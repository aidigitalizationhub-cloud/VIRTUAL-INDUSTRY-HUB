import React from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ChevronLeft,
  Globe,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  MessageSquare,
  Scale,
  ShieldCheck,
  Target,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { User, UserRole } from '../../types';
import type { DashboardTab } from '../../lib/dashboardRouting';
import { canCreateDisclosure, isTtoRole } from '../../lib/dashboardRouting';
import { useTranslation } from 'react-i18next';

export type AdminSubTab = 'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions';

interface MobileNavProps {
  role: UserRole | string;
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  unreadCount: number;
  onNavigate: (path: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ role, activeTab, setActiveTab, unreadCount, onNavigate }) => {
  const { t } = useTranslation();
  const tabs: Array<{ id: DashboardTab; icon: typeof LayoutGrid; label: string; path?: string }> = isTtoRole(role) ? [
    { id: 'overview', icon: LayoutGrid, label: t('dashboard.overview') },
    { id: 'overview', icon: Scale, label: t('dashboard.ttoIpOffice'), path: '/dashboard/tto/disclosures' },
  ] : [
    { id: 'overview' as const, icon: LayoutGrid, label: t('dashboard.overview') },
    ...(canCreateDisclosure(role) ? [{ id: 'overview' as const, icon: ShieldCheck, label: t('dashboard.disclosures'), path: '/dashboard/disclosures' }] : []),
    { id: 'matches' as const, icon: Target, label: t('dashboard.matches') },
    { id: 'messages' as const, icon: MessageSquare, label: t('dashboard.messages') },
    { id: 'profile' as const, icon: UserIcon, label: t('dashboard.profile') },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200/80 z-40 flex items-center justify-around px-2 py-2 shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
      {tabs.map((tab) => {
        const active = tab.path ? window.location.pathname.startsWith(tab.path) : activeTab === tab.id;
        return (
          <button key={tab.path || tab.id} onClick={() => tab.path ? onNavigate(tab.path) : setActiveTab(tab.id)} className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all duration-200 relative ${active ? 'text-ug-teal' : 'text-gray-400 hover:text-gray-600'}`}>
            {active && <motion.div layoutId="mobile-nav-active" className="absolute inset-0 bg-ug-teal/10 rounded-2xl -z-10" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
            <div className="relative flex items-center justify-center">
              <tab.icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              {tab.id === 'messages' && !tab.path && unreadCount > 0 && <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-ug-teal text-white text-[11px] font-semibold flex items-center justify-center rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </div>
            <span className={`text-[11px] tracking-tight ${active ? 'text-ug-navy font-semibold' : 'text-gray-400 font-bold'}`}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  role: UserRole | string;
  user: User | null;
  adminSubTab: AdminSubTab;
  setAdminSubTab: (tab: AdminSubTab) => void;
  onNavigate: (path: string) => void;
  activePath: string;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  setActiveTab,
  role,
  adminSubTab,
  setAdminSubTab,
  onNavigate,
  activePath,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { t } = useTranslation();
  const userTabs = [
    { id: 'overview' as const, icon: LayoutGrid, label: t('dashboard.overview') },
    ...(canCreateDisclosure(role) ? [{ id: 'overview' as const, icon: ShieldCheck, label: t('dashboard.disclosures'), path: '/dashboard/disclosures' }] : []),
    { id: 'matches' as const, icon: Target, label: t('dashboard.matches') },
    { id: 'messages' as const, icon: MessageSquare, label: t('dashboard.messages') },
    { id: 'profile' as const, icon: UserIcon, label: t('dashboard.profile') },
  ];
  const adminTabs = [
    { id: 'metrics' as const, icon: LayoutGrid, label: t('dashboard.overview') },
    { id: 'users' as const, icon: Users, label: t('dashboard.users') },
    { id: 'projects' as const, icon: ShieldCheck, label: t('dashboard.projectScreener') },
  ];
  const governanceTabs = [
    { path: '/dashboard/admin/disclosures', icon: ShieldCheck, label: t('dashboard.disclosures'), adminOnly: true },
    { path: '/dashboard/tto/disclosures', icon: Scale, label: t('dashboard.ttoIpOffice') },
    { path: '/dashboard/admin/news', icon: Globe, label: t('dashboard.newsCurator'), adminOnly: true },
    { path: '/dashboard/access-requests', icon: KeyRound, label: t('dashboard.accessRequests') },
    { path: '/dashboard/admin/audit', icon: Activity, label: t('dashboard.governanceAudit'), adminOnly: true },
  ];
  const administrative = role === UserRole.Admin || role === 'Super Admin' || role === 'TTO' || role === 'TTO/IP' || role === 'IP Office';
  const ttoOnly = isTtoRole(role);
  const title = role === UserRole.Admin || role === 'Super Admin' ? t('auth.roles.admin').toUpperCase() : administrative ? t('dashboard.ttoIpOffice') : role === UserRole.Student ? t('auth.roles.student').toUpperCase() : role === UserRole.Investor ? t('auth.roles.investor').toUpperCase() : role === UserRole.IndustryPartner ? t('auth.roles.partner').toUpperCase() : t('auth.roles.researcher').toUpperCase();

  return (
    <aside className={`hidden lg:flex h-full bg-white border-r border-gray-100 flex-col relative transition-all duration-300 ${isCollapsed ? 'w-20 p-4' : 'w-64 p-6'} shrink-0`}>
      <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute top-1/2 -right-3.5 -translate-y-1/2 bg-white border border-gray-200 text-ug-navy hover:bg-ug-navy hover:text-white h-7 w-7 rounded-full flex items-center justify-center shadow-md z-50" title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
        <ChevronLeft size={14} className={`transition-transform ${isCollapsed ? 'rotate-180 text-ug-teal' : ''}`} />
      </button>
      <div className={`mb-10 flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-4'}`}>
        <div className="bg-ug-navy p-2 rounded-xl text-white shrink-0"><GraduationCap size={20} /></div>
        {!isCollapsed && <h2 className="text-sm font-bold text-ug-navy tracking-wide leading-none">{title}<br /><span className="text-ug-teal">PORTAL</span></h2>}
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto">
        {administrative ? (
          <>
            {ttoOnly && (
              <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center rounded-2xl transition-all ${isCollapsed ? 'justify-center p-3' : 'px-5 py-3'} ${activeTab === 'overview' ? 'bg-ug-navy text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50 hover:text-ug-navy'}`} title={isCollapsed ? 'Overview' : undefined}>
                <LayoutGrid size={18} className="shrink-0" />
                {!isCollapsed && <span className="ml-3 text-xs font-bold tracking-wide">Overview</span>}
              </button>
            )}
            {!ttoOnly && (role === UserRole.Admin || role === 'Super Admin') && adminTabs.map((tab) => (
              <button key={tab.id} onClick={() => setAdminSubTab(tab.id)} className={`w-full flex items-center rounded-2xl transition-all ${isCollapsed ? 'justify-center p-3' : 'px-5 py-3'} ${adminSubTab === tab.id ? 'bg-ug-navy text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50 hover:text-ug-navy'}`} title={isCollapsed ? tab.label : undefined}>
                <tab.icon size={18} className="shrink-0" />
                {!isCollapsed && <span className="ml-3 text-xs font-bold tracking-wide">{tab.label}</span>}
              </button>
            ))}
            {governanceTabs.filter((tab) => ttoOnly ? tab.path === '/dashboard/tto/disclosures' : (!tab.adminOnly || role === UserRole.Admin || role === 'Super Admin')).map((tab) => (
              <button key={tab.path} onClick={() => onNavigate(tab.path)} className={`w-full flex items-center rounded-2xl transition-all ${isCollapsed ? 'justify-center p-3' : 'px-5 py-3'} ${activePath.startsWith(tab.path) ? 'bg-ug-navy text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50 hover:text-ug-navy'}`} title={isCollapsed ? tab.label : undefined}>
                <tab.icon size={18} className="shrink-0" />
                {!isCollapsed && <span className="ml-3 text-xs font-bold tracking-wide">{tab.label}</span>}
              </button>
            ))}
          </>
        ) : userTabs.map((tab) => {
          const active = tab.path ? activePath.startsWith(tab.path) : activeTab === tab.id;
          return <button key={tab.path || tab.id} onClick={() => tab.path ? onNavigate(tab.path) : setActiveTab(tab.id)} className={`w-full flex items-center rounded-2xl transition-all ${isCollapsed ? 'justify-center p-3' : 'px-5 py-4'} ${active ? 'bg-ug-navy text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50 hover:text-ug-navy'}`} title={isCollapsed ? tab.label : undefined}>
            <tab.icon size={18} className="shrink-0" />
            {!isCollapsed && <span className="ml-3 text-xs font-bold tracking-wide">{tab.label}</span>}
          </button>;
        })}
      </nav>
    </aside>
  );
};
