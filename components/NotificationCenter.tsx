
import React, { useState, useEffect, useRef } from 'react';
import { Bell, MailOpen, User as UserIcon, Search, Trash2, Check, Sparkles, ExternalLink, X } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { User, SavedSearch, AlertNotification } from '../types';
import { Tr } from './Tr';

interface NotificationCenterProps {
  user: User | null;
  onSelectMessage: (threadId: string) => void;
  onSelectAlert?: (itemType: 'project' | 'news', itemId: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ user, onSelectMessage, onSelectAlert }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'messages'>('alerts');
  const [threads, setThreads] = useState<any[][]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isManageSearchesOpen, setIsManageSearchesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (user?.id) {
      const [convs, alertList, searchesList] = await Promise.all([
        StorageService.getConversations(user.id),
        StorageService.getAlertNotifications(user.id),
        StorageService.getSavedSearches(user.id)
      ]);
      setThreads(convs || []);
      setAlerts(alertList || []);
      setSavedSearches(searchesList || []);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadThreads = threads.filter(t => t.some(m => !m.read && m.recipient_id === user?.id));
  const unreadAlerts = alerts.filter(a => !a.read);
  const totalUnread = unreadThreads.length + unreadAlerts.length;

  const handleAlertClick = async (alert: AlertNotification) => {
    if (user?.id) {
      await StorageService.markAlertAsRead(user.id, alert.id);
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: true } : a));
    }
    setIsOpen(false);
    if (alert.item_type && alert.item_id) {
      if (onSelectAlert) {
        onSelectAlert(alert.item_type, alert.item_id);
      } else {
        window.location.hash = alert.item_type === 'project' ? `#/projects/${alert.item_id}` : `#/news`;
      }
    }
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    if (user?.id) {
      await StorageService.deleteSavedSearch(user.id, searchId);
      setSavedSearches(prev => prev.filter(s => s.id !== searchId));
    }
  };

  const handleClearAlerts = async () => {
    if (user?.id) {
      await StorageService.clearAllAlerts(user.id);
      setAlerts([]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition text-slate-300 hover:text-white border border-white/10 cursor-pointer flex items-center justify-center"
        title="Notifications & Saved Search Alerts"
      >
        <Bell size={18} className={totalUnread > 0 ? "text-ug-teal animate-pulse" : ""} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 border-2 border-ug-navy text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md">
            {totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 z-[120] overflow-hidden animate-fade-in-up text-left">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 bg-gray-50/70">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-ug-teal" />
                <h4 className="font-black text-ug-navy text-xs uppercase tracking-widest">
                  <Tr text="Notifications & Alerts" />
                </h4>
              </div>
              <button 
                onClick={() => setIsManageSearchesOpen(true)}
                className="text-[10px] font-black text-ug-teal hover:text-ug-navy bg-ug-teal/10 hover:bg-ug-teal/20 px-2.5 py-1 rounded-xl uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
              >
                <Search size={10} />
                <Tr text="Saved Searches" /> ({savedSearches.length})
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-gray-200/60 rounded-2xl">
              <button
                onClick={() => setActiveTab('alerts')}
                className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'alerts' 
                    ? 'bg-white text-ug-navy shadow-xs' 
                    : 'text-gray-500 hover:text-ug-navy'
                }`}
              >
                <Sparkles size={12} className={unreadAlerts.length > 0 ? "text-ug-teal animate-bounce" : ""} />
                <Tr text="Search Alerts" />
                {unreadAlerts.length > 0 && (
                  <span className="bg-ug-teal text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                    {unreadAlerts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'messages' 
                    ? 'bg-white text-ug-navy shadow-xs' 
                    : 'text-gray-500 hover:text-ug-navy'
                }`}
              >
                <UserIcon size={12} />
                <Tr text="Direct Messages" />
                {unreadThreads.length > 0 && (
                  <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                    {unreadThreads.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
            {activeTab === 'alerts' ? (
              alerts.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Sparkles size={28} className="mx-auto text-gray-200" />
                  <p className="text-xs font-bold text-gray-500">
                    <Tr text="No active search match alerts." />
                  </p>
                  <p className="text-[10px] text-gray-400">
                    <Tr text="Save searches on Projects or News to receive alerts when new matches are posted!" />
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`p-4 hover:bg-gray-50/80 transition cursor-pointer flex items-start gap-3.5 ${
                      !alert.read ? 'bg-ug-teal/5 border-l-4 border-l-ug-teal' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-ug-teal/10 text-ug-teal flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-ug-teal bg-ug-teal/10 px-2 py-0.5 rounded-md truncate">
                          <Tr text={alert.query_matched || 'Match Alert'} />
                        </span>
                        <span className="text-[8px] font-bold text-gray-400">
                          {new Date(alert.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <h5 className="text-xs font-black text-ug-navy line-clamp-1">
                        <Tr text={alert.title} />
                      </h5>
                      <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                        <Tr text={alert.message} />
                      </p>
                    </div>
                  </div>
                ))
              )
            ) : (
              unreadThreads.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <MailOpen size={28} className="mx-auto text-gray-200" />
                  <p className="text-xs font-bold text-gray-500">
                    <Tr text="All caught up! No unread messages." />
                  </p>
                </div>
              ) : (
                unreadThreads.map((thread, i) => {
                  const lastMsg = thread[0];
                  return (
                    <div 
                      key={i}
                      onClick={() => {
                        onSelectMessage(lastMsg.project_id || 'general');
                        setIsOpen(false);
                      }}
                      className="p-4 hover:bg-gray-50/80 transition cursor-pointer flex items-start gap-3.5"
                    >
                      <div className="w-8 h-8 rounded-xl bg-ug-navy/5 text-ug-navy flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-black text-ug-navy text-xs truncate">{lastMsg.user_name}</p>
                          <span className="text-[8px] font-bold text-gray-400 uppercase">
                            {new Date(lastMsg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-ug-teal uppercase tracking-wider mb-0.5 truncate">
                          {lastMsg.projects?.title || 'General Inquiry'}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{lastMsg.message}</p>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 bg-gray-50/80 text-center border-t border-gray-100 flex items-center justify-between px-4">
            {activeTab === 'alerts' && alerts.length > 0 ? (
              <button 
                onClick={handleClearAlerts}
                className="text-[10px] font-bold text-gray-400 hover:text-red-600 transition cursor-pointer"
              >
                <Tr text="Clear Alert History" />
              </button>
            ) : (
              <button 
                onClick={() => { onSelectMessage('all'); setIsOpen(false); }}
                className="text-[10px] font-black text-ug-navy uppercase tracking-widest hover:text-ug-teal transition cursor-pointer mx-auto"
              >
                <Tr text="Open Message Inbox" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* MANAGE SAVED SEARCHES MODAL */}
      {isManageSearchesOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative text-left">
            <button 
              onClick={() => setIsManageSearchesOpen(false)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-ug-navy rounded-full hover:bg-gray-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 text-ug-teal mb-1">
              <Search size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                <Tr text="Keyword Subscriptions" />
              </span>
            </div>
            <h3 className="text-xl font-black text-ug-navy mb-2">
              <Tr text="Your Saved Searches & Alerts" />
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              <Tr text="You will receive real-time notifications in your alert feed whenever matching research disclosures or grant announcements are published." />
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 mb-6">
              {savedSearches.length === 0 ? (
                <div className="p-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-xs font-bold text-gray-400">
                    <Tr text="You have no active saved search alerts." />
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    <Tr text="Click 'Save Search' on the Projects or News page to create one." />
                  </p>
                </div>
              ) : (
                savedSearches.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <h4 className="font-black text-xs text-ug-navy">
                        "{s.query}"
                      </h4>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">
                        <Tr text="Category" />: {s.category || 'All'} • <Tr text="Subscribed" /> {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteSavedSearch(s.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      title="Unsubscribe / Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setIsManageSearchesOpen(false)}
              className="w-full py-3 bg-ug-navy hover:bg-ug-navy/90 text-white font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer"
            >
              <Tr text="Done" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;

