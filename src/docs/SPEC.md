# Extension Warehouse Review Dashboard — Full Application Specification

> **Last Updated:** 2026-04-22 | **Changed:** Moved "Global Authentication" settings (Session Cookie & Bearer Token) from the card config drawer to a new "Configure" option within the User Profile menu for centralized management.

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

### Left/Top Toolbar (Main Navigation)
| Tool | ID | Shortcut | Description |
| :--- | :--- | :--- | :--- |
| **Refresh** | `refresh-btn` | `R` | Triggers a fresh fetch from the Extension Warehouse API endpoints. |
| **Edit Mode** | `edit-toggle` | `E` | Toggles between "View" and "Edit" layouts. Enables drag handles and modification controls. |
| **Help** | `help-btn` | `?` | Opens the Documentation and Release Notes modal. |
| **Theme Toggle**| `theme-toggle` | `T` | Switches between Light and Dark mode globally. Preference is saved to local storage. |
| **Export PDF** | `export-pdf` | `P` | Generates a print-ready PDF layout. Includes fallback guidance if blocked by iframe sandbox. |
| **Share** | `share-dashboard` | `S` | Opens sharing dialog to grant viewer access to specific emails (Prototypes as alert). |
| **User Profile** | `user-menu` | `U` | Accesses account details, email, EW Session status, **Configure (Authentication)**, and Sign Out command. |

### Dashboard Tabs
- **Rename:** Double-click any active dashboard tab to enter inline edit mode. Press `Enter` or click away to save the new name to Firestore.

### Global Authentication (New)
Accessible via **User Profile > Configure**. This provides a centralized interface for bypassing API authorization hurdles:
- **Bearer Token**: Input for API tokens or temporary authorization IDs.
- **Session Cookie**: A multi-line textarea for the full 'Cookie' header captured from a browser. Values are relayed via a custom `x-sketchup-cookie` header to the local proxy.

### Configuration Panel Details
Each option includes an **Info Icon (i)** with a tooltip describing its mathematical effect on the chart.
- **Label**: Editable string for the card's header.
- **Format**: KPI, Bar, Line, Pie, Rank (Leaderboard), and **Table** (record list).
- **Status**: Multi-select gate (Approved, Denied, Queued, Reviewing).
- **Date Range**: Standard windows (Today, Yesterday, Past 30/60/90/120/365 Days, This Year, **All Time**). Selecting **All Time** bypasses date filtering completely.
- **Listing Pages**: 3-way mode (Include Both, Exclude Listing, Listing Only).
- **Benchmarks**: Toggle for comparison periods.
- **Visual Specs**: Legend (renamed from Legendary) and Aggregate Sum. Both include info tooltips.

### Dashboard Layout Controls (Edit Mode Only)
- **Add Row:** Appends a new 12-column logical row to the bottom of the active dashboard.
- **Add Card:** Appends a new configuration card to a specific row. Defaults to KPI view.
- **Drag Handle:** 6-dot icon allowing vertical row reordering and horizontal card shifting.
- **Remove:** Deletes specific cards or entire rows (requires confirmation if data exists).

## 4. Right Configuration Panel
Accessed by clicking the "Configure" cog on any card in Edit Mode.

| Section | Control | Description |
| :--- | :--- | :--- |
| **Label** | Text Input | Sets the display title of the card. |
| **Format** | Icon Grid | Selects Viz Type: KPI (Value), Bar (Trend), Line (Time), Pie (Mix), Leaderboard (Ranking). |
| **Logic Filters** | Select/Grid | Filters data by Status (Approved, Denied, etc.), Period (Week, Month, Year), or Strict Mode. |
| **Benchmarks** | Toggle/Grid | Enables comparison against historical windows (Previous Period, Last Month, etc.). |
| **Visual Specs** | Tick Boxes | Toggles Legends and Aggregate Total Sum overlays. |

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
interface Dashboard {
  id: string;
  name: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
  order: number;
  layout: {
    rows: Array<{
      id: string;
      cards: Array<CardConfig>;
    }>;
  };
}
```

### Card Configuration
```typescript
interface CardConfig {
  id: string;
  title: string;
  vizType: 'kpi' | 'bar' | 'line' | 'pie' | 'leaderboard' | 'table';
  filters: {
    status: string[]; // Multi-select array
    period: string; // Range options (Today, Past 30, etc.)
    listingPageMode: 'both' | 'exclude' | 'only';
    reviewerIds: string[];
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
The application uses a "Probe and Fallback" strategy to handle the varying accessibility of Extension Warehouse internal endpoints.

- **`probeAndFetch(urls: string[])`**: Sequentially attempts to access URLs. If first fails (401/403), it moves down the chain.
- **`generateSampleData()`**: Returns a deterministic set of ~500 reviews for functional testing when live API is unreachable.
- **`applyFilters(data, filters)`**: Client-side filtering engine using `dayjs` for sub-second intersection calculations.

## 7. File Structure
- `/src/services/firebase.ts`: Singleton initialization for Auth and Firestore.
- `/src/services/api.ts`: Fetching logic and response sanitization.
- `/src/services/dataStore.ts`: Filter logic and date window resolution.
- `/src/components/Card.tsx`: Master visualization component.
- `/src/components/DashboardView.tsx`: Grid management and SortableJS integration.
- `/src/components/ConfigPanel.tsx`: The configuration side-drawer for individual cards.
- `/src/components/GlobalConfigModal.tsx`: Centralized authentication and environment configuration.

## 8. Build & Deployment
1. Required Env: `GEMINI_API_KEY`, `APP_URL`.
2. Install: `npm install`.
3. Dev: `npm run dev`.
4. Build: `npm run build` (Outputs to `dist/`).
5. Firebase: Rules must be deployed via `deploy_firebase` tool after structural changes.
