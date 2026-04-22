import dayjs from 'dayjs';
import { EWReview } from '../types';
import { getSessionCookie } from './dataStore';

const FIELD_MAP: Record<keyof EWReview, string[]> = {
  id: ['id', 'extensionId', 'extension_id'],
  extensionName: ['name', 'extensionName', 'extension_name', 'title'],
  status: ['status', 'reviewStatus', 'review_status', 'state', 'review_queue_status', 'current_status'],
  submittedAt: ['submittedAt', 'submitted_at', 'createdAt', 'created_at', 'dateSubmitted'],
  reviewedAt: ['reviewedAt', 'reviewed_at', 'updatedAt', 'updated_at', 'lastReviewed'],
  reviewerName: ['reviewer.name', 'reviewerName', 'reviewer_name'],
  isListingPage: ['listingPage', 'listing_page', 'isListing', 'is_listing'],
  version: ['version', 'versionNumber', 'version_number'],
  developer: ['developer', 'developerName', 'developer_name', 'author'],
};

const STATUS_MAP: Record<string, string[]> = {
  approved: ['approved', 'accepted', 'published', 'live', 'active', 'passed'],
  denied: ['denied', 'rejected', 'refused', 'declined', 'removed', 'failed'],
  in_queue: ['in_queue', 'inqueue', 'queued', 'pending', 'submitted', 'in queue', 'waiting'],
  in_review: ['in_review', 'inreview', 'reviewing', 'under_review', 'in review', 'under review'],
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

export function normalizeReview(raw: any): EWReview {
  const extensionName = resolveField(raw, FIELD_MAP.extensionName) || 'Unknown Extension';
  const isListingFlag = !!resolveField(raw, FIELD_MAP.isListingPage);
  
  return {
    id: String(resolveField(raw, FIELD_MAP.id) || Math.random().toString(36).substr(2, 9)),
    extensionName,
    status: normalizeStatus(resolveField(raw, FIELD_MAP.status)),
    submittedAt: resolveField(raw, FIELD_MAP.submittedAt),
    reviewedAt: resolveField(raw, FIELD_MAP.reviewedAt),
    reviewerName: resolveField(raw, FIELD_MAP.reviewerName),
    isListingPage: isListingFlag || LISTING_PAGE_REGEX.test(extensionName),
    version: resolveField(raw, FIELD_MAP.version),
    developer: resolveField(raw, FIELD_MAP.developer),
  };
}

export function generateSampleData(days = 400): EWReview[] {
  const data: EWReview[] = [];
  const reviewers = ['Alex K.', 'Priya N.', 'Tom W.', 'Sarah C.', 'Marcus L.'];
  const statuses = ['approved', 'denied', 'in_queue', 'in_review'];
  const weights = [0.6, 0.25, 0.05, 0.1]; // Cumulative: 0.6, 0.85, 0.9, 1.0

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
        submittedAt: date.toISOString(),
        reviewedAt: status !== 'in_queue' ? date.add(2, 'hour').toISOString() : null,
        reviewerName: status !== 'in_queue' ? reviewer : null,
        isListingPage: isListing,
        version: '1.0.' + v,
        developer: 'Dev ' + (v % 5),
      });
    }
  }
  return data;
}

export async function checkSession(authHeader?: string): Promise<boolean> {
  const sessionCookie = getSessionCookie();
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };
  
  if (sessionCookie) {
    headers['x-sketchup-cookie'] = sessionCookie;
  }

  if (authHeader) {
    if (authHeader.toLowerCase().startsWith('cookie:') || authHeader.includes('=')) {
      headers['Cookie'] = authHeader.replace(/^cookie:\s*/i, '');
    } else {
      headers['Authorization'] = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
    }
  }

  try {
    const response = await fetch('/api/sketchup/reviews?completedOnly=false', { 
      method: 'HEAD',
      headers,
      credentials: 'include' 
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function probeAndFetch(authHeader?: string): Promise<{ data: EWReview[], isSample: boolean, rawPayload?: any }> {
  const sessionCookie = getSessionCookie();
  const sources = [
    { name: 'Active Reviews', url: '/api/sketchup/reviews?completedOnly=false' },
    { name: 'Completed Reviews', url: '/api/sketchup/reviews?completedOnly=true' }
  ];

  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };

  if (sessionCookie) {
    headers['x-sketchup-cookie'] = sessionCookie;
  }

  if (authHeader) {
    if (authHeader.toLowerCase().startsWith('cookie:') || authHeader.includes('=')) {
      headers['Cookie'] = authHeader.replace(/^cookie:\s*/i, '');
    } else {
      headers['Authorization'] = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
    }
  }

  let rawPayload: any = { sources: [] };
  let errorLogs: string[] = [];
  let combinedData: EWReview[] = [];

  try {
    const results = await Promise.all(sources.map(async (source) => {
      try {
        const response = await fetch(source.url, { 
          headers,
          credentials: 'include' 
        });
        if (response.ok) {
          const json = await response.json();
          rawPayload.sources.push({ 
            name: source.name, 
            url: source.url, 
            status: 'success', 
            count: Array.isArray(json) ? json.length : 'unknown', 
            data: json 
          });
          if (Array.isArray(json)) {
            return json.map(normalizeReview);
          }
        }
        errorLogs.push(`${source.name}: ${response.status} ${response.statusText}`);
        rawPayload.sources.push({ name: source.name, url: source.url, status: 'failed', error: `${response.status} ${response.statusText}` });
        return [];
      } catch (e) {
        errorLogs.push(`${source.name}: Network error`);
        rawPayload.sources.push({ name: source.name, url: source.url, status: 'error', error: 'Network error or blocked (CORS)' });
        return [];
      }
    }));

    combinedData = results.flat();

    // If we got ANY data from live sources, we're not in sample mode
    if (combinedData.length > 0) {
      return {
        data: combinedData,
        isSample: false,
        rawPayload
      };
    }
  } catch (e) {
    console.warn("API Probe failed", e);
  }

  // Fallback to sample data if no live data reached us
  const sample = generateSampleData();
  return { 
    data: sample, 
    isSample: true, 
    rawPayload: { 
      note: "FALLBACK: Connection to Extension Warehouse API failed. Combined results from new sources returned 0 records.", 
      probes: errorLogs,
      sources: rawPayload.sources,
      data: sample 
    } 
  };
}
