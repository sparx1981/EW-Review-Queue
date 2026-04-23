import dayjs from 'dayjs';
import { EWReview, SourceConfig } from '../types';
import { getSessionCookie, getSourceUrls } from './dataStore';

const FIELD_MAP: Record<keyof EWReview, string[]> = {
  id: ['id', 'extensionId', 'extension_id'],
  extensionName: ['extension.title', 'name', 'extensionName', 'extension_name', 'title'],
  status: ['status', 'reviewStatus', 'review_status', 'state', 'review_queue_status', 'current_status'],
  dateSubmitted: ['submittedAt', 'submitted_at', 'createdAt', 'created_at', 'dateSubmitted'],
  dateReviewed: ['reviewedAt', 'reviewed_at', 'updatedAt', 'updated_at', 'lastReviewed', 'dateReviewed'],
  reviewerName: ['reviewer.name', 'reviewer', 'reviewerName', 'reviewer_name'],
  isListingPage: ['listingPage', 'listing_page', 'isListing', 'is_listing'],
  version: ['version', 'versionNumber', 'version_number'],
  developer: ['developer', 'developerName', 'developer_name', 'author'],
};

const STATUS_MAP: Record<string, string[]> = {
  approved: ['approved', 'accepted', 'published', 'live', 'active', 'passed', 'complete', 'completed', 'verified', 'passed'],
  denied: ['denied', 'rejected', 'refused', 'declined', 'removed', 'failed', 'vetoed', 'returned', 'rejected'],
  in_queue: ['in_queue', 'inqueue', 'queued', 'pending', 'submitted', 'in queue', 'waiting', 'unassigned'],
  in_review: ['in_review', 'inreview', 'reviewing', 'under_review', 'in review', 'under review', 'processing'],
};

const LISTING_PAGE_REGEX = /^(listing|showcase|collection|bundle)/i;

function resolveField(obj: any, keys: string[]): any {
  for (const key of keys) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = obj;
      for (const part of parts) {
        current = current?.[part];
      }
      if (current !== undefined && current !== null) return current;
    } else {
      if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
  }
  return null;
}

function normalizeStatus(status: any): string {
  if (!status) return 'unknown';
  const s = String(status).toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(STATUS_MAP)) {
    if (aliases.includes(s)) return canonical;
  }
  return s;
}

export function extractRecordsFromResponse(json: any): any[] {
  if (!json) return [];

  // Bare array
  if (Array.isArray(json)) return json;

  // Try every common wrapper key
  const wrapperKeys = ['data', 'reviews', 'items', 'results', 'records', 'queue', 'extensions', 'submissions', 'list', 'payload'];
  for (const key of wrapperKeys) {
    if (Array.isArray(json[key]) && json[key].length >= 0) {
      return json[key];
    }
  }

  // Look for any top-level key whose value is a non-empty array
  for (const key of Object.keys(json)) {
    if (Array.isArray(json[key]) && json[key].length > 0) {
      console.info(`[EW] Found reviews array under unexpected key: "${key}"`);
      return json[key];
    }
  }

  // Single object that looks like one review record — wrap it
  if (typeof json === 'object' && (json.id || json.extensionId || json.status || json.extension_id)) {
    return [json];
  }

  return [];
}

export function normalizeReview(raw: any): EWReview {
  const extensionName = resolveField(raw, FIELD_MAP.extensionName) || 'Unknown Extension';
  const isListingFlag = !!resolveField(raw, FIELD_MAP.isListingPage);
  
  const subRaw = resolveField(raw, FIELD_MAP.dateSubmitted);
  const revRaw = resolveField(raw, FIELD_MAP.dateReviewed);
  
  // Convert to number (Unix Millisecond Timestamp)
  const dateSubmitted = subRaw ? (typeof subRaw === 'number' ? subRaw : dayjs(subRaw).valueOf()) : Date.now();
  const dateReviewed = revRaw ? (typeof revRaw === 'number' ? revRaw : dayjs(revRaw).valueOf()) : null;

  return {
    id: String(resolveField(raw, FIELD_MAP.id) || Math.random().toString(36).substr(2, 9)),
    extensionName,
    status: normalizeStatus(resolveField(raw, FIELD_MAP.status)),
    dateSubmitted,
    dateReviewed,
    reviewerName: resolveField(raw, FIELD_MAP.reviewerName),
    isListingPage: isListingFlag || LISTING_PAGE_REGEX.test(extensionName),
    version: resolveField(raw, FIELD_MAP.version),
    developer: resolveField(raw, FIELD_MAP.developer),
  };
}

// Build the headers for every API request. The custom header x-session-cookie
// is read by both the Vite dev proxy and the Firebase Cloud Function proxy
// and converted into a real Cookie header on the server side.
function buildHeaders(authHeader?: string): Record<string, string> {
  const sessionCookie = getSessionCookie();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (sessionCookie) {
    headers['x-session-cookie'] = sessionCookie;
  }

  if (authHeader && authHeader.trim()) {
    const trimmed = authHeader.trim();
    if (trimmed.toLowerCase().startsWith('cookie:') || trimmed.includes('=')) {
      // Treat as cookie string — also store as x-session-cookie
      headers['x-session-cookie'] = trimmed.replace(/^cookie:\s*/i, '');
    } else {
      headers['Authorization'] = trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
    }
  }

  return headers;
}

export interface ConnectionTestResult {
  ok: boolean;
  status: number | null;
  statusText: string;
  hasCookie: boolean;
  errorType: 'none' | 'cors' | 'auth' | 'network' | 'server' | 'wrong_cookie';
  detail: string;
  rawResponse?: string;
}

export async function testApiConnection(authHeader?: string): Promise<ConnectionTestResult> {
  const hasCookie = !!getSessionCookie() || !!authHeader?.trim();
  const headers = buildHeaders(authHeader);
  const sources = getSourceUrls();
  const testUrl = sources.length > 0 ? sources[0].url : '/api/sketchup/reviews?completedOnly=false';

  if (!hasCookie) {
    return { ok: false, status: null, statusText: 'No cookie', hasCookie: false, errorType: 'auth', detail: 'No session cookie provided. Paste your cookie from the DevTools Network tab.' };
  }

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, statusText: response.statusText, hasCookie, errorType: 'auth', detail: `Authentication failed (${response.status}). Your session cookie is expired or incorrect.` };
    }

    if (!response.ok) {
      return { ok: false, status: response.status, statusText: response.statusText, hasCookie, errorType: 'server', detail: `Server returned ${response.status} ${response.statusText}.` };
    }

    // Read the response body as text first
    const rawText = await response.text();
    const trimmedRaw = rawText.trim();

    // Check if it's actually HTML (login redirect / not authenticated)
    const isHtml = trimmedRaw.startsWith('<') || trimmedRaw.toLowerCase().includes('<!doctype') || trimmedRaw.toLowerCase().includes('<html');
    if (isHtml) {
      return {
        ok: false,
        status: response.status,
        statusText: 'HTML response (not JSON)',
        hasCookie,
        errorType: 'wrong_cookie',
        detail: 'The server returned a login/redirect page instead of data. Your cookie is valid in format but does not contain the authentication token — you are likely copying tracking cookies instead of the session cookie. See the guide below.',
        rawResponse: trimmedRaw.slice(0, 400),
      };
    }

    // Try to parse as JSON
    let json: any;
    try {
      json = JSON.parse(rawText);
    } catch {
      return {
        ok: false,
        status: response.status,
        statusText: 'Invalid JSON',
        hasCookie,
        errorType: 'server',
        detail: 'Server responded but the content is not valid JSON.',
        rawResponse: trimmedRaw.slice(0, 400),
      };
    }

    const records = extractRecordsFromResponse(json);
    if (records.length > 0) {
      return { ok: true, status: response.status, statusText: 'Connected', hasCookie, errorType: 'none', detail: `Connected — ${records.length} review records found.` };
    }

    return { ok: true, status: response.status, statusText: 'Connected (empty)', hasCookie, errorType: 'none', detail: 'Connected successfully. The active review queue appears to be empty.' };

  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('CORS') || msg.includes('cross-origin') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return { ok: false, status: null, statusText: 'Network Error', hasCookie, errorType: 'cors', detail: 'Could not reach the proxy server. Make sure the app is running correctly.' };
    }
    return { ok: false, status: null, statusText: 'Network Error', hasCookie, errorType: 'network', detail: msg };
  }
}

export async function validateSourceUrl(url: string, authHeader?: string): Promise<ConnectionTestResult> {
  const headers = buildHeaders(authHeader);

  try {
    const response = await fetch(url, { headers });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, statusText: response.statusText, hasCookie: true, errorType: 'auth', detail: 'Authentication failed. Check your cookie.' };
    }

    if (!response.ok) {
       return { ok: false, status: response.status, statusText: response.statusText, hasCookie: true, errorType: 'server', detail: `Server returned ${response.status} ${response.statusText}.` };
    }

    const rawText = await response.text();
    const trimmedRaw = rawText.trim();

    const isHtml = trimmedRaw.startsWith('<') || trimmedRaw.toLowerCase().includes('<!doctype') || trimmedRaw.toLowerCase().includes('<html');
    if (isHtml) {
      return { ok: false, status: response.status, statusText: 'HTML response', hasCookie: true, errorType: 'wrong_cookie', detail: 'Endpoint returned HTML instead of JSON. Ensure you are copying the correct URL and have a valid session.', rawResponse: trimmedRaw.slice(0, 400) };
    }

    try {
      const json = JSON.parse(trimmedRaw);
      const records = extractRecordsFromResponse(json);
      return { ok: true, status: response.status, statusText: 'Valid', hasCookie: true, errorType: 'none', detail: `Success! ${records.length} records found.` };
    } catch {
       return { ok: false, status: response.status, statusText: 'Invalid JSON', hasCookie: true, errorType: 'server', detail: 'Response is not valid JSON.', rawResponse: trimmedRaw.slice(0, 400) };
    }
  } catch (e: any) {
    return { ok: false, status: null, statusText: 'Network Error', hasCookie: true, errorType: 'network', detail: e?.message || 'Failed to fetch the URL.' };
  }
}

export function generateSampleData(days = 400): EWReview[] {
  const data: EWReview[] = [];
  const reviewers = ['Alex K.', 'Priya N.', 'Tom W.', 'Sarah C.', 'Marcus L.'];

  for (let i = 0; i < days; i++) {
    const date = dayjs().subtract(i, 'day');
    const isWeekend = date.day() === 0 || date.day() === 6;
    const volume = isWeekend ? Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 6);

    for (let v = 0; v < volume; v++) {
      const randStatus = Math.random();
      let status = 'approved';
      if (randStatus > 0.9) status = 'in_review';
      else if (randStatus > 0.85) status = 'in_queue';
      else if (randStatus > 0.6) status = 'denied';

      const reviewer = reviewers[Math.floor(Math.random() * reviewers.length)];
      const id = Math.random().toString(36).substr(2, 9);
      const isListing = Math.random() < 0.15;

      data.push({
        id,
        extensionName: isListing ? `Collection ${v}` : `Extension ${v}-${i}`,
        status,
        dateSubmitted: date.valueOf(),
        dateReviewed: status !== 'in_queue' ? date.add(2, 'hour').valueOf() : null,
        reviewerName: status !== 'in_queue' ? reviewer : null,
        isListingPage: isListing,
        version: '1.0.' + v,
        developer: 'Dev ' + (v % 5),
      });
    }
  }
  return data;
}

export async function probeAndFetch(authHeader?: string): Promise<{ data: EWReview[], isSample: boolean, rawPayload?: any }> {
  const headers = buildHeaders(authHeader);
  const sources = getSourceUrls();

  let rawPayload: any = { sources: [] };
  const errorLogs: string[] = [];
  let combinedData: EWReview[] = [];

  try {
    const results = await Promise.all(sources.map(async (source) => {
      try {
        const response = await fetch(source.url, { headers });

        if (response.ok) {
          const json = await response.json();
          const records = extractRecordsFromResponse(json);
          
          rawPayload.sources.push({
            name: source.name,
            url: source.url,
            status: 'success',
            rawResponseType: Array.isArray(json) ? 'array' : (typeof json === 'object' ? `object(keys:${Object.keys(json).join(',')})` : typeof json),
            recordsExtracted: records.length,
            firstRecord: records[0] ?? null,
            data: json,
          });

          return records.map(normalizeReview);
        }

        const errorDetail = `${source.name}: HTTP ${response.status} ${response.statusText}`;
        errorLogs.push(errorDetail);
        rawPayload.sources.push({ name: source.name, url: source.url, status: 'failed', error: errorDetail });
        return [];
      } catch (e: any) {
        const errorDetail = `${source.name}: ${e?.message || 'Network error'}`;
        errorLogs.push(errorDetail);
        rawPayload.sources.push({ name: source.name, url: source.url, status: 'error', error: errorDetail });
        return [];
      }
    }));

    combinedData = results.flat();

    // Deduplicate records by ID
    const seenIds = new Set<string>();
    combinedData = combinedData.filter(item => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });

    // If at least one source responded with HTTP 200 (even an empty array), treat this as live data
    const anySourceSucceeded = rawPayload.sources.some((s: any) => s.status === 'success');
    if (anySourceSucceeded) {
      return { data: combinedData, isSample: false, rawPayload };
    }
  } catch (e) {
    console.warn('API probe failed', e);
  }

  const sample = generateSampleData();
  return {
    data: sample,
    isSample: true,
    rawPayload: {
      note: 'FALLBACK: Could not fetch live data. Showing sample data.',
      errors: errorLogs,
      sources: rawPayload.sources,
    },
  };
}
