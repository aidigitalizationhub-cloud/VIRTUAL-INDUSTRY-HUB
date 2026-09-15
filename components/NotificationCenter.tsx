
import React, { useState, useEffect, useRef } from 'react';
import { Bell, MailOpen, User as UserIcon } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { User } from '../types';
import { Tr } from './Tr';

interface NotificationCenterProps {
  user: User | null;
  onSelectMessage: (threadId: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ user, onSelectMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState<any[][]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (user?.id) {
      const convs = await StorageService.getConversations(user.id);
      setThreads(convs || []);
    }
  };

  useEffect(() => {
    loadData().catch(err => console.warn("Notification data load failed:", err));
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
  const totalUnread = unreadThreads.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition text-slate-300 hover:text-white border border-white/10 cursor-pointer flex items-center justify-center"
        title="Notifications"
      >
        <Bell size={18} className={totalUnread > 0 ? "text-ug-teal animate-pulse" : ""} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 border-2 border-ug-navy text-white text-[11px] font-semibold rounded-full flex items-center justify-center shadow-md">
            {totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-[120] overflow-hidden animate-fade-in-up text-left">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 bg-gray-50/70">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-ug-teal" />
                <h4 className="font-bold text-ug-navy text-xs uppercase tracking-wide">
                  <Tr text="Notifications" />
                </h4>
              </div>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
            {unreadThreads.length === 0 ? (
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
                        <p className="font-bold text-ug-navy text-xs truncate">{lastMsg.user_name}</p>
                        <span className="text-[11px] font-bold text-gray-400">
                          {new Date(lastMsg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-ug-teal tracking-wider mb-0.5 truncate">
                        {lastMsg.projects?.title || 'General Inquiry'}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{lastMsg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 bg-gray-50/80 text-center border-t border-gray-100 flex items-center justify-between px-4">
            <button
              onClick={() => { onSelectMessage('all'); setIsOpen(false); }}
              className="text-[11px] font-semibold text-ug-navy tracking-wide hover:text-ug-teal transition cursor-pointer mx-auto"
            >
              <Tr text="Open Message Inbox" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
