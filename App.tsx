
import React, { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AIAssistant from './components/AIAssistant';
import AuthModal from './components/AuthModal';
import { UserRole, User } from './types';
import { AlertCircle, X, CheckCircle2, BellRing, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authClient } from './lib/auth-client';
import { getAuthUser } from './lib/auth-client';
import { StorageService } from './services/storageService';
import { useSystemTheme } from './hooks/useSystemTheme';

const Home = lazy(() => import('./pages/Home'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const ResearcherPortfolio = lazy(() => import('./pages/ResearcherPortfolio'));
const Dashboards = lazy(() => import('./pages/Dashboards'));
const Onboarding = lazy(() => import('./pages/Onboarding').then((module) => ({ default: module.Onboarding })));
const Products = lazy(() => import('./pages/Products'));
const News = lazy(() => import('./pages/News'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyOTP = lazy(() => import('./pages/VerifyOTP'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AdminLogin = lazy(() => import('./pages/AdminLogin').then((module) => ({ default: module.AdminLogin })));

// --- TOAST SYSTEM ---
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const ToastContext = createContext<{
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-[11px] font-semibold tracking-[0.2em] text-ug-teal uppercase">
    Loading workspace...
  </div>
);

const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => (
  <div className="fixed top-24 right-6 z-[200] space-y-3 pointer-events-none">
    {toasts.map((toast) => (
      <div 
        key={toast.id} 
        className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border animate-fade-in-right max-w-sm ${
          toast.type === 'success' ? 'bg-ug-navy border-ug-teal text-white' : 
          toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 
          toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
          'bg-white border-gray-100 text-ug-navy'
        }`}
      >
        {toast.type === 'success' ? (
          <CheckCircle2 className="text-ug-teal shrink-0" size={20} />
        ) : toast.type === 'warning' ? (
          <AlertCircle className="text-amber-500 shrink-0" size={20} />
        ) : (
          <AlertCircle size={20} className="shrink-0" />
        )}
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={() => removeToast(toast.id)} className="ml-2 p-1 hover:bg-white/10 rounded-full transition">
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
);

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  isAuthenticated: boolean | null;
  children: React.ReactNode;
  onUnauthorized: () => void;
}> = ({ isAuthenticated, children, onUnauthorized }) => {
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated && location.pathname === '/dashboard') {
      onUnauthorized();
    }
  }, [isAuthenticated, location.pathname, onUnauthorized]);

  if (isAuthenticated === null) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  useSystemTheme();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    (async () => {
      try {
        const user = await getAuthUser();
        if (user?.id) {
          await loadProfile(user.id);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {}
    })();
  }, []);

  // Periodic unread count check (every 30 seconds or on route change)
  useEffect(() => {
    if (isAuthenticated && userProfile?.id) {
      const fetchCount = async () => {
        const count = await StorageService.getUnreadCount(userProfile.id);
        setUnreadCount(count);
      };
      fetchCount();
      
      // Setup interval for live updates
      const interval = setInterval(fetchCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, userProfile?.id]);

  const loadProfile = async (userId: string) => {
    try {
      const profile = await StorageService.getCurrentProfile();
      if (profile) {
        setUserProfile(profile);
      } else {
        setUserProfile({ id: userId, email: '', name: 'Researcher', role: UserRole.Researcher });
      }
    } catch (error) {
      console.error('Profile load failed:', error);
      setUserProfile(null);
    }
  };

  const handleAuthenticated = async (user: { id: string }) => {
    setIsAuthenticated(null);
    setShowLoginPrompt(false);
    setIsAuthModalOpen(false);
    await loadProfile(user.id);
    setIsAuthenticated(true);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const executeLogout = async () => {
    setShowLogoutConfirm(false);
    try { await (authClient as any).signOut?.(); } catch {}
    setIsAuthenticated(false);
    setUserProfile(null);
    setUnreadCount(0);
    showToast("Session Secured & Terminated", "info");
    navigate('/');
  };

  const handleUserIconClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleUnauthorizedAccess = () => {
    setShowLoginPrompt(true);
    setIsAuthModalOpen(true);
  };

  const handleSelectMessage = (threadId: string) => {
    setSelectedThreadId(threadId);
    navigate('/dashboard');
  };

  const isDashboard = location.pathname === '/dashboard';
  const isAdminLogin = location.pathname === '/admin/login';
  const hideLayout = isDashboard || isAdminLogin;

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="flex flex-col min-h-screen font-sans text-gray-900">
        {!hideLayout && (
          <Navbar 
              isAuthenticated={isAuthenticated === true}
              user={userProfile}
              onUserIconClick={handleUserIconClick}
              onLogout={handleLogout}
              onSelectMessage={handleSelectMessage}
              unreadCount={unreadCount}
          />
        )}
        
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {showLoginPrompt && !isAuthenticated && (
          <div className="bg-ug-warning/90 backdrop-blur-sm text-ug-navy py-3 px-4 flex items-center justify-center gap-3 animate-fade-in shadow-xl relative z-40 border-b border-ug-warning">
            <BellRing size={20} className="shrink-0 animate-bounce" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">
              Identity Required: Please sign in to access secure researcher tools.
            </span>
            <button 
              onClick={() => setShowLoginPrompt(false)}
              className="ml-4 p-1 hover:bg-black/10 rounded-full transition"
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        <main className="flex-grow">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/researcher/:id" element={<ResearcherPortfolio />} />
              <Route path="/products" element={<Products />} />
              <Route path="/news" element={<News />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route path="/reset-password" element={<ResetPassword />} />
               <Route path="/admin/login" element={<AdminLogin onAuthenticated={handleAuthenticated} />} />
              
              <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute 
                      isAuthenticated={isAuthenticated} 
                      onUnauthorized={handleUnauthorizedAccess}
                    >
                      {userProfile?.role !== UserRole.Admin && !userProfile?.ai_profile && !localStorage.getItem(`onboarding_skipped_${userProfile?.id}`) ? (
                        <Onboarding 
                          user={userProfile} 
                          onComplete={() => userProfile && loadProfile(userProfile.id)} 
                          onSkip={() => {
                            if (userProfile?.id) {
                              localStorage.setItem(`onboarding_skipped_${userProfile.id}`, 'true');
                              loadProfile(userProfile.id);
                            }
                          }}
                        />
                      ) : (
                        <Dashboards 
                          role={userProfile?.role || UserRole.Researcher} 
                          user={userProfile} 
                          initialThreadId={selectedThreadId}
                          onThreadHandled={() => setSelectedThreadId(null)}
                          onLogout={handleLogout}
                          onProfileUpdate={() => userProfile && loadProfile(userProfile.id)}
                        />
                      )}
                    </ProtectedRoute>
                  } 
              />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)}
            onAuthenticated={handleAuthenticated}
        />

        <AnimatePresence>
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLogoutConfirm(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-sm w-full overflow-hidden text-center relative z-10 p-6 sm:p-8"
              >
                {/* Warning Icon */}
                <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 text-[#ef4444] flex items-center justify-center mb-5 shadow-inner">
                  <LogOut size={28} className="translate-x-0.5" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-extrabold text-ug-navy uppercase tracking-wider mb-2">
                  Terminate {userProfile?.role === UserRole.Admin ? "Admin Session" : "Active Session"}?
                </h3>

                {/* Body message */}
                <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">
                  Are you sure you want to log out? Any unsaved edits or active curator tasks will be terminated securely.
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-3 px-4 text-[11px] font-semibold tracking-wider text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition cursor-pointer text-center"
                  >
                    Keep Session
                  </button>
                  <button
                    type="button"
                    onClick={executeLogout}
                    className="flex-1 py-3 px-4 text-[11px] font-semibold tracking-wider text-white bg-[#ef4444] hover:bg-red-600 rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/15"
                  >
                    <span>Secure Sign Out</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {!hideLayout && <AIAssistant />}
        {!hideLayout && <Footer />}
      </div>
    </ToastContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
