import { useMemo, useState } from 'react';
import { CardConfig, EWReview } from '../types';
import { applyFilters, getFilterSteps, getDateRange } from '../services/dataStore';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

dayjs.extend(isSameOrBefore);
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Settings, Trash2, GripVertical, TrendingUp, TrendingDown, Minus, X, Info, Download, Filter, Maximize2, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface CardProps {
  key?: string | number;
  card: CardConfig;
  reviews: EWReview[];
  globalExcludeListing: boolean;
  globalColorScheme?: 'blue' | 'green' | 'red' | 'amber' | 'multi';
  isEditMode: boolean;
  isSelected: boolean;
  isSampleData: boolean;
  onSelect: () => void;
  onDuplicate?: () => void;
  onDelete: () => void | Promise<void>;
  theme?: 'light' | 'dark';
}

const InfoModal = ({ isOpen, onClose, card, reviews, globalExcludeListing, data, theme }: { 
  isOpen: boolean; 
  onClose: () => void; 
  card: CardConfig;
  reviews: EWReview[];
  globalExcludeListing: boolean;
  data: EWReview[]; 
  theme: 'light' | 'dark';
}) => {
  const [copied, setCopied] = useState(false);
  const jsonStr = JSON.stringify(data, null, 2);
  const filters = card.filters;
  const comparison = card.comparison;

  const subPeriod = filters.submittedPeriod || (filters as any).period || 'all_time';
  const revPeriod = filters.reviewedPeriod || 'all_time';
  const subRange = getDateRange(subPeriod);
  const revRange = getDateRange(revPeriod);

  const filterSteps = useMemo(() => {
    return getFilterSteps(reviews, card, globalExcludeListing);
  }, [reviews, card, globalExcludeListing]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={cn(
              "bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col relative z-20 border border-gray-200 dark:border-slate-800",
              theme === 'dark' ? "text-white" : "text-gray-900"
            )}
          >
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950">
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-gray-900 dark:text-white">
                <Info className="w-4 h-4 text-blue-500" />
                <span className="text-gray-900 dark:text-white">Data Source Criteria</span>
              </h3>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg transition"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              <section>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Filter Logic Debugger</h4>
                <div className="overflow-hidden border border-gray-100 dark:border-slate-800 rounded-xl bg-gray-50/50 dark:bg-slate-900/50">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 dark:bg-slate-800">
                      <tr className="text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-widest">
                        <th className="px-4 py-3">Filter Stage</th>
                        <th className="px-4 py-3">Applied Value</th>
                        <th className="px-4 py-3 text-right">Result Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filterSteps.map((step, idx) => (
                        <tr key={idx} className={cn(
                          "text-[10px] transition-colors",
                          step.isIgnored ? "opacity-40" : "hover:bg-blue-500/5"
                        )}>
                          <td className="px-4 py-2.5 font-bold text-gray-500 dark:text-slate-400">
                            {idx === 0 ? '' : `${idx}. `}{step.name}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-blue-500 dark:text-blue-400 break-all max-w-[150px]">
                            {step.configValue === 'null' ? (
                              <span className="text-gray-400 italic">Ignored</span>
                            ) : step.configValue}
                          </td>
                          <td className={cn(
                            "px-4 py-2.5 text-right font-bold tabular-nums",
                            step.count === 0 ? "text-red-500" : "text-gray-900 dark:text-white"
                          )}>
                            {step.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/10 text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">
                    * Ignored rows indicate filters that are not strictly restricting the dataset (Set to All/Both/Null)
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-4">
                <section>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Resolved Submission Range</h4>
                  <div className="bg-slate-900 rounded-lg p-3 font-mono text-[10px] border border-slate-800 text-blue-400 text-center">
                    {subRange ? `${dayjs(subRange.start).format('YYYY-MM-DD')} to ${dayjs(subRange.end).format('YYYY-MM-DD')}` : 'ALL TIME'}
                  </div>
                </section>
                <section>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Resolved Review Range</h4>
                  <div className="bg-slate-900 rounded-lg p-3 font-mono text-[10px] border border-slate-800 text-emerald-400 text-center">
                    {revRange ? `${dayjs(revRange.start).format('YYYY-MM-DD')} to ${dayjs(revRange.end).format('YYYY-MM-DD')}` : 'ALL TIME'}
                  </div>
                </section>
              </div>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Applied Configuration</h4>
                  <span className="text-[8px] text-amber-500 font-bold uppercase italic tracking-tighter">* null values in config are ignored by engine</span>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-[11px] border border-slate-800 shadow-inner">
                  <pre className="whitespace-pre-wrap break-all text-white">{JSON.stringify(filters, null, 2)}</pre>
                </div>
              </section>

              {comparison?.enabled && (
                <section>
                  <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">Benchmark Configuration</h4>
                  <div className="bg-amber-950/20 rounded-lg p-4 font-mono text-[11px] border border-amber-900/30 text-amber-200/70">
                    <pre className="whitespace-pre-wrap break-all uppercase tracking-tight">Focus: {comparison.period.replace('_', ' ')} logic enabled</pre>
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Powering JSON Data</h4>
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-600 transition"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <div className="bg-slate-900 text-blue-300 rounded-lg p-4 font-mono text-[11px] overflow-auto max-h-[300px] border border-slate-800">
                  <pre>{jsonStr}</pre>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const EnlargedChartModal = ({ 
    isOpen, 
    onClose, 
    chartData, 
    options, 
    vizType, 
    title,
    theme 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    chartData: any; 
    options: any; 
    vizType: string;
    title: string;
    theme?: 'light' | 'dark';
  }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cn(
              "bg-white dark:bg-slate-950 rounded-3xl shadow-3xl w-full max-w-6xl h-fit max-h-[90vh] p-10 relative z-20 border border-gray-200 dark:border-slate-800 flex flex-col",
            )}
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                {title}
              </h3>
              <button 
                onClick={onClose}
                className="p-3 bg-gray-50 dark:bg-slate-900 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-2xl transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 min-h-[400px]">
              {vizType === 'bar' && <Bar data={chartData} options={{ ...options, maintainAspectRatio: false }} />}
              {vizType === 'line' && <Line data={chartData} options={{ ...options, maintainAspectRatio: false }} />}
              {vizType === 'pie' && <Doughnut data={chartData} options={{ ...options, maintainAspectRatio: false }} />}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DetailModal = ({ isOpen, onClose, data, title }: { isOpen: boolean; onClose: () => void; data: EWReview[]; title: string }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col relative z-20 border border-gray-100 dark:border-slate-800"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-900 flex items-center justify-between bg-white/50 dark:bg-slate-950/50 backdrop-blur-md">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                  <span className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                    <Info className="w-5 h-5" />
                  </span>
                  {title} <span className="text-gray-400 font-normal">Details</span>
                </h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Showing {data.length} relevant records</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={onClose}
                  className="p-2.5 bg-gray-50 dark:bg-slate-900 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 bg-gray-50/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
                  <tr className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-slate-500">
                    <th className="px-8 py-4 border-b border-gray-100 dark:border-slate-800">Extension</th>
                    <th className="px-8 py-4 border-b border-gray-100 dark:border-slate-800">Reviewer</th>
                    <th className="px-8 py-4 border-b border-gray-100 dark:border-slate-800">Developer</th>
                    <th className="px-8 py-4 border-b border-gray-100 dark:border-slate-800">Status</th>
                    <th className="px-8 py-4 border-b border-gray-100 dark:border-slate-800">Version</th>
                    <th className="px-8 py-4 border-b border-gray-100 dark:border-slate-800 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-900">
                  {data.map((review, idx) => (
                    <tr key={`${review.id}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/30 transition group">
                      <td className="px-8 py-4">
                        <div className="font-bold text-gray-900 dark:text-white text-xs">{review.extensionName}</div>
                        <div className="text-[9px] text-gray-400 dark:text-slate-500 mt-0.5 truncate max-w-[150px] font-mono uppercase">{review.id}</div>
                      </td>
                      <td className="px-8 py-4 text-xs font-medium text-gray-600 dark:text-slate-400">{review.reviewerName || '--'}</td>
                      <td className="px-8 py-4 text-xs font-medium text-gray-600 dark:text-slate-400">{review.developer || '--'}</td>
                      <td className="px-8 py-4">
                        <div className={cn(
                          "inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border",
                          review.status === 'approved' ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30" :
                          review.status === 'denied' ? "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30" :
                          "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30"
                        )}>
                          {review.status.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-8 py-4 text-xs font-mono text-gray-500">{review.version || '1.0.0'}</td>
                      <td className="px-8 py-4 text-xs text-gray-400 dark:text-slate-500 text-right font-medium">
                        {review.dateSubmitted ? dayjs(review.dateSubmitted).format('MMM D, YYYY') : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-100 dark:border-slate-900 flex items-center justify-between bg-gray-50/50 dark:bg-slate-950/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <div>End of record list</div>
              <div className="flex items-center gap-4">
                <span>Displaying current snapshot</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function Card({
  card,
  reviews,
  globalExcludeListing,
  globalColorScheme = 'blue',
  isEditMode,
  isSelected,
  isSampleData,
  onSelect,
  onDuplicate,
  onDelete,
  theme = 'light'
}: CardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showEnlarged, setShowEnlarged] = useState(false);

  const colors = useMemo(() => {
    const scheme = globalColorScheme || card.display.colorScheme || 'blue';
    const mapping: Record<string, string> = {
      blue: '#3b82f6',
      green: '#10b981',
      red: '#ef4444',
      amber: '#f59e0b',
      multi: '#8b5cf6' 
    };
    return {
      primary: mapping[scheme] || '#3b82f6',
      bgOpacity: scheme === 'multi' ? 'rgba(139, 92, 246, 0.1)' : `rgba(59, 130, 246, 0.1)`
    };
  }, [globalColorScheme, card.display.colorScheme]);

  const { currentData, prevData } = useMemo(() => {
    const current = applyFilters(reviews, card, globalExcludeListing);
    // For comparison, we'd need to shift the ranges, but the current applyFilters doesn't take shift
    // For now, let's just use current filtering. Benchmark logic might need separate handling later.
    return { currentData: current, prevData: [] };
  }, [reviews, card, globalExcludeListing]);

  const renderKPI = () => {
    const currentCount = currentData.length;
    const prevCount = prevData?.length ?? 0;
    const delta = prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : 0;

    return (
      <div 
        className="flex flex-col items-center justify-center py-6 cursor-pointer group/kpi"
        onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-light tracking-tight text-gray-900 dark:text-white mb-2 group-hover/kpi:scale-105 transition-transform"
        >
          {currentCount.toLocaleString()}
        </motion.div>
        {card.comparison.enabled && prevData && (
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
            delta > 0 ? "text-green-600 bg-green-50 border-green-100" : delta < 0 ? "text-red-500 bg-red-50 border-red-100" : "text-gray-400 bg-gray-50 border-gray-100"
          )}>
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(Math.round(delta))}%
          </div>
        )}
      </div>
    );
  };

  const renderLeaderboard = () => {
    const field = card.filters.rankField || 'reviewer';
    const grouped = currentData.reduce((acc, curr) => {
      // FIX: Ensure grouping by reviewer uses reviewerName
      const key = field === 'reviewer' ? (curr.reviewerName || 'Unassigned') : (curr.developer || 'Unknown Developer');
      if (key) {
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(grouped)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 5);

    const maxCount = sorted.length > 0 ? sorted[0][1] : 0;

    return (
      <div className="space-y-3 py-2 h-[200px] overflow-y-auto custom-scrollbar">
        {sorted.length > 0 ? sorted.map(([name, count], idx) => (
          <div key={name} className="relative">
            <div className="flex items-center justify-between z-10 relative px-2 py-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold",
                  idx === 0 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500" : idx === 1 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" : idx === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500" : "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-600"
                )}>
                  {idx + 1}
                </span>
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 truncate max-w-[140px]">{name}</span>
              </div>
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">{count}</span>
            </div>
            <div 
              className="absolute left-0 top-0 bottom-0 rounded-md transition-all duration-500"
              style={{ 
                width: `${(Number(count) / Math.max(1, Number(maxCount))) * 100}%`,
                backgroundColor: colors.bgOpacity
              }}
            />
          </div>
        )) : (
          <div className="text-center py-10 text-slate-400 text-xs italic">No {field} data in this slice</div>
        )}
      </div>
    );
  };

  const renderDays = () => {
    const today = dayjs().endOf('day');
    const buckets = [
      { label: '0-5 Days', min: 0, max: 5 },
      { label: '6-10 Days', min: 6, max: 10 },
      { label: '11-30 Days', min: 11, max: 30 },
      { label: '30+ Days', min: 31, max: Infinity }
    ];

    const distribution = buckets.map(b => {
      const count = currentData.filter(item => {
        const subDate = item.dateSubmitted ? dayjs(item.dateSubmitted) : null;
        const revDate = item.dateReviewed ? dayjs(item.dateReviewed) : null;
        if (!subDate) return false;

        let val = 0;
        if (card.filters.daysCalculation === 'processing_time') {
          if (!revDate) return false;
          val = revDate.diff(subDate, 'day');
        } else {
          val = today.diff(subDate, 'day');
        }
        if (val < 0) val = 0;
        return val >= b.min && val <= b.max;
      }).length;
      return { label: b.label, count };
    });

    const max = Math.max(...distribution.map(d => d.count), 1);

    return (
      <div className="space-y-4 py-2 h-[200px] overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
          {card.filters.daysCalculation === 'processing_time' ? 'Review Time' : 'Active Age'}
        </div>
        {distribution.map((d, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{d.label}</span>
              <span className="font-bold text-gray-900 dark:text-white">{d.count}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(d.count / max) * 100}%` }}
                className="h-full bg-blue-500 rounded-full"
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const chartInfo = useMemo(() => {
    if (card.vizType === 'pie') {
      const grouped = currentData.reduce((acc, curr) => {
        const key = card.display.groupBy === 'reviewer' ? (curr.reviewerName || 'Unassigned') : curr.status;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const labels = Object.keys(grouped);
      const data = Object.values(grouped);
      
      const chartData = {
        labels,
        datasets: [{
          data,
          backgroundColor: [colors.primary, '#4B5563', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#000000'],
          borderWidth: 0,
        }]
      };

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: card.display.showLegend,
            position: 'right' as const,
            labels: { boxWidth: 12, usePointStyle: true, padding: 10, font: { size: 10 } }
          }
        }
      };
      return { chartData, options };
    }

    const interval = 'day'; // Default to day for simplicity
    
    const currentGrouped = currentData.reduce((acc, curr) => {
      const key = dayjs(curr[card.filters.dateField || 'dateSubmitted']).startOf(interval).format('YYYY-MM-DD');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const labels = Object.keys(currentGrouped).sort();

    const data = labels.map(l => currentGrouped[l] || 0);

    const chartData = {
      labels: labels.map(l => dayjs(l).format(interval === 'day' ? 'MMM D' : interval === 'week' ? '[W]w' : 'MMM')),
      datasets: [{
        label: 'Current',
        data,
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 2,
        fill: false,
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: card.display.showLegend, labels: { boxWidth: 8, color: '#64748b', font: { size: 10, weight: 600 } } },
        tooltip: { backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#f8fafc' }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)' }, border: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } },
        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } }
      }
    };

    return { chartData, options };
  }, [currentData, card, colors]);

  const renderTable = () => {
    return (
      <div className="overflow-x-auto h-[200px] border border-gray-100 dark:border-slate-800 rounded">
        <table className="w-full text-[10px] text-left border-collapse">
          <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 z-10">
            <tr className="uppercase tracking-widest text-gray-400 dark:text-slate-500 font-bold">
              <th className="px-3 py-2">Extension</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
            {currentData.slice(0, 50).map((review, idx) => (
              <tr key={`${review.id}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition">
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-slate-200 truncate max-w-[120px]">{review.extensionName}</td>
                <td className="px-3 py-2 uppercase font-bold text-[8px] text-gray-500 dark:text-slate-500">{review.status.replace('_', ' ')}</td>
                <td className="px-3 py-2 text-gray-400 dark:text-slate-600">{dayjs(review[card.filters.dateField] || review.dateSubmitted).format('MMM D')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {currentData.length === 0 && (
          <div className="text-center py-10 text-gray-400 italic text-xs">No records found</div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={cn(
        "bg-white dark:bg-slate-950 rounded-lg p-8 border transition-all duration-200 group flex flex-col h-full relative",
        isSelected 
          ? "border-black dark:border-white shadow-lg ring-1 ring-black dark:ring-white/20" 
          : "border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md",
        isEditMode && "cursor-default ring-2 ring-gray-50 dark:ring-slate-900 ring-offset-2 dark:ring-offset-slate-950"
      )}
      onClick={() => isEditMode && onSelect()}
    >
      {isSampleData && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[7px] font-bold uppercase tracking-widest pointer-events-none">
          Placeholder
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 max-w-full">
          {isEditMode && <GripVertical className="drag-handle w-5 h-5 text-gray-200 cursor-grab active:cursor-grabbing hover:text-black transition flex-shrink-0" />}
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest truncate">{card.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {!isEditMode && (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowInfo(true); }}
              className="p-1.5 text-gray-300 hover:text-black hover:bg-gray-50 rounded transition lg:opacity-0 lg:group-hover:opacity-100"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
          {isEditMode && (
            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded transition"
                title="Configure Card"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              {onDuplicate && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition"
                  title="Duplicate Card"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                title="Delete Card"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-[160px]">
        {card.vizType === 'kpi' && renderKPI()}
        {(card.vizType === 'bar' || card.vizType === 'line' || card.vizType === 'pie') && (
           <div 
             className="relative group/chart cursor-zoom-in" 
             onClick={(e) => { e.stopPropagation(); setShowEnlarged(true); }}
           >
             <div className="absolute inset-0 bg-white/0 group-hover/chart:bg-black/5 flex items-center justify-center transition-colors z-10 rounded">
               <Maximize2 className="w-6 h-6 text-black opacity-0 group-hover/chart:opacity-100 transition-opacity translate-y-2 group-hover/chart:translate-y-0 duration-200" />
             </div>
             {card.vizType === 'pie' ? (
                <div className="h-[200px] w-full flex items-center justify-center">
                  <Doughnut data={chartInfo.chartData} options={chartInfo.options} />
                </div>
             ) : (
                <div className="h-[200px]">
                  {card.vizType === 'bar' ? (
                    <Bar data={chartInfo.chartData} options={chartInfo.options} />
                  ) : (
                    <Line data={chartInfo.chartData} options={chartInfo.options} />
                  )}
                </div>
             )}
           </div>
        )}
        {card.vizType === 'leaderboard' && renderLeaderboard()}
        {card.vizType === 'days' && renderDays()}
        {card.vizType === 'table' && renderTable()}
      </div>

      <DetailModal 
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        data={currentData}
        title={card.title}
      />

      <InfoModal 
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        card={card}
        reviews={reviews}
        globalExcludeListing={globalExcludeListing}
        data={currentData}
        theme={theme}
      />

      <EnlargedChartModal 
        isOpen={showEnlarged}
        onClose={() => setShowEnlarged(false)}
        chartData={chartInfo.chartData}
        options={chartInfo.options}
        vizType={card.vizType}
        title={card.title}
        theme={theme}
      />

      {(card.display.showTotal && (card.vizType === 'bar' || card.vizType === 'line' || card.vizType === 'table')) && (
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-900 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
          <span>Aggregate Sum:</span>
          <span className="text-black dark:text-white ml-1 bg-gray-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-800 shadow-sm">
            {currentData.length.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
