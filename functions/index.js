const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const fetch = require("node-fetch");

setGlobalOptions({ region: "us-central1" });

exports.sketchupProxy = onRequest(
  { cors: true },
  async (req, res) => {
    const path = req.path || "/reviews";
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const targetUrl = `https://extensions.sketchup.com/api${path}${query}`;

    const forwardHeaders = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; EW-Review-Dashboard/1.0)",
    };

    // Forward the session cookie passed from the frontend as a custom header
    const sessionCookie = req.headers["x-session-cookie"];
    if (sessionCookie) {
      forwardHeaders["Cookie"] = sessionCookie;
    }

    // Also forward Authorization if present
    const authHeader = req.headers["authorization"];
    if (authHeader) {
      forwardHeaders["Authorization"] = authHeader;
    }

    try {
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        redirect: "follow",
      });

      const contentType = upstream.headers.get("content-type") || "application/json";
      const body = await upstream.text();

      res.set("Content-Type", contentType);
      res.set("X-Proxy-Status", String(upstream.status));
      res.status(upstream.status).send(body);
    } catch (err) {
      console.error("Proxy fetch error:", err);
      res.status(502).json({ error: "Proxy failed", detail: err.message });
    }
  }
);
