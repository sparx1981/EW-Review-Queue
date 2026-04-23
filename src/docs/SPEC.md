# Extension Warehouse Review Dashboard — Full Application Specification

> **Last Updated:** 2026-04-23 | **Changed:** Integrated dynamic API Source URLs with validation in the global config modal; updated probeAndFetch to support user-defined endpoint merging.

## 1. Product Vision
A high-performance, minimalist dashboard builder for SketchUp Extension Warehouse review managers. It provides real-time (or near real-time) visibility into review queues, reviewer velocity, and extension trends through a highly configurable and persistent UI. Now including **Dark Mode** for enhanced visual comfort in low-light environments.

## 2. Architecture Overview
- **Core:** React 19 (Functional Components, Hooks)
- **Asset Pipeline:** Vite 6 with Tailwind CSS 4
- **Persistence Layer:** Firebase Cloud Firestore (NoSQL)
- **Identity:** Firebase Authentication (Google Sign-In)
- **Theming:** Multi-theme support (Light/Dark) with Tailwind `dark:` variants and persistence.
- **Data Engine:** Multi-step API probing with statistical fallback (Sample Data)
- **Visuals:** Chart.js 4 (Bar, Line, Doughnut) with custom theme-aware minimalist styling
- **Orchestration:** SortableJS for bi-directional drag-and-drop layout management

## 3. Toolbars & Controls

### Top Toolbar (Header)
| Component | ID | Behaviour |
| :--- | :--- | :--- |
| **Refresh Settings** | `refresh-btn` | Triggers immediate fetch OR sets Auto-Refresh interval (30m, 1h, 3h, 6h). |
| **Theme Toggle** | `theme-toggle` | Located next to Refresh inside the header. Switches between Light and Dark mode. |
| **Edit Mode** | `edit-toggle` | Toggles between "View" and "Edit" layouts. |
| **User Profile** | `user-menu` | Access Open/Save/Share Dashboards, Config, Data View, and Sign Out. |

### Profile Menu (U)
- **Open Dashboard**: Opens a selector for saved or shared dashboards.
- **Save Dashboard**: Manually persists the current layout and metadata.
- **Share Dashboard**: (Icon: `Share2`) Grant dashboard access to other users by email.
- **Configure**: Opens the Global Configuration Modal. Now includes **API Source URLs** management allowing users to edit, add, and validate JSON endpoints.
- **View Latest Data**: Opens the System Tab for raw record inspection.
- **Color Scheme**: Global selection of primary dashboard color (Blue, Green, Red, Amber, Multi).
- **Sign Out**: Terminates the session.

### Dashboard Tabs
- **Latest Data (System Tab):** A non-persistent, read-only tab generated via "View Latest Data" in the profile menu. Provides a searchable, sortable table of all raw JSON records currently in memory.
- **Rename:** Double-click any active dashboard tab to enter inline edit mode. Press `Enter` or click away to save the new name to Firestore.

### Visualisation Improvements (New)
- **Info Icon (i)**: Top-right corner of cards in view mode. Opens a popup showing the exact filter criteria and first 50 rows of JSON powering the card. Now includes a **Filter Logic Debugger** table showing sequential record counts.
- **Enlarged View**: Clicking on Line, Bar, or Pie charts opens a high-resolution modal version of the graph.
- **Days Visualization**: New bucket-based format showing distribution of items by age (Submitted to Today) or review time (Submitted to Reviewed).

### Latest Data View
- **JSON Configuration Debugger**: New input field to paste a card's JSON configuration. Applying this overrides table filters with the card's specific logic (Dataset, Status, Reviewer, Dates) for validation and debugging.
- **Per-Column Filters**: Every column includes its own dedicated search or filter control.
- **Date Filters**: "Submitted" and "Reviewed" columns now use dynamic date strings for "Today" and "Yesterday" matching (e.g., "2026-04-23") based on server time.
- **Sorting**: Multi-column sorting (Extension, Developer, Status, etc.).
- **Data Sources Button**: Opens a popup listing the actual underlying API endpoints and raw payload metadata.
- **Validation**: Designed to allow users to verify dashboard card data against the raw source records.

### User Interaction
- **Auto-Refresh**: Refresh button now includes options for background cycling every 30m, 1h, 3h, or 6h.
- **Collaboration**: Dashboards can now be shared with other users via email. Shared dashboards appear in the recipient's "Open Dashboard" menu.
- **Save/Persistence**: Global "Save Dashboard" button ensures manual persistence, though layout changes auto-sync to Firestore.

### Configuration Panel Details
Each option includes an **Info Icon (i)** with a tooltip describing its mathematical effect on the chart.
- **Label**: Editable string for the card's header.
- **Format**: KPI, Bar, Line, Pie, Rank (Leaderboard), **Days** (age buckets), and **Table** (record list).
- **Status**: Multi-select allowing users to choose "Approved", "Denied", "Queued", and "Reviewing".
- **Date Submitted Range**: Standard windows (Today, Yesterday, Past 30/60/90/120/365 Days, This Year, **All Time**). Filters strictly on the `dateSubmitted` field.
- **Last Reviewed Range**: Standard windows (Today, Yesterday, Past 30/60/90/120/365 Days, This Year, **All Time**). Filters strictly on the `dateReviewed` field.
- **Listing Pages**: 3-way mode (Include Both, Exclude Listing, Listing Only).
- **Duplicates**: Toggle between "Show All" and "Unique Only". When set to "Unique Only", the system deduplicates records based on `extensionName`, keeping only one instance per extension.
- **Primary Axis Field**: Configurable to 'Submitted' or 'Reviewed' for grouping and X-axis.
- **Days Logic (New)**: Accessible when Format = 'Days'. Supports 'Active Age' vs 'Processing Time' calculations with Min/Max day bounds.
- **Apply**: Button renamed to 'Apply' for cleaner interaction.

### Dashboard Layout Controls (Edit Mode Only)
- **Add Row:** Appends a new 12-column logical row to the bottom of the active dashboard.
- **Add Card:** Appends a new configuration card to a specific row. Defaults to KPI view.
- **Duplicate Card:** (Icon: `Copy`) Located between Settings and Delete icons. Creates an exact copy of the selected card with a "(Copy)" suffix in the title for rapid iteration.
- **Drag Handle:** 6-dot icon allowing vertical row reordering and horizontal card shifting.
- **Remove:** Deletes specific cards or entire rows (requires confirmation if data exists).

## 4. Right Configuration Panel
Accessed by clicking the "Configure" cog on any card in Edit Mode.

| Section | Control | Description |
| :--- | :--- | :--- |
| **Label** | Text Input | Sets the display title of the card. |
| **Format** | Icon Grid | Selects Viz Type: KPI (Value), Bar (Trend), Line (Time), Pie (Mix), Leaderboard (Ranking). |
| **Logic Filters** | Select/Grid | Filters data by Status (Approved, Denied, etc.), Period (Week, Month, Year), or **Deduplication** (Unique Only). |
| **Benchmarks** | Toggle/Grid | Enables comparison against historical windows (Previous Period, Last Month, etc.). |
| **Visual Specs** | Tick Boxes | Toggles Legends and Aggregate Sum overlays (displays total record count at bottom of cards). |

## 5. Data Models (Typescript)

### User Profile
```typescript
interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  lastSeen: any; // Firestore Timestamp
  prefs: {
    excludeListingPages: boolean;
    defaultDashboardId: string | null;
  };
}
```

### Dashboard Configuration
```typescript
export interface Dashboard {
  id: string;
  name: string;
  ownerId: string;
  collaborators: string[]; // email addresses
  createdAt: any;
  updatedAt: any;
  order: number;
  layout: DashboardLayout;
  colorScheme?: 'blue' | 'green' | 'red' | 'amber' | 'multi';
}
```

### Card Configuration
```typescript
export interface CardConfig {
  id: string;
  title: string;
  vizType: 'kpi' | 'bar' | 'line' | 'pie' | 'leaderboard' | 'table' | 'days';
  filters: {
    dataset?: 'active' | 'completed'; // Legacy field
    status: string[];
    submittedPeriod: string;
    reviewedPeriod: string;
    dateField: 'dateSubmitted' | 'dateReviewed';
    listingPageMode: 'both' | 'exclude' | 'only';
    uniqueOnly?: boolean;
    reviewerIds: string[];
    rankField: 'reviewer' | 'developer';
    daysCalculation?: 'active_age' | 'processing_time';
    daysRangeMin?: number | null;
    daysRangeMax?: number | null;
  };
  comparison: {
    enabled: boolean;
    period: string;
  };
  display: {
    showLegend: boolean;
    showTotal: boolean;
    colorScheme: string;
  };
}
```

## 6. API Surface & Scripting
- **`probeAndFetch(authHeader?)`**: Reads custom endpoints from `localStorage`. Sequentially attempts to access URLs. Merges all reviews into a single flat array without deduplication.
- **`validateSourceUrl(url, authHeader?)`**: Functional validator that checks if a URL returns valid JSON and extracts records to verify compatibility.
- **`generateSampleData()`**: Returns a deterministic set of ~500 reviews for functional testing when live API is unreachable.
- **`applyFilters(data, filters)`**: Client-side filtering engine. Filters must pass BOTH `dateSubmitted` AND `dateReviewed` criteria. Includes optional deduplication logic for `extensionName` if `uniqueOnly` is true.
- **`getFilterSteps(data, filters)`**: Used by the logic debugger to show result counts after each sequential filter stage. Now includes a "Unique Extensions Only" step.

## 7. File Structure
- `/src/services/firebase.ts`: Singleton initialization for Auth and Firestore.
- `/src/services/api.ts`: Fetching logic and response sanitization.
- `/src/services/dataStore.ts`: Filter logic and date window resolution.
- `/src/components/Card.tsx`: Master visualization component.
- `/src/components/LatestDataView.tsx`: Dedicated view for raw JSON data inspection and validation.
- `/src/components/DashboardView.tsx`: Grid management and SortableJS integration.
- `/src/components/ConfigPanel.tsx`: The configuration side-drawer for individual cards.
- `/src/components/GlobalConfigModal.tsx`: Centralized authentication and environment configuration.

## 8. Build & Deployment
1. Required Env: `GEMINI_API_KEY`, `APP_URL`.
2. Install: `npm install`.
3. Dev: `npm run dev`.
4. Build: `npm run build` (Outputs to `dist/`).
5. Firebase: Rules must be deployed via `deploy_firebase` tool after structural changes.
