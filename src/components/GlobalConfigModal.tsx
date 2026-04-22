import { X, Lock, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, Loader, Copy, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getSessionCookie, setSessionCookie } from '../services/dataStore';
import { testApiConnection, ConnectionTestResult } from '../services/api';
import { useState, useEffect, useCallback } from 'react';

interface GlobalConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  authHeader: string;
  onUpdateAuth: (val: string) => void;
  theme: 'light' | 'dark';
}

const CONSOLE_SNIPPET = `// Run this in your browser console while on extensions.sketchup.com
// It copies your visible session cookies to clipboard.
(function() {
  const cookies = document.cookie;
  if (!cookies) {
    alert('No readable cookies found. The session may use HttpOnly cookies — use the DevTools method instead.');
    return;
  }
  navigator.clipboard.writeText(cookies).then(() => {
    alert('Cookies copied to clipboard! Paste them into the dashboard config.');
  });
})();`;

export default function GlobalConfigModal({
  isOpen,
  onClose,
  authHeader,
  onUpdateAuth,
  theme,
}: GlobalConfigModalProps) {
  const [sessionCookie, setSessionCookieLocal] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showSnippet, setShowSnippet] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [snippetCopied, setSnippetCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSessionCookieLocal(getSessionCookie());
      setTestResult(null);
    }
  }, [isOpen]);

  const handleCookieChange = (val: string) => {
    setSessionCookieLocal(val);
    setSessionCookie(val);
    setTestResult(null);
  };

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testApiConnection(authHeader || undefined);
    setTestResult(result);
    setTesting(false);
  }, [authHeader]);

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(CONSOLE_SNIPPET).then(() => {
      setSnippetCopied(true);
      setTimeout(() => setSnippetCopied(false), 2000);
    });
  };

  const isDark = theme === 'dark';
  const base = isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900';
  const inputCls = isDark
    ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-black';
  const mutedCls = isDark ? 'text-slate-400' : 'text-gray-500';
  const labelCls = isDark ? 'text-slate-500' : 'text-gray-400';

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
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-xl z-[70] flex flex-col shadow-2xl overflow-hidden border',
              base
            )}
          >
            {/* Header */}
            <div className={cn('p-6 border-b flex items-center justify-between', isDark ? 'border-slate-800' : 'border-gray-100')}>
              <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-4 h-4" />
                API Authentication
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-900 rounded transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
              <p className={cn('text-xs leading-relaxed', mutedCls)}>
                This dashboard fetches live data from the SketchUp Extension Warehouse API. You must be a SketchUp reviewer with access to
                <a href="https://extensions.sketchup.com" target="_blank" rel="noreferrer" className="underline ml-1">extensions.sketchup.com</a>.
                Paste your session cookie below to authenticate.
              </p>

              {/* Cookie input */}
              <div className="space-y-2">
                <label className={cn('text-[10px] font-bold uppercase tracking-widest block', labelCls)}>Session Cookie</label>
                <textarea
                  value={sessionCookie}
                  onChange={(e) => handleCookieChange(e.target.value)}
                  className={cn(
                    'w-full px-4 py-3 rounded text-[11px] focus:outline-none transition-colors border font-mono min-h-[80px] resize-none',
                    inputCls
                  )}
                  placeholder="Paste your cookie string here, e.g.  _session_id=abc123; user_id=456..."
                />
              </div>

              {/* Test connection button + result */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded text-[11px] font-bold uppercase tracking-widest transition',
                    isDark
                      ? 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50'
                      : 'bg-black hover:bg-gray-800 text-white disabled:opacity-50'
                  )}
                >
                  {testing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {testing ? 'Testing…' : 'Test Connection'}
                </button>

                {testResult && (
                  <div className={cn('flex items-center gap-2 text-[11px] font-medium', testResult.ok ? 'text-green-600' : 'text-red-500')}>
                    {testResult.ok
                      ? <CheckCircle className="w-4 h-4" />
                      : testResult.errorType === 'auth'
                        ? <XCircle className="w-4 h-4" />
                        : <AlertCircle className="w-4 h-4" />}
                    <span>{testResult.detail}</span>
                  </div>
                )}
              </div>

              {/* Step-by-step guide (collapsible) */}
              <div className={cn('rounded-lg border overflow-hidden', isDark ? 'border-slate-800' : 'border-gray-200')}>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition',
                    isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  )}
                >
                  <span>How to get your session cookie (step-by-step)</span>
                  {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence>
                  {showGuide && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className={cn('px-4 pb-4 text-[11px] leading-relaxed space-y-2', mutedCls)}
                    >
                      <ol className="list-decimal list-inside space-y-1.5 pt-3">
                        <li>Open <strong>Google Chrome</strong> and sign in to <a href="https://extensions.sketchup.com" target="_blank" rel="noreferrer" className="underline">extensions.sketchup.com</a>.</li>
                        <li>Press <kbd className="px-1 py-0.5 rounded text-[10px] bg-gray-200 dark:bg-slate-700 font-mono">F12</kbd> to open DevTools, then click the <strong>Network</strong> tab.</li>
                        <li>Reload the page. Click any request to <code className="font-mono">extensions.sketchup.com</code> in the list.</li>
                        <li>In the right panel, scroll down to <strong>Request Headers</strong> and find the <strong>Cookie</strong> row.</li>
                        <li>Right-click the Cookie value → <strong>Copy value</strong>.</li>
                        <li>Paste the copied value into the Session Cookie field above.</li>
                      </ol>

                      <div className={cn('mt-3 p-3 rounded', isDark ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-50 text-amber-700')}>
                        <strong>Note:</strong> Session cookies expire. If the connection test fails after previously working, repeat these steps to get a fresh cookie.
                      </div>

                      {/* Console snippet alternative */}
                      <button
                        onClick={() => setShowSnippet(!showSnippet)}
                        className="flex items-center gap-1 mt-2 underline text-[10px] opacity-70 hover:opacity-100"
                      >
                        {showSnippet ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Alternative: browser console snippet
                      </button>

                      <AnimatePresence>
                        {showSnippet && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-2 pt-1"
                          >
                            <p>While on <strong>extensions.sketchup.com</strong>, open the Console tab in DevTools and paste this script. It will copy any readable cookies to your clipboard.</p>
                            <div className="relative">
                              <pre className={cn('text-[10px] font-mono p-3 rounded overflow-x-auto', isDark ? 'bg-slate-800' : 'bg-gray-100')}>
                                {CONSOLE_SNIPPET}
                              </pre>
                              <button
                                onClick={handleCopySnippet}
                                className={cn(
                                  'absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition',
                                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-gray-200 text-gray-700 border border-gray-200'
                                )}
                              >
                                <Copy className="w-3 h-3" />
                                {snippetCopied ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <p className={cn('text-[10px]', isDark ? 'text-amber-400' : 'text-amber-600')}>
                              ⚠ This only captures non-HttpOnly cookies. If it returns empty, use the DevTools Network method above.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Direct API link */}
              <a
                href="https://extensions.sketchup.com/api/reviews?completedOnly=false"
                target="_blank"
                rel="noreferrer"
                className={cn('flex items-center gap-2 text-[11px] underline', mutedCls)}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open API endpoint directly (to verify you have access)
              </a>
            </div>

            <div className={cn('p-6 border-t flex justify-end', isDark ? 'border-slate-800 bg-slate-900/50' : 'border-gray-100 bg-gray-50')}>
              <button
                onClick={onClose}
                className={cn(
                  'px-8 py-3 rounded text-xs font-bold uppercase tracking-widest transition',
                  isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800 shadow-sm'
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
