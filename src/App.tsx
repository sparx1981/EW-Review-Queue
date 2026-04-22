import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithPopup, googleProvider, testConnection } from './services/firebase';
import DashboardView from './components/DashboardView';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-400 font-medium"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-4"
          >
            <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-10 text-center border border-gray-200">
              <div className="w-12 h-12 bg-black rounded-sm flex items-center justify-center mx-auto mb-8 shadow-sm">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">Extension Warehouse</h1>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-10">Review Analytics Dashboard</p>
              
              <button
                onClick={handleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-medium py-3 px-4 rounded hover:bg-gray-50 transition-colors shadow-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Sign in with Google
              </button>
              
              <div className="mt-10 pt-8 border-t border-gray-100">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
                  Your dashboard layouts are saved to your Google account.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <DashboardView user={user} />
        )}
      </AnimatePresence>
    </div>
  );
}
