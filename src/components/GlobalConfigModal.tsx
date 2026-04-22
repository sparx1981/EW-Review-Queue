import { X, Lock, ClipboardList, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getSessionCookie, setSessionCookie } from '../services/dataStore';
import { useState, useEffect } from 'react';

interface GlobalConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  authHeader: string;
  onUpdateAuth: (val: string) => void;
  theme: 'light' | 'dark';
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

export default function GlobalConfigModal({
  isOpen,
  onClose,
  authHeader,
  onUpdateAuth,
  theme
}: GlobalConfigModalProps) {
  const [sessionCookie, setSessionCookieLocal] = useState(getSessionCookie());

  useEffect(() => {
    if (isOpen) {
      setSessionCookieLocal(getSessionCookie());
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900 z-[60]"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-xl z-[70] flex flex-col shadow-2xl overflow-hidden",
              theme === 'dark' ? "bg-slate-950 border border-slate-800" : "bg-white border border-gray-200"
            )}
          >
            <div className={cn("p-6 border-b flex items-center justify-between", theme === 'dark' ? "border-slate-800" : "border-gray-100")}>
              <h2 className={cn("text-sm font-bold uppercase tracking-widest flex items-center gap-2", theme === 'dark' ? "text-white" : "text-gray-900")}>
                <Lock className="w-4 h-4" />
                Global Authentication
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-900 rounded transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <p className={cn("text-xs leading-relaxed", theme === 'dark' ? "text-slate-400" : "text-gray-500")}>
                Configure your SketchUp session credentials to bypass authorization errors. These settings are applied globally and stored locally in your browser.
              </p>

              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", theme === 'dark' ? "text-slate-500" : "text-gray-400")}>Bearer / Auth Token</span>
                    <Tooltip text="Paste your API Bearer token here. Use this if you have a service token or temporary auth ID." />
                  </div>
                  <input 
                    type="password" 
                    value={authHeader}
                    onChange={(e) => onUpdateAuth(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 rounded text-sm focus:outline-none transition-colors border",
                      theme === 'dark' 
                        ? "bg-slate-900 border-slate-800 text-white focus:border-blue-500" 
                        : "bg-gray-50 border-gray-200 text-gray-900 focus:border-black"
                    )}
                    placeholder="Paste Bearer..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <ClipboardList className="w-3.5 h-3.5 text-gray-400 mr-2" />
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", theme === 'dark' ? "text-slate-500" : "text-gray-400")}>Session Cookie</span>
                    <Tooltip text="Paste the full 'Cookie' header value from your browser Network tab. This is relayed through our secure local proxy." />
                  </div>
                  <textarea 
                    value={sessionCookie}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSessionCookieLocal(val);
                      setSessionCookie(val);
                    }}
                    className={cn(
                      "w-full px-4 py-3 rounded text-[11px] focus:outline-none transition-colors border font-mono min-h-[120px] resize-none",
                      theme === 'dark' 
                        ? "bg-slate-900 border-slate-800 text-white focus:border-blue-500" 
                        : "bg-gray-50 border-gray-200 text-gray-900 focus:border-black"
                    )}
                    placeholder="session=...; expires=...;"
                  />
                </div>
              </div>

              <div className={cn("p-4 rounded-lg flex items-start gap-3", theme === 'dark' ? "bg-blue-900/10 border border-blue-900/30" : "bg-blue-50 border border-blue-100")}>
                <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className={cn("text-[10px] leading-normal", theme === 'dark' ? "text-blue-400" : "text-blue-700")}>
                  Pro-tip: You can find these values by inspecting any Network request to high-traffic SketchUp endpoints while logged in to the Extension Warehouse.
                </p>
              </div>
            </div>

            <div className={cn("p-6 border-t flex justify-end", theme === 'dark' ? "border-slate-800 bg-slate-900/50" : "border-gray-100 bg-gray-50")}>
              <button 
                onClick={onClose}
                className={cn(
                  "px-8 py-3 rounded text-xs font-bold uppercase tracking-widest transition",
                  theme === 'dark' 
                    ? "bg-white text-black hover:bg-gray-200" 
                    : "bg-black text-white hover:bg-gray-800 shadow-sm"
                )}
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
