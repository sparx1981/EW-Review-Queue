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

export type VizType = 'kpi' | 'bar' | 'line' | 'pie' | 'leaderboard' | 'table';

export interface CardFilters {
  status: string[]; // Changed to array for multi-select
  dateField: 'submittedAt' | 'reviewedAt';
  period: 'today' | 'yesterday' | 'past_30' | 'past_60' | 'past_90' | 'past_120' | 'past_365' | 'this_week' | 'this_month' | 'this_year' | 'all_time' | 'custom';
  customFrom: string | null;
  customTo: string | null;
  excludeListingPages: boolean; // Keep for backward compatibility or remove later
  listingPageMode: 'only' | 'exclude' | 'both'; 
  reviewerIds: string[];
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
  createdAt: any;
  updatedAt: any;
  order: number;
  layout: DashboardLayout;
}

export interface EWReview {
  id: string;
  extensionName: string;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
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
