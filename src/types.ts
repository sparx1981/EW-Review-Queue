/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  displayName: string | null;
  email: string | null;
  lastSeen: any;
  prefs: {
    excludeListingPages: boolean;
    defaultDashboardId: string | null;
    theme: 'light' | 'dark' | 'system';
  };
}

export type VizType = 'kpi' | 'bar' | 'line' | 'pie' | 'leaderboard' | 'table' | 'days';

export interface CardFilters {
  status: string[];
  submittedPeriod: 'today' | 'yesterday' | 'past_30' | 'past_60' | 'past_90' | 'past_120' | 'past_365' | 'this_week' | 'this_month' | 'this_year' | 'all_time' | 'custom';
  submittedFrom: string | null;
  submittedTo: string | null;
  reviewedPeriod: 'today' | 'yesterday' | 'past_30' | 'past_60' | 'past_90' | 'past_120' | 'past_365' | 'this_week' | 'this_month' | 'this_year' | 'all_time' | 'custom';
  reviewedFrom: string | null;
  reviewedTo: string | null;
  dateField: 'dateSubmitted' | 'dateReviewed'; // The primary field used for charts/grouping
  listingPageMode: 'only' | 'exclude' | 'both'; 
  reviewerIds: string[];
  rankField: 'reviewer' | 'developer';
  uniqueOnly?: boolean;
  
  // Days format specific
  daysCalculation?: 'active_age' | 'processing_time';
  daysRangeMin?: number | null;
  daysRangeMax?: number | null;

  // Legacy fields (optional migration)
  dataset?: 'active' | 'completed';
  period?: string;
  customFrom?: string | null;
  customTo?: string | null;
  excludeListingPages?: boolean;
}

export interface CardComparison {
  enabled: boolean;
  period: 'previous_period' | 'last_week' | 'last_month' | 'last_year';
}

export interface CardDisplay {
  showTotal: boolean;
  colorScheme: 'blue' | 'green' | 'red' | 'amber' | 'multi';
  groupBy: 'day' | 'week' | 'reviewer' | 'status' | 'none';
  showLegend: boolean;
  showDelta: boolean;
}

export interface CardConfig {
  id: string;
  title: string;
  vizType: VizType;
  filters: CardFilters;
  comparison: CardComparison;
  display: CardDisplay;
}

export interface DashboardRow {
  id: string;
  cards: CardConfig[];
}

export interface DashboardLayout {
  rows: DashboardRow[];
}

export interface Dashboard {
  id: string;
  name: string;
  ownerId: string;
  collaborators: string[]; // array of emails
  createdAt: any;
  updatedAt: any;
  order: number;
  layout: DashboardLayout;
  colorScheme?: 'blue' | 'green' | 'red' | 'amber' | 'multi';
}

export interface SourceConfig {
  name: string;
  url: string;
}

export interface EWReview {
  id: string;
  extensionName: string;
  status: string;
  dateSubmitted: number; // Always present Unix timestamp in ms
  dateReviewed: number | null; // Not always present
  reviewerName: string | null;
  isListingPage: boolean;
  version: string | null;
  developer: string | null;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  };
}
