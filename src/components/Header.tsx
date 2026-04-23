import { User } from 'firebase/auth';
import { Dashboard } from '../types';
import { RefreshCw, Edit3, User as UserIcon, Plus, Eye, LogOut, FileText, Share2, Moon, Sun, Terminal, Settings, LayoutGrid, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import dayjs from 'dayjs';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  user: User;
  dashboards: Dashboard[];
  activeDashboardId: string | null;
  setActiveDashboardId: (id: string) => void;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  isRefreshing: boolean;
  handleRefresh: () => void;
  lastRefreshed: Date;
  autoRefreshInterval: number | null;
  setAutoRefreshInterval: (interval: number | null) => void;
  globalExcludeListing: boolean;
  setGlobalExcludeListing: (val: boolean) => void;
  createDashboard: () => void;
  onSignOut: () => void;
  hasSession: boolean | null;
  isSampleData: boolean;
  onRenameDashboard: (id: string, name: string) => void;
  onCloseDashboard: (id: string) => void;
  onOpenDebug: () => void;
  onOpenConfig: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  colorScheme: 'blue' | 'green' | 'red' | 'amber' | 'multi';
  onUpdateColorScheme: (val: 'blue' | 'green' | 'red' | 'amber' | 'multi') => void;
  onViewLatestData: () => void;
  isLatestDataOpen: boolean;
}

export default function Header({
  user,
  dashboards,
  activeDashboardId,
  setActiveDashboardId,
  isEditMode,
  setIsEditMode,
  isRefreshing,
  handleRefresh,
  lastRefreshed,
  globalExcludeListing,
  setGlobalExcludeListing,
  createDashboard,
  onSignOut,
  hasSession,
  isSampleData,
  onRenameDashboard,
  onCloseDashboard,
  onOpenDebug,
  onOpenConfig,
  theme,
  toggleTheme,
  colorScheme,
  onUpdateColorScheme,
  onViewLatestData,
  isLatestDataOpen,
  onSaveDashboard,
  onShareDashboard,
  onOpenDashboardMenu,
  autoRefreshInterval,
  setAutoRefreshInterval
}: HeaderProps & { 
  onSaveDashboard: () => void; 
  onShareDashboard: (email: string) => void; 
  onOpenDashboardMenu: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [showShareInput, setShowShareInput] = useState(false);

  const refreshOptions = [
    { label: 'Manual Only', value: null },
    { label: 'Every 30 minutes', value: 30 },
    { label: 'Every hour', value: 60 },
    { label: 'Every 3 hours', value: 180 },
    { label: 'Every 6 hours', value: 360 },
  ];

  const handleExport = () => {
    try {
      window.print();
    } catch (e) {
      alert("Print blocked by browser environment. Please open the application in a new tab (using the button in the top right of the AIS preview) and try again.");
    }
  };

  const handleShare = () => {
    alert("Sharing functionality: Future scope allows specific user emails to be granted viewer access to this dashboard snapshot.");
  };

  return (
    <header className={cn(
      "border-b z-30 sticky top-0 print:hidden transition-colors duration-300",
      theme === 'dark' ? "bg-slate-950/80 backdrop-blur-md border-slate-800" : "bg-white/50 backdrop-blur-sm border-gray-200"
    )}>
      <div className="px-10 h-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className={cn("w-6 h-6 rounded-sm flex items-center justify-center shadow-sm", theme === 'dark' ? "bg-white" : "bg-black")}>
              <div className={cn("w-2 h-2 rounded-full", theme === 'dark' ? "bg-black" : "bg-white")}></div>
            </div>
            <span className={cn("font-semibold tracking-tight text-lg hidden sm:inline", theme === 'dark' ? "text-white" : "text-gray-900")}>Extension Warehouse - Review Queue Analytics</span>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full border",
              isSampleData ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-green-50 text-green-700 border-green-100"
            )}>
              <span className={cn("inline-block w-1.5 h-1.5 rounded-full", isRefreshing ? "bg-amber-400 animate-pulse" : (isSampleData ? "bg-amber-500" : "bg-green-500"))}></span>
              <span>{isSampleData ? 'Placeholder Data Active' : `Live Data as of ${dayjs(lastRefreshed).format('HH:mm')}`}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowRefreshMenu(!showRefreshMenu)}
              className={cn(
                "p-2 rounded transition flex items-center gap-1", 
                theme === 'dark' ? "text-slate-400 hover:text-white" : "text-gray-400 hover:text-black",
                autoRefreshInterval && "text-blue-500"
              )}
              title="Refresh Settings"
            >
              <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
              {autoRefreshInterval && <span className="text-[9px] font-bold">Auto</span>}
            </button>
            
            <AnimatePresence>
              {showRefreshMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowRefreshMenu(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xl py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Refresh Rate</p>
                    </div>
                    <button 
                      onClick={() => { handleRefresh(); setShowRefreshMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition text-left"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh Now</span>
                    </button>
                    <div className="my-1 border-t border-gray-50 dark:border-slate-800" />
                    {refreshOptions.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => {
                          setAutoRefreshInterval(opt.value);
                          setShowRefreshMenu(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2 text-xs font-semibold transition text-left flex items-center justify-between",
                          autoRefreshInterval === opt.value 
                            ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                            : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <span>{opt.label}</span>
                        {autoRefreshInterval === opt.value && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={toggleTheme}
            className={cn("p-2 rounded transition mr-2", theme === 'dark' ? "text-slate-400 hover:text-white" : "text-gray-400 hover:text-black")}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded text-xs font-medium transition mr-4",
              isEditMode 
                ? "bg-gray-100 text-black border border-gray-200" 
                : "bg-black text-white hover:bg-gray-800"
            )}
          >
            {isEditMode ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Finish</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </>
            )}
          </button>

          <div className="relative group">
            <button className="flex items-center gap-2 p-1 rounded bg-gray-100 border border-gray-200 hover:border-black transition">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-7 h-7 rounded-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-7 h-7 rounded-sm bg-black flex items-center justify-center text-white">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </button>
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <p className="text-xs font-bold text-gray-900">{user.displayName || 'Reviewer'}</p>
                <p className="text-[10px] text-gray-400 truncate mb-2">{user.email}</p>
                <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50">
                  <div className={cn("w-1.5 h-1.5 rounded-full", hasSession ? "bg-green-500" : "bg-red-500")}></div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                    EW Session: {hasSession === null ? 'Checking...' : hasSession ? 'Detected' : 'Not Found'}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button 
                  onClick={onOpenDashboardMenu}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition text-left"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Open Dashboard</span>
                </button>
                <button 
                  onClick={onSaveDashboard}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition text-left"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Dashboard</span>
                </button>
                <button 
                  onClick={() => setShowShareInput(!showShareInput)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition text-left"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Dashboard</span>
                </button>

                <div className="my-1 border-t border-gray-50" />

                <button 
                  onClick={onOpenConfig}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition text-left"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </button>
                <button 
                  onClick={onViewLatestData}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition text-left"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Latest Data</span>
                </button>

                {/* Global Color Selector */}
                <div className="px-4 py-2">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Global Color</p>
                  <div className="flex gap-2">
                    {[
                      { id: 'blue', color: 'bg-blue-500' },
                      { id: 'green', color: 'bg-green-500' },
                      { id: 'red', color: 'bg-red-500' },
                      { id: 'amber', color: 'bg-amber-500' },
                      { id: 'multi', color: 'bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500' }
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => onUpdateColorScheme(c.id as any)}
                        className={cn(
                          "w-5 h-5 rounded-full transition-all flex items-center justify-center",
                          c.color,
                          colorScheme === c.id ? "ring-2 ring-offset-2 ring-black dark:ring-white scale-110" : "opacity-70 hover:opacity-100"
                        )}
                        title={c.id}
                      >
                        {colorScheme === c.id && <div className="w-1 h-1 bg-white rounded-full shadow-sm"></div>}
                      </button>
                    ))}
                  </div>
                </div>

                {showShareInput && (
                  <div className="px-4 py-2 bg-gray-50 border-y border-gray-100">
                    <input 
                      type="email" 
                      placeholder="User email..."
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      className="w-full px-2 py-1.5 text-[10px] border border-gray-200 rounded mb-2 outline-none focus:border-black"
                    />
                    <button 
                      onClick={() => {
                        onShareDashboard(shareEmail);
                        setShareEmail('');
                        setShowShareInput(false);
                      }}
                      className="w-full bg-black text-white py-1.5 rounded text-[9px] font-bold uppercase tracking-widest"
                    >
                      Grant Access
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-1">
                <button 
                  onClick={onSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(
        "px-10 flex items-center gap-1 overflow-x-auto no-scrollbar border-t shadow-sm h-12 transition-colors duration-300",
        theme === 'dark' ? "bg-slate-950 border-slate-800" : "bg-white border-gray-100"
      )}>
        {dashboards.map(dashboard => (
          <div key={dashboard.id} className="relative h-full flex items-center min-w-fit group">
            {editingId === dashboard.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => {
                  onRenameDashboard(dashboard.id, editName);
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRenameDashboard(dashboard.id, editName);
                    setEditingId(null);
                  }
                }}
                className={cn(
                  "px-6 h-full text-[11px] font-bold uppercase tracking-widest bg-transparent border-b-2 border-black outline-none",
                  theme === 'dark' ? "text-white border-white" : "text-black"
                )}
              />
            ) : (
              <button
                onClick={() => setActiveDashboardId(dashboard.id)}
                onDoubleClick={() => {
                  setEditingId(dashboard.id);
                  setEditName(dashboard.name);
                }}
                className={cn(
                  "px-6 h-full flex items-center text-[11px] font-bold uppercase tracking-widest transition relative",
                  activeDashboardId === dashboard.id 
                    ? (theme === 'dark' ? "text-white border-b-2 border-white" : "text-black border-b-2 border-black")
                    : (theme === 'dark' ? "text-slate-500 hover:text-white border-b-2 border-transparent" : "text-gray-400 hover:text-black border-b-2 border-transparent")
                )}
                title="Double click to rename"
              >
                {dashboard.name}
              </button>
            )}
            {activeDashboardId === dashboard.id && (
              <button
                onClick={(e) => { e.stopPropagation(); onCloseDashboard(dashboard.id); }}
                className={cn(
                  "absolute right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-gray-200 dark:hover:bg-slate-800",
                  theme === 'dark' ? "text-slate-400" : "text-gray-400"
                )}
                title="Close Dashboard"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}
        
        {isLatestDataOpen && (
          <div className="relative h-full flex items-center min-w-fit group">
            <button
              onClick={() => setActiveDashboardId('latest-data')}
              className={cn(
                "px-6 h-full flex items-center text-[11px] font-bold uppercase tracking-widest transition relative",
                activeDashboardId === 'latest-data'
                  ? (theme === 'dark' ? "text-white border-b-2 border-white" : "text-black border-b-2 border-black")
                  : (theme === 'dark' ? "text-slate-500 hover:text-white border-b-2 border-transparent" : "text-gray-400 hover:text-black border-b-2 border-transparent")
              )}
            >
              Latest Data
            </button>
            {activeDashboardId === 'latest-data' && (
              <button
                onClick={(e) => { e.stopPropagation(); onCloseDashboard('latest-data'); }}
                className={cn(
                  "absolute right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-gray-200 dark:hover:bg-slate-800",
                  theme === 'dark' ? "text-slate-400" : "text-gray-400"
                )}
                title="Close Tab"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
        <button
          onClick={createDashboard}
          className={cn("px-4 transition", theme === 'dark' ? "text-slate-700 hover:text-white" : "text-gray-300 hover:text-black")}
          title="New Dashboard"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
