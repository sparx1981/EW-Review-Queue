import { useMemo, useState, useEffect, useRef } from 'react';
import { CardConfig, EWReview, Dashboard } from '../types';
import { applyFilters, getFilterSteps, getDateRange, getPreviousDateRange } from '../services/dataStore';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import ReactMarkdown from 'react-markdown';

dayjs.extend(isSameOrBefore);

const getComparisonLabel = (period: string) => {
  switch (period) {
    case 'last_year': return 'Last Year';
    case 'last_month': return 'Last Month';
    case 'last_week': return 'Last Week';
    default: return 'Previous Period';
  }
};
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
import { Settings, Trash2, GripVertical, TrendingUp, TrendingDown, Minus, Plus, X, Info, Download, Filter, Maximize2, Copy, Check, FileText, Send, Eraser, MessageSquareCode } from 'lucide-react';
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
  globalColorScheme?: Dashboard['colorScheme'];
  isEditMode: boolean;
  isSelected: boolean;
  isSampleData: boolean;
  onSelect: () => void;
  onUpdate?: (update: Partial<CardConfig>) => void;
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

  const prevSubRange = getPreviousDateRange(subPeriod, comparison.period);
  const prevRevRange = getPreviousDateRange(revPeriod, comparison.period);

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
                  <div className="bg-slate-900 rounded-lg p-3 flex flex-col items-center justify-center font-mono text-[10px] border border-slate-800">
                    <div className="text-blue-400">{subRange ? `${dayjs(subRange.start).format('YYYY-MM-DD')} to ${dayjs(subRange.end).format('YYYY-MM-DD')}` : 'ALL TIME'}</div>
                    {comparison?.enabled && prevSubRange && (
                       <div className="text-blue-400/50 mt-1">Prev: {dayjs(prevSubRange.start).format('YYYY-MM-DD')} to {dayjs(prevSubRange.end).format('YYYY-MM-DD')}</div>
                    )}
                  </div>
                </section>
                <section>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Resolved Review Range</h4>
                  <div className="bg-slate-900 rounded-lg p-3 flex flex-col items-center justify-center font-mono text-[10px] border border-slate-800">
                    <div className="text-emerald-400">{revRange ? `${dayjs(revRange.start).format('YYYY-MM-DD')} to ${dayjs(revRange.end).format('YYYY-MM-DD')}` : 'ALL TIME'}</div>
                    {comparison?.enabled && prevRevRange && (
                       <div className="text-emerald-400/50 mt-1">Prev: {dayjs(prevRevRange.start).format('YYYY-MM-DD')} to {dayjs(prevRevRange.end).format('YYYY-MM-DD')}</div>
                    )}
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
    theme,
    card
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    chartData: any; 
    options: any; 
    vizType: string;
    title: string;
    theme?: 'light' | 'dark';
    card: CardConfig;
  }) => {
  const modalChartData = useMemo(() => {
    if (!chartData || theme !== 'light') return chartData;
    
    const comparisonLabel = getComparisonLabel(card.comparison.period || 'previous_period');
    
    // In light mode modal, we want the comparison series to BE light grey regardless of theme/scheme
    const newDatasets = chartData.datasets.map((ds: any) => {
      if (ds.label === comparisonLabel) {
        return {
          ...ds,
          backgroundColor: vizType === 'bar' ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
          borderColor: '#d1d5db', // Light grey
        };
      }
      return ds;
    });

    return { ...chartData, datasets: newDatasets };
  }, [chartData, theme, vizType, card.comparison.period]);

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
            <div className="flex-1 min-h-[450px] w-full">
              {vizType === 'bar' && <Bar data={modalChartData} options={{ ...options, maintainAspectRatio: false, plugins: { ...options.plugins, legend: { ...options.plugins.legend, labels: { ...options.plugins.legend.labels, font: { size: 12, weight: 600 } } } } }} />}
              {vizType === 'line' && <Line data={modalChartData} options={{ ...options, maintainAspectRatio: false, plugins: { ...options.plugins, legend: { ...options.plugins.legend, labels: { ...options.plugins.legend.labels, font: { size: 12, weight: 600 } } } } }} />}
              {vizType === 'pie' && <Doughnut data={modalChartData} options={{ ...options, maintainAspectRatio: false }} />}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const ChatModal = ({ isOpen, onClose, messages, onSend, onClear, isLoading, theme }: { 
  isOpen: boolean; 
  onClose: () => void; 
  messages: { role: 'user' | 'ai', text: string }[];
  onSend: (text: string) => void;
  onClear: () => void;
  isLoading: boolean;
  theme: 'light' | 'dark' 
}) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
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
            className={cn(
              "rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col relative z-20 border",
              theme === 'dark' ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200"
            )}
          >
            <div className={cn(
               "px-8 py-6 border-b flex items-center justify-between",
               theme === 'dark' ? "bg-slate-950 border-slate-900" : "bg-white border-gray-100"
            )}>
              <div className="flex items-center gap-3">
                <MessageSquareCode className="w-5 h-5 text-blue-500" />
                <h3 className={cn(
                  "text-xl font-bold tracking-tight",
                  theme === 'dark' ? "text-white" : "text-gray-900"
                )}>AI Data Chat</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={onClear}
                  className="p-2 text-gray-400 hover:text-red-500 transition"
                  title="Clear Chat"
                >
                  <Eraser className="w-5 h-5" />
                </button>
                <button 
                  onClick={onClose}
                  className={cn(
                    "p-2.5 text-gray-400 transition rounded-xl",
                    theme === 'dark' ? "bg-slate-900 hover:text-white" : "bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className={cn(
              "flex-1 overflow-auto p-8 space-y-6",
              theme === 'dark' ? "bg-slate-900/10" : "bg-white"
            )}>
              {messages.length === 0 && !isLoading && (
                <div className={cn(
                  "h-full flex flex-col items-center justify-center text-center opacity-40",
                  theme === 'dark' ? "text-slate-400" : "text-gray-500"
                )}>
                  <MessageSquareCode className="w-12 h-12 mb-4" />
                  <p className="text-sm font-medium">Ask anything about the full dataset.</p>
                  <p className="text-[10px] uppercase tracking-widest mt-1">E.g. "Who has the most approvals this month?"</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "flex flex-col max-w-[85%]",
                  m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm",
                    m.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none shadow-md" 
                      : cn(
                        "border rounded-tl-none shadow-sm",
                        theme === 'dark' 
                          ? "bg-slate-900 text-slate-200 border-slate-800" 
                          : "bg-gray-50 text-gray-800 border-gray-100"
                      )
                  )}>
                    <div className={cn(
                      "prose prose-sm max-w-none",
                      theme === 'dark' ? "dark:prose-invert" : ""
                    )}>
                      <ReactMarkdown>{m.text || ''}</ReactMarkdown>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 mt-1.5 px-1">
                    {m.role === 'user' ? 'You' : 'Dashboard AI'}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="flex flex-col mr-auto items-start">
                  <div className={cn(
                    "px-4 py-3 border rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2",
                    theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
                  )}>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className={cn(
              "p-6 border-t",
              theme === 'dark' ? "bg-slate-950 border-slate-900" : "bg-white border-gray-100"
            )}>
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  className={cn(
                    "w-full border rounded-2xl px-6 py-4 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition",
                    theme === 'dark' 
                      ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500" 
                      : "bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400"
                  )}
                  disabled={isLoading}
                />
                <div className="absolute right-3 flex items-center gap-2">
                  <button 
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const SummaryModal = ({ isOpen, onClose, summary, title, theme }: { isOpen: boolean; onClose: () => void; summary: string | null; title: string; theme: 'light' | 'dark' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
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
            className="bg-slate-950 text-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col relative z-20 border border-slate-800"
          >
            <div className="px-8 py-6 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                {title} Summary
              </h3>
              <button 
                onClick={onClose}
                className="p-2.5 bg-slate-900 text-white hover:text-white rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-10 text-base leading-relaxed text-white">
              <div className="prose prose-invert max-w-none [&_*]:text-white!">
                <ReactMarkdown>{summary || 'No summary available.'}</ReactMarkdown>
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between border-t border-slate-900">
              <span>AI-Generated Analysis</span>
              <span>Proprietary Insights Agent</span>
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
  onUpdate,
  onDuplicate,
  onDelete,
  theme = 'light'
}: CardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showEnlarged, setShowEnlarged] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  const colors = useMemo(() => {
    const scheme = globalColorScheme || card.display.colorScheme || 'blue';
    const mapping: Record<string, string> = {
      blue: '#3b82f6',
      green: '#10b981',
      red: '#ef4444',
      amber: '#f59e0b',
      multi: '#8b5cf6',
      pastel: '#60A5FA',
      warm: '#F59E0B',
      midnight: '#A855F7',
      forest: '#059669',
      slate: '#F97316'
    };

    const palette: Record<string, string[]> = {
      blue: ['#3b82f6', '#93c5fd', '#1d4ed8', '#60a5fa'],
      green: ['#10b981', '#6ee7b7', '#047857', '#34d399'],
      red: ['#ef4444', '#f87171', '#b91c1c', '#fca5a5'],
      amber: ['#f59e0b', '#fbbf24', '#b45309', '#fcd34d'],
      multi: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'],
      pastel: ['#D1FAE5', '#FCE7F3', '#FEF3C7', '#EDE9FE', '#DBEAFE'],
      warm: ['#FDE68A', '#1F2937', '#6B7280', '#FFFBEB'],
      midnight: ['#A855F7', '#22D3EE', '#818CF8', '#C084FC', '#4B5563'],
      forest: ['#D1FAE5', '#F97316', '#06B6D4', '#65A30D', '#CA8A04'],
      slate: ['#F39C12', '#464646', '#7F8C8D', '#BDC3C7', '#2C3E50']
    };

    const cardStyles: Record<string, { bg: string, text: string, border: string }> = {
      blue: { bg: theme === 'dark' ? 'bg-slate-900' : 'bg-white', text: theme === 'dark' ? 'text-slate-100' : 'text-slate-900', border: 'border-slate-200 dark:border-slate-800' },
      green: { bg: theme === 'dark' ? 'bg-slate-900' : 'bg-white', text: theme === 'dark' ? 'text-slate-100' : 'text-slate-900', border: 'border-slate-200 dark:border-slate-800' },
      red: { bg: theme === 'dark' ? 'bg-slate-900' : 'bg-white', text: theme === 'dark' ? 'text-slate-100' : 'text-slate-900', border: 'border-slate-200 dark:border-slate-800' },
      amber: { bg: theme === 'dark' ? 'bg-slate-900' : 'bg-white', text: theme === 'dark' ? 'text-slate-100' : 'text-slate-900', border: 'border-slate-200 dark:border-slate-800' },
      multi: { bg: theme === 'dark' ? 'bg-slate-800' : 'bg-white', text: theme === 'dark' ? 'text-white' : 'text-slate-900', border: 'border-slate-200 dark:border-white/10' },
      pastel: { bg: card.display.colorScheme === 'blue' ? 'bg-[#D0E8E3]' : card.display.colorScheme === 'red' ? 'bg-[#FDCFE1]' : 'bg-white', text: 'text-slate-900', border: 'border-transparent' },
      warm: { bg: card.display.colorScheme === 'amber' ? 'bg-[#FFD93D]' : 'bg-white', text: 'text-slate-900', border: 'border-slate-200' },
      midnight: { bg: 'bg-[#1A1C26]', text: 'text-slate-100', border: 'border-white/5' },
      forest: { bg: 'bg-white', text: 'text-slate-900', border: 'border-slate-100' },
      slate: { bg: 'bg-[#F3F3F3]', text: 'text-[oklch(0.42_0.01_0)]', border: 'border-[#E0E0E0]' }
    };

    return {
      primary: mapping[scheme] || '#3b82f6',
      bgOpacity: scheme === 'multi' ? 'rgba(139, 92, 246, 0.1)' : `${mapping[scheme] || '#3b82f6'}1a`,
      palette: palette[scheme] || palette.blue,
      card: cardStyles[scheme] || cardStyles.blue,
      isLight: scheme === 'pastel' || scheme === 'warm' || scheme === 'forest' || scheme === 'slate' || (theme === 'light' && (scheme === 'blue' || scheme === 'green' || scheme === 'red' || scheme === 'amber' || scheme === 'multi'))
    };
  }, [globalColorScheme, card.display.colorScheme, theme]);

  const isLightCard = colors.isLight;

  const { currentData, prevData } = useMemo(() => {
    const current = applyFilters(reviews, card, globalExcludeListing);
    if (!card.comparison.enabled) return { currentData: current, prevData: [] };

    const overrideOptions: any = {};
    const subP = card.filters.submittedPeriod || (card.filters as any).period || 'all_time';
    const revP = card.filters.reviewedPeriod || 'all_time';
    const comparisonMode = card.comparison.period || 'previous_period';
    
    if (subP && subP !== 'all_time') {
      overrideOptions.overrideSubRange = getPreviousDateRange(subP, comparisonMode);
    }
    if (revP && revP !== 'all_time') {
      overrideOptions.overrideRevRange = getPreviousDateRange(revP, comparisonMode);
    }
    
    const previous = applyFilters(reviews, card, globalExcludeListing, overrideOptions);
    return { currentData: current, prevData: previous };
  }, [reviews, card, globalExcludeListing]);

  const generateSummary = async (signal?: AbortSignal) => {
    if (card.vizType !== 'summary') return;
    setSummaryLoading(true);
    setSummaryError(null);

    // ── Trim data to essential fields to prevent 413 Payload Too Large ──
    const trim = (records: EWReview[]) => {
      if (!records) return [];
      // Only keep fields used by the backend's summarizeData logic
      return records.map(r => ({
        status: r.status,
        dateSubmitted: r.dateSubmitted,
        dateReviewed: r.dateReviewed,
        reviewerName: r.reviewerName,
        developer: r.developer,
        reviewerFeedback: r.reviewerFeedback
      }));
    };

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentData: trim(currentData),
          prevData: trim(prevData),
          title: card.title,
          config: {
            comparisonEnabled: card.comparison.enabled,
            period: card.comparison.period
          }
        }),
        signal
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to generate summary';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errData = await response.json();
            errorMessage = errData.error || errorMessage;
          } catch (e) {
            // Ignore parse error
          }
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Summary error:', err);
        setSummaryError(err.message);
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (card.vizType !== 'summary') return;
    const controller = new AbortController();
    generateSummary(controller.signal);
    return () => controller.abort();
  }, [card.vizType, currentData, prevData, card.title, card.comparison.enabled, card.comparison.period]);

  const handleResize = (dimension: 'w' | 'h', delta: number) => {
    if (!onUpdate) return;
    const current = card[dimension] || 1;
    const next = Math.max(1, Math.min(4, current + delta));
    if (next !== current) {
      onUpdate({ [dimension]: next });
    }
  };

  const handleRetrySummary = (e: React.MouseEvent) => {
    e.stopPropagation();
    generateSummary();
  };

  const handleSendMessage = async (input: string) => {
    if (!input.trim() || isChatLoading) return;
    
    // Trim data used for analysis to prevent 413 Payload Too Large
    const trim = (records: EWReview[]) => {
      if (!records) return [];
      return records.map(r => ({
        status: r.status,
        reviewerName: r.reviewerName,
        developer: r.developer,
        dateSubmitted: r.dateSubmitted,
        dateReviewed: r.dateReviewed,
        extensionName: r.extensionName,
        reviewerFeedback: r.reviewerFeedback
      }));
    };

    const newUserMessage = { role: 'user' as const, text: input };
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsChatLoading(true);
    
    let attempts = 0;
    const maxAttempts = 3;
    let finalResponse = "";

    while (attempts < maxAttempts) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullData: trim(reviews), 
            question: input,
            history: chatMessages
          })
        });
        
        if (!response.ok) throw new Error('Chat failed');
        
        const data = await response.json();
        const text = data.response;

        if (text && text !== "No response generated.") {
          finalResponse = text;
          break;
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            // Small delay between retries
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (err: any) {
        console.error('Chat error attempt', attempts + 1, err);
        attempts++;
        if (attempts >= maxAttempts) {
          finalResponse = `Error: ${err.message || 'Failed to connect to AI service.'}`;
        }
        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!finalResponse || finalResponse === "No response generated." || finalResponse === "No text response generated by AI.") {
      const detail = finalResponse ? ` (AI detail: ${finalResponse})` : "";
      finalResponse = `I'm sorry, I was unable to generate a narrative response after ${maxAttempts} attempts${detail}. This may happen if the data query was too complex or returned no results. Try rephrasing your question.`;
    }

    setChatMessages(prev => [...prev, { role: 'ai', text: finalResponse }]);
    setIsChatLoading(false);
  };

  const renderChat = () => {
    return (
      <div className="flex flex-col h-full space-y-4">
        <div 
          className={cn(
            "flex-1 min-h-0 rounded-2xl p-4 overflow-y-auto custom-scrollbar cursor-pointer relative border shadow-sm transition-colors",
            theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
          )}
          onClick={() => setShowChatModal(true)}
        >
          {chatMessages.length === 0 ? (
            <div className={cn(
              "h-full flex flex-col items-center justify-center text-center opacity-30",
              theme === 'dark' ? "text-slate-400" : "text-gray-500"
            )}>
              <MessageSquareCode className="w-8 h-8 mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                Expand to ask dataset questions
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {chatMessages.slice(-3).map((m, i) => (
                <div key={i} className={cn(
                  "flex flex-col",
                  m.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "px-3 py-2 rounded-xl text-[10px] max-w-[90%] leading-snug",
                    m.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none shadow-sm" 
                      : cn(
                         "border rounded-tl-none shadow-xs",
                         theme === 'dark' ? "bg-slate-800 text-slate-200 border-white/5" : "bg-gray-50 text-gray-800 border-gray-100"
                      )
                  )}>
                    {(m.text || '').length > 100 ? (m.text || '').substring(0, 100) + '...' : (m.text || '')}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-1 opacity-50 ml-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                </div>
              )}
            </div>
          )}
          <div className="absolute top-2 right-2 flex items-center gap-1">
             <button 
              onClick={(e) => { e.stopPropagation(); setChatMessages([]); }}
              className={cn(
                "p-1.5 rounded-lg transition text-gray-300 hover:text-red-500",
                theme === 'dark' ? "hover:bg-red-900/20" : "hover:bg-red-50"
              )}
              title="Clear"
            >
              <Eraser className="w-3 h-3" />
            </button>
            <Maximize2 className="w-3 h-3 text-gray-300" />
          </div>
        </div>

        <div className="flex gap-2 relative">
          <input 
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && chatInput.trim()) {
                handleSendMessage(chatInput);
                setChatInput('');
              }
            }}
            placeholder="Ask anything..."
            className={cn(
              "flex-1 border rounded-xl px-4 py-3 text-[11px] focus:ring-1 focus:ring-blue-500/50 shadow-inner transition-colors",
              theme === 'dark' 
                ? "bg-slate-900 border-slate-800 text-white placeholder:text-gray-400" 
                : "bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400"
            )}
          />
          <button 
            onClick={() => {
              if (chatInput.trim()) {
                handleSendMessage(chatInput);
                setChatInput('');
              }
            }}
            disabled={!chatInput.trim() || isChatLoading}
            className="p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition disabled:opacity-50 shadow-lg"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderKPI = () => {
    const currentCount = currentData?.length ?? 0;
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
          className="text-4xl font-light tracking-tight mb-2 group-hover/kpi:scale-105 transition-transform"
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
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1]);

    const displayCount = card.h ? (card.h * 5) : 5;
    const displayed = sorted.slice(0, displayCount);

    const maxCount = sorted.length > 0 ? sorted[0][1] : 0;

    return (
      <div className="space-y-3 py-2 h-full overflow-y-auto custom-scrollbar">
        {displayed.length > 0 ? displayed.map(([name, count], idx) => (
          <div key={name} className="relative">
            <div className="flex items-center justify-between z-10 relative px-2 py-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold",
                  idx === 0 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500" : idx === 1 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" : idx === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500" : "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-600"
                )}>
                  {idx + 1}
                </span>
                <span className={cn(
                  "text-xs font-semibold truncate max-w-[140px]",
                  isLightCard ? "text-gray-700" : "text-gray-700 dark:text-slate-300"
                )}>{name}</span>
              </div>
              <span className={cn(
                "text-[11px] font-bold",
                isLightCard ? "text-slate-900" : "text-slate-900 dark:text-slate-100"
              )}>{count}</span>
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
      const count = (currentData || []).filter(item => {
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
      <div className="space-y-4 py-2 h-full overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
          {card.filters.daysCalculation === 'processing_time' ? 'Review Time' : 'Active Age'}
        </div>
        {distribution.map((d, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className={cn(
                "font-bold uppercase tracking-widest",
                isLightCard ? "text-gray-500" : "text-gray-500 dark:text-gray-400"
              )}>{d.label}</span>
              <span className={cn(
                "font-bold",
                isLightCard ? "text-gray-900" : "text-gray-900 dark:text-white"
              )}>{d.count}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(d.count / max) * 100}%` }}
                className="h-full rounded-full transition-colors duration-500"
                style={{ backgroundColor: colors.primary }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSummary = () => {
    if (summaryLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-10 space-y-4 opacity-50 flex-1">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Analyzing trends...</div>
        </div>
      );
    }

    if (summaryError) {
      return (
        <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center flex-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-red-500">Analysis Failed</div>
          <p className="text-[11px] text-gray-400 px-4 max-w-[200px]">{summaryError}</p>
          <button 
            onClick={handleRetrySummary}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Retry Analysis
          </button>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div 
          className="flex-1 relative group/summary cursor-pointer overflow-hidden max-h-[160px]"
          onClick={(e) => { e.stopPropagation(); setShowSummaryModal(true); }}
        >
          <div className={cn(
            "text-sm leading-relaxed text-center px-2 pb-10",
            isLightCard ? "text-slate-600" : "text-slate-300"
          )}>
            <ReactMarkdown>{summary || 'Initializing analysis engine...'}</ReactMarkdown>
          </div>
          {/* Subtle fade to indicate more content */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 h-16 pointer-events-none",
            isLightCard 
              ? "bg-gradient-to-t from-white via-white/80 to-transparent" 
              : "bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"
          )} />
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowSummaryModal(true); }}
          className="mt-auto w-full py-2.5 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-blue-500 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2"
        >
          <Maximize2 className="w-3 h-3" />
          Read Full Analysis
        </button>
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
          backgroundColor: colors.palette,
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

    const interval = (card.display.groupBy === 'week' || card.display.groupBy === 'month' || card.display.groupBy === 'year') 
      ? card.display.groupBy 
      : 'day';
    
    const dateField = card.filters.dateField || 'dateSubmitted';

    // 1. Determine labels (based on current range)
    const currentGrouped = currentData.reduce((acc, curr) => {
      const key = dayjs(curr[dateField]).startOf(interval).format('YYYY-MM-DD');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // If comparison is enabled, we should also look at gaps in current that might have data in prev
    let allLabelsSet = new Set(Object.keys(currentGrouped));
    
    // Calculate the time offset for potential gap filling in labels
    const subP = card.filters.submittedPeriod || (card.filters as any).period || 'all_time';
    const revP = card.filters.reviewedPeriod || 'all_time';
    const comparisonMode = card.comparison.period || 'previous_period';
    
    // Pick the most relevant period for shifting. 
    // Prioritize the one matching the plotted dateField, but fall back to the other if it's not all_time.
    let activePeriod = dateField === 'dateReviewed' ? revP : subP;
    if (activePeriod === 'all_time') {
      activePeriod = subP !== 'all_time' ? subP : 'all_time'; 
      if (activePeriod === 'all_time') activePeriod = revP; // final fallback to whatever revP is
    }
    
    const currentRange = getDateRange(activePeriod);
    const prevRange = getPreviousDateRange(activePeriod, comparisonMode);
    let offset = 0;
    let prevGroupedShifted: Record<string, number> = {};

    if (card.comparison.enabled && prevData.length > 0 && currentRange && prevRange) {
      offset = currentRange.end - prevRange.end; // Use end to end for more safety with 'now' ranges
      prevGroupedShifted = prevData.reduce((acc, curr) => {
        const originalDate = dayjs(curr[dateField]);
        const shiftedDate = originalDate.add(offset, 'ms').startOf(interval).format('YYYY-MM-DD');
        acc[shiftedDate] = (acc[shiftedDate] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.keys(prevGroupedShifted).forEach(k => allLabelsSet.add(k));
    }

    const labels = Array.from(allLabelsSet).sort();
    const data = labels.map(l => currentGrouped[l] || 0);

    const datasets: any[] = [{
      label: 'Current Period',
      data,
      backgroundColor: card.vizType === 'bar' 
        ? (card.display.colorScheme === 'multi' ? colors.palette : colors.palette[0]) 
        : colors.primary,
      borderColor: colors.primary,
      tension: 0.1,
      pointRadius: card.vizType === 'line' ? 2 : 0,
      borderWidth: 1.5,
      fill: false,
    }];

    // 2. Add comparison dataset if enabled
    if (card.comparison.enabled && prevData.length > 0 && offset !== 0) {
      const prevDataMapped = labels.map(l => prevGroupedShifted[l] || 0);
      const isMidnightLight = theme === 'light' && (globalColorScheme === 'midnight' || card.display.colorScheme === 'midnight');
      const comparisonLabel = getComparisonLabel(card.comparison.period || 'previous_period');

      datasets.push({
        label: comparisonLabel,
        data: prevDataMapped,
        backgroundColor: card.vizType === 'bar'
          ? (theme === 'dark' ? 'rgba(226, 232, 240, 0.45)' : (isMidnightLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.08)'))
          : 'transparent',
        borderColor: theme === 'dark' ? 'rgba(248, 250, 252, 0.75)' : (isMidnightLight ? '#cbd5e1' : 'rgba(0, 0, 0, 0.3)'),
        borderDash: card.vizType === 'line' ? [5, 5] : undefined,
        pointRadius: card.vizType === 'line' ? 2 : 0,
        borderWidth: 1.5,
        tension: 0.1,
        fill: false,
      });
    }

    const chartData = {
      labels: labels.map(l => {
        const d = dayjs(l);
        if (interval === 'year') return d.format('YYYY');
        if (interval === 'month') {
          return (card.comparison.enabled && card.comparison.period === 'last_year') 
            ? d.format('MMM') 
            : d.format('MMM YYYY');
        }
        if (interval === 'week') return `WC ${d.format('MMM D')}`;
        return d.format('MMM D');
      }),
      datasets
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { 
          display: card.display.showLegend || card.comparison.enabled, 
          position: 'top' as const,
          align: 'end' as const,
          labels: { 
            boxWidth: 8, 
            boxHeight: 8,
            color: theme === 'dark' ? '#94a3b8' : '#64748b', 
            usePointStyle: true,
            padding: 15,
            font: { size: 10, weight: 600 } 
          } 
        },
        tooltip: { 
          backgroundColor: '#1e293b', 
          titleColor: '#f8fafc', 
          bodyColor: '#f8fafc',
          padding: 10,
          cornerRadius: 8,
          bodyFont: { size: 11 },
          titleFont: { size: 11, weight: 'bold' as const }
        }
      },
      scales: {
        y: { 
          beginAtZero: true, 
          grid: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)' }, 
          border: { display: false }, 
          ticks: { color: theme === 'dark' ? '#94a3b8' : '#64748b', font: { size: 9 } } 
        },
        x: { 
          grid: { display: false }, 
          border: { display: false }, 
          ticks: { color: theme === 'dark' ? '#94a3b8' : '#64748b', font: { size: 9 } } 
        }
      }
    };

    return { chartData, options };
  }, [currentData, prevData, card, colors, theme]);

  const renderTable = () => {
    return (
      <div className="overflow-x-auto h-full border border-gray-100 dark:border-slate-800 rounded">
        <table className="w-full text-[10px] text-left border-collapse">
          <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 z-10">
            <tr className="uppercase tracking-widest text-gray-400 dark:text-slate-500 font-bold">
              <th className="px-3 py-2">Extension</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
            {(currentData || []).slice(0, 50).map((review, idx) => (
              <tr key={`${review.id}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition">
                <td className={cn(
                  "px-3 py-2 font-medium truncate max-w-[120px]",
                  isLightCard ? "text-gray-900" : "text-gray-900 dark:text-slate-200"
                )}>{review.extensionName}</td>
                <td className={cn(
                  "px-3 py-2 uppercase font-bold text-[8px]",
                  isLightCard ? "text-gray-500" : "text-gray-500 dark:text-slate-500"
                )}>{review.status.replace('_', ' ')}</td>
                <td className={cn(
                  "px-3 py-2",
                  isLightCard ? "text-gray-400" : "text-gray-400 dark:text-slate-600"
                )}>{dayjs(review[card.filters.dateField] || review.dateSubmitted).format('MMM D')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {currentData?.length === 0 && (
          <div className="text-center py-10 text-gray-400 italic text-xs">No records found</div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={cn(
        "rounded-3xl p-8 transition-all duration-300 group flex flex-col h-full relative",
        colors.card.bg,
        colors.card.text,
        colors.card.border,
        "border shadow-sm hover:shadow-md",
        isSelected 
          ? "border-black dark:border-white shadow-lg ring-1 ring-black dark:ring-white/20" 
          : "",
        isEditMode && "cursor-default ring-2 ring-gray-50 dark:ring-slate-900 ring-offset-2 dark:ring-offset-slate-950",
        // Width and Height Spans
        card.w === 2 && "xl:col-span-2",
        card.w === 3 && "xl:col-span-3",
        card.w === 4 && "xl:col-span-4",
        card.h === 2 && "row-span-2",
        card.h === 3 && "row-span-3",
        card.h === 4 && "row-span-4"
      )}
      onClick={() => isEditMode && onSelect()}
    >
      {/* Resize Handles */}
      {isEditMode && (
        <>
          {/* Left / Right (Width) */}
          <div className="absolute inset-y-0 left-0 w-6 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button onClick={(e) => { e.stopPropagation(); handleResize('w', -1); }} className="p-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"><Minus className="w-2.5 h-2.5" /></button>
            <button onClick={(e) => { e.stopPropagation(); handleResize('w', 1); }} className="p-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"><Plus className="w-2.5 h-2.5" /></button>
          </div>
          <div className="absolute inset-y-0 right-0 w-6 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button onClick={(e) => { e.stopPropagation(); handleResize('w', -1); }} className="p-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"><Minus className="w-2.5 h-2.5" /></button>
            <button onClick={(e) => { e.stopPropagation(); handleResize('w', 1); }} className="p-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"><Plus className="w-2.5 h-2.5" /></button>
          </div>
          {/* Top / Bottom (Height) */}
          <div className="absolute inset-x-0 top-0 h-6 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button onClick={(e) => { e.stopPropagation(); handleResize('h', -1); }} className="p-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"><Minus className="w-2.5 h-2.5" /></button>
            <button onClick={(e) => { e.stopPropagation(); handleResize('h', 1); }} className="p-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"><Plus className="w-2.5 h-2.5" /></button>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-6 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button onClick={(e) => { e.stopPropagation(); handleResize('h', -1); }} className="p-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"><Minus className="w-2.5 h-2.5" /></button>
            <button onClick={(e) => { e.stopPropagation(); handleResize('h', 1); }} className="p-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"><Plus className="w-2.5 h-2.5" /></button>
          </div>
        </>
      )}
      {isSampleData && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[7px] font-bold uppercase tracking-widest pointer-events-none">
          Placeholder
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 max-w-full">
          {isEditMode && <GripVertical className="drag-handle w-5 h-5 text-gray-200 cursor-grab active:cursor-grabbing hover:text-black transition flex-shrink-0" />}
          <h3 className="text-[11px] font-bold uppercase tracking-widest truncate opacity-60">{card.title}</h3>
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

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {card.vizType === 'kpi' && renderKPI()}
        {(card.vizType === 'bar' || card.vizType === 'line' || card.vizType === 'pie') && (
           <div 
             className="relative group/chart cursor-zoom-in flex-1 min-h-0" 
             onClick={(e) => { e.stopPropagation(); setShowEnlarged(true); }}
           >
             <div className="absolute inset-0 bg-white/0 group-hover/chart:bg-black/5 flex items-center justify-center transition-colors z-10 rounded">
               <Maximize2 className="w-6 h-6 text-black opacity-0 group-hover/chart:opacity-100 transition-opacity translate-y-2 group-hover/chart:translate-y-0 duration-200" />
             </div>
             {card.vizType === 'pie' ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Doughnut data={chartInfo.chartData} options={chartInfo.options} />
                </div>
             ) : (
                <div className="h-full w-full">
                  {card.vizType === 'bar' ? (
                    <Bar data={chartInfo.chartData} options={chartInfo.options} />
                  ) : (
                    <Line data={chartInfo.chartData} options={chartInfo.options} />
                  )}
                </div>
             )}
           </div>
        )}
        {card.vizType === 'leaderboard' && <div className="h-full">{renderLeaderboard()}</div>}
        {card.vizType === 'days' && <div className="h-full">{renderDays()}</div>}
        {card.vizType === 'table' && <div className="h-full">{renderTable()}</div>}
        {card.vizType === 'summary' && renderSummary()}
        {card.vizType === 'chat' && <div className="h-full">{renderChat()}</div>}
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
        card={card}
      />

      <SummaryModal 
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        summary={summary}
        title={card.title}
        theme={theme}
      />

      <ChatModal 
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        messages={chatMessages}
        onSend={(q) => handleSendMessage(q)}
        onClear={() => setChatMessages([])}
        isLoading={isChatLoading}
        theme={theme}
      />

      {(card.display.showTotal && (card.vizType === 'bar' || card.vizType === 'line' || card.vizType === 'table')) && (
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-900 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
          <span>Aggregate Sum:</span>
          <div className="flex items-center gap-2 font-mono">
            {card.comparison.enabled && prevData && prevData.length > 0 && (
              <span className={cn(
                "font-bold text-[10px]",
                theme === 'dark' ? "text-slate-100 opacity-90" : "text-gray-500 opacity-100"
              )}>
                {prevData.length.toLocaleString()}
                <span className="mx-1.5 opacity-40 font-normal text-gray-500">vs</span>
              </span>
            )}
            <span 
              className={cn(
                "px-2 py-0.5 rounded border shadow-sm",
                theme === 'dark' ? "text-white bg-slate-900 border-slate-800" : "bg-gray-50 border-gray-100"
              )}
              style={{ color: theme === 'light' ? colors.primary : undefined }}
            >
              {(currentData?.length || 0).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
