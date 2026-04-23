import { X, Lock, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, Loader, ExternalLink, ShieldAlert, ShieldCheck, Globe, Plus, Trash2, ShieldQuestion } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getSessionCookie, setSessionCookie, getSourceUrls, setSourceUrls } from '../services/dataStore';
import { testApiConnection, ConnectionTestResult, validateSourceUrl } from '../services/api';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { SourceConfig } from '../types';

interface GlobalConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  authHeader: string;
  onUpdateAuth: (val: string) => void;
  theme: 'light' | 'dark';
  onRefreshNeeded?: () => void;
  onOpenDebug?: () => void;
}

// Known tracking/analytics cookie name patterns — these are NEVER auth cookies
const TRACKING_PREFIXES = [
  '_mkto_trk', '_vwo_', '_ga', '_gid', '__utm', '_fbp', '_fbc',
  '_hjid', '_hjSession', 'intercom-', 'mp_', 'ajs_', 'amplitude_',
  '__hstc', '__hssc', '__hsfp', 'hubspotutk', '_uetsid', '_uetvid',
  'BIGipServer', 'incap_ses', 'visid_incap',
];

// Cookie names that strongly suggest authentication
const AUTH_INDICATORS = [
  'session', 'auth', 'token', 'credential', 'remember', 'logged',
  'user_id', 'access', 'jwt', 'bearer', 'oauth', 'signin', 'login',
  'trimble', 'tc_', 'sso', 'identity', 'account',
];

interface CookieAnalysis {
  trackingCookies: string[];
  authCookies: string[];
  unknownCookies: string[];
  hasOnlyTracking: boolean;
  hasAnyAuth: boolean;
}

function analyseCookies(cookieStr: string): CookieAnalysis {
  if (!cookieStr.trim()) return { trackingCookies: [], authCookies: [], unknownCookies: [], hasOnlyTracking: false, hasAnyAuth: false };

  const pairs = cookieStr.split(';').map(s => s.trim()).filter(Boolean);
  const trackingCookies: string[] = [];
  const authCookies: string[] = [];
  const unknownCookies: string[] = [];

  for (const pair of pairs) {
    const name = pair.split('=')[0].trim().toLowerCase();
    const isTracking = TRACKING_PREFIXES.some(p => name.startsWith(p.toLowerCase()));
    const isAuth = AUTH_INDICATORS.some(a => name.includes(a.toLowerCase()));

    if (isTracking) {
      trackingCookies.push(pair.split('=')[0].trim());
    } else if (isAuth) {
      authCookies.push(pair.split('=')[0].trim());
    } else {
      unknownCookies.push(pair.split('=')[0].trim());
    }
  }

  return {
    trackingCookies,
    authCookies,
    unknownCookies,
    hasOnlyTracking: trackingCookies.length > 0 && authCookies.length === 0,
    hasAnyAuth: authCookies.length > 0,
  };
}

export default function GlobalConfigModal({
  isOpen,
  onClose,
  authHeader,
  onUpdateAuth,
  theme,
  onRefreshNeeded,
  onOpenDebug,
}: GlobalConfigModalProps) {
  const [sessionCookie, setSessionCookieLocal] = useState('');
  const [sourceUrls, setSourceUrlsLocal] = useState<SourceConfig[]>([]);
  const [validatingUrls, setValidatingUrls] = useState<Record<number, boolean>>({});
  const [urlResults, setUrlResults] = useState<Record<number, ConnectionTestResult | null>>({});
  const [showGuide, setShowGuide] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSessionCookieLocal(getSessionCookie());
      setSourceUrlsLocal(getSourceUrls());
      setTestResult(null);
      setUrlResults({});
      setShowRawResponse(false);
    }
  }, [isOpen]);

  const handleSourceUrlChange = (index: number, field: keyof SourceConfig, value: string) => {
    const updated = [...sourceUrls];
    updated[index] = { ...updated[index], [field]: value };
    setSourceUrlsLocal(updated);
    setSourceUrls(updated);
    // Clear validation result for this URL
    setUrlResults(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleAddSource = () => {
    const updated = [...sourceUrls, { name: 'New Source', url: '' }];
    setSourceUrlsLocal(updated);
    setSourceUrls(updated);
  };

  const handleRemoveSource = (index: number) => {
    const updated = sourceUrls.filter((_, i) => i !== index);
    setSourceUrlsLocal(updated);
    setSourceUrls(updated);
  };

  const handleValidateUrl = async (index: number) => {
    const url = sourceUrls[index].url;
    if (!url.trim()) return;

    setValidatingUrls(prev => ({ ...prev, [index]: true }));
    const result = await validateSourceUrl(url, authHeader || undefined);
    setUrlResults(prev => ({ ...prev, [index]: result }));
    setValidatingUrls(prev => ({ ...prev, [index]: false }));
  };

  const handleCookieChange = (val: string) => {
    setSessionCookieLocal(val);
    setSessionCookie(val);
    setTestResult(null);
    setShowRawResponse(false);
  };

  const cookieAnalysis = useMemo(() => analyseCookies(sessionCookie), [sessionCookie]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    setShowRawResponse(false);
    const result = await testApiConnection(authHeader || undefined);
    setTestResult(result);
    setTesting(false);
    if (result.ok && onRefreshNeeded) {
      onRefreshNeeded();
    }
  }, [authHeader, onRefreshNeeded]);

  const isDark = theme === 'dark';
  const mutedCls = isDark ? 'text-slate-400' : 'text-gray-500';
  const labelCls = isDark ? 'text-slate-500' : 'text-gray-400';
  const inputCls = isDark
    ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-black';
  const borderCls = isDark ? 'border-slate-800' : 'border-gray-200';
  const sectionBg = isDark ? 'bg-slate-900' : 'bg-gray-50';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900 z-[60]"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-xl z-[70] flex flex-col shadow-2xl border overflow-hidden',
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
            )}
          >
            {/* Header */}
            <div className={cn('p-6 border-b flex items-center justify-between flex-shrink-0', borderCls)}>
              <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-4 h-4" />
                API Authentication
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-900 rounded transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>

              {/* Intro */}
              <p className={cn('text-xs leading-relaxed', mutedCls)}>
                Paste your <strong>full session cookie</strong> from the DevTools Network tab below. You must be signed in to{' '}
                <a href="https://extensions.sketchup.com" target="_blank" rel="noreferrer" className="underline">extensions.sketchup.com</a>{' '}
                as a reviewer.
              </p>

              {/* ─── CRITICAL WARNING ─── */}
              <div className={cn('rounded-lg p-4 border flex gap-3', isDark ? 'bg-red-950/30 border-red-900/50' : 'bg-red-50 border-red-200')}>
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className={cn('text-[11px] font-bold', isDark ? 'text-red-400' : 'text-red-700')}>
                    Do NOT use the browser console snippet or the Application tab
                  </p>
                  <p className={cn('text-[11px] leading-relaxed', isDark ? 'text-red-400/80' : 'text-red-600')}>
                    The SketchUp auth cookie is <strong>HttpOnly</strong> — it is invisible to JavaScript and cannot be copied by any console script. You must copy from <strong>DevTools → Network tab → Request Headers → Cookie</strong>.
                  </p>
                </div>
              </div>

              {/* Cookie textarea */}
              <div className="space-y-2">
                <label className={cn('text-[10px] font-bold uppercase tracking-widest block', labelCls)}>Session Cookie (from Network tab)</label>
                <textarea
                  value={sessionCookie}
                  onChange={(e) => handleCookieChange(e.target.value)}
                  className={cn(
                    'w-full px-4 py-3 rounded text-[11px] focus:outline-none transition-colors border font-mono min-h-[80px] resize-none',
                    inputCls
                  )}
                  placeholder="Paste the full Cookie header value from DevTools Network tab..."
                />
              </div>

              {/* ─── SOURCE URLs ─── */}
              <div className={cn('rounded-lg border overflow-hidden', borderCls)}>
                <button
                  onClick={() => setShowSources(!showSources)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition',
                    isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    API Source URLs
                  </span>
                  {showSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence>
                  {showSources && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className={cn('px-4 pb-4 space-y-4 pt-2', isDark ? 'bg-slate-950' : 'bg-white')}
                    >
                      <p className={cn('text-[10px]', mutedCls)}>
                        Configure the JSON endpoints used to populate the dashboard. You can add multiple sources to combine data.
                      </p>

                      <div className="space-y-3">
                        {sourceUrls.map((source, idx) => (
                          <div key={idx} className={cn('p-3 rounded-lg border space-y-3', borderCls, sectionBg)}>
                            <div className="flex items-center justify-between">
                              <input
                                value={source.name}
                                onChange={(e) => handleSourceUrlChange(idx, 'name', e.target.value)}
                                className={cn('bg-transparent border-none p-0 text-[11px] font-bold focus:ring-0 w-full', isDark ? 'text-white' : 'text-gray-900')}
                                placeholder="Source Name"
                              />
                              <button
                                onClick={() => handleRemoveSource(idx)}
                                className="p-1 hover:text-red-500 transition-colors text-gray-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <input
                                value={source.url}
                                onChange={(e) => handleSourceUrlChange(idx, 'url', e.target.value)}
                                className={cn(
                                  'flex-1 px-3 py-1.5 rounded text-[11px] focus:outline-none transition-colors border font-mono',
                                  inputCls
                                )}
                                placeholder="/api/..."
                              />
                              <button
                                onClick={() => handleValidateUrl(idx)}
                                disabled={validatingUrls[idx] || !source.url.trim()}
                                className={cn(
                                  'px-3 py-1.5 rounded text-[10px] font-bold uppercase transition flex items-center gap-1.5 shrink-0',
                                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                )}
                              >
                                {validatingUrls[idx] ? <Loader className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                                Validate
                              </button>
                            </div>

                            {urlResults[idx] && (
                              <div className={cn(
                                'rounded p-2 flex gap-2 items-start text-[10px]',
                                urlResults[idx]?.ok
                                  ? (isDark ? 'bg-green-950/30 text-green-400' : 'bg-green-50 text-green-700')
                                  : (isDark ? 'bg-red-950/30 text-red-400' : 'bg-red-50 text-red-700')
                              )}>
                                {urlResults[idx]?.ok ? <CheckCircle className="w-3.5 h-3.5 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 mt-0.5" />}
                                <p className="leading-tight">{urlResults[idx]?.detail}</p>
                              </div>
                            )}
                          </div>
                        ))}

                        <button
                          onClick={handleAddSource}
                          className={cn(
                            'w-full py-2 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition',
                            isDark ? 'border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-400' : 'border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-500'
                          )}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add API Source
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ─── COOKIE ANALYSER ─── */}
              {sessionCookie.trim() && (
                <div className={cn('rounded-lg border p-3 space-y-2', borderCls, sectionBg)}>
                  <p className={cn('text-[10px] font-bold uppercase tracking-widest', labelCls)}>Cookie Analysis</p>

                  {cookieAnalysis.hasOnlyTracking && (
                    <div className={cn('flex gap-2 items-start rounded p-3', isDark ? 'bg-red-950/40 text-red-400' : 'bg-red-50 text-red-700')}>
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="text-[11px] space-y-1">
                        <p className="font-bold">Only tracking cookies detected — authentication will fail</p>
                        <p>The cookies you pasted ({cookieAnalysis.trackingCookies.slice(0,3).join(', ')}{cookieAnalysis.trackingCookies.length > 3 ? '…' : ''}) are analytics trackers. They contain no login information. The SketchUp API will redirect you to a login page.</p>
                        <p className="font-semibold">You must copy from DevTools → Network tab → a request to extensions.sketchup.com → Request Headers → Cookie row.</p>
                      </div>
                    </div>
                  )}

                  {cookieAnalysis.hasAnyAuth && (
                    <div className={cn('flex gap-2 items-start rounded p-3', isDark ? 'bg-green-950/30 text-green-400' : 'bg-green-50 text-green-700')}>
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="text-[11px]">
                        <p className="font-bold">Auth-related cookies detected: {cookieAnalysis.authCookies.join(', ')}</p>
                        <p>These look like session cookies. Click Test Connection to verify.</p>
                      </div>
                    </div>
                  )}

                  {!cookieAnalysis.hasOnlyTracking && !cookieAnalysis.hasAnyAuth && cookieAnalysis.unknownCookies.length > 0 && (
                    <div className={cn('flex gap-2 items-start rounded p-3', isDark ? 'bg-amber-950/30 text-amber-400' : 'bg-amber-50 text-amber-700')}>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="text-[11px]">
                        <p>Unrecognised cookies: <strong>{cookieAnalysis.unknownCookies.slice(0,5).join(', ')}</strong></p>
                        <p>These may include the auth cookie. Click Test Connection to find out.</p>
                      </div>
                    </div>
                  )}

                  <p className={cn('text-[10px]', mutedCls)}>
                    {cookieAnalysis.trackingCookies.length > 0 && <span className="text-red-500">Tracking: {cookieAnalysis.trackingCookies.length} · </span>}
                    {cookieAnalysis.authCookies.length > 0 && <span className="text-green-500">Auth: {cookieAnalysis.authCookies.length} · </span>}
                    {cookieAnalysis.unknownCookies.length > 0 && <span>Unknown: {cookieAnalysis.unknownCookies.length}</span>}
                  </p>
                </div>
              )}

              {/* Test button + result */}
              <div className="space-y-3">
                <button
                  onClick={handleTest}
                  disabled={testing || !sessionCookie.trim()}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded text-[11px] font-bold uppercase tracking-widest transition w-full justify-center',
                    isDark ? 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40' : 'bg-black hover:bg-gray-800 text-white disabled:opacity-40'
                  )}
                >
                  {testing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {testing ? 'Testing…' : 'Test Connection'}
                </button>

                {testResult && (
                  <div className={cn(
                    'rounded-lg p-3 flex gap-3 items-start text-[11px]',
                    testResult.ok
                      ? (isDark ? 'bg-green-950/30 text-green-400' : 'bg-green-50 text-green-700')
                      : (isDark ? 'bg-red-950/30 text-red-400' : 'bg-red-50 text-red-700')
                  )}>
                    {testResult.ok
                      ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      : testResult.errorType === 'wrong_cookie'
                        ? <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <div className="space-y-1.5 flex-1">
                      <p className="font-semibold">{testResult.detail}</p>

                      {testResult.rawResponse && (
                        <div>
                          <button
                            onClick={() => setShowRawResponse(!showRawResponse)}
                            className="underline text-[10px] opacity-70 hover:opacity-100"
                          >
                            {showRawResponse ? 'Hide' : 'Show'} raw server response
                          </button>
                          {showRawResponse && (
                            <pre className={cn('mt-2 text-[10px] font-mono p-2 rounded overflow-x-auto whitespace-pre-wrap break-all', isDark ? 'bg-slate-900' : 'bg-white border border-gray-200')}>
                              {testResult.rawResponse}
                            </pre>
                          )}
                        </div>
                      )}

                      {testResult.ok && onOpenDebug && (
                        <button onClick={onOpenDebug} className="underline text-[10px] opacity-70 hover:opacity-100">
                          View raw API response in debug panel →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Step-by-step guide */}
              <div className={cn('rounded-lg border overflow-hidden', borderCls)}>
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
                      className={cn('px-4 pb-4 text-[11px] leading-relaxed', mutedCls)}
                    >
                      <div className={cn('my-3 p-3 rounded-lg font-bold text-[11px] border', isDark ? 'bg-red-950/30 border-red-900/40 text-red-400' : 'bg-red-50 border-red-200 text-red-700')}>
                        ⚠ IMPORTANT: You must use the <u>Network tab</u>. The Application tab and browser console only show non-HttpOnly tracking cookies — those will NOT work.
                      </div>

                      <ol className="list-decimal list-inside space-y-2">
                        <li>In Chrome, navigate to <a href="https://extensions.sketchup.com" target="_blank" rel="noreferrer" className="underline font-semibold">extensions.sketchup.com</a> and make sure you are signed in.</li>
                        <li>Press <kbd className="px-1 py-0.5 rounded text-[10px] bg-gray-200 dark:bg-slate-700 font-mono">F12</kbd> to open DevTools.</li>
                        <li>Click the <strong>Network</strong> tab at the top of DevTools.</li>
                        <li>Press <kbd className="px-1 py-0.5 rounded text-[10px] bg-gray-200 dark:bg-slate-700 font-mono">F5</kbd> to reload the page with Network recording active.</li>
                        <li>In the Network request list, click the <strong>first request</strong> to <code className="font-mono bg-gray-100 dark:bg-slate-800 px-1 rounded">extensions.sketchup.com</code> (usually the document request at the top).</li>
                        <li>In the right panel, click <strong>Headers</strong> then scroll to <strong>Request Headers</strong>.</li>
                        <li>Find the row labelled <strong>cookie:</strong> — this will contain a long string with ALL cookies including the HttpOnly session cookie.</li>
                        <li>Right-click that value and select <strong>Copy value</strong>.</li>
                        <li>Paste into the Session Cookie field above.</li>
                      </ol>

                      <div className={cn('mt-3 p-3 rounded', isDark ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-50 text-amber-700')}>
                        <strong>Tip:</strong> The auth cookie will be among names like <code className="font-mono">_session_id</code>, <code className="font-mono">auth_token</code>, <code className="font-mono">tc_session</code>, or similar — not <code className="font-mono">_mkto_trk</code> or <code className="font-mono">_ga</code> which are analytics trackers.
                      </div>

                      <div className={cn('mt-2 p-3 rounded', isDark ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-700')}>
                        <strong>Session cookies expire</strong> — typically after a few hours or when you log out. If the test worked previously but fails now, repeat these steps to get a fresh cookie.
                      </div>
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
                Open API endpoint directly (check if you get JSON or a login page)
              </a>
            </div>

            {/* Footer */}
            <div className={cn('p-6 border-t flex justify-end flex-shrink-0', isDark ? 'border-slate-800 bg-slate-900/50' : 'border-gray-100 bg-gray-50')}>
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
