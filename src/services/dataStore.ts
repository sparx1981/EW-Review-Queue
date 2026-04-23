import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { CardConfig, CardFilters, CardComparison, EWReview, SourceConfig } from '../types';

dayjs.extend(isBetween);
dayjs.extend(weekday);
dayjs.extend(weekOfYear);

export function getDateRange(filterOption: string): { start: number; end: number } | null {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();

  const startOfToday    = new Date(y, m, d, 0, 0, 0, 0).getTime();
  const endOfToday      = new Date(y, m, d, 23, 59, 59, 999).getTime();
  const startOfYesterday = new Date(y, m, d - 1, 0, 0, 0, 0).getTime();
  const endOfYesterday  = new Date(y, m, d - 1, 23, 59, 59, 999).getTime();
  const start30         = new Date(y, m, d - 30, 0, 0, 0, 0).getTime();
  const start90         = new Date(y, m, d - 90, 0, 0, 0, 0).getTime();
  const startYear       = new Date(y, 0, 1, 0, 0, 0, 0).getTime();
  const rightNow        = Date.now();

  switch (filterOption) {
    case 'today':      return { start: startOfToday,     end: endOfToday };
    case 'yesterday':  return { start: startOfYesterday, end: endOfYesterday };
    case 'past30':     
    case 'past_30':
    case 'past30days': return { start: start30,           end: rightNow };
    case 'past90':     
    case 'past_90':
    case 'past90days': return { start: start90,           end: rightNow };
    case 'this_year':
    case 'thisYear':   return { start: startYear,         end: rightNow };
    case 'all_time':
    case 'allTime':
    default:           return null;
  }
}

export function applyFilters(data: EWReview[], card: CardConfig, excludeListingGlobal: boolean): EWReview[] {
  const { filters } = card;
  const now = dayjs();
  const listingMode = filters.listingPageMode || (filters.excludeListingPages || excludeListingGlobal ? 'exclude' : 'both');

  const subPeriod = filters.submittedPeriod || (filters as any).period || 'all_time';
  const subRange = getDateRange(subPeriod);
  const revPeriod = filters.reviewedPeriod || 'all_time';
  const revRange = getDateRange(revPeriod);

  const todayEndOfDay = dayjs().endOf('day');

  const filtered = data.filter(item => {
    // 1. Status logic (multi-select)
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      if (!filters.status.includes(item.status)) return false;
    }

    // 2. Listing page logic
    if (listingMode === 'exclude' && item.isListingPage) return false;
    if (listingMode === 'only' && !item.isListingPage) return false;

    // 3. Reviewer logic
    if (filters.reviewerIds.length > 0 && item.reviewerName && !filters.reviewerIds.includes(item.reviewerName)) return false;

    // 4. DATE SUBMITTED filter (always uses dateSubmitted)
    if (subRange !== null) {
      const ts = item.dateSubmitted;
      if (ts == null) return false;
      if (ts < subRange.start || ts > subRange.end) return false;
    }

    // 5. LAST REVIEWED filter (always uses dateReviewed)
    if (revRange !== null) {
      const ts = item.dateReviewed;
      if (ts == null || ts === undefined) return false; // exclude unreviewed records
      if (ts < revRange.start || ts > revRange.end) return false;
    }

    // 6. Days Filter Logic
    if (card.vizType === 'days' || (filters.daysRangeMin !== undefined && filters.daysRangeMin !== null) || (filters.daysRangeMax !== undefined && filters.daysRangeMax !== null)) {
      let days = 0;
      const subDate = item.dateSubmitted ? dayjs(item.dateSubmitted) : null;
      const revDate = item.dateReviewed ? dayjs(item.dateReviewed) : null;

      if (!subDate) return false;

      if (filters.daysCalculation === 'processing_time') {
        if (!revDate) return false; // Exclude if not yet reviewed
        days = revDate.diff(subDate, 'day');
      } else {
        // active_age (Default)
        days = todayEndOfDay.diff(subDate, 'day');
      }

      if (days < 0) days = 0;

      if (filters.daysRangeMin !== null && filters.daysRangeMin !== undefined && days < filters.daysRangeMin) return false;
      if (filters.daysRangeMax !== null && filters.daysRangeMax !== undefined && days > filters.daysRangeMax) return false;
    }

    return true;
  });

  // 7. Deduplication Logic
  if (filters.uniqueOnly) {
    const seen = new Set<string>();
    return filtered.filter(item => {
      if (seen.has(item.extensionName)) return false;
      seen.add(item.extensionName);
      return true;
    });
  }

  return filtered;
}

export interface FilterStep {
  name: string;
  count: number;
  configValue: any;
  isIgnored: boolean;
}

export function getFilterSteps(data: EWReview[], card: CardConfig, excludeListingGlobal: boolean): FilterStep[] {
  const { filters } = card;
  const todayEndOfDay = dayjs().endOf('day');

  const subPeriod = filters.submittedPeriod || (filters as any).period || 'all_time';
  const subRange = getDateRange(subPeriod);
  const revPeriod = filters.reviewedPeriod || 'all_time';
  const revRange = getDateRange(revPeriod);

  const steps: FilterStep[] = [];
  let currentData = [...data];

  // Initial
  steps.push({ name: 'Total Records Supplied', count: currentData.length, configValue: 'Input Stream', isIgnored: false });

  // 1. Listing Pages
  const listingMode = filters.listingPageMode || (filters.excludeListingPages || excludeListingGlobal ? 'exclude' : 'both');
  currentData = currentData.filter(item => {
    if (listingMode === 'exclude' && item.isListingPage) return false;
    if (listingMode === 'only' && !item.isListingPage) return false;
    return true;
  });
  steps.push({ name: 'Listing Pages', count: currentData.length, configValue: listingMode, isIgnored: listingMode === 'both' });

  // 2. Status
  const statusFilter = filters.status || [];
  const statusIgnored = statusFilter.length === 0;
  if (!statusIgnored) {
    currentData = currentData.filter(item => statusFilter.includes(item.status));
  }
  steps.push({ name: 'Status Filter', count: currentData.length, configValue: statusIgnored ? 'null' : statusFilter.join(', '), isIgnored: statusIgnored });

  // 3. Reviewer
  const reviewerFilter = filters.reviewerIds || [];
  const reviewerIgnored = reviewerFilter.length === 0;
  if (!reviewerIgnored) {
    currentData = currentData.filter(item => item.reviewerName && reviewerFilter.includes(item.reviewerName));
  }
  steps.push({ name: 'Reviewer Filter', count: currentData.length, configValue: reviewerIgnored ? 'null' : reviewerFilter.join(', '), isIgnored: reviewerIgnored });

  // 4. Submitted Date
  if (subRange !== null) {
    currentData = currentData.filter(item => {
      const ts = item.dateSubmitted;
      if (ts == null) return false;
      return ts >= subRange.start && ts <= subRange.end;
    });
  }
  steps.push({ name: 'Submission Range', count: currentData.length, configValue: subPeriod, isIgnored: subRange === null });

  // 5. Reviewed Date
  if (revRange !== null) {
    currentData = currentData.filter(item => {
      const ts = item.dateReviewed;
      if (ts == null || ts === undefined) return false;
      return ts >= revRange.start && ts <= revRange.end;
    });
  }
  steps.push({ name: 'Review Range', count: currentData.length, configValue: revPeriod, isIgnored: revRange === null });

  // 6. Days Filter
  const daysIgnored = !(card.vizType === 'days' || filters.daysRangeMin != null || filters.daysRangeMax != null);
  if (!daysIgnored) {
    currentData = currentData.filter(item => {
      let days = 0;
      const subDate = item.dateSubmitted ? dayjs(item.dateSubmitted) : null;
      const revDate = item.dateReviewed ? dayjs(item.dateReviewed) : null;
      if (!subDate) return false;
      if (filters.daysCalculation === 'processing_time') {
        if (!revDate) return false;
        days = revDate.diff(subDate, 'day');
      } else {
        days = todayEndOfDay.diff(subDate, 'day');
      }
      if (days < 0) days = 0;
      if (filters.daysRangeMin != null && days < filters.daysRangeMin) return false;
      if (filters.daysRangeMax != null && days > filters.daysRangeMax) return false;
      return true;
    });
  }
  steps.push({ name: 'Days/Age Logic', count: currentData.length, configValue: daysIgnored ? 'null' : `${filters.daysCalculation || 'active_age'} (${filters.daysRangeMin || 0}-${filters.daysRangeMax || '∞'})`, isIgnored: daysIgnored });

  // 7. Deduplication
  const uniqueIgnored = !filters.uniqueOnly;
  if (!uniqueIgnored) {
    const seen = new Set<string>();
    currentData = currentData.filter(item => {
      if (seen.has(item.extensionName)) return false;
      seen.add(item.extensionName);
      return true;
    });
  }
  steps.push({ name: 'Unique Extensions Only', count: currentData.length, configValue: uniqueIgnored ? 'null' : 'Enabled', isIgnored: uniqueIgnored });

  return steps;
}

export function getSessionCookie(): string {
  return localStorage.getItem('ew_session_cookie') || '';
}

export function setSessionCookie(value: string): void {
  localStorage.setItem('ew_session_cookie', value);
}

export function getSourceUrls(): SourceConfig[] {
  const stored = localStorage.getItem('ew_source_urls');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse source URLs', e);
    }
  }
  return [
    { name: 'Active Reviews', url: '/api/sketchup/reviews?completedOnly=false' },
    { name: 'Completed Reviews', url: '/api/sketchup/reviews?completedOnly=true' },
  ];
}

export function setSourceUrls(urls: SourceConfig[]): void {
  localStorage.setItem('ew_source_urls', JSON.stringify(urls));
}
