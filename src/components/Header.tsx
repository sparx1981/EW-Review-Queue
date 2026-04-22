import { User } from 'firebase/auth';
import { Dashboard } from '../types';
import { RefreshCw, Edit3, User as UserIcon, Plus, Eye, LogOut, FileText, HelpCircle, Moon, Sun, Terminal, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import dayjs from 'dayjs';
import { useState } from 'react';

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
  globalExcludeListing: boolean;
  setGlobalExcludeListing: (val: boolean) => void;
  createDashboard: () => void;
  onSignOut: () => void;
  onOpenHelp: () => void;
  hasSession: boolean | null;
  isSampleData: boolean;
  onRenameDashboard: (id: string, name: string) => void;
  onOpenDebug: () => void;
  onOpenConfig: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
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
  onOpenHelp,
  hasSession,
  isSampleData,
  onRenameDashboard,
  onOpenDebug,
  onOpenConfig,
  theme,
  toggleTheme
}: HeaderProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn("p-2 rounded transition disabled:opacity-50 mr-1", theme === 'dark' ? "text-slate-400 hover:text-white" : "text-gray-400 hover:text-black")}
            title="Refresh Data"
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </button>

          <button
            onClick={onOpenHelp}
            className={cn("p-2 rounded transition mr-2", theme === 'dark' ? "text-slate-400 hover:text-white" : "text-gray-400 hover:text-black")}
            title="Help & Resources"
          >
            <HelpCircle className="w-5 h-5" />
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
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition text-left"
                >
                  {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
                <button 
                  onClick={onOpenConfig}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition text-left"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </button>
                <button 
                  onClick={handleExport}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition text-left"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export to PDF</span>
                </button>
                <button 
                  onClick={handleShare}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition text-left"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Share Dashboard</span>
                </button>
              </div>

              <div className="border-t border-gray-100 pt-1">
                <button 
                  onClick={onOpenDebug}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition text-left"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Review Data Sources</span>
                </button>
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
          <div key={dashboard.id} className="relative h-full flex items-center min-w-fit">
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
          </div>
        ))}
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
