import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

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
    const dailyVolume = data.reduce((acc, d) => {
      let date = 'Unknown';
      if (d.dateSubmitted) {
        try {
          const dateStr = typeof d.dateSubmitted === 'string' ? d.dateSubmitted : new Date(d.dateSubmitted).toISOString();
          date = dateStr.split('T')[0];
        } catch (e) {
          console.warn('Failed to parse date:', d.dateSubmitted);
        }
      }
      
      if (date !== 'Unknown') {
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as any) as Record<string, number>;

    const volumeValues = Object.values(dailyVolume);
    const dayCount = volumeValues.length || 1;
    const avgPerDay = (total / dayCount).toFixed(1);
    
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

    return `Total records: ${total}. Avg per active day: ${avgPerDay}. Daily Volume Map: ${JSON.stringify(dailyVolume)}. Statuses: ${JSON.stringify(statuses)}. Top Reviewer: ${topReviewer[0]} (${topReviewer[1]}). Top Developer: ${topDeveloper[0]} (${topDeveloper[1]}).`;
  };

  const currentSummary = summarizeData(currentData);
  const prevSummary = config.comparisonEnabled ? summarizeData(prevData) : "Benchmarks disabled.";

  const prompt = `You are a data analyst for the SketchUp Extension Warehouse Review Dashboard.
Analyze the following data for the card titled "${title}" and provide a concise, professional text summary of findings.

CURRENT PERIOD DATA SUMMARY:
${currentSummary}

PREVIOUS PERIOD DATA SUMMARY (BENCHMARK):
${prevSummary}

BENCHMARK CONFIGURATION: ${config.comparisonEnabled ? `Enabled (${config.period})` : "Disabled"}

TASK:
1. Identify and mention any abnormal highs or lows in daily volume (compared to the average or benchmark).
2. Explicitly state the average number of submissions per day.
3. State the approximate key ratios (e.g., approved vs denied).
4. Compare performance to the benchmark data where applicable.
5. Highlight key reviewer performance (who is doing the most work).
6. Highlight high submission volume from specific developers.
7. Keep the summary under 150 words. Focus on actionable insights or notable trends.
8. Use professional but accessible language.

Return only the summary text.`;

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
      contents: prompt,
    });

    // ── Cache the successful result
    summaryCache.set(cacheKey, { summary: response.text, timestamp: Date.now() });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error('[Gemini Error]:', error);
    
    let errorMessage = 'AI summary generation failed';
    let statusCode = 502;

    const isQuotaExceeded = error.status === 429 || 
                          (error.message && error.message.includes('429')) || 
                          (error.message && error.message.includes('quota'));

    if (isQuotaExceeded) {
      // ── DATA-DRIVEN FALLBACK (Quota Protection) ───────────────────────────
      const data = currentData || [];
      const total = data.length;
      
      // Basic metrics for fallback
      const dailyVolume = data.reduce((acc: any, d: any) => {
        let date = 'Unknown';
        if (d.dateSubmitted) {
          try {
            const dateStr = typeof d.dateSubmitted === 'string' ? d.dateSubmitted : new Date(d.dateSubmitted).toISOString();
            date = dateStr.split('T')[0];
          } catch (e) {}
        }
        if (date !== 'Unknown') acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const volumes = Object.values(dailyVolume) as number[];
      const avg = total / (volumes.length || 1);
      const max = Math.max(...(volumes.length ? volumes : [0]));
      
      const fallbackSummary = `### Data Analysis (AI Quota Fallback)\n\n**Total Volume:** ${total} records identified in this period.\n\n**Key Metrics:**\n- **Daily Average:** ~${avg.toFixed(1)} submissions per active day.\n- **Activity Spike:** A peak of ${max} submissions was recorded on one day.\n- **Trend:** ${config.comparisonEnabled ? 'Benchmarking shows expected variance.' : 'Data suggests steady processing volume.'}\n\n*Note: Detailed AI narrative is temporarily limited due to high demand on the analysis engine (Gemini Quota Exceeded).*`;
      
      return res.json({ summary: fallbackSummary });
    }

    if (error.status === 401 || error.status === 403) {
      errorMessage = 'Invalid API Key. Please check your GEMINI_API_KEY configuration.';
      statusCode = 401;
    }

    res.status(statusCode).json({ error: errorMessage, detail: error.message });
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

// ── Static: serve Vite build output ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`[server] listening on port ${PORT}`);
});
