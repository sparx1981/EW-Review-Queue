import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, db, doc, setDoc, updateDoc, serverTimestamp, auth, signOut } from '../services/firebase';
import { Dashboard, EWReview, CardConfig, DashboardRow } from '../types';
import Header from './Header';
import Card from './Card';
import ConfigPanel from './ConfigPanel';
import HelpResources from './HelpResources';
import GlobalConfigModal from './GlobalConfigModal';
import { probeAndFetch, testApiConnection } from '../services/api';
import { v4 as uuidv4 } from 'uuid';
import Sortable from 'sortablejs';
import { Plus, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, X, Copy, Check } from 'lucide-react';

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
            <div className={cn("p-4 border-t text-[10px] uppercase font-bold tracking-widest text-center", theme === 'dark' ? "border-slate-800 text-slate-500" : "border-gray-100 text-gray-400")}>
              Debugging mode active - This data reflects the latest probe results.
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
    status: [], // Empty array means "All"
    dateField: 'submittedAt',
    period: 'past_30', // Default to past 30 days to ensure data visibility
    customFrom: null,
    customTo: null,
    excludeListingPages: false,
    listingPageMode: 'both',
    reviewerIds: [],
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isSampleData, setIsSampleData] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [rawPayload, setRawPayload] = useState<any>(null);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [authHeader, setAuthHeader] = useState(() => localStorage.getItem('ew_auth_header') || '');

  const rowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    // Load theme from user prefs if available
    const savedTheme = localStorage.getItem('ew_dashboard_theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);
    
    const checkUserSession = async () => {
      const result = await testApiConnection(authHeader);
      setHasSession(result.ok);
    };
    checkUserSession();

    const q = query(collection(db, `users/${user.uid}/dashboards`), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dashboard));
        setDashboards(docs);
        if (docs.length > 0 && !activeDashboardId) {
          setActiveDashboardId(docs[0].id);
        }
      },
      (error) => {
        console.error("Dashboard listener error:", error);
      }
    );

    handleRefresh();
    return () => unsubscribe();
  }, [user.uid, authHeader]);

  useEffect(() => {
    if (isEditMode && activeDashboardId) {
      const activeDashboard = dashboards.find(d => d.id === activeDashboardId);
      if (!activeDashboard) return;

      activeDashboard.layout.rows.forEach(row => {
        const el = rowRefs.current[row.id];
        if (el) {
          Sortable.create(el, {
            group: 'cards',
            animation: 150,
            handle: '.drag-handle',
            onEnd: (evt) => {
              const { from, to, oldIndex, newIndex } = evt;
              if (oldIndex === undefined || newIndex === undefined) return;
              
              handleDragEnd(from.dataset.rowId!, to.dataset.rowId!, oldIndex, newIndex);
            }
          });
        }
      });
    }
  }, [isEditMode, activeDashboardId, dashboards]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const result = await probeAndFetch(authHeader);
    setReviews(result.data);
    setIsSampleData(result.isSample);
    setRawPayload(result.rawPayload);
    setLastRefreshed(new Date());
    setIsRefreshing(false);
  };

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
    // Sanitize layout to remove potential undefined values before Firestore update
    const sanitizedLayout = JSON.parse(JSON.stringify(layout));
    const dashboardRef = doc(db, `users/${user.uid}/dashboards`, dashboardId);
    await updateDoc(dashboardRef, {
      layout: sanitizedLayout,
      updatedAt: serverTimestamp()
    });
  };

  const activeDashboard = dashboards.find(d => d.id === activeDashboardId);

  const addRow = async () => {
    if (!activeDashboardId || !activeDashboard) return;
    const newRow: DashboardRow = { id: uuidv4(), cards: [] };
    const newLayout = {
      rows: [...activeDashboard.layout.rows, newRow]
    };
    await updateDashboardLayout(activeDashboardId, newLayout);
  };

  const addCard = async (rowId: string) => {
    if (!activeDashboardId || !activeDashboard) return;
    const newRows = activeDashboard.layout.rows.map(row => {
      if (row.id === rowId) {
        return { ...row, cards: [...row.cards, DEFAULT_CARD('New KPI', 'kpi')] };
      }
      return row;
    });
    await updateDashboardLayout(activeDashboardId, { rows: newRows });
  };

  const deleteCard = async (rowId: string, cardId: string) => {
    if (!activeDashboardId || !activeDashboard) return;
    const newRows = activeDashboard.layout.rows.map(row => {
      if (row.id === rowId) {
        return { ...row, cards: row.cards.filter(c => c.id !== cardId) };
      }
      return row;
    });
    await updateDashboardLayout(activeDashboardId, { rows: newRows });
    if (selectedCardId === cardId) setSelectedCardId(null);
  };

  const updateCardConfig = async (rowId: string, cardId: string, config: Partial<CardConfig>) => {
    if (!activeDashboardId || !activeDashboard) return;
    const newRows = activeDashboard.layout.rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cards: row.cards.map(c => c.id === cardId ? { ...c, ...config } : c)
        };
      }
      return row;
    });
    await updateDashboardLayout(activeDashboardId, { rows: newRows });
  };

  const renameDashboard = async (dashboardId: string, name: string) => {
    const dashboardRef = doc(db, `users/${user.uid}/dashboards`, dashboardId);
    await updateDoc(dashboardRef, {
      name,
      updatedAt: serverTimestamp()
    });
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('ew_dashboard_theme', newTheme);
  };

  const createDashboard = async () => {
    try {
      const id = uuidv4();
      const dashboardRef = doc(db, `users/${user.uid}/dashboards`, id);
      const newDashboard: Partial<Dashboard> = {
        name: 'New Dashboard',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        order: dashboards.length,
        layout: {
          rows: [{ id: uuidv4(), cards: [DEFAULT_CARD('Reviews Volume', 'bar'), DEFAULT_CARD('Active Queue', 'pie')] }]
        }
      };
      await setDoc(dashboardRef, newDashboard);
      setActiveDashboardId(id);
      setIsEditMode(true); // Automatically enter edit mode for new dashboard
    } catch (error) {
      console.error("Failed to create dashboard:", error);
      alert("Failed to create dashboard. Check console for permissions.");
    }
  };

  const selectedCard = activeDashboard?.layout.rows
    .flatMap(r => r.cards)
    .find(c => c.id === selectedCardId);

  const selectedRowId = activeDashboard?.layout.rows.find(r => r.cards.some(c => c.id === selectedCardId))?.id;

  return (
    <div className={cn("flex flex-col h-screen overflow-hidden transition-colors duration-300", theme === 'dark' ? "bg-slate-950 text-slate-100 dark" : "bg-white text-gray-900")}>
      <Header 
        user={user}
        dashboards={dashboards}
        activeDashboardId={activeDashboardId}
        setActiveDashboardId={setActiveDashboardId}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        isRefreshing={isRefreshing}
        handleRefresh={handleRefresh}
        lastRefreshed={lastRefreshed}
        globalExcludeListing={globalExcludeListing}
        setGlobalExcludeListing={setGlobalExcludeListing}
        createDashboard={createDashboard}
        onSignOut={() => signOut(auth)}
        onOpenHelp={() => setIsHelpOpen(true)}
        hasSession={hasSession}
        isSampleData={isSampleData}
        onRenameDashboard={renameDashboard}
        onOpenDebug={() => setIsDebugOpen(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className={cn("flex-1 overflow-y-auto p-10 transition-colors duration-300", theme === 'dark' ? "bg-slate-900/50" : "bg-[#F9FAFB]")}>
        <div className="max-w-full">
          {!activeDashboard ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-sm flex items-center justify-center mb-6">
                <LayoutGrid className="w-6 h-6 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight">No active monitor</h2>
              <p className="text-sm text-gray-400 mb-8 max-w-sm">Deploy your first analytics dashboard to start monitoring reviews.</p>
              <button 
                onClick={createDashboard}
                className="bg-black text-white px-8 py-3 rounded text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition shadow-sm"
              >
                Create New
              </button>
            </div>
          ) : (
            <div className="space-y-10 pb-20">
              {activeDashboard.layout.rows.map(row => (
                <div key={row.id} className="relative group">
                  <div 
                    ref={el => rowRefs.current[row.id] = el}
                    data-row-id={row.id}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 min-h-[100px]"
                  >
                    {row.cards.map(card => (
                      <Card 
                        key={card.id}
                        card={card}
                        reviews={reviews}
                        globalExcludeListing={globalExcludeListing}
                        isEditMode={isEditMode}
                        isSelected={selectedCardId === card.id}
                        isSampleData={isSampleData}
                        onSelect={() => setSelectedCardId(card.id)}
                        onDelete={() => deleteCard(row.id, card.id)}
                      />
                    ))}
                    {isEditMode && (
                      <button
                        onClick={() => addCard(row.id)}
                        className="bg-white border border-gray-200 border-dashed rounded-lg flex flex-col items-center justify-center p-8 text-gray-300 hover:text-black hover:border-black hover:bg-gray-50 transition min-h-[200px]"
                      >
                        <Plus className="w-6 h-6 mb-2" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">New Card</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isEditMode && (
                <button 
                  onClick={addRow}
                  className="w-full bg-white border border-gray-200 border-dashed rounded-lg py-6 flex items-center justify-center gap-2 text-gray-400 hover:text-black hover:border-black transition"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">New Row</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <ConfigPanel 
        isOpen={!!selectedCardId && isEditMode}
        onClose={() => setSelectedCardId(null)}
        card={selectedCard}
        onUpdate={(update) => selectedCardId && selectedRowId && updateCardConfig(selectedRowId, selectedCardId, update)}
        reviewerNames={Array.from(new Set(reviews.map(r => r.reviewerName).filter(Boolean))) as string[]}
      />

      <HelpResources 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <GlobalConfigModal 
        isOpen={isConfigOpen}
        onClose={() => {
          setIsConfigOpen(false);
          handleRefresh();
        }}
        authHeader={authHeader}
        onUpdateAuth={(val) => {
          setAuthHeader(val);
          localStorage.setItem('ew_auth_header', val);
        }}
        theme={theme}
        onRefreshNeeded={handleRefresh}
        onOpenDebug={() => {
          setIsConfigOpen(false);
          setIsDebugOpen(true);
        }}
      />

      <DebugModal 
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        payload={rawPayload}
        theme={theme}
      />
    </div>
  );
}
