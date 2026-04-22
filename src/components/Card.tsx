import { useMemo } from 'react';
import { CardConfig, EWReview } from '../types';
import { applyFilters, resolveWindows } from '../services/dataStore';
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
import { Settings, Trash2, GripVertical, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

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
  isEditMode: boolean;
  isSelected: boolean;
  isSampleData: boolean;
  onSelect: () => void;
  onDelete: () => void | Promise<void>;
}

export default function Card({
  card,
  reviews,
  globalExcludeListing,
  isEditMode,
  isSelected,
  isSampleData,
  onSelect,
  onDelete
}: CardProps) {
  const { currentData, prevData, windows } = useMemo(() => {
    const wins = resolveWindows(card.filters, card.comparison);
    const current = applyFilters(reviews, card, wins.current, globalExcludeListing);
    const prev = wins.previous ? applyFilters(reviews, card, wins.previous, globalExcludeListing) : null;
    return { currentData: current, prevData: prev, windows: wins };
  }, [reviews, card, globalExcludeListing]);

  const renderKPI = () => {
    const currentCount = currentData.length;
    const prevCount = prevData?.length ?? 0;
    const delta = prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : 0;

    return (
      <div className="flex flex-col items-center justify-center py-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-light tracking-tight text-gray-900 dark:text-white mb-2"
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
            {currentData.slice(0, 50).map((review) => (
              <tr key={review.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition">
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-slate-200 truncate max-w-[120px]">{review.extensionName}</td>
                <td className="px-3 py-2 uppercase font-bold text-[8px] text-gray-500 dark:text-slate-500">{review.status.replace('_', ' ')}</td>
                <td className="px-3 py-2 text-gray-400 dark:text-slate-600">{dayjs(review[card.filters.dateField]).format('MMM D')}</td>
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

  const renderChart = () => {
    if (card.vizType === 'pie') {
      const grouped = currentData.reduce((acc, curr) => {
        const key = card.display.groupBy === 'reviewer' ? (curr.reviewerName || 'Unassigned') : curr.status;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const labels = Object.keys(grouped);
      const data = Object.values(grouped);

      return (
        <div className="h-[200px] w-full flex items-center justify-center">
          <Doughnut 
            data={{
              labels,
              datasets: [{
                data,
                backgroundColor: [
                  '#111827', '#4B5563', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#000000'
                ],
                borderWidth: 0,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '70%',
              plugins: {
                legend: {
                  display: card.display.showLegend,
                  position: 'right',
                  labels: { boxWidth: 12, usePointStyle: true, padding: 10, font: { size: 10 } }
                }
              }
            }}
          />
        </div>
      );
    }

    // Logic for Bar/Line charts - grouping real data by date
    const dateRange = windows.current.to.diff(windows.current.from, 'day') + 1;
    const interval = dateRange > 180 ? 'month' : dateRange > 35 ? 'week' : 'day';
    
    // Group current
    const currentGrouped = currentData.reduce((acc, curr) => {
      const key = dayjs(curr[card.filters.dateField]).startOf(interval).format('YYYY-MM-DD');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Construct labels list
    const labels: string[] = [];
    let it = windows.current.from.startOf(interval);
    while (it.isSameOrBefore(windows.current.to)) {
      labels.push(it.format('YYYY-MM-DD'));
      it = it.add(1, interval);
    }

    const data = labels.map(l => currentGrouped[l] || 0);

    const chartData = {
      labels: labels.map(l => dayjs(l).format(interval === 'day' ? 'MMM D' : interval === 'week' ? '[W]w' : 'MMM')),
      datasets: [
        {
          label: 'Current',
          data,
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          tension: 0.1,
          pointRadius: 0,
          borderWidth: 2,
          fill: false,
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { 
          display: card.display.showLegend, 
          labels: { 
            boxWidth: 8, 
            color: '#64748b',
            font: { size: 10, weight: 600 } 
          } 
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f8fafc',
          bodyColor: '#f8fafc',
        }
      },
      scales: {
        y: { 
          beginAtZero: true, 
          grid: { color: 'rgba(148, 163, 184, 0.1)' }, 
          border: { display: false }, 
          ticks: { color: '#64748b', font: { size: 9 } } 
        },
        x: { 
          grid: { display: false }, 
          border: { display: false }, 
          ticks: { color: '#64748b', font: { size: 9 } } 
        }
      }
    };

    return (
      <div className="h-[200px]">
        {card.vizType === 'bar' ? (
          <Bar data={chartData} options={options} />
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    );
  };

  const renderLeaderboard = () => {
    const reviewers = currentData.reduce((acc, curr) => {
      if (curr.reviewerName) {
        acc[curr.reviewerName] = (acc[curr.reviewerName] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(reviewers)
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
              className="absolute left-0 top-0 bottom-0 bg-blue-50/50 dark:bg-blue-900/20 rounded-md transition-all duration-500"
              style={{ width: `${(Number(count) / Math.max(1, Number(maxCount))) * 100}%` }}
            />
          </div>
        )) : (
          <div className="text-center py-10 text-slate-400 text-xs italic">No reviewer data in this slice</div>
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
        {isEditMode && (
          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded transition"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[160px]">
        {card.vizType === 'kpi' && renderKPI()}
        {(card.vizType === 'bar' || card.vizType === 'line' || card.vizType === 'pie') && renderChart()}
        {card.vizType === 'leaderboard' && renderLeaderboard()}
        {card.vizType === 'table' && renderTable()}
      </div>

      {(card.display.showTotal && (card.vizType === 'bar' || card.vizType === 'line' || card.vizType === 'table')) && (
        <div className="mt-6 pt-6 border-t border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          Total requests: <span className="text-black ml-1">{currentData.length.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
