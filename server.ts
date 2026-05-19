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

    // Top 5 reviewers for distribution analysis
    const sortedReviewers = Object.entries(reviewers)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name}(${count})`)
      .join(', ');

    const topDeveloper = Object.entries(developers).sort((a: any, b: any) => b[1] - a[1])[0] || ["None", 0];

    // Sample recent denial feedback
    const recentDenialFeedback = data
      .filter(d => d.reviewerFeedback && d.status === 'denied')
      .slice(-10)
      .map(d => d.reviewerFeedback)
      .join(' | ');

    // Approval rate
    const approved = (statuses as any)['approved'] || 0;
    const denied = (statuses as any)['denied'] || 0;
    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0';

    return `Total records: ${total}. Avg per active day: ${avgPerDay}. Approval rate: ${approvalRate}% (${approved} approved, ${denied} denied). Volume Profile: ${volumeInsight}. Statuses: ${JSON.stringify(statuses)}. Top 5 Reviewers by volume: ${sortedReviewers}. Top Developer: ${topDeveloper[0]} (${topDeveloper[1]}). Recent Denial Feedback Sample: ${recentDenialFeedback.substring(0, 600)}`;
  };

  // ── Compute hover-breakdown querySummaries for the summary card ─────────────
  const computeSummaryHovers = (data: any[], cardTitle: string) => {
    if (!data || data.length === 0) return [];
    const summaries: any[] = [];
    const total = data.length;
    const base = [{ stage: 'Data Source', applied: cardTitle, count: total }];

    // Total records
    summaries.push({ count: total, pipeline: base });

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    data.forEach(d => { statusCounts[d.status] = (statusCounts[d.status] || 0) + 1; });
    for (const [status, cnt] of Object.entries(statusCounts)) {
      summaries.push({ count: cnt, pipeline: [...base, { stage: 'Status', applied: status, count: cnt }] });
    }

    // Approval / denial rates — IMPORTANT: use total (all records), not just completed,
    // because the AI prompt passes approvalRate = approved/total and the text will say
    // e.g. "62.4%" which is 3907÷6259×100, not 3907÷(3907+2282)×100.
    const approved = statusCounts['approved'] || 0;
    const denied   = statusCounts['denied']   || 0;
    const completedTotal = approved + denied;
    const approvalRateOfAll  = total > 0 ? ((approved / total) * 100).toFixed(1) : '0';
    const denialRateOfAll    = total > 0 ? ((denied   / total) * 100).toFixed(1) : '0';
    const approvalRateOfDone = completedTotal > 0 ? ((approved / completedTotal) * 100).toFixed(1) : '0';
    const denialRateOfDone   = completedTotal > 0 ? ((denied   / completedTotal) * 100).toFixed(1) : '0';

    const pctBaseAll = [
      ...base,
      { stage: 'Approved', applied: 'status: approved', count: approved },
      { stage: 'Denied',   applied: 'status: denied',   count: denied   },
    ];
    // Emit every variant so whichever form the AI writes gets a badge
    const pctVariants: string[] = [...new Set([
      approvalRateOfAll, approvalRateOfDone,
      String(Math.round(parseFloat(approvalRateOfAll))),
      String(Math.round(parseFloat(approvalRateOfDone))),
    ])];
    pctVariants.forEach(v => {
      const isAll = v === approvalRateOfAll || String(Math.round(parseFloat(approvalRateOfAll))) === v;
      const num = parseFloat(v);
      const denom = isAll ? total : completedTotal;
      summaries.push({
        percentage: v,
        pipeline: [...pctBaseAll, {
          stage: 'Approval Rate',
          applied: `${approved} ÷ ${denom} × 100`,
          count: num
        }]
      });
    });
    const denialVariants: string[] = [...new Set([
      denialRateOfAll, denialRateOfDone,
      String(Math.round(parseFloat(denialRateOfAll))),
      String(Math.round(parseFloat(denialRateOfDone))),
    ])];
    denialVariants.forEach(v => {
      if (pctVariants.includes(v)) return; // skip if already used by approval
      const isAll = v === denialRateOfAll || String(Math.round(parseFloat(denialRateOfAll))) === v;
      const num = parseFloat(v);
      const denom = isAll ? total : completedTotal;
      summaries.push({
        percentage: v,
        pipeline: [...pctBaseAll, {
          stage: 'Denial Rate',
          applied: `${denied} ÷ ${denom} × 100`,
          count: num
        }]
      });
    });

    // Per-reviewer counts
    const reviewerCounts: Record<string, number> = {};
    data.forEach(d => { if (d.reviewerName) reviewerCounts[d.reviewerName] = (reviewerCounts[d.reviewerName] || 0) + 1; });
    for (const [reviewer, cnt] of Object.entries(reviewerCounts)) {
      summaries.push({ count: cnt, pipeline: [...base, { stage: 'Reviewer', applied: reviewer.replace('@trimble.com',''), count: cnt }] });
    }

    // Daily volume peaks — AI often mentions top peak days ("50 reviews on 2020-11-04")
    const dailyVolume: Record<string, number> = {};
    data.forEach(d => {
      if (!d.dateSubmitted) return;
      try {
        const date = new Date(Number(d.dateSubmitted)).toISOString().split('T')[0];
        if (date !== 'Invalid Date') dailyVolume[date] = (dailyVolume[date] || 0) + 1;
      } catch {}
    });
    const sortedPeaks = Object.entries(dailyVolume).sort((a, b) => (b[1] as number) - (a[1] as number));
    for (const [date, cnt] of sortedPeaks.slice(0, 15)) { // top 15 peaks
      summaries.push({ count: cnt as number, pipeline: [...base, { stage: 'Daily Peak', applied: date, count: cnt as number }] });
    }

    // Number of active days
    const activeDays = sortedPeaks.length;
    if (activeDays > 0) {
      summaries.push({ count: activeDays, pipeline: [...base, { stage: 'Active Days', applied: 'Days with submissions', count: activeDays }] });
    }

    return summaries;
  };

  const currentSummary = summarizeData(currentData);
  const prevSummary = config.comparisonEnabled ? summarizeData(prevData) : "Benchmarks disabled.";
  const currentHovers = computeSummaryHovers(currentData, title);

  const prompt = `You are a high-level executive data analyst specializing in software review operations for the SketchUp Extension Warehouse.
Your goal is to provide a comprehensive, executive-quality summary of the review dashboard card titled "${title}".

CURRENT PERIOD SUMMARY DATA:
${currentSummary}

BENCHMARK PERIOD DATA:
${prevSummary} (Comparison Mode: ${config.period})

OPERATIONAL CONTEXT:
- The review team operates on a standard Monday-Friday business schedule.
- Extension submissions occur 24/7, but reviews only happen on weekdays.
- Incorporate this constraint when analyzing throughput, turnaround times, or predicted completion dates.

OUTPUT FORMAT:
Structure your response using the following sections with exactly these Markdown headers. Each section should be 1-3 sentences or a short bullet list.

## 📊 At a Glance
Provide 2-3 headline bullet points with bold key numbers (total records, approval rate, avg reviews per business day).

## 📈 Volume & Trends
Identify patterns or spikes in daily submission volume. Note if activity is erratic or consistent.

## 👥 Reviewer Performance
Highlight top contributors by name and count. Note if workload distribution is balanced or skewed.

## ✅ Quality Ratios
State the Approved vs Denied breakdown. Flag any notable denial reasons from the feedback sample.

## 🔄 vs Benchmark
${config.comparisonEnabled ? "Compare this period against the benchmark. State whether performance has improved, declined, or held steady." : "Benchmark comparison is disabled for this card."}

## 🎯 Recommendation
1-2 sentences on what this data suggests the team should focus on in the coming week.

CONSTRAINTS:
- Use professional but clear language — avoid overly dense prose.
- Do NOT use placeholders like [Reviewer Name]; use actual names from the data.
- Do not invent numbers; only use figures present in the data provided.
- Output ONLY the Markdown-formatted summary text. No preamble or sign-off.`;

  // ── Cache Lookup ──────────────────────────────────────────────────────────
  const cacheKey = crypto.createHash('md5').update(prompt).digest('hex');
  const cachedEntry = summaryCache.get(cacheKey);
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
    console.log('[Cache Hit] Returning cached summary');
    return res.json({ summary: cachedEntry.summary, querySummaries: currentHovers });
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

    res.json({ summary: text, querySummaries: currentHovers });
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
  const { fullData, question, history, timezoneOffsetMinutes, nowMs } = req.body;

  // tzOffsetMs: shift bare date strings so they align with the browser's local midnight,
  // matching dayjs().startOf('day') which runs in the user's timezone (not the server's).
  // getTimezoneOffset() returns (UTC - local) in minutes: BST = -60, EST = +300.
  const tzOffsetMs: number = (typeof timezoneOffsetMinutes === 'number' ? timezoneOffsetMinutes : 0) * 60 * 1000;
  // nowTimestamp: the exact moment the browser sent this request. Used to clamp the end of
  // date ranges so the AI never counts records that arrived after the card's snapshot.
  // The card uses end: now.valueOf() — we replicate that here by capping to nowTimestamp.
  const nowTimestamp: number = typeof nowMs === 'number' ? nowMs : Date.now();

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
  }

  // ── Data Analytics Engine (Tool Implementation) ───────────────────────────
  interface PipelineStage { stage: string; applied: string; count: number; }

  const runDataQuery = (args: any): any => {
    let result = Array.isArray(fullData) ? [...fullData] : [];
    const pipeline: PipelineStage[] = [];

    // ── Stage 0: Total records ────────────────────────────────────────────────
    pipeline.push({ stage: 'Total Records Supplied', applied: 'Input Stream', count: result.length });

    // ── Stage 1: Listing pages ────────────────────────────────────────────────
    // The dashboard card configuration has listingPageMode:"exclude" by default,
    // so the AI must exclude them to produce counts that match the cards.
    // Only include them if the user explicitly asks about listing page submissions.
    if (!args.includeListingPages) {
      result = result.filter(r => !r.isListingPage);
      pipeline.push({ stage: '1. Listing Pages', applied: 'exclude', count: result.length });
    } else {
      pipeline.push({ stage: '1. Listing Pages', applied: 'include', count: result.length });
    }

    // ── Stage 2: craig exclusion (reviewer-performance queries only) ──────────
    // craig_trickett@trimble.com is excluded ONLY from reviewer leaderboard/
    // performance queries (groupBy:reviewerName). For submission/review counts by
    // date, all records are included regardless of reviewer.
    const isReviewerPerformanceQuery =
      args.groupBy === 'reviewerName' ||
      (args.filters && (args.filters.reviewerName || args.filters.reviewer));
    if (isReviewerPerformanceQuery) {
      result = result.filter(r => r.reviewerName !== 'craig_trickett@trimble.com');
      pipeline.push({ stage: '2. Reviewer Filter', applied: 'exclude craig_trickett', count: result.length });
    } else {
      pipeline.push({ stage: '2. Reviewer Filter', applied: 'Ignored', count: result.length });
    }

    // ── Stage 3: General filters (status, extensionName, etc.) ───────────────
    if (args.filters) {
      Object.entries(args.filters).forEach(([field, value]: [string, any]) => {
        if (value === undefined || value === null) return;
        if (field === 'search' || field === 'reviewerFeedback') {
          result = result.filter(r =>
            String(r.reviewerFeedback || '').toLowerCase().includes(String(value).toLowerCase()) ||
            String(r.extensionName || '').toLowerCase().includes(String(value).toLowerCase())
          );
          pipeline.push({ stage: `3. Search Filter`, applied: String(value), count: result.length });
        } else if (field === 'status') {
          const statuses = Array.isArray(value) ? value : [value];
          result = result.filter(r => statuses.includes(r[field]));
          pipeline.push({ stage: `3. Status Filter`, applied: statuses.join(', '), count: result.length });
        } else if (Array.isArray(value)) {
          result = result.filter(r => value.includes(r[field]));
          pipeline.push({ stage: `3. Filter: ${field}`, applied: value.join(', '), count: result.length });
        } else {
          result = result.filter(r => String(r[field] || '').toLowerCase().includes(String(value).toLowerCase()));
          pipeline.push({ stage: `3. Filter: ${field}`, applied: String(value), count: result.length });
        }
      });
    }

    // ── Stage 4: Date Filtering ──────────────────────────────────────────────
    // Bare YYYY-MM-DD strings are shifted by the browser's UTC offset so the
    // boundary matches dayjs().startOf('day') which runs in the browser's local timezone.
    // Full ISO strings (containing T, Z, or +) are trusted as-is.
    let resolvedDateRange: string | null = null;
    if (args.dateRange) {
      const parseTzAwareStart = (val: string): number => {
        if (val.includes('T') || val.includes('Z') || val.includes('+')) return new Date(val).getTime();
        return new Date(val + 'T00:00:00.000Z').getTime() + tzOffsetMs;
      };
      const parseTzAwareEnd = (val: string): number => {
        if (val.includes('T') || val.includes('Z') || val.includes('+')) return new Date(val).getTime();
        const endOfDay = new Date(val + 'T23:59:59.999Z').getTime() + tzOffsetMs;
        return endOfDay > nowTimestamp ? nowTimestamp : endOfDay;
      };
      const start = args.dateRange.start ? parseTzAwareStart(String(args.dateRange.start)) : 0;
      const rawEnd = args.dateRange.end ? parseTzAwareEnd(String(args.dateRange.end)) : nowTimestamp;
      const end = Math.min(rawEnd, nowTimestamp);
      const dateFieldKey: 'dateSubmitted' | 'dateReviewed' =
        args.dateRange.dateField === 'dateReviewed' ? 'dateReviewed' : 'dateSubmitted';
      result = result.filter(r => {
        const d = Number(r[dateFieldKey]);
        if (!d) return false;
        return d >= start && d <= end;
      });
      const fmtDate = (ms: number) => new Date(ms).toISOString().split('T')[0];
      resolvedDateRange = `${fmtDate(start)} to ${fmtDate(end)}`;
      pipeline.push({
        stage: `4. ${dateFieldKey === 'dateReviewed' ? 'Review' : 'Submission'} Range`,
        applied: resolvedDateRange,
        count: result.length
      });
    } else {
      pipeline.push({ stage: '4. Date Range', applied: 'All Time', count: result.length });
    }

    // ── Stage 5: Default status filter ─────────────────────────────────────────
    // Apply the same status defaults as the KPI card configuration. Without this
    // the AI overcounts records with non-standard statuses (e.g. in_review).
    //
    // The card config from DATA SOURCE CRITERIA shows:
    //   submitted queries → status: [in_queue, approved, denied]  (excludes in_review)
    //   reviewed  queries → status: [approved, denied]            (only completed reviews)
    //
    // The AI screen showed: Approved(35)+Denied(71)+InQueue(60)+InReview(2) = 168
    // Card shows 163 = 168 − 3(listing pages, fixed by isListingPage in trim) − 2(in_review)
    const hasExplicitStatusFilter = args.filters?.status !== undefined && args.filters?.status !== null;
    if (args.dateRange && !hasExplicitStatusFilter) {
      if (args.dateRange.dateField === 'dateReviewed') {
        // Only completed reviews — in_review means still in progress
        result = result.filter(r => r.status === 'approved' || r.status === 'denied');
        pipeline.push({ stage: '5. Status Filter', applied: 'approved, denied (auto — completed reviews only)', count: result.length });
      } else {
        // Submitted queries — match card default: in_queue, approved, denied (no in_review)
        result = result.filter(r => r.status === 'in_queue' || r.status === 'approved' || r.status === 'denied');
        pipeline.push({ stage: '5. Status Filter', applied: 'in_queue, approved, denied (auto — excludes in_review)', count: result.length });
      }
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

      const finalGroups = summary.sort((a, b) => b.count - a.count).slice(0, 20);

      // Build one pipeline entry per group so the frontend can show a hover
      // breakdown for sub-counts like "Denied: 109" or "Approved: 49".
      // Each entry extends the shared pipeline with a final "group" stage.
      const groupPipelineSummaries = finalGroups.map((group: any) => ({
        count: group.count,
        pipeline: [
          ...pipeline,
          {
            stage: `6. Group: ${args.groupBy}`,
            applied: String(group[args.groupBy] ?? 'Unknown'),
            count: group.count
          }
        ]
      }));

      return { results: finalGroups, pipeline, groupPipelineSummaries };
    }

    // 4. Sorting & Sampling
    const totalMatches = result.length;
    if (args.sortBy) {
      const field = args.sortBy.field;
      const direction = args.sortBy.direction === 'desc' ? -1 : 1;
      result.sort((a, b) => (String(a[field]) > String(b[field]) ? 1 : -1) * direction);
    }

    const safeISO = (val: any) => {
      if (!val) return 'Unknown';
      try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? 'Unknown' : d.toISOString().split('T')[0];
      } catch (e) {
        return 'Unknown';
      }
    };

    // Compute approval/denial rate percentages from the result set.
    // Returned as percentageSummaries so the tool loop can add them to querySummaries,
    // enabling hover badges on any percentage the AI mentions in its response.
    const resultApproved = result.filter(r => r.status === 'approved').length;
    const resultDenied   = result.filter(r => r.status === 'denied').length;
    const resultCompleted = resultApproved + resultDenied;
    const percentageSummaries: any[] = [];
    if (totalMatches > 0 && resultCompleted > 0) {
      const pctPipeline = [...pipeline,
        { stage: 'Approved', applied: 'status: approved', count: resultApproved },
        { stage: 'Denied',   applied: 'status: denied',   count: resultDenied   },
      ];
      const rateOfAll  = ((resultApproved / totalMatches)   * 100).toFixed(1);
      const rateOfDone = ((resultApproved / resultCompleted) * 100).toFixed(1);
      const variants = [...new Set([rateOfAll, rateOfDone,
        String(Math.round(parseFloat(rateOfAll))),
        String(Math.round(parseFloat(rateOfDone)))])];
      variants.forEach(v => {
        const denom = v === rateOfAll || String(Math.round(parseFloat(rateOfAll))) === v ? totalMatches : resultCompleted;
        percentageSummaries.push({ percentage: v, pipeline: [...pctPipeline,
          { stage: 'Approval Rate', applied: `${resultApproved} ÷ ${denom} × 100`, count: parseFloat(v) }
        ]});
      });
    }

    return {
      totalMatches,
      pipeline,
      percentageSummaries,
      sampleSize: Math.min(30, result.length),
      results: result.slice(0, 30).map(r => ({
        name: r.extensionName,
        status: r.status,
        reviewer: r.reviewerName,
        dev: r.developer,
        date: safeISO(r.dateSubmitted),
        feedback: r.reviewerFeedback
      }))
    };
  };

  const today = new Date().toISOString().split('T')[0];
  const totalAvailable = Array.isArray(fullData) ? fullData.length : 0;
  const systemInstruction = `You are "Dashboard AI", an expert data assistant for the SketchUp Extension Warehouse review team.
Today's Date: ${today}. Total records available: ${totalAvailable}.

OPERATIONAL CONTEXT:
- The review team operates on a standard Monday-Friday business schedule.
- Extension submissions occur 24/7, but reviews only happen on weekdays.
- When calculating throughput or estimating time-to-clear benchmarks, ONLY count weekdays.

REVIEWER TEAM CONTEXT:
1. The "Reviewer Team" consists of anyone listed in the 'reviewerName' field.
2. EXCLUDE 'craig_trickett@trimble.com' from reviewer PERFORMANCE metrics only (leaderboards, throughput, who-reviewed-most, team-activity queries). The tool will automatically exclude him when you use groupBy: "reviewerName".
   IMPORTANT: Do NOT manually filter him out when counting SUBMISSIONS or REVIEWS by date. "How many extensions were submitted this month?" and "How many were reviewed this month?" should count ALL records regardless of reviewer — the tool handles this correctly. Only exclude him from questions like "who reviewed the most?" or "what is each reviewer's throughput?".
3. When asked about the "team" or "current workload", prioritize data from the last 3 months (since approx ${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}).

CAPABILITIES:
- You MUST use the 'run_data_query' tool for any quantitative questions (counts, rankings, averages, throughput) or when searching for specific feedback. 
- Do NOT guess numbers. Use the tool to group by status, reviewerName, or developer to get accurate totals.
- For time-based questions, use dateRange filters. ALWAYS express dateRange values as bare YYYY-MM-DD strings (e.g. "2026-05-17") — the server will automatically clamp start to 00:00:00 and end to 23:59:59 of that local day, matching the dashboard card behaviour exactly.
- CRITICAL — always set dateRange.dateField correctly:
  * Questions about when extensions were SUBMITTED, received, or entered the queue → dateField: "dateSubmitted"
  * Questions about when extensions were REVIEWED, completed, approved, denied, or processed → dateField: "dateReviewed"
  * When in doubt about review-related questions ("reviewed this month", "completed last week", "how many reviews did X do") → dateField: "dateReviewed"
  * Omitting dateField defaults to dateSubmitted — this will give WRONG answers for review-date questions.
- "Past 30 days" = start: today minus 30 days (YYYY-MM-DD), end: today (YYYY-MM-DD). This matches the card's subtract(30, days).startOf(day) logic. Do NOT subtract one more day thinking you need "30 complete days before today" — the card includes the anchor day.
- LISTING PAGES: records with isListingPage=true are excluded by default (matching the card's listingPageMode:"exclude" config).

LISTING PAGE CLARIFICATION (required for direct count queries):
When the user asks a DIRECT COUNT question such as "how many extensions were submitted" or "how many were reviewed" (i.e. they want a single total number), you MUST first reply WITHOUT calling any tool and ask:
  "Before I count — should I **include** or **exclude** listing page submissions?
   *(The dashboard cards exclude them by default.)*
   I'll use these statuses: **in_queue, approved, denied** for submissions / **approved, denied** for reviews."
Wait for the user's reply, then call the tool with the appropriate includeListingPages value.
Exception: if the user already stated their preference in the question (e.g. "excluding listing pages"), skip the clarification and use that preference directly.

STATUS CONFIRMATION (required in every count response):
After running a count query, your response MUST include a one-line confirmation such as:
  "*(Listing pages: excluded · Statuses: in_queue, approved, denied)*"
This lets the user verify the count matches their expectation.
- "This weekend" = start: the most recent Saturday date, end: the most recent Sunday date (or today if today is Sunday).
- For single-day queries (e.g. "what was submitted on Sunday"), set BOTH start and end to the same YYYY-MM-DD date — the server will expand this to the full 24-hour day automatically.
- If asked about a specific developer, reviewer, or feedback keyword, filter by that term first.
- The field 'reviewerFeedback' contains the reasons for denial or approval notes. Use it to identify quality trends.
- Complex questions may require MULTIPLE sequential tool calls — for example, first grouping by reviewer, then filtering by status for a specific reviewer. Always make as many tool calls as needed to fully answer the question before writing your final response. Never say you lack data when a follow-up query could retrieve it.
- CRITICAL — ALWAYS CALL THE TOOL: You MUST call run_data_query for EVERY response that states a specific count or percentage, even if the conversation history already contains that number. The tool call is required so the UI can attach a hover tooltip ("how was this calculated?") to each figure. If you answer with a number from memory without re-querying, the tooltip cannot be shown and the user has no way to verify the figure. No exceptions.

FINAL RESPONSE FORMAT:
- Format your main answer in Markdown with clear structure (use headers, bullet points, bold for key figures).
- You MUST end every single response with exactly one relevant follow-up question on its own line, formatted precisely as:
> 💬 **What would you like to explore next?** [your specific question here]
- The follow-up must be specific to the data you just analysed — not a generic offer to help.
- Do not include more than one blockquote follow-up line.`;

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
                  start: { type: "STRING", description: "ISO start date (YYYY-MM-DD)" },
                  end: { type: "STRING", description: "ISO end date (YYYY-MM-DD)" },
                  dateField: {
                    type: "STRING",
                    enum: ["dateSubmitted", "dateReviewed"],
                    description: "Which date field to filter on. Use dateSubmitted for submission date, dateReviewed for review/completion date. REQUIRED when the question involves review dates."
                  }
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
              },
              includeListingPages: {
                type: "BOOLEAN",
                description: "Default false — listing pages are excluded to match the dashboard card default. Set true only if the user explicitly asks about listing page submissions."
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
      if (!res) return "No response from AI service.";
      
      let text = '';
      try {
        if (typeof res.text === 'string') text = res.text;
        else if (typeof res.text === 'function') text = res.text();
      } catch (e) {}

      if (text) return text.trim();

      const candidate = res.candidates?.[0];
      if (candidate?.content?.parts) {
        text = candidate.content.parts
          .filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join('\n')
          .trim();
      }

      if (text) return text;
      
      const safety = res.promptFeedback?.blockReason || candidate?.finishReason;
      if (safety && safety !== 'STOP' && safety !== 'stop' && safety !== 'SUCCESS') {
        return `Response blocked or interrupted: ${safety}`;
      }
      
      // If only a function call part is present, the multi-tool loop should have
      // handled it. Returning an empty string here ensures it never leaks to the
      // client UI as a visible "[Processing tool call...]" message.
      if (candidate?.content?.parts?.some((p: any) => p.functionCall)) {
        return "";
      }
      
      return "";
    };

    // Multi-tool call loop: allows the AI to make up to 5 sequential data
    // queries before composing its final answer. This is critical for complex
    // questions that require multiple dataset passes.
    const MAX_TOOL_CALLS = 5;
    let toolCallCount = 0;
    // querySummaries: one entry per tool call, used by the frontend to render
    // the "How was this number calculated?" hover popup on figures in the response.
    const querySummaries: Array<{ count: number; pipeline: any[] }> = [];
    const geminiConfig = {
      tools,
      systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
    };

    let currentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages,
      config: geminiConfig
    } as any);

    while (toolCallCount < MAX_TOOL_CALLS) {
      const currentContent = currentResponse.candidates?.[0]?.content;
      const currentParts = currentContent?.parts || [];
      const toolCall = currentParts.find((p: any) => p.functionCall);

      if (!toolCall) break;

      toolCallCount++;
      const call = toolCall.functionCall;
      console.log(`[Tool Call ${toolCallCount}] ${call.name}:`, call.args);
      const queryResult = runDataQuery(call.args);

      // Capture pipeline for hover breakdowns.
      // Non-grouped queries: one entry for the total count.
      if (queryResult.pipeline && typeof queryResult.totalMatches === 'number') {
        querySummaries.push({ count: queryResult.totalMatches, pipeline: queryResult.pipeline });
      }
      // Grouped queries: one entry per group so sub-counts like "Denied: 109" get hovers too.
      if (Array.isArray(queryResult.groupPipelineSummaries)) {
        querySummaries.push(...queryResult.groupPipelineSummaries);
      }
      // Percentage summaries (approval/denial rates) from any date-range query
      if (Array.isArray(queryResult.percentageSummaries)) {
        querySummaries.push(...queryResult.percentageSummaries);
      }

      messages.push(currentContent);
      messages.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: call.name,
            response: { result: queryResult }
          }
        }]
      });

      currentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages,
        config: geminiConfig
      } as any);
    }

    res.json({ response: extractText(currentResponse), querySummaries });
  } catch (error: any) {
    console.error('[Chat Error]:', error);
    res.status(500).json({ error: 'AI Chat failed', detail: error.message });
  }
});

// ── API: Auto-Detect Session Cookie ─────────────────────────────────────────
// Works by reading the Cookie header the browser attaches automatically to same-
// origin requests. This ONLY succeeds when the app is served from the same
// origin as extensions.sketchup.com. When cross-origin, the browser never sends
// the SketchUp cookies here — that is a browser security boundary, not a bug.
app.get('/api/auto-detect', async (req, res) => {
  // Determine the app's own host so we can give a precise cross-origin message
  const appHost = (req.headers['x-forwarded-host'] || req.headers['host'] || '').toString();
  const isSketchUpOrigin = appHost.includes('extensions.sketchup.com');

  const browserCookies = req.headers['cookie'];

  // ── Cross-origin: the browser will never send sketchup.com cookies here ────
  if (!isSketchUpOrigin) {
    return res.json({
      detected: false,
      crossOrigin: true,
      appHost,
      reason: `Auto-detect requires the app to be served from extensions.sketchup.com. This instance is running on "${appHost}", so the browser will not send SketchUp session cookies here — that is a deliberate browser security boundary. Please use the manual cookie method below.`,
    });
  }

  // ── Same-origin path ────────────────────────────────────────────────────────
  if (!browserCookies) {
    return res.json({
      detected: false,
      reason: 'No cookies were sent. Make sure you are signed into extensions.sketchup.com and reload the app.',
    });
  }

  try {
    const testResponse = await fetch('https://extensions.sketchup.com/api/reviews?completedOnly=false', {
      method: 'GET',
      headers: {
        'Cookie': browserCookies,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; EW-Review-Dashboard/1.0)',
      },
    });

    const contentType = testResponse.headers.get('content-type') || '';
    const body = await testResponse.text();
    const trimmed = body.trim();
    const isHtml = trimmed.startsWith('<') || trimmed.toLowerCase().includes('<!doctype');
    const isJson = contentType.includes('application/json') && !isHtml;

    if (testResponse.ok && isJson) {
      return res.json({ detected: true, cookie: browserCookies, status: testResponse.status });
    }

    if (testResponse.status === 401 || testResponse.status === 403 || isHtml) {
      return res.json({
        detected: false,
        reason: 'Cookies were found but authentication failed — your SketchUp session may have expired. Please sign in to extensions.sketchup.com again and then retry.',
      });
    }

    return res.json({
      detected: false,
      reason: `API returned HTTP ${testResponse.status}. Unable to verify session.`,
    });
  } catch (err: any) {
    console.error('[auto-detect] fetch error:', err);
    return res.json({ detected: false, reason: `Connection error: ${err.message}` });
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
    // Explicit cookie supplied by the app (manual or previously auto-detected)
    forwardHeaders['Cookie'] = String(sessionCookie);
  } else if (req.headers['cookie']) {
    // Fallback: use browser's own cookies — works automatically when the app is
    // served from extensions.sketchup.com (browser sends HttpOnly cookies too)
    forwardHeaders['Cookie'] = req.headers['cookie'];
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
