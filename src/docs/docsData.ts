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
    content: 'Switch to **Edit Mode** using the button in the header. In Edit Mode, you can:\n- **Add Cards**: Click the "+" button in any row.\n- **Add Rows**: Click the "Add Row" button at the bottom.\n- **Resizing Cards**: Subtle icons appear on all 4 borders of a card. Click the [+] and [-] icons on the Left/Right to change **Width** (1-4 columns), and on the Top/Bottom to change **Height** (1-4 units). The dashboard uses a 4-column column grid logic and will automatically "push" cards to the next row if they exceed the width.\n- **Duplicate Cards**: Click the Copy icon (❏) between the gear and trash icons to clone a card instantly.\n- **Drag & Drop**: Use the handle (⠿) on the top left of any card to move it within or between rows.\n- **Configure Cards**: Click the gear icon (⚙) on a card to open the configuration panel.'
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
    title: 'Dark Mode & Global Colors',
    content: '- **Dark Mode**: Click the Moon/Sun icon in the header to toggle between Light and Dark mode.\n- **Global Colors**: Open the user profile menu to choose a global color scheme (Blue, Green, Red, Amber, Multi, Pastel, Warm, Midnight, Forest, or Slate). These schemes redefine the primary accent color, chart palettes, and even the dashboard workspace background (e.g., Warm uses a soft yellow gradient while Midnight switches to a deep space black).'
  },
  {
    id: 'kpi-details',
    title: 'KPI Data Details',
    content: 'When viewing a KPI card, you can **Click the Large Number** to open a detailed modal. This popup displays a full tabular view of all records included in that specific KPI count, including development details and reviewer notes.'
  },
  {
    id: 'rank-grouping',
    title: 'Advanced Ranking',
    content: 'The "Rank" format allows you to visualize top contributors. In the card configuration, you can choose between:\n- **Reviewer**: Ranks the team members carrying out the most reviews.\n- **Developer**: Ranks the external developers submitting the most extensions.'
  },
  {
    id: 'dashboard-management',
    title: 'Saving, Opening & Deleting',
    content: 'Dashboards are automatically saved as you edit, but you can also use **"Save Dashboard"** in the profile menu to ensure persistence.\n- **Open Dashboard**: Load any dashboard owned by you or shared with you from the "Open Dashboard" menu.\n- **Delete Dashboard**: If you are the owner of a dashboard, a red trash icon will appear next to its name in the "Open Dashboard" list. Click it to permanently remove the dashboard.\n- **Share Dashboard**: Input a collaborator\'s email in the profile menu to grant them access to your current view.'
  },
  {
    id: 'refresh',
    title: 'Data Refresh & Auto-Refresh',
    content: 'Click the refresh icon (↻) in the header to pull latest data. You can also click the dropdown arrow next to refresh to enable **Auto-Refresh** (e.g., Every 30 Minutes) to keep your monitor updated without manual intervention.'
  },
  {
    id: 'date-engine',
    title: 'Date Filtering Engine',
    content: 'The dashboard uses a high-precision Unix Millisecond Timestamp engine for date comparisons:\n- **Numeric Precision**: Comparisons use the underlying numeric values from the JSON data for absolute accuracy.\n- **Debugger transparency**: The "Data Source Criteria" debugger now shows exactly which Unix timestamp is being used for searching when "Today" or "Yesterday" filters are applied.\n- **Relative Context**: "Today" and "Yesterday" selections precisely target server-local date boundaries.\n- **Benchmarks**: Benchmark values (deltas) accurately compare the current filtered period against the equivalent previous period (e.g. Today vs Yesterday, or Past 30 Days vs the 30 days prior).'
  },
  {
    id: 'json-debugger',
    title: 'JSON Configuration Debugging',
    content: 'In the **Latest Data Feed**, you can now paste a "JSON configuration" copied from any dashboard card. \n1. **Copy JSON**: Click the "i" icon on a card and click "Copy JSON".\n2. **Paste & Debug**: Go to Latest Data Feed, paste the JSON into the input box next to "Debug JSON", and click the button.\n3. **Validation**: The table will automatically filter to show exactly what records that specific card is seeing, allowing you to debug complex status or date intersections.'
  },
  {
    id: 'dataset-logic',
    title: 'Merged Data Stream',
    content: 'The dashboard now merges both **Active** and **Completed** reviews into a single stream. You no longer need to switch datasets; instead, use the **Status** filter to choose between Approved, Denied, Queued, or Reviewing items across the entire review history.'
  },
  {
    id: 'dual-date-filtering',
    title: 'Dual Date Filtering',
    content: 'You can now filter by both **Date Submitted** and **Last Reviewed** simultaneously. Note that reviews must pass BOTH date filters to be shown. If you apply a "Last Reviewed" filter, items that haven\'t been reviewed yet (active queue) will be automatically excluded.'
  },
  {
    id: 'data-inspect',
    title: 'Inspecting Card Data',
    content: 'Click the **"i" icon** at the top right of any card to see exactly what filters are being applied and preview the raw JSON data. You can copy the JSON directly for external analysis.'
  },
  {
    id: 'days-format',
    title: 'Age & Processing Distribution',
    content: 'The **Days** visualization format groups reviews into buckets based on time. You can choose to calculate based on "Current Age" (days since submission) or "Review Time" (days taken from submission to final review decision).'
  },
  {
    id: 'filter-debugger',
    title: 'Data Source Filter Debugger',
    content: 'The "Data Source Criteria" popup (click the "i" icon on any card) now includes a **Filter Logic Debugger** table. \n- **Sequential Counts**: Shows exactly how many records are left after each filter (Dataset, Status, Reviewer, Dates) is applied.\n- **Ignored States**: Filters shown as "Ignored" (or with *null* in the config) mean they are currently wide-open and not restricting the data.\n- **Troubleshooting**: If a card shows 0, use this table to find exactly which filter is "killing" the results.'
  },
  {
    id: 'enlarged-view',
    title: 'Large Chart Popups',
    content: 'Click any chart (Bar, Line, or Pie) in View Mode to open a larger, high-resolution modal. This is perfect for capturing high-quality screenshots for reports.'
  },
  {
    id: 'latest-data',
    title: 'Latest Data Feed',
    content: 'Accessed via the "View Latest Data" link in the profile menu, this "System Tab" provides a real-time list of all JSON records fetched during the current session.\n- **Validate Card Data**: Use this view to cross-reference counts and totals seen on dashboard cards.\n- **Filters**: Quickly search or filter by status to find specific extensions.\n- **Data Sources**: Click the "Data Sources" button to see the exact API endpoints and raw payload metadata being analyzed.'
  },
  {
    id: 'deduplication',
    title: 'Deduplication & Unique Records',
    content: 'Use the **"Unique Only"** toggle in the configuration panel to count each extension only once. \n- **Logic**: When enabled, the dashboard identifies duplicates based on the **Extension Name**. Only the first occurrence in the filtered dataset is kept.\n- **Use Case**: Perfect for tracking how many *individual*extensions were reviewed, rather than how many total version updates occurred in a period.'
  },
  {
    id: 'pagination',
    title: 'Cursor-Based Pagination',
    content: 'The dashboard now handles large datasets using DynamoDB-style cursor pagination. If an API endpoint contains more records than can be returned in a single response, the system automatically fetches subsequent pages until all records are retrieved, ensuring complete visibility across high-volume review queues.'
  },
  {
    id: 'api-sources',
    title: 'Managing API Source URLs',
    content: 'You can now customize which endpoints the dashboard pulls data from.\n1. **Open Config**: Go to the Profile Menu → Configure.\n2. **Expand Sources**: Click on "API Source URLs" to see the active endpoints.\n3. **Edit**: You can change the names and URLs of existing sources.\n4. **Validate**: Click the "Validate" button on any URL to check if it returns valid JSON review data. The system will tell you exactly how many records were found.\n5. **Add/Remove**: Use the "Add API Source" button to append new endpoints or the trash icon to remove them. All data from active sources is merged into one dashboard stream.'
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
    id: 'benchmark-logic',
    title: 'Benchmark Comparison Engine',
    code: `import { getPreviousDateRange, applyFilters } from './services/dataStore';

const current = applyFilters(data, card, false);
const prevRange = getPreviousDateRange(card.filters.submittedPeriod);
const previous = applyFilters(data, card, false, prevRange);

const delta = ((current.length - previous.length) / previous.length) * 100;`,
    description: 'Benchmarks compare the current dataset against a look-back window of equal duration.'
  },
  {
    id: 'data-store',
    title: 'Dual-Field Filtering Engine',
    code: `// Items must pass both submitted and reviewed ranges
const subRange = getDateRange(filters.submittedPeriod);
const revRange = getDateRange(filters.reviewedPeriod);

const matchesSub = !subRange || (item.dateSubmitted >= subRange.start && item.dateSubmitted <= subRange.end);
const matchesRev = !revRange || (item.dateReviewed >= revRange.start && item.dateReviewed <= revRange.end);

return matchesSub && matchesRev;`,
    description: 'Data is filtered independently on both dateSubmitted and dateReviewed using local time midnight boundaries.'
  },
  {
    id: 'days-viz',
    title: 'Days Aggregation',
    code: `// Example of the "Days" grouping logic
const buckets = { '0-7': 0, '8-14': 0, '15-30': 0, '30+': 0 };
data.forEach(item => {
  const diff = calculateDiff(item.dateSubmitted, item.dateReviewed);
  if (diff <= 7) buckets['0-7']++;
  // ...
});`,
    description: 'The days format calculates the delta between submission and either today or a review timestamp.'
  },
  {
    id: 'latest-view',
    title: 'Data Feed Extraction',
    code: `<LatestDataView 
  data={reviews} 
  onOpenDataSources={() => setIsDebugOpen(true)} 
  theme={theme} 
/>`,
    description: 'The LatestDataView component renders a searchable, sortable table of raw review objects.'
  },
  {
    id: 'json-filter-debug',
    title: 'JSON Filter Debugging',
    code: `// Paste a card configuration object to debug its filters
const handleApplyConfig = () => {
  const parsed = JSON.parse(configInput);
  setAppliedConfig(parsed); // Re-filters the table instantly
};`,
    description: 'Enables quick verification of complex filtering logic against live raw data records.'
  },
  {
    id: 'filter-steps',
    title: 'Sequential Filter Debugging',
    code: `import { getFilterSteps } from './services/dataStore';

// Get counts after each filter stage
const steps = getFilterSteps(reviews, card, subWindow, globalExcludeListing);
console.table(steps);
// Output: [{ name: "Total", count: 500 }, { name: "Status Filter", count: 120 }, ...]`,
    description: 'Returns an array of steps showing how many records survived each filtering stage.'
  },
  {
    id: 'dedup-logic',
    title: 'Deduplication Engine',
    code: `// Set-based deduplication in applyFilters
if (filters.uniqueOnly) {
  const seen = new Set<string>();
  return filtered.filter(item => {
    if (seen.has(item.extensionName)) return false;
    seen.add(item.extensionName);
    return true;
  });
}`,
    description: 'The deduplication logic ensures that each extension is represented only once in the final dataset when enabled.'
  },
  {
    id: 'access-management',
    title: 'Access Management',
    code: `import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Grant access to a collaborator
async function share(dashboardId, email) {
  await updateDoc(doc(db, 'dashboards', dashboardId), {
    collaborators: arrayUnion(email),
    updatedAt: serverTimestamp()
  });
}

// Revoke access from a collaborator
async function revoke(dashboardId, email) {
  const newColabs = currentCollaborators.filter(e => e !== email);
  await updateDoc(doc(db, 'dashboards', dashboardId), {
    collaborators: newColabs,
    updatedAt: serverTimestamp()
  });
}`,
    description: 'Collaborative access is managed via the collaborators array in Firestore, with synchronous revocation logic.'
  },
  {
    id: 'pagination-logic',
    title: 'Cursor Pagination Helper',
    code: `const { allRecords, pageCount } = await fetchAllPages(url, headers);
console.log(\`Fetched \${allRecords.length} records across \${pageCount} pages\`);`,
    description: 'Internal helper that implements iterative while-loop pagination using lastEvaluatedKey cursors.'
  },
  {
    id: 'source-config',
    title: 'API Source Configuration',
    code: `import { getSourceUrls, setSourceUrls } from './services/dataStore';
import { validateSourceUrl } from './services/api';

// Managing sources
const sources = getSourceUrls();
setSourceUrls([...sources, { name: 'Alpha', url: '/api/alpha' }]);

// Validating a new endpoint
const result = await validateSourceUrl('/api/beta');
if (result.ok) console.log('Source is valid!');`,
    description: 'Provides persistence and validation for dynamic API endpoints used by the probing engine.'
  },
  {
    id: 'grid-layout',
    title: 'Dynamic Grid Layout',
    code: `<div className={cn(
  "grid transition-all duration-200",
  card.w === 2 && "xl:col-span-2",
  card.h === 2 && "row-span-2"
)}>
  {/* Content scales to fill 100% */}
</div>`,
    description: 'Cards use col-span and row-span logic within a 12-unit or 4-unit grid. Visualizations detect parent size and scale accordingly.'
  }
];

export const releaseNotes = [
  {
    date: '2026-05-17',
    changes: [
      'AI-Powered Insights: Introduced a new "Summary" card type that leverages Gemini to analyze trends, abnormal highs/lows, reviewer performance, and developer activity.',
      'Benchmarking Support: Summary cards automatically incorporate benchmarks when comparisons are enabled, providing context on performance shifts.',
      'Year-over-Year Benchmarking: Supported "Previous Year" comparisons for all bar and line charts, allowing users to benchmark against the same period 12 months prior with perfect date alignment.',
      'Refined Axis Labels: When grouping by "Month" with a "Last Year" benchmark active, chart axes now only show month names to prevent date-shifting confusion.',
      'Dynamic Comparison Labels: Chart legends now accurately reflect the active benchmark mode (e.g., "Last Year" instead of "Previous Period").',
      'Intelligence Modal Styling: Enlarged chart views in Light Mode now automatically override series colors to use high-contrast light grey for all comparison data types.',
      'Accessibility Audit: Enhanced visibility for benchmark totals and "vs" labels in Light Mode using high-contrast slate tones.',
      'Refined Aggregate Summary: Aggregate sums now use primary theme colors for current values and distinct grey tones for benchmarks.',
      'Refined Modal Charting: Enlarged chart views now use optimized text sizes and consistent legend styles for better data analysis.',
      'Finalized Benchmark Rendering: Fixed a critical logic error preventing previous period datasets from displaying in charts. Data shifting now intelligently picks the active date range for accurate side-by-side comparison.',
      'Distinct Comparison Styles: Restyled chart datasets to ensure "Previous Period" data is visually distinct (subtle dashed lines and transparent fills).',
      'Implemented Side-by-Side Bar Comparisons: Bar charts now display current and previous periods as distinct adjacent bars for direct visual benchmark analysis.',
      'Auto-Legend Logic: The chart legend now automatically toggles on when a benchmark is enabled to ensure clear distinction between data series.',
      'Fixed Comparison Data Persistence: Resolved an issue where previous period data was not rendering in charts. Shifting logic now correctly accounts for both Submitted and Reviewed date ranges.',
      'Refined Aggregate Sum: The total summary line now explicitly shows current vs previous period totals when benchmark is enabled.',
      'Enhanced Chart Comparisons: Bar and Line charts now support side-by-side or overlaid dataset comparisons for the previous period.',
      'Improved Time Labels: "Week" grouping now uses "WC [Date]" format for better readability.',
      'Refined Config Options: Comparison options for Bar/Line charts are now restricted to "Previous Period" as requested.',
      'Detailed Filter Debugging: The "Data Source Criteria" modal now explicitly shows the resolved date ranges for comparison periods.',
      'Implemented Chart Data Grouping: Bar and Line charts can now aggregate data by Day, Week, Month, or Year.',
      'Refined Config UI: Added a new "Time Grouping" selector in the card configuration panel for better trend analysis over long periods.',
    ]
  },
  {
    date: '2026-05-11',
    changes: [
      'Added "Past 7 Days" filter: New temporal window available for both Date Submitted and Last Reviewed filters.',
      'New Application Logo: Updated the header logo to a modern bar-graph style representation to better reflect the dashboard\'s analytical purpose.',
    ]
  },
  {
    date: '2026-04-24',
    changes: [
      'Fixed "Close Dashboard" functionality: Implemented a persistent tab management system using `openDashboardIds`. Closing a tab now correctly removes it from the header with an optional save confirmation prompt.',
      'Refined Header Tabs: Tabs now show the "Close" (X) icon on hover for all dashboards, not just the active one.',
      'Fixed Benchmark Calculations: Resolved a bug where comparison/benchmark values were incorrectly showing as 0%. The engine now correctly identifies which date field (Submitted vs Reviewed) is used by the card and shifts the corresponding period for the comparison dataset.',
      'Implemented Dashboard Deletion: Owners can now delete their dashboards directly from the "Open Dashboard" menu via a new context-aware trash icon.',
      'Implemented getPreviousDateRange helper: New utility for calculating comparison periods (Today vs Yesterday, etc.) based on duration deltas.',
      'Implemented Access Revocation: Dashboard creators can now view a list of collaborators and revoke their access directly from the profile menu.',
      'Refined Sharing UI: Added a persistent shared-with list below the email input for better transparency on dashboard permissions.',
      'Fixed Placeholder Contrast: Updated the "User email..." input to explicitly use black text and placeholder colors for better legibility.',
      'Light/Dark Consistency: Unified text and background colors in the "Open Dashboard" modal to ensure consistent visibility across both light and dark modes.',
      'Global Color Sync: Updated all text schemes using slate-300 or slate-200 to use a refined OKLCH palette (oklch(0.42 0.01 0)) as requested.',
      'Themed Card Backgrounds: Color schemes now apply specific background tints and text color styles to cards (e.g., Midnight uses dark cards with neon accents, while Pastel features soft tinted cards).',
      'Grid Color Picker: The global color selector has been updated to a 2-row grid layout for better usability and visibility within the user menu.',
      'Refined Color Palette: Adjusted primary and categorical colors to better align with high-end dashboard design samples.',
      'Implemented Dashboard Resizing: Users can now adjust card width (1-4 columns) and height (1-4 units) directly in Edit Mode using subtle border icons.',
      'Reflow & Push Logic: Integrated CSS Grid logic that automatically wraps cards to the next row if they exceed the 4rd column, pushing subsequent content down.',
      'Fixed Tab Redirection Bug: Resolved an issue where saving card configurations would force the application back to the first dashboard tab. Active tab state is now strictly maintained.',
      'Visual Scaling: Updated all visualization components (Charts, Tables, Leaderboards) to scale to 100% of their parent container\'s width and height.',
      'Fixed Drag-and-Drop TypeError: Resolved a "Cannot read properties of null (reading id)" error by implementing proper SortableJS instance cleanup and defensive null checks during card reordering.',
      'Implemented DynamoDB-style cursor pagination: Added support for status1/status2 cursors to handle large datasets across multiple API pages.',
      'New fetchAllPages internal helper: Robust iterative fetching logic that automatically builds and follows pagination URLs.',
      'Enhanced probeAndFetch: Updated the main data engine to sequentially retrieve all available records from every configured source endpoint.',
      'Updated testApiConnection: The connection validator now reports the total records found across all retrieved pages.',
      'Performance optimization: Replaced recursive fetching with iterative while-loop logic to prevent stack overflow on extremely large datasets.',
      'Improved payload metadata: rawPayload now includes pagesFetched and rawJson arrays for all source endpoints for enhanced debugging.',
      'Updated SPEC.md: Documented the new resizing features, cursor-based pagination architecture, and stability fixes.',
    ]
  },
  {
    date: '2026-04-23',
    changes: [
      'Added API Source Configuration: Users can now view, add, and edit the underlying data source URLs directly from the Authentication modal.',
      'Source URL Validation: Integrated a live validation tool in the config modal that checks if an endpoint returns compatible JSON data before deployment.',
      'Dynamic Probing Engine: Updated the API service to pull from user-configured endpoints instead of static hardcoded paths.',
      'Merged Data Streams: Optimized the combined data logic to handle an arbitrary number of JSON sources seamlessly.',
      'Refactored Filtering Architecture: Removed "Dataset" switch; data from all sources (Active & Completed) is now merged before filtering for universal visibility.',
      'Implemented Multi-Select Status: Users can now select any combination of Approved, Denied, Queued, and Reviewing statuses simultaneously.',
      'Enabled Independent Date Filters: "Date Submitted" and "Last Reviewed" filters now operate independently with AND logic.',
      'Fixed Date Boundary Logic: Standardized all relative date ranges (Today, Yesterday, etc.) to use local time midnight for precise day-to-day accuracy.',
      'Simplified UI: Removed dataset-specific logic from Configuration Panel to provide a more consistent editing experience.',
      'Updated Latest Data View: Enhanced feed extraction to align with the new merged-stream filtering logic.',
      'Implemented high-precision Unix Millisecond Timestamp filtering engine: Replaced string-based comparisons with numeric timestamp logic for all date filters to resolve "Today/Yesterday" results inconsistencies.',
      'Updated Data Source Criteria UI: Relative date filters ("Today", "Yesterday") now display the resolved date and search timestamp in brackets for debugging transparency.',
      'Updated EWReview data model: Standardized on numeric timestamps for submittedAt and reviewedAt fields globally.',
      'Revised Documentation: Updated SPEC.md and Help & Resources to reflect the new millisecond-accurate filtering logic.',
      'Unified Date Matching Engine: Replaced complex date calculations with strict Unix timestamp comparisons against "Resolved Window" bounds.',
      'Global Filter Consistency: Synchronized date matching logic across Dashboard Cards and the Latest Data Feed.',
      'Added Filter Logic Debugger to Data Source Criteria: A new table showing record counts after each sequential filter stage to help debug empty cards.',
      'Clarified Filter Config: Explicitly marked "null" configuration values as "Ignored" in the debugger and added explanatory notes.',
      'Added "Duplicate Card" feature: Quickly clone existing cards in Edit Mode to iterate on similar configurations.',
      'Fixed TypeError in Date Filtering: Added defensive checks for non-string date inputs during normalization and filtering.',
      'Added "JSON Configuration Debugger" to Latest Data Feed: Paste card configs to debug multi-step filter logic on raw records.',
      'Revised Date Filtering Engine: Implemented mandatory Time Neutrality (ignoring HH:MM) and 10-character partial string matching (YYYY-MM-DD) for Today, Yesterday, and specific date queries.',
      'Fixed Aggregate Sum on Table Cards: Resolved styling issues in Dark Mode and added descriptive labelling for counts.',
      'Consolidated Latest Data View: Enhanced raw record inspection with per-column advanced filters and sorting.',
      'Implemented Dataset Filter: Pivot cards between Active Queue and Completed History buckets.',
      'Added "Days" Visualization: Segment reviews by Active Age vs Processing Time windows.',
      'Added Auto-Refresh Logic: Configure automated data cycling (30m to 6h intervals).',
      'Implemented Dashboard Sharing: Collaborative view access via email addresses.',
      'Integrated Enlarged Charts: High-resolution modal views for all graphical card formats.',
      'Updated Product Specification: Refreshed SPEC.md to match the version 1.2 functional surface.',
      'Added Deduplication Toggle: New "Duplicates" filter in the configuration panel allows users to toggle between "Show All" records and "Unique Only" per extension.',
      'Deduplication Engine: Implemented high-performance Set-based deduplication logic in the data processing stream using extensionName as the primary key.',
      'Updated Filter Debugger: Added a "Unique Extensions Only" stage to the Data Source Criteria debugger to show exactly how many records are removed by the unique filter.'
    ]
  },
  {
    date: '2026-04-22',
    changes: [
      'Implemented KPI Detail Modal: Click any KPI value to view the underlying record table.',
      'Added Global Color Schemes: Choose from 5 palettes via the user profile menu.',
      'Enhanced Rank Visualization: Added support for grouping by either Reviewer or Developer.',
      'Integrated Dual Date Filtering: Filter dashboards by "Date Submitted" or "Last Reviewed" independently.',
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
