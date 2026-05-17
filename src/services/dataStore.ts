import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { CardConfig, CardFilters, CardComparison, EWReview, SourceConfig } from '../types';

dayjs.extend(isBetween);
dayjs.extend(weekday);
dayjs.extend(weekOfYear);

export function getDateRange(filterOption: string): { start: number; end: number } | null {
  const now = dayjs();
  
  switch (filterOption) {
    case 'today':
      return { 
        start: now.startOf('day').valueOf(), 
        end: now.endOf('day').valueOf() 
      };
    case 'yesterday':
      return { 
        start: now.subtract(1, 'day').startOf('day').valueOf(), 
        end: now.subtract(1, 'day').endOf('day').valueOf() 
      };
    case 'past_7':
    case 'past7':
      return { 
        start: now.subtract(7, 'days').startOf('day').valueOf(), 
        end: now.valueOf() 
      };
    case 'past_30':
    case 'past30':
      return { 
        start: now.subtract(30, 'days').startOf('day').valueOf(), 
        end: now.valueOf() 
      };
    case 'past_60':
      return { 
        start: now.subtract(60, 'days').startOf('day').valueOf(), 
        end: now.valueOf() 
      };
    case 'past_90':
    case 'past90':
      return { 
        start: now.subtract(90, 'days').startOf('day').valueOf(), 
        end: now.valueOf() 
      };
    case 'past_120':
      return { 
        start: now.subtract(120, 'days').startOf('day').valueOf(), 
        end: now.valueOf() 
      };
    case 'past_365':
      return { 
        start: now.subtract(365, 'days').startOf('day').valueOf(), 
        end: now.valueOf() 
      };
    case 'this_week':
      return { 
        start: now.startOf('week').valueOf(), 
        end: now.valueOf() 
      };
    case 'this_month':
      return { 
        start: now.startOf('month').valueOf(), 
        end: now.valueOf() 
      };
    case 'this_year':
      return { 
        start: now.startOf('year').valueOf(), 
        end: now.valueOf() 
      };
    default:
      return null;
  }
}

export function getPreviousDateRange(filterOption: string, comparisonMode: 'previous_period' | 'last_week' | 'last_month' | 'last_year' = 'previous_period'): { start: number; end: number } | null {
  const current = getDateRange(filterOption);
  if (!current) return null;

  if (comparisonMode === 'last_year') {
    return {
      start: dayjs(current.start).subtract(1, 'year').valueOf(),
      end: dayjs(current.end).subtract(1, 'year').valueOf()
    };
  }

  if (comparisonMode === 'last_month') {
    return {
      start: dayjs(current.start).subtract(1, 'month').valueOf(),
      end: dayjs(current.end).subtract(1, 'month').valueOf()
    };
  }

  if (comparisonMode === 'last_week') {
    return {
      start: dayjs(current.start).subtract(1, 'week').valueOf(),
      end: dayjs(current.end).subtract(1, 'week').valueOf()
    };
  }

  // default: previous_period
  const duration = current.end - current.start;
  return {
    start: current.start - duration - 1,
    end: current.start - 1
  };
}

export function applyFilters(data: EWReview[], card: CardConfig, excludeListingGlobal: boolean, options?: { overrideSubRange?: { start: number; end: number } | null; overrideRevRange?: { start: number; end: number } | null }): EWReview[] {
  const { filters } = card;
  const now = dayjs();
  const listingMode = filters.listingPageMode || (filters.excludeListingPages || excludeListingGlobal ? 'exclude' : 'both');

  const subPeriod = filters.submittedPeriod || (filters as any).period || 'all_time';
  const subRange = options?.overrideSubRange !== undefined ? options.overrideSubRange : getDateRange(subPeriod);
  const revPeriod = filters.reviewedPeriod || 'all_time';
  const revRange = options?.overrideRevRange !== undefined ? options.overrideRevRange : getDateRange(revPeriod);

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
