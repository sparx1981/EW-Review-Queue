import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, db, doc, setDoc, updateDoc, serverTimestamp, auth, signOut, where, or } from '../services/firebase';
import { Dashboard, EWReview, CardConfig, DashboardRow } from '../types';
import Header from './Header';
import Card from './Card';
import ConfigPanel from './ConfigPanel';
import GlobalConfigModal from './GlobalConfigModal';
import LatestDataView from './LatestDataView';
import { probeAndFetch, testApiConnection } from '../services/api';
import { v4 as uuidv4 } from 'uuid';
import Sortable from 'sortablejs';
import { Plus, LayoutGrid, Terminal, X, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const DebugModal = ({ isOpen, onClose, payload, theme }: { isOpen: boolean; onClose: () => void; payload: any; theme: 'light' | 'dark' }) => {
  const [copied, setCopied] = useState(false);
  const jsonStr = JSON.stringify(payload, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-[60]"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl z-[70] flex flex-col shadow-2xl",
              theme === 'dark' ? "bg-slate-900 border border-slate-800" : "bg-white border border-gray-200"
            )}
          >
            <div className={cn("p-6 border-b flex items-center justify-between", theme === 'dark' ? "border-slate-800" : "border-gray-100")}>
              <div className="flex items-center gap-3">
                <Terminal className={cn("w-5 h-5", theme === 'dark' ? "text-blue-400" : "text-black")} />
                <h3 className={cn("text-sm font-bold uppercase tracking-widest", theme === 'dark' ? "text-white" : "text-gray-900")}>Review Data Sources</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={copyToClipboard}
                  className={cn("p-2 rounded transition flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest", theme === 'dark' ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-gray-500")}
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </button>
                <button onClick={onClose} className={cn("p-2 rounded transition", theme === 'dark' ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-gray-500")}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className={cn("flex-1 overflow-auto p-6 font-mono text-[11px]", theme === 'dark' ? "bg-slate-950 text-blue-300" : "bg-gray-50 text-blue-900 shadow-inner")}>
              <pre>{jsonStr}</pre>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface DashboardViewProps {
  user: User;
}

const DEFAULT_CARD: (title: string, type: CardConfig['vizType']) => CardConfig = (title, type) => ({
  id: uuidv4(),
  title,
  vizType: type,
  filters: {
    status: [],
    dateField: 'dateSubmitted',
    submittedPeriod: 'all_time',
    submittedFrom: null,
    submittedTo: null,
    reviewedPeriod: 'all_time',
    reviewedFrom: null,
    reviewedTo: null,
    listingPageMode: 'both',
    reviewerIds: [],
    rankField: 'reviewer',
    daysCalculation: 'active_age',
    daysRangeMin: null,
    daysRangeMax: null
  },
  comparison: {
    enabled: true,
    period: 'previous_period',
  },
  display: {
    showTotal: true,
    colorScheme: 'blue',
    groupBy: 'day',
    showLegend: true,
    showDelta: true,
  }
});

export default function DashboardView({ user }: DashboardViewProps) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [reviews, setReviews] = useState<EWReview[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [globalExcludeListing, setGlobalExcludeListing] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isSampleData, setIsSampleData] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [colorScheme, setColorScheme] = useState<Dashboard['colorScheme']>('blue');
  const [rawPayload, setRawPayload] = useState<any>(null);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [authHeader, setAuthHeader] = useState(() => localStorage.getItem('ew_auth_header') || '');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(null);
  const [isOpenDashboardOpen, setIsOpenDashboardOpen] = useState(false);
  const [isLatestDataOpen, setIsLatestDataOpen] = useState(false);

  const rowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const result = await probeAndFetch(authHeader);
    setReviews(result.data);
    setIsSampleData(result.isSample);
    setRawPayload(result.rawPayload);
    setLastRefreshed(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (autoRefreshInterval) {
      const interval = setInterval(() => {
        handleRefresh();
      }, autoRefreshInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefreshInterval, authHeader]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('ew_dashboard_theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);

    const savedColor = localStorage.getItem('ew_dashboard_color') as any;
    if (savedColor) setColorScheme(savedColor);
    
    const checkUserSession = async () => {
      const result = await testApiConnection(authHeader);
      setHasSession(result.ok);
    };
    checkUserSession();

    const q = query(
      collection(db, 'dashboards'), 
      or(
        where('ownerId', '==', user.uid),
        where('collaborators', 'array-contains', user.email)
      ),
      orderBy('order', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uniqueDocs = new Map<string, Dashboard>();
      snapshot.docs.forEach(d => {
        uniqueDocs.set(d.id, { id: d.id, ...d.data() } as Dashboard);
      });
      const allDocs = Array.from(uniqueDocs.values());
      setDashboards(allDocs);
      if (allDocs.length > 0 && !activeDashboardId) {
        setActiveDashboardId(allDocs[0].id);
      }
    });

    handleRefresh();
    return () => unsubscribe();
  }, [user.uid, user.email, authHeader]);

  useEffect(() => {
    if (isEditMode && activeDashboardId) {
      const current = dashboards.find(d => d.id === activeDashboardId);
      current?.layout.rows.forEach(row => {
        const el = rowRefs.current[row.id];
        if (el) {
          Sortable.create(el, {
            group: 'cards',
            animation: 150,
            handle: '.drag-handle',
            onEnd: (evt) => {
              const { from, to, oldIndex, newIndex } = evt;
              if (oldIndex !== undefined && newIndex !== undefined) {
                handleDragEnd(from.dataset.rowId!, to.dataset.rowId!, oldIndex, newIndex);
              }
            }
          });
        }
      });
    }
  }, [isEditMode, activeDashboardId, dashboards]);

  const handleDragEnd = (fromRowId: string, toRowId: string, oldIndex: number, newIndex: number) => {
    const activeDashboard = dashboards.find(d => d.id === activeDashboardId);
    if (!activeDashboard) return;

    const newRows = [...activeDashboard.layout.rows];
    const fromRow = newRows.find(r => r.id === fromRowId);
    const toRow = newRows.find(r => r.id === toRowId);

    if (fromRow && toRow) {
      const [movedCard] = fromRow.cards.splice(oldIndex, 1);
      toRow.cards.splice(newIndex, 0, movedCard);
      updateDashboardLayout(activeDashboardId!, { rows: newRows });
    }
  };

  const updateDashboardLayout = async (dashboardId: string, layout: any) => {
    const sanitizedLayout = JSON.parse(JSON.stringify(layout));
    await updateDoc(doc(db, 'dashboards', dashboardId), {
      layout: sanitizedLayout,
      updatedAt: serverTimestamp()
    });
    setIsDirty(true);
  };

  const activeDashboard = dashboards.find(d => d.id === activeDashboardId);

  const addRow = async () => {
    if (!activeDashboardId || !activeDashboard) return;
    const newRow: DashboardRow = { id: uuidv4(), cards: [] };
    const newLayout = { rows: [...activeDashboard.layout.rows, newRow] };
    await updateDashboardLayout(activeDashboardId, newLayout);
  };

  const addCard = async (rowId: string) => {
    if (!activeDashboardId || !activeDashboard) return;
    const newRows = activeDashboard.layout.rows.map(row => 
      row.id === rowId ? { ...row, cards: [...row.cards, DEFAULT_CARD('New Card', 'kpi')] } : row
    );
    await updateDashboardLayout(activeDashboardId, { rows: newRows });
  };

  const duplicateCard = async (rowId: string, card: CardConfig) => {
    if (!activeDashboardId || !activeDashboard) return;
    const duplicatedCard: CardConfig = JSON.parse(JSON.stringify(card));
    duplicatedCard.id = uuidv4();
    duplicatedCard.title = `${card.title} (Copy)`;
    const newRows = activeDashboard.layout.rows.map(row => 
      row.id === rowId ? { ...row, cards: [...row.cards, duplicatedCard] } : row
    );
    await updateDashboardLayout(activeDashboardId, { rows: newRows });
  };

  const deleteCard = async (rowId: string, cardId: string) => {
    if (!activeDashboardId || !activeDashboard) return;
    const newRows = activeDashboard.layout.rows.map(row => 
      row.id === rowId ? { ...row, cards: row.cards.filter(c => c.id !== cardId) } : row
    );
    await updateDashboardLayout(activeDashboardId, { rows: newRows });
    if (selectedCardId === cardId) setSelectedCardId(null);
  };

  const updateCardConfig = async (rowId: string, cardId: string, config: Partial<CardConfig>) => {
    if (!activeDashboardId || !activeDashboard) return;
    const newRows = activeDashboard.layout.rows.map(row => 
      row.id === rowId ? {
        ...row,
        cards: row.cards.map(c => c.id === cardId ? { ...c, ...config } : c)
      } : row
    );
    await updateDashboardLayout(activeDashboardId, { rows: newRows });
  };

  const renameDashboard = async (dashboardId: string, name: string) => {
    await updateDoc(doc(db, 'dashboards', dashboardId), { name, updatedAt: serverTimestamp() });
    setIsDirty(true);
  };

  const saveDashboard = async () => {
    if (activeDashboardId) {
      await updateDoc(doc(db, 'dashboards', activeDashboardId), { updatedAt: serverTimestamp() });
      setIsDirty(false);
      alert('Dashboard saved.');
    }
  };

  const closeDashboard = async (id: string) => {
    if (id === 'latest-data') {
      setIsLatestDataOpen(false);
      return;
    }
    if (activeDashboardId === id && isDirty) {
      const save = window.confirm('You have unsaved changes. Would you like to save before closing?');
      if (save) {
        await saveDashboard();
      }
    }
    if (activeDashboardId === id) {
      setActiveDashboardId(null);
      setIsDirty(false);
    }
  };

  const shareDashboard = async (email: string) => {
    if (!activeDashboardId || !activeDashboard) return;
    const colabs = activeDashboard.collaborators || [];
    if (!colabs.includes(email)) {
      await updateDoc(doc(db, 'dashboards', activeDashboardId), {
        collaborators: [...colabs, email],
        updatedAt: serverTimestamp()
      });
      alert(`Shared with ${email}`);
    } else {
      alert('Already shared.');
    }
  };

  const createDashboard = async () => {
    const id = uuidv4();
    const newDoc: Dashboard = {
      id, name: 'New Dashboard', ownerId: user.uid, collaborators: [],
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), order: dashboards.length,
      layout: { rows: [{ id: uuidv4(), cards: [DEFAULT_CARD('Volume', 'bar')] }] }
    };
    await setDoc(doc(db, 'dashboards', id), newDoc);
    setActiveDashboardId(id);
    setIsEditMode(true);
  };

  const toggleTheme = () => {
    const newT = theme === 'light' ? 'dark' : 'light';
    setTheme(newT);
    localStorage.setItem('ew_dashboard_theme', newT);
  };

  const selectedCard = activeDashboard?.layout.rows.flatMap(r => r.cards).find(c => c.id === selectedCardId);
  const selectedRowId = activeDashboard?.layout.rows.find(r => r.cards.some(c => c.id === selectedCardId))?.id;

  return (
    <div className={cn("flex flex-col h-screen overflow-hidden", theme === 'dark' ? "bg-slate-950 text-slate-100 dark" : "bg-white text-gray-900")}>
      <Header 
        user={user} dashboards={dashboards} activeDashboardId={isLatestDataOpen ? 'latest-data' : activeDashboardId} 
        setActiveDashboardId={(id) => {
          if (id === 'latest-data') {
            setIsLatestDataOpen(true);
            setActiveDashboardId(null);
          } else {
            setIsLatestDataOpen(false);
            setActiveDashboardId(id);
          }
        }} 
        isEditMode={isEditMode} setIsEditMode={setIsEditMode}
        isRefreshing={isRefreshing} handleRefresh={handleRefresh} lastRefreshed={lastRefreshed}
        autoRefreshInterval={autoRefreshInterval} setAutoRefreshInterval={setAutoRefreshInterval}
        globalExcludeListing={globalExcludeListing} setGlobalExcludeListing={setGlobalExcludeListing}
        createDashboard={createDashboard} onSignOut={() => signOut(auth)} 
        hasSession={hasSession} isSampleData={isSampleData} onRenameDashboard={renameDashboard}
        onCloseDashboard={closeDashboard}
        onOpenDebug={() => setIsDebugOpen(true)} onOpenConfig={() => setIsConfigOpen(true)}
        onSaveDashboard={saveDashboard} onShareDashboard={shareDashboard} 
        onOpenDashboardMenu={() => setIsOpenDashboardOpen(true)}
        theme={theme} toggleTheme={toggleTheme} colorScheme={colorScheme || 'blue'}
        onUpdateColorScheme={(val) => { setColorScheme(val); localStorage.setItem('ew_dashboard_color', val); }}
        onViewLatestData={() => { setIsLatestDataOpen(true); setActiveDashboardId(null); }}
        isLatestDataOpen={isLatestDataOpen}
      />

      <main className={cn("flex-1 overflow-y-auto p-10", theme === 'dark' ? "bg-slate-900/50" : "bg-[#F9FAFB]")}>
        {isLatestDataOpen ? (
          <LatestDataView data={reviews} onOpenDataSources={() => setIsDebugOpen(true)} theme={theme} />
        ) : !activeDashboard ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <LayoutGrid className="w-12 h-12 text-gray-300 mb-4" />
            <h2 className="text-xl font-bold mb-2">No active dashboard</h2>
            <button onClick={createDashboard} className="bg-black text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-gray-800">Create New</button>
          </div>
        ) : (
          <div className="space-y-10">
            {activeDashboard.layout.rows.map(row => (
              <div key={row.id} ref={el => rowRefs.current[row.id] = el} data-row-id={row.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 min-h-[100px]">
                {row.cards.map(card => (
                  <Card 
                    key={card.id} card={card} reviews={reviews} globalExcludeListing={globalExcludeListing}
                    globalColorScheme={colorScheme || 'blue'} isEditMode={isEditMode} isSelected={selectedCardId === card.id}
                    isSampleData={isSampleData} onSelect={() => setSelectedCardId(card.id)} 
                    onDuplicate={() => duplicateCard(row.id, card)}
                    onDelete={() => deleteCard(row.id, card.id)}
                    theme={theme}
                  />
                ))}
                {isEditMode && (
                  <button onClick={() => addCard(row.id)} className="border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center p-8 text-gray-400 hover:text-black hover:border-black transition h-[250px]">
                    <Plus className="w-6 h-6 mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Add Card</span>
                  </button>
                )}
              </div>
            ))}
            {isEditMode && (
              <button onClick={addRow} className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-lg text-gray-400 hover:text-black hover:border-black transition uppercase font-bold text-[10px] tracking-widest">New Row</button>
            )}
          </div>
        )}
      </main>

      <ConfigPanel 
        isOpen={!!selectedCardId && isEditMode} onClose={() => setSelectedCardId(null)} card={selectedCard}
        onUpdate={(update) => selectedCardId && selectedRowId && updateCardConfig(selectedRowId, selectedCardId, update)}
        reviewerNames={Array.from(new Set(reviews.map(r => r.reviewerName).filter(Boolean))) as string[]}
      />
      <GlobalConfigModal 
        isOpen={isConfigOpen} onClose={() => { setIsConfigOpen(false); handleRefresh(); }} authHeader={authHeader}
        onUpdateAuth={(v) => { setAuthHeader(v); localStorage.setItem('ew_auth_header', v); }} theme={theme}
        onRefreshNeeded={handleRefresh} onOpenDebug={() => { setIsConfigOpen(false); setIsDebugOpen(true); }}
      />
      <DebugModal isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} payload={rawPayload} theme={theme} />
      
      <AnimatePresence>
        {isOpenDashboardOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setIsOpenDashboardOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col relative z-20 border border-gray-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-900 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-blue-500" /> Open Dashboard</h3>
                <button onClick={() => setIsOpenDashboardOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="p-2 overflow-y-auto flex-1">
                {dashboards.map(d => (
                  <button key={d.id} onClick={() => { setActiveDashboardId(d.id); setIsOpenDashboardOpen(false); }} className={cn("w-full flex items-center justify-between p-4 rounded-xl transition mb-1", activeDashboardId === d.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "hover:bg-gray-50 dark:hover:bg-slate-900")}>
                    <div className="text-left">
                      <div className="text-xs font-bold uppercase tracking-widest">{d.name}</div>
                      <div className="text-[10px] opacity-60">{d.ownerId === user.uid ? 'Private' : 'Shared with you'}</div>
                    </div>
                    {activeDashboardId === d.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
