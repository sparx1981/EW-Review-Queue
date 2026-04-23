import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ── Proxy: forward /api/sketchup/** → extensions.sketchup.com/api/** ──────────
app.use('/api/sketchup', async (req, res) => {
  // Strip the /api/sketchup prefix; keep everything after it including query string
  const upstreamPath = req.url; // e.g. /reviews?completedOnly=false
  const targetUrl = `https://extensions.sketchup.com/api${upstreamPath}`;

  const forwardHeaders = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; EW-Review-Dashboard/1.0)',
  };

  // The frontend sends the session cookie as x-session-cookie (see src/services/api.ts)
  const sessionCookie = req.headers['x-session-cookie'] || req.headers['x-sketchup-cookie'];
  if (sessionCookie) {
    forwardHeaders['Cookie'] = String(sessionCookie);
  }

  // Also forward Authorization if present
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    forwardHeaders['Authorization'] = authHeader;
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      // Do not follow redirects automatically — pass them back to the client
      // so the auth detection logic in the frontend can identify login pages
      redirect: 'follow',
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const body = await upstream.text();

    res.status(upstream.status)
       .set('Content-Type', contentType)
       .set('X-Proxy-Status', String(upstream.status))
       .send(body);
  } catch (err) {
    console.error('[proxy] fetch error:', err);
    res.status(502).json({ error: 'Proxy failed', detail: err.message });
  }
});

// ── Static: serve Vite build output ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback — all unmatched routes return index.html
// In Express v4 we use *, in v5 we might need *all
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`[server] listening on port ${PORT}`);
});
