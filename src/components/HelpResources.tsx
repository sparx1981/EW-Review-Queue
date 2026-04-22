import { useState } from 'react';
import { X, Book, Code, History, Search, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { userDocumentation, developerDocumentation, releaseNotes } from '../docs/docsData';
import { cn } from '../lib/utils';
import dayjs from 'dayjs';

interface HelpResourcesProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpResources({ isOpen, onClose }: HelpResourcesProps) {
  const [activeTab, setActiveTab] = useState<'user' | 'dev' | 'release'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredUserDoc = userDocumentation.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative z-10"
          >
            <div className="flex border-b border-slate-100">
              <button 
                onClick={() => setActiveTab('user')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-5 text-sm font-bold transition",
                  activeTab === 'user' ? "text-blue-600 bg-blue-50/50" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <Book className="w-4 h-4" />
                User Doc
              </button>
              <button 
                onClick={() => setActiveTab('dev')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-5 text-sm font-bold transition",
                  activeTab === 'dev' ? "text-blue-600 bg-blue-50/50" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <Code className="w-4 h-4" />
                Full Documentation
              </button>
              <button 
                onClick={() => setActiveTab('release')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-5 text-sm font-bold transition",
                  activeTab === 'release' ? "text-blue-600 bg-blue-50/50" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <History className="w-4 h-4" />
                Release Notes
              </button>
              <button onClick={onClose} className="px-6 border-l border-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {activeTab === 'user' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search documentation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  {filteredUserDoc.map(doc => (
                    <div key={doc.id} className="scroll-mt-6">
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{doc.title}</h3>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{doc.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'dev' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {developerDocumentation.map(doc => (
                    <div key={doc.id} className="relative group">
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{doc.title}</h3>
                      <p className="text-slate-500 text-sm mb-4 italic">{doc.description}</p>
                      <div className="bg-slate-900 rounded-2xl p-6 relative overflow-hidden">
                        <pre className="text-blue-300 text-xs font-mono overflow-x-auto">
                          {doc.code}
                        </pre>
                        <button 
                          onClick={() => copyToClipboard(doc.code, doc.id)}
                          className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                        >
                          {copiedId === doc.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button className="absolute bottom-4 right-4 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-md hover:bg-blue-700 transition">
                          TRY IT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'release' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full">
                  {releaseNotes.map(note => (
                    <div key={note.date} className="relative pl-8 border-l-2 border-slate-100">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-600 rounded-full ring-4 ring-white" />
                      <h3 className="text-lg font-bold text-slate-800 mb-4">{dayjs(note.date).format('MMMM D, YYYY')}</h3>
                      <ul className="space-y-3">
                        {note.changes.map((change, i) => (
                          <li key={i} className="text-slate-600 text-sm flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
