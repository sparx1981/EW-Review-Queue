import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { CardConfig, CardFilters, CardComparison, EWReview } from '../types';

dayjs.extend(isBetween);
dayjs.extend(weekday);
dayjs.extend(weekOfYear);

export interface DateWindow {
  from: dayjs.Dayjs;
  to: dayjs.Dayjs;
}

export function resolveWindows(filters: CardFilters, comparison: CardComparison): { current: DateWindow; previous: DateWindow | null } {
  let from: dayjs.Dayjs;
  let to = dayjs().endOf('day');

  switch (filters.period) {
    case 'today':
      from = dayjs().startOf('day');
      break;
    case 'yesterday':
      from = dayjs().subtract(1, 'day').startOf('day');
      to = dayjs().subtract(1, 'day').endOf('day');
      break;
    case 'past_30':
      from = dayjs().subtract(30, 'day').startOf('day');
      break;
    case 'past_60':
      from = dayjs().subtract(60, 'day').startOf('day');
      break;
    case 'past_90':
      from = dayjs().subtract(90, 'day').startOf('day');
      break;
    case 'past_120':
      from = dayjs().subtract(120, 'day').startOf('day');
      break;
    case 'past_365':
      from = dayjs().subtract(365, 'day').startOf('day');
      break;
    case 'this_week':
      from = dayjs().startOf('week');
      break;
    case 'this_month':
      from = dayjs().startOf('month');
      break;
    case 'this_year':
      from = dayjs().startOf('year');
      break;
    case 'all_time':
      from = dayjs(0); // Epoch start
      break;
    case 'custom':
      from = filters.customFrom ? dayjs(filters.customFrom) : dayjs().startOf('year');
      to = filters.customTo ? dayjs(filters.customTo).endOf('day') : dayjs();
      break;
    default:
      from = dayjs().startOf('month');
  }

  const current: DateWindow = { from, to };
  let previous: DateWindow | null = null;

  if (comparison.enabled) {
    let pFrom: dayjs.Dayjs;
    let pTo: dayjs.Dayjs;

    switch (comparison.period) {
      case 'last_week':
        pFrom = from.subtract(1, 'week');
        pTo = to.subtract(1, 'week');
        break;
      case 'last_month':
        pFrom = from.subtract(1, 'month');
        pTo = to.subtract(1, 'month');
        break;
      case 'last_year':
        pFrom = from.subtract(1, 'year');
        pTo = to.subtract(1, 'year');
        break;
      case 'previous_period':
      default:
        const diff = to.diff(from);
        pTo = from.subtract(1, 'millisecond');
        pFrom = pTo.subtract(diff, 'millisecond');
        break;
    }
    previous = { from: pFrom, to: pTo };
  }

  return { current, previous };
}

export function applyFilters(data: EWReview[], card: CardConfig, window: DateWindow, excludeListingGlobal: boolean): EWReview[] {
  const { filters } = card;
  const listingMode = filters.listingPageMode || (filters.excludeListingPages || excludeListingGlobal ? 'exclude' : 'both');

  return data.filter(item => {
    // Listing page logic
    if (listingMode === 'exclude' && item.isListingPage) return false;
    if (listingMode === 'only' && !item.isListingPage) return false;

    // Status logic (multi-select)
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      if (!filters.status.includes(item.status)) return false;
    } else if (filters.status && typeof filters.status === 'string' && filters.status !== 'all') {
      if (item.status !== filters.status) return false;
    }

    // Reviewer logic
    if (filters.reviewerIds.length > 0 && item.reviewerName && !filters.reviewerIds.includes(item.reviewerName)) return false;

    // Date filter
    if (filters.period === 'all_time') return true;
    
    const dateStr = item[filters.dateField];
    if (!dateStr) return false;
    const date = dayjs(dateStr);
    return date.isBetween(window.from, window.to, null, '[]');
  });
}

export function getSessionCookie(): string {
  return localStorage.getItem('ew_session_cookie') || '';
}

export function setSessionCookie(value: string): void {
  localStorage.setItem('ew_session_cookie', value);
}
