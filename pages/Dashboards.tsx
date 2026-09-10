
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { UserRole, Project, User } from '../types';
import { StorageService } from '../services/storageService';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Zap, Target, Sparkles } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { dashboardLandingPath, hasDashboardCapability, isDashboardPathAllowed, isTtoRole, legacyDashboardTabPath, type AdminPage, type DashboardTab } from '../lib/dashboardRouting';
import { DashboardSidebar, MobileNav as DashboardMobileNav } from '../components/dashboard/DashboardNavigation';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { ProfileInsight } from '../components/dashboard/ProfileInsight';
import { ProfileSettings } from '../components/dashboard/ProfileSettings';
import { ProjectFormModal } from '../components/dashboard/ProjectFormModal';

const Onboarding = lazy(() => import('./Onboarding').then((module) => ({ default: module.Onboarding })));
const AdminDashboard = lazy(() => import('../components/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const PartnerOverviewPage = lazy(() => import('./dashboard/PartnerOverviewPage').then((module) => ({ default: module.PartnerOverviewPage })));
const StudentOverviewPage = lazy(() => import('./dashboard/StudentOverviewPage').then((module) => ({ default: module.StudentOverviewPage })));
const MatchesPage = lazy(() => import('./dashboard/MatchesPage').then((module) => ({ default: module.MatchesPage })));
const MessagesPage = lazy(() => import('./dashboard/MessagesPage').then((module) => ({ default: module.MessagesPage })));
const ResearcherOverviewPage = lazy(() => import('./dashboard/ResearcherOverviewPage').then((module) => ({ default: module.ResearcherOverviewPage })));
const AccessRequestsPage = lazy(() => import('./dashboard/DisclosurePages').then((module) => ({ default: module.AccessRequestsPage })));
const ResearcherDisclosuresPage = lazy(() => import('./dashboard/DisclosurePages').then((module) => ({ default: module.ResearcherDisclosuresPage })));
const IpQuestionsPage = lazy(() => import('./dashboard/DisclosurePages').then((module) => ({ default: module.IpQuestionsPage })));
const AdminDisclosuresPage = lazy(() => import('./dashboard/DisclosurePages').then((module) => ({ default: module.AdminDisclosuresPage })));
const TtoDisclosuresPage = lazy(() => import('./dashboard/DisclosurePages').then((module) => ({ default: module.TtoDisclosuresPage })));
const AdminAuditPage = lazy(() => import('./dashboard/admin/AdminAuditPage').then((module) => ({ default: module.AdminAuditPage })));
const AdminDecisionsPage = lazy(() => import('./dashboard/admin/AdminDecisionsPage').then((module) => ({ default: module.AdminDecisionsPage })));
const AdminNewsPage = lazy(() => import('./dashboard/admin/AdminNewsPage').then((module) => ({ default: module.AdminNewsPage })));
const AdminOverviewPage = lazy(() => import('./dashboard/admin/AdminOverviewPage').then((module) => ({ default: module.AdminOverviewPage })));
const AdminProjectsPage = lazy(() => import('./dashboard/admin/AdminProjectsPage').then((module) => ({ default: module.AdminProjectsPage })));
const AdminUsersPage = lazy(() => import('./dashboard/admin/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })));

const DashboardPageFallback = () => (
  <div className="py-16 flex items-center justify-center text-[11px] font-semibold tracking-[0.2em] text-ug-teal uppercase">
    Loading workspace...
  </div>
);

// --- DASHBOARD WRAPPER ---
interface DashboardProps {
  role: UserRole;
  user: User | null;
}

interface DashboardsProps extends DashboardProps {
  initialThreadId?: string | null;
  onThreadHandled?: () => void;
  onLogout?: () => void;
  onProfileUpdate?: () => void;
}

const Dashboards: React.FC<DashboardsProps> = ({ role, user, initialThreadId, onThreadHandled, onLogout, onProfileUpdate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [activeTab, setActiveTabState] = useState<DashboardTab>('overview');
  const [adminSubTab, setAdminSubTabState] = useState<'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions'>('metrics');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [localUser, setLocalUser] = useState<User | null>(user);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [localInitialThreadId, setLocalInitialThreadId] = useState<string | null>(null);
  const [autoOpenCreateChallenge, setAutoOpenCreateChallenge] = useState(false);

  const setActiveTab = (tab: DashboardTab) => {
    setActiveTabState(tab);
    navigate(`/dashboard/${tab}`);
  };

  const setAdminSubTab = (tab: 'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions') => {
    setAdminSubTabState(tab);
    const segment: Record<typeof tab, AdminPage> = {
      metrics: 'overview',
      users: 'users',
      disclosures: 'disclosures',
      projects: 'projects',
      news: 'news',
      logs: 'audit',
      decisions: 'decisions',
    };
    navigate(`/dashboard/admin/${segment[tab]}`);
  };

  // Canonical nested URLs are authoritative. Legacy ?tab= links redirect once.
  useEffect(() => {
    if (!isDashboardPathAllowed(role, location.pathname)) {
      navigate('/dashboard/overview', { replace: true });
      return;
    }
    const params = new URLSearchParams(location.search);
    const legacyTab = params.get('tab');
    if (location.pathname === '/dashboard' && legacyTab) {
      params.delete('tab');
      const suffix = params.toString();
      navigate(`${legacyDashboardTabPath(legacyTab, role)}${suffix ? `?${suffix}` : ''}`, { replace: true });
      return;
    }
    if (location.pathname === '/dashboard') {
      navigate(dashboardLandingPath(role), { replace: true });
      return;
    }
    const genericTab = location.pathname.split('/')[2];
    if (['overview', 'matches', 'messages', 'profile'].includes(genericTab)) {
      setActiveTabState(genericTab as DashboardTab);
      return;
    }
    if (genericTab === 'admin') {
      const adminPage = location.pathname.split('/')[3] || 'overview';
       const mapped: Record<string, typeof adminSubTab> = {
         overview: 'metrics', users: 'users', disclosures: 'metrics', projects: 'projects',
         news: 'news', audit: 'logs', decisions: 'metrics',
      };
      setActiveTabState('overview');
      setAdminSubTabState(mapped[adminPage] || 'metrics');
    }
  }, [location.pathname, location.search, navigate, role]);

  useEffect(() => {
    if (initialThreadId) {
      setActiveTab('messages');
      if (onThreadHandled) onThreadHandled();
    }
  }, [initialThreadId, onThreadHandled]);

  useEffect(() => {
    setLocalUser(user);
    const userId = user?.id;
    if (userId) {
       StorageService.getUnreadCount(userId).then(setInternalUnread).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const userId = localUser?.id || user?.id;
    if (!userId) return;
    const interval = setInterval(() => {
       StorageService.getUnreadCount(userId).then(setInternalUnread).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [localUser?.id, user?.id]);

  const [internalUnread, setInternalUnread] = useState(0);

  const [profileMode, setProfileMode] = useState<'identity' | 'insights'>('identity');
  const [isRerunningOnboarding, setIsRerunningOnboarding] = useState(false);

  const refreshProfile = async () => {
    const userId = localUser?.id || user?.id;
    if (!userId) return;
     const freshProfile = await StorageService.getCurrentProfile();
    setLocalUser(freshProfile);
    if (onProfileUpdate) {
      onProfileUpdate();
    }
  };

  const handleToggleVisibility = async () => {
    if (!localUser) return;
    const currentStatus = localUser.ai_profile?.portfolio_visible !== false;
    const newStatus = !currentStatus;
    
    const updatedAiProfile = {
      ...(localUser.ai_profile || {}),
      portfolio_visible: newStatus
    };
    
    try {
      const updatedUser = {
        ...localUser,
        ai_profile: updatedAiProfile
      };
      setLocalUser(updatedUser);
      
      const { error } = await supabase
        .from('profiles')
        .update({ ai_profile: updatedAiProfile })
        .eq('id', localUser.id);
        
      if (error) throw error;
      
      showToast(`Directory visibility set to ${newStatus ? 'Visible' : 'Hidden'}`, "success");
    } catch (err: any) {
      showToast(`Failed to update visibility: ${err.message}`, "error");
      refreshProfile();
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Fallback if prop not provided
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      window.location.href = '/';
    }
  };

  const adminPath = location.pathname.startsWith('/dashboard/admin/')
    ? location.pathname.slice('/dashboard/admin/'.length).split('/')[0]
    : location.pathname === '/dashboard/admin'
      ? 'overview'
      : null;
  const routedWorkspace = adminPath === 'disclosures'
      ? <AdminDisclosuresPage role={role} />
      : adminPath === 'overview'
      ? <AdminOverviewPage user={localUser} onRefresh={refreshProfile} />
      : adminPath === 'users'
        ? <AdminUsersPage user={localUser} onRefresh={refreshProfile} />
        : adminPath === 'projects'
          ? <AdminProjectsPage user={localUser} onRefresh={refreshProfile} />
          : adminPath === 'news'
            ? <AdminNewsPage user={localUser} onRefresh={refreshProfile} />
            : adminPath === 'audit'
              ? <AdminAuditPage user={localUser} onRefresh={refreshProfile} />
              : adminPath === 'decisions'
                ? <AdminDecisionsPage user={localUser} onRefresh={refreshProfile} />
                    : location.pathname.startsWith('/dashboard/disclosures/')
                      ? <IpQuestionsPage role={role} />
                    : location.pathname.startsWith('/dashboard/disclosures')
                    ? <ResearcherDisclosuresPage role={role} onCreateProject={() => { setSelectedProject(null); setIsProjectModalOpen(true); }} />
                   : location.pathname.startsWith('/dashboard/tto')
                  ? <TtoDisclosuresPage role={role} />
                     : location.pathname.startsWith('/dashboard/access-requests')
                        ? <AccessRequestsPage role={role} />
                        : null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <DashboardSidebar 
        role={role} 
        user={localUser} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        adminSubTab={adminSubTab}
        setAdminSubTab={setAdminSubTab}
        onNavigate={navigate}
        activePath={location.pathname}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      
      <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        <DashboardHeader
          displayName={localUser?.name || user?.name}
          administrative={hasDashboardCapability(role, 'reviewTto')}
          activeTab={activeTab}
          unreadCount={internalUnread}
          onMessages={() => setActiveTab('messages')}
          showMessages={!isTtoRole(role)}
          onLogout={handleLogout}
          onNavigate={navigate}
        />
        <main className="flex-1 w-full overflow-y-auto bg-slate-50">
          <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-5 pb-24 sm:space-y-7 sm:px-6 sm:py-7 lg:px-10 lg:py-8 lg:pb-10">
          <Suspense fallback={<DashboardPageFallback />}>
          {routedWorkspace || <>
          {activeTab === 'overview' && (
            <div className="animate-fade-in space-y-5 md:space-y-7">
              {role === UserRole.Researcher && (
                <div className="space-y-5 md:space-y-7">
                  <ResearcherOverviewPage 
                    user={localUser} 
                    onUpdate={refreshProfile} 
                    onOpenModal={(proj) => {
                      setSelectedProject(proj);
                      setIsProjectModalOpen(true);
                    }}
                    refreshTrigger={refreshTrigger}
                    setActiveTab={setActiveTab}
                    setLocalInitialThreadId={setLocalInitialThreadId}
                  />
                </div>
              )}
              {role === UserRole.Student && <StudentOverviewPage user={localUser} />}
              {(role === UserRole.Investor || role === UserRole.IndustryPartner) && (
                <PartnerOverviewPage 
                  user={localUser} 
                  setActiveTab={setActiveTab} 
                />
              )}
              {(role === UserRole.Admin || isTtoRole(role)) && (
                 <AdminDashboard 
                   user={localUser} 
                   onRefresh={refreshProfile} 
                   activeSubTab={adminSubTab}
                   setActiveSubTab={setAdminSubTab}
                   overviewOnly={isTtoRole(role)}
                 />
              )}
            </div>
          )}

          {activeTab === 'matches' && (
             <MatchesPage 
               user={localUser} 
               setActiveTab={setActiveTab} 
               setLocalInitialThreadId={setLocalInitialThreadId} 
               onProfileUpdate={refreshProfile}
               autoOpenCreateChallenge={autoOpenCreateChallenge}
               onCloseCreateChallenge={() => setAutoOpenCreateChallenge(false)}
             />
          )}

          {activeTab === 'messages' && (
            <MessagesPage 
              user={localUser} 
              initialThreadId={localInitialThreadId || initialThreadId} 
              onResetInitialThread={() => setLocalInitialThreadId(null)} 
            />
          )}
          {activeTab === 'profile' && (
            <div className="space-y-6 md:space-y-10 animate-fade-in">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between border-b border-slate-200 pb-6 md:pb-8">
                <div>
                   <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-ug-teal"><span className="h-1.5 w-1.5 rounded-full bg-ug-teal" /> Account workspace</div>
                   <h2 className="text-xl font-bold tracking-tight text-ug-navy sm:text-2xl md:text-3xl">Profile & identity</h2>
                   <p className="mt-1 text-[11px] font-semibold tracking-[0.2em] text-gray-400 sm:tracking-[0.35em]">Verified Hub Identity Management</p>
                </div>
                {!isRerunningOnboarding && (
                  <div className="flex w-full sm:w-auto bg-slate-100 p-1 rounded-xl sm:rounded-2xl shadow-inner">
                    <button 
                      onClick={() => setProfileMode('identity')}
                       className={`flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-2xl text-[11px] sm:text-[11px] font-semibold tracking-wide transition-all ${profileMode === 'identity' ? 'bg-ug-navy text-white shadow-xl' : 'text-slate-500 hover:text-ug-navy'}`}
                    >
                      Identity & Narrative
                    </button>
                    <button 
                      onClick={() => setProfileMode('insights')}
                       className={`flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-2xl text-[11px] sm:text-[11px] font-semibold tracking-wide transition-all ${profileMode === 'insights' ? 'bg-ug-navy text-white shadow-xl' : 'text-slate-500 hover:text-ug-navy'}`}
                    >
                      AI Research Analysis
                    </button>
                  </div>
                )}
              </div>

              {isRerunningOnboarding ? (
                <div className="animate-fade-in">
                  <Onboarding 
                    user={localUser} 
                    isEmbedded={true}
                    onComplete={() => {
                      setIsRerunningOnboarding(false);
                      if (localUser?.id) {
                        localStorage.removeItem(`onboarding_skipped_${localUser.id}`);
                      }
                      refreshProfile();
                    }}
                    onSkip={() => setIsRerunningOnboarding(false)}
                  />
                </div>
              ) : (
                <>
                  {!localUser?.ai_profile && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 md:gap-6 shadow-sm">
                      <div className="flex gap-4 items-start">
                        <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                          <AlertCircle size={24} />
                        </div>
                        <div className="space-y-1 text-center md:text-left">
                          <h4 className="text-sm font-bold text-ug-navy  ">Complete Your AI Match Profile</h4>
                          <p className="text-xs text-gray-500 font-medium leading-relaxed">
                            You currently do not have an active AI Match Profile. Industry delegates, researchers, and students rely on accurate AI recommendations to discover you. Complete the interactive setup to get matched!
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsRerunningOnboarding(true)}
                        className="w-full md:w-auto bg-amber-600 hover:bg-amber-750 text-white px-8 py-3.5 rounded-2xl font-semibold text-[11px] tracking-wide transition shadow-md active:scale-95 duration-150 shrink-0 flex items-center justify-center gap-2"
                      >
                        <Sparkles size={14} /> Start Interactive Onboarding
                      </button>
                    </div>
                  )}

                  {profileMode === 'identity' ? (
                    <div className="space-y-6 animate-fade-in">
                      <ProfileSettings 
                        user={localUser} 
                        onUpdate={refreshProfile} 
                        onRetakeOnboarding={() => setIsRerunningOnboarding(true)}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <div className="lg:col-span-8 flex flex-col gap-6">
                        <ProfileInsight profile={localUser?.ai_profile} />
                      </div>
                      <div className="lg:col-span-4 shrink-0 space-y-6">
                        <div className="bg-gradient-to-br from-ug-navy to-[#1a1a4b] text-white p-4 rounded-2xl shadow-xl relative overflow-hidden group border border-white/5">
                          <div className="absolute -top-2 -right-2 p-6 opacity-5 group-hover:opacity-10 transition duration-500">
                            <Target size={80} />
                          </div>
                          <div className="relative z-10 space-y-4">
                            <div>
                              <h4 className="text-[11px] font-semibold text-ug-teal/80 tracking-wide mb-0.5">Ecosystem Compliance</h4>
                              <h3 className="text-sm font-bold tracking-wide  leading-tight text-white">AI Profile Sync</h3>
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed text-white/70 italic font-sans">
                              "Insights are compiled from your verified academic records. Re-indexing occurs automatically within 24 hours of profile edits."
                            </p>
                            <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl border border-white/5">
                              <div className="w-6 h-6 bg-ug-teal/20 text-ug-teal rounded-lg flex items-center justify-center"><Zap size={12} className="animate-pulse" /></div>
                              <span className="text-[11px] font-bold text-white/90 tracking-wider">Matching Active</span>
                            </div>
                            {localUser?.ai_profile && (
                              <button
                                onClick={() => setIsRerunningOnboarding(true)}
                                className="w-full bg-ug-teal text-ug-navy hover:bg-white text-center cursor-pointer font-semibold transition duration-150 py-2 rounded-lg text-[11px] tracking-wide shadow-md hover:shadow-ug-teal/10"
                              >
                                Sync Profile Engine
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
                           <div className="flex items-center justify-between">
                              <div>
                                 <h4 className="text-[11px] font-semibold text-gray-400 tracking-wide">Directory Visibility</h4>
                                 <span className="text-[11px] font-semibold text-ug-navy tracking-tight">
                                    {localUser?.ai_profile?.portfolio_visible !== false ? 'Public Discovery' : 'Hidden / Private'}
                                 </span>
                              </div>
                              <button 
                                 onClick={handleToggleVisibility}
                                 className={`w-8 h-4.5 rounded-full relative p-0.5 transition-colors duration-300 focus:outline-none cursor-pointer shrink-0 ${localUser?.ai_profile?.portfolio_visible !== false ? 'bg-ug-teal' : 'bg-gray-300'}`}
                              >
                                 <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${localUser?.ai_profile?.portfolio_visible !== false ? 'translate-x-3.5' : 'translate-x-0'}`} />
                              </button>
                           </div>
                           <p className="text-[10px] text-gray-400 font-medium leading-normal italic">
                              {localUser?.ai_profile?.portfolio_visible !== false 
                                 ? "Your profile is discoverable to verified technical partners and industry delegates."
                                 : "Your profile is hidden from the public directories and matching engine."}
                           </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          </>}
          </Suspense>
        </div>
      </main>

      {!hasDashboardCapability(role, 'reviewTto') && (
        <DashboardMobileNav role={role} activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={internalUnread} onNavigate={navigate} />
      )}
    </div>

    {isProjectModalOpen && (
      <Suspense fallback={null}>
        <ProjectFormModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
           onSave={(continueToDisclosure, disclosureId) => {
             setRefreshTrigger(prev => prev + 1);
             if (continueToDisclosure && disclosureId) navigate(`/dashboard/disclosures/${encodeURIComponent(disclosureId)}/questions`);
           }}
          project={selectedProject}
        />
      </Suspense>
    )}
  </div>
);
};

export default Dashboards;
