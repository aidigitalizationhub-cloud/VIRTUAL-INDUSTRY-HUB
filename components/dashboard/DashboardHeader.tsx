import React from 'react';
import { Bell, Home, LogOut } from 'lucide-react';
import ThemeSwitcher from '../ThemeSwitcher';
import type { DashboardTab } from '../../lib/dashboardRouting';

interface DashboardHeaderProps {
  displayName?: string;
  administrative: boolean;
  activeTab: DashboardTab;
  unreadCount: number;
  onMessages: () => void;
  showMessages?: boolean;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

const welcomeName = (name: string) => {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return words[0] || '';
  const titles = ['dr', 'dr.', 'prof', 'prof.', 'professor', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'rev', 'rev.', 'sir', 'madam', 'dean', 'provost', 'assoc.', 'asst.'];
  if (titles.includes(words[0].toLowerCase())) {
    const middle = words.length > 2 && words[1].startsWith('(') && words[1].endsWith(')') ? ` ${words[1]}` : '';
    return `${words[0]}${middle} ${words[words.length - 1]}`;
  }
  return words[words.length - 1];
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  displayName,
  administrative,
  activeTab,
  unreadCount,
  onMessages,
  showMessages = true,
  onLogout,
  onNavigate,
}) => (
  <header className="bg-ug-navy text-white flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 shrink-0 shadow-xl z-50 border-b border-white/10">
    <button className="flex sm:hidden items-center gap-2 group" onClick={() => onNavigate('/')} title="Return to Home">
      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-ug-teal via-teal-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-teal-900/40 ring-1 ring-white/20 group-hover:scale-105 transition-transform"><Home size={16} /></span>
      <span className="font-bold text-xs tracking-tight group-hover:text-ug-teal transition-colors">UG Industry Hub</span>
    </button>
    <nav className="hidden sm:flex items-center gap-6 lg:gap-8 ml-0 lg:ml-8">
      {!administrative && ['Home', 'Projects', 'Products', 'News'].map((link) => (
        <button key={link} onClick={() => onNavigate(link === 'Home' ? '/' : `/${link.toLowerCase()}`)} className="text-xs font-bold hover:text-ug-teal transition-colors text-white/80">{link}</button>
      ))}
    </nav>
    {displayName && (
      <div className="hidden md:flex items-center gap-2.5 px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs shadow-inner">
        <span className="font-light text-white/50">Welcome,</span>
        <span className="font-extrabold text-ug-teal">{welcomeName(displayName)}</span>
        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse ml-0.5" />
      </div>
    )}
    <div className="flex items-center gap-1.5 sm:gap-6">
      <button onClick={() => onNavigate('/')} className="sm:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-1" title="Return to Home">
        <Home size={18} className="text-ug-teal" /><span className="text-[11px] font-bold tracking-wider">Home</span>
      </button>
      {showMessages && <button onClick={onMessages} className={`p-2 transition-all relative rounded-xl hover:bg-white/10 ${activeTab === 'messages' ? 'text-ug-teal' : 'text-white/70 hover:text-white'}`} title="Messages & Notifications">
        <Bell size={18} />
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-ug-teal text-white text-[11px] font-semibold flex items-center justify-center rounded-full border border-ug-navy shadow-lg">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>}
      <ThemeSwitcher />
      <div className="flex items-center pl-2 sm:pl-6 border-l border-white/10">
        <button onClick={onLogout} className="p-2 text-white/60 hover:text-red-400 transition-all rounded-xl hover:bg-white/10 flex items-center gap-1.5" title="Logout">
          <LogOut size={18} /><span className="hidden md:inline text-xs font-bold">Logout</span>
        </button>
      </div>
    </div>
  </header>
);
