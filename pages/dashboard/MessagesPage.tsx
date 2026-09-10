import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Download, ChevronRight, X, Check, Eye, Search, Loader2, Trash, Inbox, Paperclip, ChevronLeft, Image as ImageIcon, User as UserIcon, Pencil, MailOpen, Send as SendIcon, File } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { StorageService } from '../../services/storageService';
import type { User } from '../../types';
import { isRevealRequestMessage } from '../../lib/messageUtils';

export { isRevealRequestMessage };

// --- HELPER TO PARSE ATTACHMENTS FROM MESSAGE TEXT ---
const parseMessageWithAttachments = (fullMessage: string) => {
  if (!fullMessage) return { textContent: '', attachments: [] };
  const parts = fullMessage.split('\n\n---attachments_meta---');
  const textContent = parts[0];
  let attachments: {name: string, url: string, type: 'file' | 'image'}[] = [];
  if (parts.length > 1) {
    try {
      attachments = JSON.parse(parts[1]);
    } catch (e) {
      console.error("Error parsing attachments JSON:", e);
    }
  }
  return { textContent, attachments };
};

// --- MESSAGES SECTION (GMAIL STYLE) ---
export interface MessagesSectionProps {
  user: User | null;
  initialThreadId?: string | null;
  onResetInitialThread?: () => void;
}

export const MessagesPage: React.FC<MessagesSectionProps> = ({ user, initialThreadId, onResetInitialThread }) => {
  const [threads, setThreads] = useState<any[][]>([]);
  const [selectedThread, setSelectedThread] = useState<any[] | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'inbox' | 'sent'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [recipientResults, setRecipientResults] = useState<User[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const { showToast } = useToast();

  // Attachment states for compose and reply views
  const [replyAttachments, setReplyAttachments] = useState<{name: string, url: string, type: 'file' | 'image'}[]>([]);
  const [composeAttachments, setComposeAttachments] = useState<{name: string, url: string, type: 'file' | 'image'}[]>([]);
  const [uploadingReply, setUploadingReply] = useState(false);
  const [uploadingCompose, setUploadingCompose] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, context: 'reply' | 'compose', type: 'file' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (context === 'reply') {
      setUploadingReply(true);
    } else {
      setUploadingCompose(true);
    }

    try {
      showToast(`Uploading ${file.name}...`, "info");
      const url = await StorageService.uploadFile(file, 'projects');
      const newAttachment = { name: file.name, url, type };
      
      if (context === 'reply') {
        setReplyAttachments(prev => [...prev, newAttachment]);
      } else {
        setComposeAttachments(prev => [...prev, newAttachment]);
      }
      showToast("File uploaded successfully!", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to upload file", "error");
    } finally {
      if (context === 'reply') {
        setUploadingReply(false);
      } else {
        setUploadingCompose(false);
      }
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (index: number, context: 'reply' | 'compose') => {
    if (context === 'reply') {
      setReplyAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setComposeAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  useEffect(() => {
    if (selectedThread) {
      setIsMobileListOpen(false);
    } else {
      setIsMobileListOpen(true);
    }
  }, [selectedThread]);

  useEffect(() => {
    if (user?.id) {
      StorageService.getConversations(user.id).then(async data => {
        setThreads(data);
        if (initialThreadId && initialThreadId !== 'all') {
          const thread = data.find(t => 
            t[0].project_id === initialThreadId || 
            t[0].sender_id === initialThreadId || 
            t[0].recipient_id === initialThreadId
          );
          if (thread) {
            setSelectedThread(thread);
            setIsComposing(false);
          } else {
            try {
              const partnerProfile = await StorageService.getProfile(initialThreadId);
              if (partnerProfile) {
                setSelectedRecipient(partnerProfile);
                setComposeRecipient(partnerProfile.name || partnerProfile.email);
                setComposeSubject(`Strategic Inquiry from ${user.name}`);
                setComposeMessage(`Hello ${partnerProfile.name},\n\nI found your profile in the Academic Hub Matchmaker with high alignment, and would love to connect to discuss potential collaboration opportunities.`);
                setIsComposing(true);
                setSelectedThread(null);
              }
            } catch (err) {
              console.warn("Could not load direct partner profile for messaging:", err);
            }
          }
          if (onResetInitialThread) onResetInitialThread();
        }
      });
    }
  }, [user?.id, initialThreadId]);

  const handleSendReply = async () => {
    if ((!reply.trim() && replyAttachments.length === 0) || !selectedThread || !user) return;
    setSending(true);
    try {
      const firstMsg = selectedThread[0];
      const recipientId = firstMsg.sender_id === user.id ? firstMsg.recipient_id : firstMsg.sender_id;
      
      let finalMessage = reply;
      if (replyAttachments.length > 0) {
        finalMessage += `\n\n---attachments_meta---${JSON.stringify(replyAttachments)}`;
      }

      await StorageService.submitEOI(firstMsg.project_id, user.name, finalMessage, recipientId);
      setReply('');
      setReplyAttachments([]);
      showToast("Message Sent", "success");
      const updated = await StorageService.getConversations(user.id);
      setThreads(updated);
      const newThread = updated.find(t => t[0].project_id === firstMsg.project_id && (t[0].sender_id === recipientId || t[0].recipient_id === recipientId));
      if (newThread) setSelectedThread(newThread);
    } catch (e) {
      showToast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const handleAcceptReveal = async (msg: any) => {
    if (!user) return;
    try {
      const releaseToken = `released:${Date.now()}`;
      await StorageService.updateEOIStatus(msg.id, releaseToken);
      showToast("Access Granted Successfully! Secure 1-hour session is live.", "success");
      
      // Auto reply with Access Granted notification message
      await StorageService.submitEOI(
        msg.project_id,
        user.name,
        `Access Granted. You have been granted secure, 1-hour decrypted access to download the Technical Disclosure PDF.`,
        msg.sender_id
      );
      
      // Refresh Conversations & Threads
      const updated = await StorageService.getConversations(user.id);
      setThreads(updated);
      
      // If we are currently viewing the thread, refresh it
      if (selectedThread) {
        const firstMsg = selectedThread[0];
        const partnerId = firstMsg.sender_id === user.id ? firstMsg.recipient_id : firstMsg.sender_id;
        const newThread = updated.find(t => t[0].project_id === firstMsg.project_id && (t[0].sender_id === partnerId || t[0].recipient_id === partnerId));
        if (newThread) setSelectedThread(newThread);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to grant clearance", "error");
    }
  };

  const handleDeclineReveal = async (msg: any) => {
    if (!user) return;
    try {
      await StorageService.updateEOIStatus(msg.id, 'declined');
      showToast("Access Request Declined.", "info");
      
      // Auto reply with Access Declined notification
      await StorageService.submitEOI(
        msg.project_id,
        user.name,
        `Access Declined. Your request for technical brief access has been declined.`,
        msg.sender_id
      );
      
      // Refresh Conversations & Threads
      const updated = await StorageService.getConversations(user.id);
      setThreads(updated);
      
      if (selectedThread) {
        const firstMsg = selectedThread[0];
        const partnerId = firstMsg.sender_id === user.id ? firstMsg.recipient_id : firstMsg.sender_id;
        const newThread = updated.find(t => t[0].project_id === firstMsg.project_id && (t[0].sender_id === partnerId || t[0].recipient_id === partnerId));
        if (newThread) setSelectedThread(newThread);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to decline clearance", "error");
    }
  };

  const handleSelectThread = async (thread: any[]) => {
    setSelectedThread(thread);
    if (user?.id) {
      const lastMsg = thread[0];
      const partnerId = lastMsg.sender_id === user.id ? lastMsg.recipient_id : lastMsg.sender_id;
      await StorageService.markAsRead(user.id, lastMsg.project_id, partnerId);
      // Refresh threads to update unread status in UI
      const updated = await StorageService.getConversations(user.id);
      setThreads(updated);
    }
  };

  const filteredThreads = threads.filter(thread => {
    const lastMsg = thread[0];
    const isSent = lastMsg.sender_id === user?.id;
    
    // Category filtering
    if (activeCategory === 'inbox' && isSent) return false;
    if (activeCategory === 'sent' && !isSent) return false;

    // Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        lastMsg.user_name.toLowerCase().includes(query) ||
        lastMsg.message.toLowerCase().includes(query) ||
        (lastMsg.projects?.title || '').toLowerCase().includes(query)
      );
    }
    return true;
  });

  const unreadCount = threads.filter(t => t.some(m => !m.read && m.recipient_id === user?.id)).length;

  const handleRecipientSearch = async (query: string) => {
    setComposeRecipient(query);
    if (query.trim().length >= 2) {
      // Robust search: StorageService uses .or(name.ilike, email.ilike) which captures partial names
      const results = await StorageService.searchUsers(query.trim());
      setRecipientResults(results.filter(u => u.id !== user?.id));
    } else {
      setRecipientResults([]);
    }
  };

  const handleSendDirectMessage = async () => {
    if (!selectedRecipient || (!composeMessage.trim() && composeAttachments.length === 0) || !user) {
      showToast("Please select a recipient and enter a message", "error");
      return;
    }
    setSending(true);
    try {
      let finalMessage = composeMessage;
      if (composeAttachments.length > 0) {
        finalMessage += `\n\n---attachments_meta---${JSON.stringify(composeAttachments)}`;
      }

      await StorageService.submitEOI(null, user.name, finalMessage, selectedRecipient.id);
      showToast("Message Sent Successfully", "success");
      setIsComposing(false);
      setComposeMessage('');
      setComposeSubject('');
      setComposeRecipient('');
      setSelectedRecipient(null);
      setComposeAttachments([]);
      
      const updated = await StorageService.getConversations(user.id);
      setThreads(updated);
    } catch (e) {
      showToast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white md:rounded-2xl border-x md:border border-gray-200 shadow-sm overflow-hidden h-[calc(100vh-180px)] md:h-[750px] flex flex-col md:flex-row animate-fade-in font-sans relative">
      {/* Mobile Messages UI (Accordion Style) */}
      <div className="md:hidden flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-white">
        {!selectedThread ? (
          <div className="flex flex-col">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <h2 className="text-sm font-bold text-ug-navy  tracking-wide">Communications</h2>
              <button 
                onClick={() => setIsComposing(true)}
                className="p-2 bg-ug-teal text-white rounded-xl shadow-lg"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="flex-1">
              {[
                { id: 'inbox', icon: Inbox, label: 'Inbox', count: unreadCount },
                { id: 'sent', icon: SendIcon, label: 'Sent' },
              ].map((cat) => (
                <div key={cat.id} className="border-b border-gray-50 last:border-none">
                  <button
                    onClick={() => {
                      if (activeCategory === cat.id) {
                        // Toggle or keep
                      } else {
                        setActiveCategory(cat.id as any);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-6 py-5 transition-all ${
                      activeCategory === cat.id ? 'bg-blue-50/30' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <cat.icon size={20} className={activeCategory === cat.id ? 'text-blue-600' : 'text-gray-400'} />
                      <span className={`text-sm tracking-wide ${activeCategory === cat.id ? 'font-bold text-blue-700' : 'font-bold text-gray-700'}`}>
                        {cat.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {cat.count ? (
                        <span className="bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          {cat.count}
                        </span>
                      ) : null}
                      <ChevronRight size={16} className={`transition-transform duration-300 text-gray-300 ${activeCategory === cat.id ? 'rotate-90 text-blue-600' : ''}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {activeCategory === cat.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-gray-50/50"
                      >
                        {filteredThreads.length === 0 ? (
                          <div className="p-6 text-center text-gray-400 text-[11px] font-bold tracking-wide">
                            No {cat.label.toLowerCase()} yet
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100/50">
                            {filteredThreads.map((thread, i) => {
                              const lastMsg = thread[0];
                              const isUnread = !lastMsg.read && lastMsg.recipient_id === user?.id;
                              return (
                                <div 
                                  key={i}
                                  onClick={() => handleSelectThread(thread)}
                                  className={`p-5 flex items-center gap-4 active:bg-white transition-colors relative ${isUnread ? 'bg-white' : ''}`}
                                >
                                  {isUnread && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>}
                                  <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-ug-navy shrink-0">
                                    <UserIcon size={18} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className={`text-xs truncate ${isUnread ? 'font-bold text-gray-900' : 'font-bold text-gray-700'}`}>
                                        {lastMsg.user_name}
                                      </span>
                                      <span className="text-[11px] font-bold text-gray-400">
                                        {new Date(lastMsg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                    <h4 className={`text-[11px] truncate mb-1 ${isUnread ? 'font-bold text-blue-600' : 'text-gray-500'}`}>
                                      {lastMsg.projects?.title || 'General Inquiry'}
                                    </h4>
                                    <p className="text-[11px] text-gray-400 line-clamp-1 italic">
                                      "{parseMessageWithAttachments(lastMsg.message).textContent}"
                                    </p>
                                  </div>
                                  <ChevronRight size={14} className="text-gray-300" />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Mobile Detail View */
          <div className="flex-1 flex flex-col h-full bg-white animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-white sticky top-0 z-10">
              <button 
                onClick={() => setSelectedThread(null)}
                className="p-2 bg-gray-50 rounded-xl text-gray-600 active:scale-95 transition"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-sm truncate">{selectedThread[0].projects?.title || 'General Inquiry'}</h4>
                <p className="text-[11px] text-gray-400 font-bold tracking-wide truncate">{selectedThread[0].user_name}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/20">
              {[...selectedThread].reverse().map((msg, i) => {
                const { textContent, attachments } = parseMessageWithAttachments(msg.message);
                return (
                  <div key={i} className={`flex items-start gap-3 ${msg.sender_id === user?.id ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${msg.sender_id === user?.id ? 'bg-ug-navy text-white' : 'bg-white border border-gray-100 text-ug-navy'}`}>
                      {msg.user_name.charAt(0)}
                    </div>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                      msg.sender_id === user?.id ? 'bg-[#0092B0] text-white rounded-tr-none' : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'
                    }`}>
                      <div className="whitespace-pre-wrap">{textContent}</div>

                      {attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-gray-100/50">
                          {attachments.map((att, attIdx) => {
                            const isImg = att.type === 'image';
                            return (
                              <div key={attIdx} className="flex flex-col gap-1.5 max-w-[200px]">
                                {isImg ? (
                                  <div className="relative group border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 shadow-sm max-w-[150px]">
                                    <img 
                                      src={att.url} 
                                      alt={att.name} 
                                      className="max-h-[100px] w-auto object-cover" 
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                      <a 
                                        href={att.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="p-1 bg-white/25 hover:bg-white/45 text-white rounded-lg transition"
                                        title="Open"
                                      >
                                        <Eye size={12} />
                                      </a>
                                      <a 
                                        href={att.url} 
                                        download={att.name} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="p-1 bg-white/25 hover:bg-white/45 text-white rounded-lg transition"
                                        title="Download"
                                      >
                                        <Download size={12} />
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition text-[11px] font-semibold text-gray-700 shadow-sm truncate"
                                  >
                                    <File size={12} className="text-blue-500 shrink-0" />
                                    <span className="truncate max-w-[100px]">{att.name}</span>
                                    <Download size={10} className="text-gray-400 shrink-0" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                    {isRevealRequestMessage(msg.message) && (
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                        {(!msg.status || msg.status === 'pending') ? (
                          msg.sender_id !== user?.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcceptReveal(msg)}
                                className="flex-1 bg-ug-teal hover:bg-emerald-600 text-white font-semibold text-[11px] tracking-wider py-2 rounded-xl transition shadow-sm active:scale-95"
                              >
                                Accept Request
                              </button>
                              <button
                                onClick={() => handleDeclineReveal(msg)}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] tracking-wider py-2 rounded-xl transition shadow-sm active:scale-95"
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 justify-center py-1.5 bg-pink-50 text-pink-700 rounded-xl border border-pink-100 text-[11px] font-semibold tracking-wider">
                              Clearance Pending
                            </div>
                          )
                        ) : msg.status.startsWith('released') ? (
                          <div className="flex items-center gap-1.5 justify-center py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-[11px] font-semibold tracking-wider">
                            <Check size={12} strokeWidth={3} /> Access Granted
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 justify-center py-1.5 bg-red-50 text-red-700 rounded-xl border border-red-100 text-[11px] font-semibold tracking-wider">
                            Access Declined
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`text-[11px] mt-2 opacity-60 text-right ${msg.sender_id === user?.id ? 'text-white' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )})}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
              <div className="flex items-end gap-3">
                <div className="flex-1 bg-gray-50 rounded-xl p-2 flex flex-col border border-gray-100 focus-within:bg-white focus-within:shadow-lg transition-all">
                  <textarea 
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type message..."
                    className="w-full bg-transparent p-2 text-xs focus:outline-none resize-none min-h-[40px] max-h-[120px]"
                    rows={1}
                  />

                  {/* Attached Files Preview */}
                  {replyAttachments.length > 0 && (
                    <div className="px-2 py-1.5 flex flex-wrap gap-1.5 border-t border-gray-100/30">
                      {replyAttachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 pl-2 pr-1 py-0.5 bg-white border border-gray-200 rounded-lg text-[11px] font-medium text-gray-700 shadow-sm animate-fade-in">
                          {att.type === 'image' ? <ImageIcon size={10} className="text-emerald-500 shrink-0" /> : <File size={10} className="text-blue-500 shrink-0" />}
                          <span className="truncate max-w-[80px]">{att.name}</span>
                          <button 
                            onClick={() => handleRemoveAttachment(idx, 'reply')} 
                            className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500 transition"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadingReply && (
                    <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold animate-pulse border-t border-gray-100/30">
                      <Loader2 size={10} className="animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-100 pt-1.5 px-1 bg-transparent shrink-0">
                    <div className="flex items-center gap-1">
                      <input 
                        type="file" 
                        id="mobile-reply-file-input"
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, 'reply', 'file')}
                      />
                      <input 
                        type="file" 
                        id="mobile-reply-image-input"
                        accept="image/*"
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, 'reply', 'image')}
                      />
                      <button 
                        onClick={() => document.getElementById('mobile-reply-file-input')?.click()}
                        disabled={uploadingReply}
                        className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition disabled:opacity-55"
                        title="Attach file"
                      >
                        <Paperclip size={14} />
                      </button>
                      <button 
                        onClick={() => document.getElementById('mobile-reply-image-input')?.click()}
                        disabled={uploadingReply}
                        className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition disabled:opacity-55"
                        title="Attach image"
                      >
                        <ImageIcon size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleSendReply}
                  disabled={sending || (uploadingReply) || (!reply.trim() && replyAttachments.length === 0)}
                  className="bg-blue-600 text-white p-3 rounded-full shadow-lg active:scale-90 transition disabled:opacity-50 h-10 w-10 flex items-center justify-center"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <SendIcon size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Gmail Sidebar (Hidden on Mobile) */}
      <div className={`hidden md:flex w-64 border-r border-gray-100 flex-col bg-white pt-4 transition-transform duration-300`}>
        <div className="px-4 mb-4">
          <button 
            onClick={() => setIsComposing(true)}
            className="flex items-center gap-4 bg-white hover:shadow-lg transition-all px-6 py-3 md:py-4 rounded-2xl text-sm font-bold text-gray-700 border border-gray-100 w-full shadow-sm"
          >
            <Pencil size={20} className="text-ug-teal" />
            <span className="tracking-wide">Compose</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 md:px-0">
          {[
            { id: 'inbox', icon: Inbox, label: 'Inbox', count: unreadCount },
            { id: 'sent', icon: SendIcon, label: 'Sent' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id as any);
                setSelectedThread(null);
              }}
              className={`w-full md:w-[95%] flex items-center justify-between px-6 py-3 md:py-2.5 rounded-2xl md:rounded-r-full text-sm transition-all mb-1 ${
                activeCategory === cat.id 
                  ? 'bg-blue-50 text-blue-700 font-bold' 
                  : 'text-gray-600 hover:bg-gray-100 font-medium'
              }`}
            >
              <div className="flex items-center gap-4">
                <cat.icon size={18} className={activeCategory === cat.id ? 'text-blue-700' : 'text-gray-500'} />
                {cat.label}
              </div>
              {cat.count ? (
                <span className={`text-xs ${activeCategory === cat.id ? 'font-bold' : 'font-bold'}`}>
                  {cat.count}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Desktop Main Content Area (Hidden on Mobile) */}
      <div className={`hidden md:flex flex-1 flex flex-col min-w-0 bg-white z-10 transition-transform duration-300 ${!isMobileListOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        {/* Search Bar & Actions (Only if list open) */}
        {isMobileListOpen || !selectedThread ? (
          <div className="h-16 border-b border-gray-100 flex items-center px-4 gap-4 bg-white">
            <div className="flex-1 max-w-2xl relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 border-none rounded-xl py-2.5 pl-12 pr-4 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2">
            </div>
          </div>
        ) : null}

        {selectedThread ? (
          /* Message Detail View */
          <div className="flex-1 flex flex-col bg-white overflow-hidden absolute inset-0 md:relative">
            <div className="h-14 border-b border-gray-50 flex items-center px-4 gap-4 bg-white shrink-0">
              <button 
                onClick={() => setSelectedThread(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 truncate text-sm md:text-base">
                  {selectedThread[0].projects?.title || 'General Inquiry'}
                </h4>
                <p className="text-[11px] text-gray-400 font-bold tracking-wide truncate">{selectedThread[0].user_name}</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 custom-scrollbar bg-gray-50/20">
              {[...selectedThread].reverse().map((msg, i) => {
                const { textContent, attachments } = parseMessageWithAttachments(msg.message);
                return (
                  <div key={i} className="group animate-fade-in">
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-full bg-ug-navy/5 flex items-center justify-center text-ug-navy shrink-0 shadow-sm">
                        <UserIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-1 gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">{msg.user_name}</span>
                            {msg.user_name !== 'UG Industry Hub Admin' && (
                              <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">&lt;{msg.sender_id.substring(0, 8)}...&gt;</span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400">
                            {new Date(msg.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                        <div className="text-xs md:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap p-3 md:p-0 bg-white md:bg-transparent rounded-2xl md:rounded-none shadow-sm md:shadow-none border border-gray-100 md:border-none">
                          <div>{textContent}</div>

                          {attachments.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2.5 pt-2 border-t border-gray-100/50">
                              {attachments.map((att, attIdx) => {
                                const isImg = att.type === 'image';
                                return (
                                  <div key={attIdx} className="flex flex-col gap-1.5 max-w-[280px]">
                                    {isImg ? (
                                      <div className="relative group border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 shadow-sm max-w-[200px]">
                                        <img 
                                          src={att.url} 
                                          alt={att.name} 
                                          className="max-h-[140px] w-auto object-cover" 
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                          <a 
                                            href={att.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="p-1.5 bg-white/20 hover:bg-white/45 text-white rounded-lg transition"
                                            title="Open image"
                                          >
                                            <Eye size={16} />
                                          </a>
                                          <a 
                                            href={att.url} 
                                            download={att.name} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="p-1.5 bg-white/20 hover:bg-white/45 text-white rounded-lg transition"
                                            title="Download image"
                                          >
                                            <Download size={16} />
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <a
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition text-xs font-semibold text-gray-700 shadow-sm hover:shadow truncate"
                                      >
                                        <File size={16} className="text-blue-500 shrink-0" />
                                        <span className="truncate max-w-[150px]">{att.name}</span>
                                        <Download size={14} className="text-gray-400 shrink-0 ml-1" />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        {isRevealRequestMessage(msg.message) && (
                          <div className="mt-4 pt-3 border-t border-gray-100 space-y-3 max-w-md">
                            {(!msg.status || msg.status === 'pending') ? (
                              msg.sender_id !== user?.id ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAcceptReveal(msg)}
                                    className="flex-1 bg-ug-teal hover:bg-emerald-600 text-white font-semibold text-[11px] tracking-wider py-2 rounded-xl transition shadow-sm active:scale-95"
                                  >
                                    Accept Request
                                  </button>
                                  <button
                                    onClick={() => handleDeclineReveal(msg)}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] tracking-wider py-2 rounded-xl transition shadow-sm active:scale-95"
                                  >
                                    Decline
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 justify-center py-1.5 bg-pink-50 text-pink-700 rounded-xl border border-pink-100 text-[11px] font-semibold tracking-wider">
                                  Clearance Pending
                                </div>
                              )
                            ) : msg.status.startsWith('released') ? (
                              <div className="flex items-center gap-1.5 justify-center py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-[11px] font-semibold tracking-wider">
                                <Check size={12} strokeWidth={3} /> Access Granted
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 justify-center py-1.5 bg-red-50 text-red-700 rounded-xl border border-red-100 text-[11px] font-semibold tracking-wider">
                                Access Declined
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>

            {/* Reply Area */}
            <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <textarea 
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply here..."
                  className="w-full p-4 text-xs md:text-sm focus:outline-none resize-none min-h-[80px] md:min-h-[100px]"
                />
                {/* Attached Files Preview */}
                {replyAttachments.length > 0 && (
                  <div className="px-4 py-2.5 bg-gray-50/50 border-t border-gray-100 flex flex-wrap gap-2">
                    {replyAttachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 shadow-sm animate-fade-in">
                        {att.type === 'image' ? <ImageIcon size={14} className="text-emerald-500 shrink-0" /> : <File size={14} className="text-blue-500 shrink-0" />}
                        <span className="truncate max-w-[120px]">{att.name}</span>
                        <button 
                          onClick={() => handleRemoveAttachment(idx, 'reply')} 
                          className="p-0.5 hover:bg-gray-150 rounded text-gray-400 hover:text-red-500 transition ml-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadingReply && (
                  <div className="px-4 py-2 bg-blue-50 border-t border-gray-100 flex items-center gap-2 text-xs text-blue-600 font-semibold animate-pulse">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Uploading attachment...</span>
                  </div>
                )}

                <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-1 md:gap-2">
                    <input 
                      type="file" 
                      id="desktop-reply-file-input"
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, 'reply', 'file')}
                    />
                    <input 
                      type="file" 
                      id="desktop-reply-image-input"
                      accept="image/*"
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, 'reply', 'image')}
                    />
                    <button 
                      onClick={() => document.getElementById('desktop-reply-file-input')?.click()}
                      disabled={uploadingReply}
                      className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition disabled:opacity-55"
                      title="Attach file"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button 
                      onClick={() => document.getElementById('desktop-reply-image-input')?.click()}
                      disabled={uploadingReply}
                      className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition disabled:opacity-55"
                      title="Attach image"
                    >
                      <ImageIcon size={18} />
                    </button>
                  </div>
                  <button 
                    onClick={handleSendReply}
                    disabled={sending || (uploadingReply) || (!reply.trim() && replyAttachments.length === 0)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <><SendIcon size={16} /> Send</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Thread List View */
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 md:p-16 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <MailOpen size={40} className="opacity-20" />
                </div>
                <p className="text-sm font-bold  tracking-wide">No messages found</p>
                <p className="text-xs mt-2 text-gray-400">Your conversations in {activeCategory} will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredThreads.map((thread, i) => {
                  const lastMsg = thread[0];
                  const isUnread = !lastMsg.read && lastMsg.recipient_id === user?.id;
                  return (
                    <div 
                      key={i} 
                      onClick={() => handleSelectThread(thread)}
                      className={`flex items-center px-4 py-4 md:py-3 gap-3 md:gap-4 cursor-pointer hover:bg-gray-50/50 transition-all relative ${
                        isUnread ? 'bg-blue-50/30' : 'bg-white'
                      }`}
                    >
                      {isUnread && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full ml-1 animate-pulse"></div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm truncate w-32 md:w-48 ${isUnread ? 'font-bold text-gray-900' : 'font-bold text-gray-700'}`}>
                            {lastMsg.user_name}
                          </span>
                          <span className={`text-[11px] shrink-0 font-bold tracking-tighter ${isUnread ? 'text-blue-600' : 'text-gray-400'}`}>
                            {new Date(lastMsg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                           <span className={`text-xs truncate shrink-0 ${isUnread ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                            {lastMsg.projects?.title || 'General Inquiry'}
                          </span>
                          <span className="text-gray-400 text-xs shrink-0">•</span>
                          <span className="text-gray-500 text-xs truncate opacity-70">
                            {parseMessageWithAttachments(lastMsg.message).textContent}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compose Modal (Gmail Style) - Responsive Width */}
      {isComposing && (
        <div className="fixed inset-0 md:inset-auto md:bottom-0 md:right-10 md:w-[500px] md:h-[600px] bg-white shadow-xl md:rounded-t-3xl border border-gray-200 z-[300] flex flex-col animate-slide-up">
          <div className="bg-ug-navy text-white px-6 py-6 md:py-4 md:rounded-t-3xl flex items-center justify-between shrink-0">
            <span className="text-sm font-bold  tracking-wide text-ug-teal">New Interaction</span>
            <button onClick={() => setIsComposing(false)} className="p-2 hover:bg-white/10 rounded-2xl transition">
              <X size={24} className="md:w-5 md:h-5" />
            </button>
          </div>
          <div className="p-6 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            <div className="relative">
              <label className="text-[11px] font-semibold text-gray-400 tracking-wide block mb-2">Recipient</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search collaborators by name..." 
                  value={selectedRecipient ? selectedRecipient.name : composeRecipient}
                  onChange={(e) => handleRecipientSearch(e.target.value)}
                  disabled={!!selectedRecipient}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold disabled:opacity-50 disabled:bg-blue-50/50 disabled:border-blue-100"
                />
                {selectedRecipient && (
                  <button 
                    onClick={() => setSelectedRecipient(null)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition shadow-sm"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {recipientResults.length > 0 && !selectedRecipient && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-[310] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-2 space-y-1">
                    {recipientResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedRecipient(u);
                          setRecipientResults([]);
                        }}
                        className="w-full flex items-center gap-4 p-4 hover:bg-blue-50/50 rounded-2xl transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-ug-navy/5 flex items-center justify-center text-ug-navy group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <UserIcon size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition">{u.name}</p>
                          <p className="text-[11px] text-gray-400 font-bold tracking-wide">{u.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-400 tracking-wide block mb-2">Topic</label>
              <input 
                type="text" 
                placeholder="Brief subject description" 
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-6 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold" 
              />
            </div>

            <div className="flex-1 min-h-[200px] flex flex-col">
              <label className="text-[11px] font-semibold text-gray-400 tracking-wide block mb-2">Message</label>
              <textarea 
                placeholder="Share your thoughts or research proposal..." 
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                className="w-full flex-1 min-h-[160px] bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium resize-none shadow-inner" 
              />
            </div>

            {/* Attached Files Preview */}
            {composeAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2.5 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                {composeAttachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-sm animate-fade-in">
                    {att.type === 'image' ? <ImageIcon size={14} className="text-emerald-500 shrink-0" /> : <File size={14} className="text-blue-500 shrink-0" />}
                    <span className="truncate max-w-[140px]">{att.name}</span>
                    <button 
                      onClick={() => handleRemoveAttachment(idx, 'compose')} 
                      className="p-1 hover:bg-gray-150 rounded text-gray-400 hover:text-red-500 transition ml-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadingCompose && (
              <div className="flex items-center gap-2.5 p-3 bg-blue-50 text-blue-600 rounded-2xl text-xs font-bold animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span>Uploading attachment...</span>
              </div>
            )}
          </div>
          <div className="p-6 md:p-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 bg-white sticky bottom-0 shrink-0">
            <button 
              onClick={handleSendDirectMessage}
              disabled={sending || uploadingCompose || !selectedRecipient || (!composeMessage.trim() && composeAttachments.length === 0)}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-xl font-bold text-[12px]  tracking-[0.2em] transition-all shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)] disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <><SendIcon size={18} /> Send Message</>}
            </button>
            <div className="flex items-center gap-6 text-gray-300">
              <input 
                type="file" 
                id="compose-file-input"
                className="hidden" 
                onChange={(e) => handleFileChange(e, 'compose', 'file')}
              />
              <input 
                type="file" 
                id="compose-image-input"
                accept="image/*"
                className="hidden" 
                onChange={(e) => handleFileChange(e, 'compose', 'image')}
              />
              <button 
                onClick={() => document.getElementById('compose-file-input')?.click()}
                disabled={uploadingCompose}
                className="hover:text-blue-600 transition-colors disabled:opacity-50 cursor-pointer"
                title="Attach file"
              >
                <Paperclip size={24} />
              </button>
              <button 
                onClick={() => document.getElementById('compose-image-input')?.click()}
                disabled={uploadingCompose}
                className="hover:text-blue-600 transition-colors disabled:opacity-50 cursor-pointer"
                title="Attach image"
              >
                <ImageIcon size={24} />
              </button>
              <div className="w-px h-6 bg-gray-100 mx-2"></div>
              <button onClick={() => setIsComposing(false)} className="hover:text-red-500 transition-colors cursor-pointer"><Trash size={24} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
