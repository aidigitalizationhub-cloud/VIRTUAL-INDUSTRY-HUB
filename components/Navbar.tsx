
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, User, LogIn, LogOut, Sparkles, LayoutDashboard, ChevronRight } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import { User as UserType } from '../types';

interface NavbarProps {
  isAuthenticated: boolean;
  user: UserType | null;
  onUserIconClick: () => void;
  onLogout: () => void;
  onSelectMessage: (threadId: string) => void;
  unreadCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, user, onUserIconClick, onLogout, onSelectMessage, unreadCount = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const navLinks = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.projects'), path: '/projects' },
    { name: t('nav.products'), path: '/products' },
    { name: t('nav.news'), path: '/news' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-ug-navy/95 backdrop-blur-md text-white sticky top-0 z-50 border-b border-white/10 shadow-xl shadow-black/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          
          {/* Logo & Brand */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2.5 sm:gap-3 cursor-pointer group">
             <div className="h-9 sm:h-10 px-1 py-0.5 rounded-xl bg-white flex items-center justify-center shadow-md shadow-black/20 ring-1 ring-white/30 group-hover:scale-105 transition-transform duration-200 shrink-0 overflow-hidden">
                <img 
                  src="/logo.svg" 
                  alt="University of Ghana Logo" 
                  className="h-full w-auto max-w-[110px] sm:max-w-[130px] object-contain"
                />
             </div>
             <div className="flex flex-col">
               <div className="flex items-center gap-1.5">
                 <span className="font-black text-sm sm:text-base md:text-lg tracking-tight text-white group-hover:text-ug-teal transition-colors">
                   {t('nav.brand')}
                 </span>
                 <span className="hidden sm:inline-block text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-ug-gold/20 text-ug-gold border border-ug-gold/30">
                   IAST
                 </span>
               </div>
               <span className="text-[10px] text-gray-300 font-bold tracking-wider hidden sm:block uppercase -mt-0.5">
                 University of Ghana
               </span>
             </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-1.5 lg:space-x-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
              {navLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 relative ${
                      active
                        ? 'bg-ug-teal text-white shadow-md shadow-teal-900/40'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{link.name}</span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User & Controls Right Side */}
          <div className="hidden md:flex items-center gap-3">
             <ThemeSwitcher />
             <LanguageSwitcher />

             {isAuthenticated && (
               <NotificationCenter user={user} onSelectMessage={onSelectMessage} />
             )}
             
             {/* Account Dashboard Button */}
             <button
                type="button"
                onClick={onUserIconClick}
                className={`h-10 px-3.5 rounded-xl flex items-center gap-2 text-xs font-bold transition-all duration-200 border cursor-pointer ${
                  isAuthenticated
                    ? 'bg-gradient-to-r from-teal-500 to-ug-teal text-white border-teal-400/40 shadow-lg shadow-teal-900/30 hover:scale-[1.02]'
                    : 'bg-white/10 text-white border-white/15 hover:bg-white/20 hover:border-white/25'
                }`}
                title={isAuthenticated ? t('nav.myDashboard') : t('nav.login')}
             >
                {isAuthenticated ? (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-black text-[11px]">
                      {user?.name ? user.name.charAt(0).toUpperCase() : <User size={14} />}
                    </div>
                    <span className="max-w-[120px] truncate">{user?.name || t('nav.myDashboard')}</span>
                    <LayoutDashboard size={14} className="opacity-80" />
                  </>
                ) : (
                  <>
                    <LogIn size={15} />
                    <span>{t('nav.login')}</span>
                  </>
                )}
             </button>

             {isAuthenticated && (
               <button
                 type="button"
                 onClick={onLogout}
                 className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20 cursor-pointer"
                 title={t('nav.logout')}
               >
                 <LogOut size={16} />
               </button>
             )}
          </div>

          {/* Mobile menu toggle & quick controls */}
          <div className="-mr-1 flex md:hidden items-center gap-2">
             <ThemeSwitcher />
             <LanguageSwitcher dropdownPosition="right" />

             {isAuthenticated && (
               <NotificationCenter user={user} onSelectMessage={onSelectMessage} />
             )}
             <button
               type="button"
               onClick={() => setIsOpen(!isOpen)}
               className="p-2 rounded-xl text-gray-300 hover:text-white bg-white/5 border border-white/10 focus:outline-none transition-colors cursor-pointer"
             >
               {isOpen ? <X size={22} /> : <Menu size={22} />}
             </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-white/10 bg-ug-navy/98 backdrop-blur-xl animate-fade-in shadow-2xl">
          <div className="px-4 pt-3 pb-6 space-y-2">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    active
                      ? 'bg-ug-teal text-white shadow-md'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{link.name}</span>
                  <ChevronRight size={16} className={active ? 'text-white' : 'text-gray-500'} />
                </Link>
              );
            })}

             <div className="mt-4 pt-4 border-t border-white/10 space-y-2.5">
               <button 
                  type="button"
                  onClick={() => { setIsOpen(false); onUserIconClick(); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    isAuthenticated 
                      ? 'bg-gradient-to-r from-teal-600 to-ug-teal text-white border-teal-500/30' 
                      : 'bg-white/10 text-white border-white/15'
                  }`}
               >
                  <div className="flex items-center gap-3">
                    <User size={18} />
                    <span>{isAuthenticated ? (user?.name || t('nav.myDashboard')) : t('nav.login')}</span>
                  </div>
                  {isAuthenticated && unreadCount > 0 && (
                    <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-black">
                      {unreadCount}
                    </span>
                  )}
               </button>
               
               {isAuthenticated && (
                 <button 
                    type="button"
                    onClick={() => { setIsOpen(false); onLogout(); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl font-bold transition-colors cursor-pointer"
                 >
                    <LogOut size={18} />
                    <span>{t('nav.logout')}</span>
                 </button>
               )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
