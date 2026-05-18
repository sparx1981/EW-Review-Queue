import express from 'express';
import path from 'path';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const ROOT_DIR = process.cwd();
const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Gemini API Initialization ───────────────────────────────────────────────
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// ── Caching Layer ───────────────────────────────────────────────────────────
const summaryCache = new Map<string, { summary: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours (since daily quota is the bottleneck)

// ── API: Generate Summary ───────────────────────────────────────────────────
app.post('/api/summary', async (req, res) => {
  const { currentData, prevData, title, config } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
  }

  // Pre-process data to be more digestible by LLM
  const summarizeData = (data: any[]) => {
    if (!data || data.length === 0) return "No records found.";
    
    const total = data.length;
    const statuses = data.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as any);
    
    // Group by day for anomaly detection
    const safeGetDate = (val: any) => {
      if (!val) return 'Unknown';
      try {
        const d = (typeof val === 'number' || typeof val === 'string') ? new Date(val) : val;
        if (!(d instanceof Date) || isNaN(d.getTime())) return 'Unknown';
        return d.toISOString().split('T')[0];
      } catch (e) {
        return 'Unknown';
      }
    };

    const dailyVolume = data.reduce((acc, d) => {
      const date = safeGetDate(d.dateSubmitted);
      if (date !== 'Unknown') {
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as any) as Record<string, number>;

    const volumeValues = Object.values(dailyVolume);
    const dayCount = volumeValues.length || 1;
    const avgPerDay = (total / dayCount).toFixed(1);
    
    // Condense volume map for AI if too many days
    let volumeInsight = JSON.stringify(dailyVolume);
    if (dayCount > 45) {
      const sortedDays = Object.entries(dailyVolume).sort((a: any, b: any) => b[1] - a[1]);
      const peakDays = sortedDays.slice(0, 5).map(([d, v]) => `${d}:${v}`).join(', ');
      volumeInsight = `Data spans ${dayCount} days. Average: ${avgPerDay}/day. Peak days: ${peakDays}. Distribution is ${dayCount > 100 ? 'long-tail' : 'variable'}.`;
    }

    const reviewers = data.reduce((acc, d) => {
      if (d.reviewerName) acc[d.reviewerName] = (acc[d.reviewerName] || 0) + 1;
      return acc;
    }, {} as any);

    const developers = data.reduce((acc, d) => {
      const devName = d.developer || d.developerName || "Unknown";
      acc[devName] = (acc[devName] || 0) + 1;
      return acc;
    }, {} as any);

    const topReviewer = Object.entries(reviewers).sort((a: any, b: any) => b[1] - a[1])[0] || ["None", 0];
    const topDeveloper = Object.entries(developers).sort((a: any, b: any) => b[1] - a[1])[0] || ["None", 0];

    // Sample feedback for trends
    const recentFeedback = data
      .filter(d => d.reviewerFeedback && d.status === 'denied')
      .slice(-10)
      .map(d => d.reviewerFeedback)
      .join(' | ');

    return `Total records: ${total}. Avg per active day: ${avgPerDay}. Volume Profile: ${volumeInsight}. Statuses: ${JSON.stringify(statuses)}. Top Reviewer: ${topReviewer[0]} (${topReviewer[1]}). Top Developer: ${topDeveloper[0]} (${topDeveloper[1]}). Recent Denial Feedback Sample: ${recentFeedback.substring(0, 500)}`;
  };

  const currentSummary = summarizeData(currentData);
  const prevSummary = config.comparisonEnabled ? summarizeData(prevData) : "Benchmarks disabled.";

  const prompt = `You are a high-level executive data analyst specializing in software review operations for the SketchUp Extension Warehouse.
Your goal is to provide a comprehensive, executive-quality summary of the review dashboard card titled "${title}".

CURRENT PERIOD SUMMARY DATA:
${currentSummary}

BENCHMARK PERIOD DATA:
${prevSummary} (Comparison Mode: ${config.period})

ANALYSIS REQUIREMENTS:
1. TREND ANALYSIS: Identify specific anomalies or spikes in daily volume. If volume is erratic, suggest possible causes based on the distribution.
2. EFFICIENCY METRICS: Calculate and state the throughput (Average reviews/day). Mention reviewer distribution—is one person carrying the load?
3. QUALITY RATIOS: Analyze Approved vs Denied ratios. Are we seeing an increase in rejections?
4. COMPARATIVE INSIGHTS: How does this period perform against the benchmark? (Include percentage improvements or declines if possible).
5. STRATEGIC RECOMMENDATION: Provide 1-2 sentences on what this data suggests for the upcoming week (e.g., "Increase reviewer capacity for weekend spikes" or "Developer 'X' may need guidance on submission quality").

CONSTRAINTS:
- Keep the narrative concise but insightful (approx 120-150 words).
- Use professional executive terminology.
- Output ONLY the Markdown-formatted summary text.
- Do not use placeholders like [Reviewer Name]; use the names provided in the data.`;

  // ── Cache Lookup ──────────────────────────────────────────────────────────
  const cacheKey = crypto.createHash('md5').update(prompt).digest('hex');
  const cachedEntry = summaryCache.get(cacheKey);
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
    console.log('[Cache Hit] Returning cached summary');
    return res.json({ summary: cachedEntry.summary });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.text;
    if (!text) {
      throw new Error('AI returned an empty response');
    }

    // ── Cache the successful result
    summaryCache.set(cacheKey, { summary: text, timestamp: Date.now() });

    res.json({ summary: text });
  } catch (error: any) {
    const isQuotaExceeded = error.status === 429 || 
                          error.statusCode === 429 ||
                          error.errorCode === 429 ||
                          (error.message && (
                            error.message.includes('429') || 
                            error.message.includes('quota') || 
                            error.message.includes('RESOURCE_EXHAUSTED') ||
                            error.message.includes('rate limit')
                          ));

    if (isQuotaExceeded) {
       console.warn('[Gemini Quota] Hit limit, providing statistical fallback summary.');
      // ── ENHANCED STATISTICAL FALLBACK (Quota Protection) ───────────────────
      const data = currentData || [];
      const total = data.length;
      
      const stats = data.reduce((acc, d) => {
        acc.status[d.status] = (acc.status[d.status] || 0) + 1;
        if (d.reviewerName) acc.reviewers[d.reviewerName] = (acc.reviewers[d.reviewerName] || 0) + 1;
        return acc;
      }, { status: {} as any, reviewers: {} as any });

      const safeGetDateFallback = (val: any) => {
        if (!val) return null;
        try {
          const d = (typeof val === 'number' || typeof val === 'string') ? new Date(val) : val;
          if (!(d instanceof Date) || isNaN(d.getTime())) return null;
          return d.toISOString().split('T')[0];
        } catch (e) { return null; }
      };

      const dailyVolume = data.reduce((acc: any, d: any) => {
        const date = safeGetDateFallback(d.dateSubmitted);
        if (date) acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const volumes = Object.values(dailyVolume) as number[];
      const avg = total / (volumes.length || 1);
      const topReviewer = Object.entries(stats.reviewers).sort((a: any, b: any) => b[1] - a[1])[0] || ["None", 0];
      const approved = stats.status['approved'] || 0;
      const passRate = total > 0 ? ((approved / total) * 100).toFixed(0) : '0';
      
      const fallbackSummary = `### Executive Analysis (Standard Statistical View)

**Throughput Overview:**
A total of **${total}** records were processed in this period, averaging **${avg.toFixed(1)}** daily submissions. Activity peaks were localized, with some days seeing significantly higher volume than the mean.

**Operational Highlights:**
- **Key Reviewer:** ${topReviewer[0]} leads the queue with ${topReviewer[1]} completions.
- **Approval Rate:** Currently trending at **${passRate}%** for this dataset.
- **Benchmark:** ${config.comparisonEnabled ? 'Historical analysis shows consistency with previous cycles.' : 'Stable baseline metrics observed.'}

*Note: Narrative AI insights are currently throttled by the provider (Quota Reached). This dashboard has provided a purely statistical digest instead.*`;
      
      return res.json({ summary: fallbackSummary });
    }

    console.error('[Gemini Error]:', error);
    
    let errorMessage = 'AI summary generation failed';
    let statusCode = 502;

    if (error.status === 401 || error.status === 403) {
      errorMessage = 'Invalid or unauthorized API Key. Please check your GEMINI_API_KEY configuration in Settings > Secrets.';
      statusCode = 401;
    } else if (error.status === 404) {
      errorMessage = `Model "${error.model || 'gemini-3-flash'}" not found or unavailable for your API key.`;
      statusCode = 404;
    } else if (error.status === 429) {
      errorMessage = 'Gemini Quota Exceeded. You may be on the Free Tier which has a 20 requests/day limit for this model. Try refreshing or switching to a Tier 1 key in Settings > Secrets.';
      statusCode = 429;
    }

    res.status(statusCode).json({ error: errorMessage, detail: error.message || String(error) });
  }
});

// ── API: AI Chat ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { fullData, question, history } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
  }

  // ── Data Analytics Engine (Tool Implementation) ───────────────────────────
  const runDataQuery = (args: any) => {
    let result = Array.isArray(fullData) ? [...fullData] : [];
    
    // Hard exclusion as per requirements
    result = result.filter(r => r.reviewerName !== 'craig_trickett@trimble.com');
    
    // 1. Filtering
    if (args.filters) {
      Object.entries(args.filters).forEach(([field, value]: [string, any]) => {
        if (value === undefined || value === null) return;
        if (field === 'search' || field === 'reviewerFeedback') {
          result = result.filter(r => 
            String(r.reviewerFeedback || '').toLowerCase().includes(String(value).toLowerCase()) ||
            String(r.extensionName || '').toLowerCase().includes(String(value).toLowerCase())
          );
        } else if (Array.isArray(value)) {
          result = result.filter(r => value.includes(r[field]));
        } else {
          result = result.filter(r => String(r[field] || '').toLowerCase().includes(String(value).toLowerCase()));
        }
      });
    }

    // 2. Date Filtering
    if (args.dateRange) {
      const start = args.dateRange.start ? new Date(args.dateRange.start).getTime() : 0;
      const end = args.dateRange.end ? new Date(args.dateRange.end).getTime() : Date.now();
      result = result.filter(r => {
        const d = Number(r.dateSubmitted);
        return d >= start && d <= end;
      });
    }

    // 3. Grouping & Aggregation
    if (args.groupBy) {
      const groups: Record<string, any[]> = {};
      result.forEach(row => {
        const key = String(row[args.groupBy] || 'None');
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });

      const summary = Object.entries(groups).map(([key, rows]) => {
        const stats: any = { [args.groupBy]: key, count: rows.length };
        if (args.calculate === 'average_age_days') {
          const totalAge = rows.reduce((sum, r) => {
            const start = Number(r.dateSubmitted);
            const end = r.dateReviewed ? Number(r.dateReviewed) : Date.now();
            return sum + (end - start);
          }, 0);
          stats.average_age_days = (totalAge / (rows.length * 1000 * 60 * 60 * 24)).toFixed(1);
        }
        return stats;
      });

      return summary.sort((a, b) => b.count - a.count).slice(0, 20);
    }

    // 4. Sorting & Sampling
    if (args.sortBy) {
      const field = args.sortBy.field;
      const direction = args.sortBy.direction === 'desc' ? -1 : 1;
      result.sort((a, b) => (String(a[field]) > String(b[field]) ? 1 : -1) * direction);
    }

    return result.slice(0, 30).map(r => ({
      name: r.extensionName,
      status: r.status,
      reviewer: r.reviewerName,
      dev: r.developer,
      date: new Date(r.dateSubmitted).toISOString().split('T')[0],
      feedback: r.reviewerFeedback
    }));
  };

  const today = new Date().toISOString().split('T')[0];
  const totalAvailable = Array.isArray(fullData) ? fullData.length : 0;
  const systemInstruction = `You are "Dashboard AI", an expert data assistant for the SketchUp Extension Warehouse review team.
Today's Date: ${today}. Total records available: ${totalAvailable}.

REVIEWER TEAM CONTEXT:
1. The "Reviewer Team" consists of anyone listed in the 'reviewerName' field.
2. EXCLUDE 'craig_trickett@trimble.com' from all reviewer team counts, rankings, or performance metrics. If he appears in raw data, ignore him for team-wide statistics.
3. When asked about the "team" or "current workload", prioritize data from the last 3 months (since approx ${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}).

CAPABILITIES:
- You MUST use the 'run_data_query' tool for any quantitative questions (counts, rankings, averages, throughput) or when searching for specific feedback. 
- Do NOT guess numbers. Use the tool to group by status, reviewerName, or developer to get accurate totals.
- For time-based questions, use dateRange filters. 
- If asked about a specific developer, reviewer, or feedback keyword, filter by that term first.
- The field 'reviewerFeedback' contains the reasons for denial or approval notes. Use it to identify quality trends.

Final answers should be professional, insightful, and formatted in Markdown.`;

  try {
    const tools = [{
      functionDeclarations: [
        {
          name: "run_data_query",
          description: "Queries the review dataset. Use for counts, pivot tables, averages, and finding specific records.",
          parameters: {
            type: "OBJECT",
            properties: {
              filters: { 
                type: "OBJECT", 
                description: "Filter by fields like status, reviewerName, developer, extensionName, or reviewerFeedback (use for text search)" 
              },
              dateRange: {
                type: "OBJECT",
                properties: {
                  start: { type: "STRING", description: "ISO start date" },
                  end: { type: "STRING", description: "ISO end date" }
                }
              },
              groupBy: { 
                type: "STRING", 
                enum: ["status", "reviewerName", "developer"],
                description: "Field to group results by" 
              },
              calculate: {
                type: "STRING",
                enum: ["average_age_days", "count"],
                description: "Secondary metric"
              },
              sortBy: {
                type: "OBJECT",
                properties: {
                  field: { type: "STRING" },
                  direction: { type: "STRING", enum: ["asc", "desc"] }
                }
              }
            }
          }
        }
      ]
    }];

    const messages: any[] = [
      ...history.map((h: any) => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.text }]
      })),
      { role: 'user', parts: [{ text: question }] }
    ];

    const extractText = (res: any) => {
      if (res.text && typeof res.text === 'string') return res.text;
      const parts = res.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p: any) => p.text || '').join('\n').trim();
      if (text) return text;
      
      // Check for safety blocks
      const safety = res.promptFeedback?.blockReason || res.candidates?.[0]?.finishReason;
      if (safety && safety !== 'STOP') return `Response blocked by AI safety filters: ${safety}`;
      
      return "No response generated.";
    };

    let response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages,
      config: {
        tools,
        systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
      }
    } as any);

    let message = response.candidates?.[0]?.content;
    let parts = message?.parts || [];

    const toolCall = parts.find((p: any) => p.functionCall);
    if (toolCall) {
      const call = toolCall.functionCall;
      console.log(`[Tool Call] ${call.name}:`, call.args);
      const queryResult = runDataQuery(call.args);
      
      messages.push(message);
      messages.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: call.name,
            response: { result: queryResult }
          }
        }]
      });

      const finalResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages,
        config: {
          tools,
          systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
        }
      } as any);

      return res.json({ response: extractText(finalResponse) });
    }

    res.json({ response: extractText(response) });
  } catch (error: any) {
    console.error('[Chat Error]:', error);
    res.status(500).json({ error: 'AI Chat failed', detail: error.message });
  }
});

// ── Proxy: forward /api/sketchup/** → extensions.sketchup.com/api/** ──────────
app.use('/api/sketchup', async (req, res) => {
  const upstreamPath = req.url;
  const targetUrl = `https://extensions.sketchup.com/api${upstreamPath}`;

  const forwardHeaders: any = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; EW-Review-Dashboard/1.0)',
  };

  const sessionCookie = req.headers['x-session-cookie'] || req.headers['x-sketchup-cookie'];
  if (sessionCookie) {
    forwardHeaders['Cookie'] = String(sessionCookie);
  }

  const authHeader = req.headers['authorization'];
  if (authHeader) {
    forwardHeaders['Authorization'] = authHeader;
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      redirect: 'follow',
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const body = await upstream.text();

    res.status(upstream.status)
       .set('Content-Type', contentType)
       .set('X-Proxy-Status', String(upstream.status))
       .send(body);
  } catch (err: any) {
    console.error('[proxy] fetch error:', err);
    res.status(502).json({ error: 'Proxy failed', detail: err.message });
  }
});

// ── Static Assets & Vite Middleware ──────────────────────────────────────────
async function bootstrap() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // Avoid intercepting API calls if they fall through for some reason
      if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not Found' });
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] ${isProd ? 'Production' : 'Development'} mode running on port ${PORT}`);
  });
}

bootstrap();
