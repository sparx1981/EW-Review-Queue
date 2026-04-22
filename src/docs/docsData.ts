export const userDocumentation = [
  {
    id: 'intro',
    title: 'Introduction',
    content: 'Welcome to the Extension Warehouse Review Dashboard. This tool allows you to build custom analytics views of review data.'
  },
  {
    id: 'auth',
    title: 'Authentication',
    content: 'Sign in with your Google account to save your dashboard layouts. Layouts are stored in Firestore for each user.'
  },
  {
    id: 'edit-mode',
    title: 'Building Dashboards',
    content: 'Switch to **Edit Mode** using the button in the header. In Edit Mode, you can:\n- **Add Cards**: Click the "+" button in any row.\n- **Add Rows**: Click the "Add Row" button at the bottom.\n- **Drag & Drop**: Use the handle (⠿) on the top left of any card to move it within or between rows.\n- **Configure Cards**: Click the gear icon (⚙) on a card to open the configuration panel.'
  },
  {
    id: 'refresh',
    title: 'Data Refresh',
    content: 'Click the refresh icon (↻) in the header to pull the latest data from the Extension Warehouse API. If the API is unreachable, the dashboard will fall back to using high-quality sample data for demonstration.'
  },
  {
    id: 'session-detection',
    title: 'Session Detection',
    content: 'Open the user profile menu (top right) to see the status of your Extension Warehouse API session. If no session is detected, ensure you are logged into extensions.sketchup.com in the same browser session.'
  },
  {
    id: 'data-visibility',
    title: 'Troubleshooting Data Visibility',
    content: 'If your dashboard is not showing expected data (e.g. recent "In Queue" or "In Review" records):\n1. **Check Date Range**: Ensure the "Date Range" in the card configuration is wide enough (e.g., "Past 30 Days") or select **"All Time"** to bypass date filtering.\n2. **Check Status Filters**: Ensure you have selected the correct statuses in the configuration panel. Selecting none acts as "All".\n3. **Placeholder Data**: If you see a "Placeholder Data Active" badge, the app is using sample data because your SketchUp session could not be verified.'
  },
  {
    id: 'theme-mode',
    title: 'Dark Mode',
    content: 'Click the Moon/Sun icon in the header to toggle between Light and Dark mode. Your preference will be saved locally in your browser.'
  },
  {
    id: 'renaming',
    title: 'Dashboard Management',
    content: 'To rename a dashboard, simply **Double Click** its name in the tab bar at the top. Type the new name and press Enter to save.'
  }
];

export const developerDocumentation = [
  {
    id: 'api-layer',
    title: 'API Integration',
    code: `import { probeAndFetch } from './services/api';

async function loadData() {
  const reviews = await probeAndFetch();
  console.log(reviews);
}`,
    description: 'The API layer handles authentication probing and result normalization.'
  },
  {
    id: 'data-store',
    title: 'Filtering Logic',
    code: `import { applyFilters, resolveWindows } from './services/dataStore';

const windows = resolveWindows(filters, comparison);
const filtered = applyFilters(data, card, windows.current, globalExclude);`,
    description: 'Data is filtered in-memory for fast dashboard refreshing without redundant network calls.'
  }
];

export const releaseNotes = [
  {
    date: '2026-04-22',
    changes: [
      'Added comprehensive Dark Mode support with persistence.',
      'Implemented dashboard renaming (Double-click any tab to edit).',
      'Added "All Time" Date Range filter to bypass temporal constraints.',
      'Added missing tooltips and icons for Legend and Aggregate Sum options.',
      'Renamed "Legendary" to "Legend" for clarity.',
      'Added failover guidance for PDF exports blocked by iframe sandboxing.',
      'Implemented "Table" visualization type for raw record viewing.',
      'Overhauled configuration panel with tooltips and multi-status selection.',
      'Expanded "Date Range" options with new relative windows (Today, Yesterday, etc.).',
      'Added "Listing Page" mode control (Include, Exclude, Only).',
      'Integrated PDF Export and Dashboard Sharing features.',
      'Improved data normalization support for multiple status aliases and field formats.',
      'Applied "Clean Minimalism" design theme globally.',
      'Added EW API Session detection indicator in the user menu.',
      'Fixed "Create New" dashboard functionality and enhanced permission robustness.',
      'Updated full product specification at src/docs/SPEC.md.',
      'Initial release of Extension Warehouse Review Dashboard.',
      'Implemented Google Sign-In and Firestore persistence.',
      'Added drag-and-drop dashboard builder with SortableJS.',
      'Developed 5 visualization types: KPI, Bar, Line, Pie, and Rank.',
      'Created automatic API probing with sample data fallback.'
    ]
  }
];
