import { CardConfig, VizType } from '../types';
import { X, Hash, BarChart3, LineChart, PieChart, Trophy, Calendar, Filter, MousePointer2, Info, Table as TableIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardConfig | undefined;
  onUpdate: (update: Partial<CardConfig>) => void;
  reviewerNames: string[];
}

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1 align-middle">
    <Info className="w-3 h-3 text-gray-300 hover:text-black transition-colors cursor-help" />
    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-black text-[10px] text-white rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black"></div>
    </div>
  </div>
);

export default function ConfigPanel({
  isOpen,
  onClose,
  card,
  onUpdate,
  reviewerNames
}: ConfigPanelProps) {
  if (!card) return null;

  const vizTypes: { type: VizType; icon: any; label: string; info: string }[] = [
    { type: 'kpi', icon: Hash, label: 'KPI', info: 'Shows a single, high-level number representing the total count for the selected filters.' },
    { type: 'bar', icon: BarChart3, label: 'Bar', info: 'Compares discrete categories (like reviewers or status) or intervals over time.' },
    { type: 'line', icon: LineChart, label: 'Line', info: 'Best for visualizing trends and volume changes over continuous time windows.' },
    { type: 'pie', icon: PieChart, label: 'Pie', info: 'Shows the relative proportion of parts to the whole (e.g., status distribution).' },
    { type: 'leaderboard', icon: Trophy, label: 'Rank', info: 'A sorted list showing the top performers based on the current data slice.' },
    { type: 'table', icon: TableIcon, label: 'Table', info: 'Provides a detailed list of all records matching your filter criteria.' },
  ];

  const updateFilters = (update: any) => {
    onUpdate({ filters: { ...card.filters, ...update } });
  };

  const updateDisplay = (update: any) => {
    onUpdate({ display: { ...card.display, ...update } });
  };

  const toggleStatus = (status: string) => {
    const current = card.filters.status || [];
    if (current.includes(status)) {
      updateFilters({ status: current.filter(s => s !== status) });
    } else {
      updateFilters({ status: [...current, status] });
    }
  };

  const hasStatus = (status: string) => (card.filters.status || []).includes(status);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900 z-40"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-slate-800 z-50 overflow-y-auto flex flex-col shadow-2xl"
          >
            <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm z-10 h-20">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <MousePointer2 className="w-4 h-4" />
                Configure
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-50 dark:hover:bg-slate-900 rounded transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-10">
              {/* Section 1: Title */}
              <section>
                <div className="flex items-center mb-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Label</label>
                  <Tooltip text="The descriptive name shown at the top of the chart card." />
                </div>
                <input 
                  type="text" 
                  value={card.title}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded text-sm text-gray-900 dark:text-white focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                  placeholder="Card title..."
                />
              </section>

              {/* Section 2: Visualisation Type */}
              <section>
                <div className="flex items-center mb-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Format</label>
                  <Tooltip text="Defines the visual representation of the data. Changing this affects how the filtered numbers are rendered." />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {vizTypes.map(({ type, icon: Icon, label, info }) => (
                    <div key={type} className="relative group/viz">
                      <button
                        onClick={() => onUpdate({ vizType: type })}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 w-full rounded border transition",
                          card.vizType === type 
                            ? "bg-black border-black text-white dark:bg-white dark:text-black dark:border-white" 
                            : "bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800 text-gray-400 hover:border-gray-300 dark:hover:border-slate-600"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
                      </button>
                      <div className="absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/viz:opacity-100 transition-opacity">
                         <Tooltip text={info} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 3: Filters */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-50 dark:border-slate-900 pb-2">
                  <Filter className="w-3.5 h-3.5 text-black dark:text-white" />
                  <label className="text-[11px] font-bold text-black dark:text-white uppercase tracking-widest">Logic Filters</label>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</span>
                      <Tooltip text="Select one or more statuses to include. If none are selected, all reviews are considered." />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'approved', label: 'Approved' },
                        { id: 'denied', label: 'Denied' },
                        { id: 'in_queue', label: 'Queued' },
                        { id: 'in_review', label: 'Reviewing' }
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => toggleStatus(s.id)}
                          className={cn(
                            "px-3 py-2 rounded text-[10px] font-bold uppercase tracking-widest border transition",
                            hasStatus(s.id)
                              ? "bg-gray-100 dark:bg-slate-800 text-black dark:text-white border-black dark:border-white"
                              : "bg-white dark:bg-slate-900 text-gray-400 border-gray-100 dark:border-slate-800"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Date Range</span>
                      <Tooltip text="Filters the data based on the submission or review date within this specified window." />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'today', label: 'Today' },
                        { id: 'yesterday', label: 'Yesterday' },
                        { id: 'past_30', label: 'Past 30 Days' },
                        { id: 'past_60', label: 'Past 60 Days' },
                        { id: 'past_90', label: 'Past 90 Days' },
                        { id: 'past_120', label: 'Past 120 Days' },
                        { id: 'past_365', label: 'Past 365 Days' },
                        { id: 'this_year', label: 'This Year' },
                        { id: 'all_time', label: 'All Time' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => updateFilters({ period: p.id })}
                          className={cn(
                            "px-3 py-2 rounded text-[9px] font-bold uppercase tracking-widest border transition",
                            card.filters.period === p.id 
                              ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" 
                              : "bg-white dark:bg-slate-900 text-gray-400 border-gray-100 dark:border-slate-800 hover:border-gray-300"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Listing Pages</span>
                      <Tooltip text="Control whether reviews from listing pages are excluded, included, or shown in isolation." />
                    </div>
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-900 rounded">
                      {[
                        { id: 'both', label: 'Both' },
                        { id: 'exclude', label: 'Exclude' },
                        { id: 'only', label: 'Only' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => updateFilters({ listingPageMode: m.id })}
                          className={cn(
                            "flex-1 px-2 py-1.5 rounded text-[9px] font-bold uppercase tracking-tighter transition",
                            (card.filters.listingPageMode || 'both') === m.id
                              ? "bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm"
                              : "text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: Comparison */}
              {card.vizType !== 'pie' && card.vizType !== 'leaderboard' && (
                <section>
                  <div className="flex items-center justify-between mb-4 border-b border-gray-50 dark:border-slate-900 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-black dark:text-white" />
                      <label className="text-[11px] font-bold text-black dark:text-white uppercase tracking-widest">Benchmarks</label>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                         type="checkbox" 
                         checked={card.comparison.enabled}
                         onChange={(e) => onUpdate({ comparison: { ...card.comparison, enabled: e.target.checked } })}
                         className="sr-only peer" 
                       />
                      <div className="w-8 h-4 bg-gray-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-black dark:peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {card.comparison.enabled && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {['previous_period', 'last_week', 'last_month', 'last_year'].map((p) => (
                        <button
                          key={p}
                          onClick={() => onUpdate({ comparison: { ...card.comparison, period: p as any } })}
                          className={cn(
                            "px-3 py-2 rounded text-[9px] font-bold uppercase tracking-widest border transition",
                            card.comparison.period === p 
                              ? "bg-gray-100 dark:bg-slate-800 text-black dark:text-white border-gray-300 dark:border-slate-600" 
                              : "bg-white dark:bg-slate-900 text-gray-400 border-gray-100 dark:border-slate-800 hover:border-gray-200"
                          )}
                        >
                          {p.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Section 5: Display */}
              <section className="space-y-6">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-4 border-b border-gray-50 dark:border-slate-900 pb-2">Visual Specs</label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg cursor-pointer group">
                    <div className="flex items-center">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Legend</span>
                      <Tooltip text="Toggles the visibility of the color-coded key explaining the chart data." />
                    </div>
                    <input 
                      type="checkbox" 
                      checked={card.display.showLegend} 
                      onChange={(e) => updateDisplay({ showLegend: e.target.checked })}
                      className="w-3.5 h-3.5 accent-black dark:accent-white"
                    />
                  </label>
                  <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg cursor-pointer group">
                    <div className="flex items-center">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Aggregate Sum</span>
                      <Tooltip text="Displays the total numerical sum for the selected metric at the top of the card or segment." />
                    </div>
                    <input 
                      type="checkbox" 
                      checked={card.display.showTotal} 
                      onChange={(e) => updateDisplay({ showTotal: e.target.checked })}
                      className="w-3.5 h-3.5 accent-black dark:accent-white"
                    />
                  </label>
                </div>
              </section>
            </div>

            <div className="mt-auto p-8 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
              <button 
                onClick={onClose}
                className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded text-xs font-bold uppercase tracking-widest hover:bg-gray-800 dark:hover:bg-gray-200 transition transform active:scale-95"
              >
                Apply Manifest
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
