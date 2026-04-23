import { useState } from 'react';
import { EWReview } from '../types';
import { Search, Filter, Database, X, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import dayjs from 'dayjs';
import { getDateRange } from '../services/dataStore';

interface LatestDataViewProps {
  data: EWReview[];
  onOpenDataSources: () => void;
  theme: 'light' | 'dark';
}

export default function LatestDataView({ data, onOpenDataSources, theme }: LatestDataViewProps) {
  const [filters, setFilters] = useState({
    extensionName: '',
    developer: '',
    status: 'all',
    dateSubmitted: 'all',
    dateSubmittedCustom: '',
    dateReviewed: 'all',
    dateReviewedCustom: '',
    reviewerName: ''
  });
  const [configInput, setConfigInput] = useState('');
  const [appliedConfig, setAppliedConfig] = useState<any>(null);
  const [sortField, setSortField] = useState<keyof EWReview>('dateSubmitted');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const dateOptions = [
    { label: 'All Time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: '30 Days', value: '30' },
    { label: '90 Days', value: '90' },
    { label: '120 Days', value: '120' },
    { label: '365 Days', value: '365' },
    { label: 'Custom Search', value: 'custom' },
  ];

  const checkDateFilter = (timestamp: any, period: string, custom: string) => {
    if (period === 'all') return true;
    if (timestamp === null || timestamp === undefined) return false;
    
    // Normalize period keys between view and card config
    let normalizedPeriod = period;
    if (['30', '60', '90', '120', '365'].includes(period)) {
      normalizedPeriod = `past_${period}`;
    }

    if (normalizedPeriod === 'custom') {
      const searchStr = custom.toLowerCase().trim();
      if (!searchStr) return true;
      const d = dayjs(timestamp).format('YYYY-MM-DD');
      return d.includes(searchStr);
    }

    const range = getDateRange(normalizedPeriod);
    if (!range) return true;
    return timestamp >= range.start && timestamp <= range.end;
  };

  const handleApplyConfig = () => {
    try {
      const parsed = JSON.parse(configInput);
      setAppliedConfig(parsed);
      // We don't alert here to keep it clean, but we set the state
    } catch (e) {
      alert('Invalid JSON Configuration');
    }
  };

  const clearConfig = () => {
    setAppliedConfig(null);
    setConfigInput('');
  };

  const filteredData = data.filter(item => {
    // If a JSON config is applied, check its filters too
    if (appliedConfig && appliedConfig.filters) {
      const f = appliedConfig.filters;
      
      // Status logic
      if (f.status && Array.isArray(f.status) && f.status.length > 0) {
        if (!f.status.includes(item.status)) return false;
      }

      // Reviewer logic
      if (f.reviewerIds && f.reviewerIds.length > 0 && item.reviewerName && !f.reviewerIds.includes(item.reviewerName)) return false;

      // Listing page logic
      const listingMode = f.listingPageMode || 'both';
      if (listingMode === 'exclude' && item.isListingPage) return false;
      if (listingMode === 'only' && !item.isListingPage) return false;

      // Date filtering for config (Submitted)
      if (f.submittedPeriod && f.submittedPeriod !== 'all_time') {
        const range = getDateRange(f.submittedPeriod);
        if (range) {
          const ts = item.dateSubmitted;
          if (ts == null || ts < range.start || ts > range.end) return false;
        }
      }

      // Date filtering for config (Reviewed)
      if (f.reviewedPeriod && f.reviewedPeriod !== 'all_time') {
        const range = getDateRange(f.reviewedPeriod);
        if (range) {
          const ts = item.dateReviewed;
          if (ts == null || ts < range.start || ts > range.end) return false;
        }
      }
    }

    const matchesExtension = item.extensionName.toLowerCase().includes(filters.extensionName.toLowerCase());
    const matchesDeveloper = (item.developer || '').toLowerCase().includes(filters.developer.toLowerCase());
    const matchesStatus = filters.status === 'all' || item.status.toLowerCase() === filters.status.toLowerCase();
    const matchesReviewer = (item.reviewerName || '').toLowerCase().includes(filters.reviewerName.toLowerCase());
    
    const matchesSubmitted = checkDateFilter(item.dateSubmitted, filters.dateSubmitted, filters.dateSubmittedCustom);
    const matchesReviewed = checkDateFilter(item.dateReviewed, filters.dateReviewed, filters.dateReviewedCustom);
    
    return matchesExtension && matchesDeveloper && matchesStatus && matchesReviewer && matchesSubmitted && matchesReviewed;
  }).sort((a, b) => {
    const valA = (a[sortField] as string) || '';
    const valB = (b[sortField] as string) || '';
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: keyof EWReview) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const statuses = Array.from(new Set(data.map(d => d.status))).sort();

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className={cn("text-lg font-bold tracking-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>Latest Data Feed</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Paste Card JSON..."
              value={configInput}
              onChange={(e) => setConfigInput(e.target.value)}
              className={cn(
                "w-48 px-3 py-2 text-[10px] border rounded outline-none focus:ring-1 focus:ring-blue-500",
                theme === 'dark' ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-gray-200"
              )}
            />
            <button
              onClick={handleApplyConfig}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Debug JSON
            </button>
            {appliedConfig && (
              <button
                onClick={clearConfig}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                title="Clear Debug Config"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={onOpenDataSources}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition shadow-sm"
          >
            <Database className="w-4 h-4" />
            <span>Data Sources</span>
          </button>
        </div>
      </div>

      <div className={cn(
        "flex-1 border rounded-xl overflow-hidden flex flex-col shadow-sm",
        theme === 'dark' ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200"
      )}>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-10">
              <tr className={cn(
                "border-b",
                theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-gray-50 border-gray-100"
              )}>
                {[
                  { key: 'extensionName', label: 'Extension', filterType: 'text' },
                  { key: 'developer', label: 'Developer', filterType: 'text' },
                  { key: 'status', label: 'Status', filterType: 'select', options: statuses },
                  { key: 'dateSubmitted', label: 'Submitted', filterType: 'date' },
                  { key: 'dateReviewed', label: 'Reviewed', filterType: 'date' },
                  { key: 'reviewerName', label: 'Reviewer', filterType: 'text' }
                ].map((col) => (
                  <th key={col.label} className="p-4 align-top">
                    <div 
                      onClick={() => toggleSort(col.key as keyof EWReview)}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-blue-500 transition whitespace-nowrap mb-3"
                    >
                      {col.label}
                      {sortField === col.key && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                    
                    {col.filterType === 'text' && (
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="text"
                          value={(filters as any)[col.key]}
                          onChange={(e) => handleFilterChange(col.key, e.target.value)}
                          placeholder="Search..."
                          className={cn(
                            "w-full pl-6 pr-2 py-1.5 text-[10px] border rounded outline-none focus:ring-1 focus:ring-blue-500",
                            theme === 'dark' ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-gray-200"
                          )}
                        />
                      </div>
                    )}

                    {col.filterType === 'select' && (
                      <select
                        value={(filters as any)[col.key]}
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        className={cn(
                          "w-full px-2 py-1.5 text-[10px] border rounded outline-none appearance-none focus:ring-1 focus:ring-blue-500",
                          theme === 'dark' ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-gray-200"
                        )}
                      >
                        <option value="all">All</option>
                        {col.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    )}

                    {col.filterType === 'date' && (
                      <div className="space-y-2">
                        <select
                          value={(filters as any)[col.key]}
                          onChange={(e) => handleFilterChange(col.key, e.target.value)}
                          className={cn(
                            "w-full px-2 py-1.5 text-[10px] border rounded outline-none appearance-none focus:ring-1 focus:ring-blue-500",
                            theme === 'dark' ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-gray-200"
                          )}
                        >
                          {dateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        {(filters as any)[col.key] === 'custom' && (
                          <input
                            type="text"
                            placeholder="YYYY-MM-DD..."
                            value={(filters as any)[`${col.key}Custom`]}
                            onChange={(e) => handleFilterChange(`${col.key}Custom`, e.target.value)}
                            className={cn(
                              "w-full px-2 py-1.5 text-[10px] border rounded outline-none focus:ring-1 focus:ring-blue-500",
                              theme === 'dark' ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-gray-200"
                            )}
                          />
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className={cn("p-10 text-center text-sm italic", theme === 'dark' ? "text-slate-500" : "text-gray-400")}>
                    No records found matching filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className={cn("hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition", theme === 'dark' ? "text-slate-300" : "text-gray-700")}>
                    <td className="p-4 text-xs font-semibold">
                      <div className="flex flex-col">
                        <span>{item.extensionName}</span>
                        <span className="text-[10px] opacity-50 font-normal">{item.version}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs">{item.developer}</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                        item.status === 'Approved' ? "bg-green-100 text-green-700" : 
                        item.status === 'Denied' ? "bg-red-100 text-red-700" : 
                        item.status === 'Reviewing' ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-[11px] font-mono whitespace-nowrap">{item.dateSubmitted ? dayjs(item.dateSubmitted).format('YYYY-MM-DD HH:mm') : '-'}</td>
                    <td className="p-4 text-[11px] font-mono whitespace-nowrap">{item.dateReviewed ? dayjs(item.dateReviewed).format('YYYY-MM-DD HH:mm') : '-'}</td>
                    <td className="p-4 text-xs">{item.reviewerName || <span className="opacity-30 italic">Unassigned</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={cn(
          "p-4 border-t text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between items-center shrink-0",
          theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-gray-50 border-gray-100"
        )}>
          <span>Showing {filteredData.length} records</span>
          <span>Source: {data.length > 0 ? 'Live Review Feed' : 'No Data'}</span>
        </div>
      </div>
    </div>
  );
}
