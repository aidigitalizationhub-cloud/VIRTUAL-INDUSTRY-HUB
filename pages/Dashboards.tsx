
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, ProjectStatus, Visibility, Project, ResearchArea, User, AIProfile, DisclosureStatus } from '../types';
import { StorageService } from '../services/storageService';
import { MatchingService } from '../services/matchingService';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  TrendingUp, Users, Plus, FileText, 
  Settings, Bell, ShieldCheck, Download, 
  ChevronRight, ChevronDown, ChevronUp, Globe, Lock, X, Check, Award, GraduationCap, Eye, Search, Loader2, Star, Trash, Inbox, Archive, MoreVertical, CornerUpLeft, Paperclip, Maximize2, Minimize2, ChevronLeft, UserPlus,
  Briefcase, BookOpen, Handshake, Image as ImageIcon, Upload, DollarSign, FileCode,
  Home as HomeIcon,
  ShoppingBag, Bookmark, ArrowRight, User as UserIcon, Link as LinkIcon, Camera, AlertCircle, AlertTriangle, Info, Fingerprint,
  Pencil, Trash2, FileUp, MessageSquare, MailOpen, Clock, Zap, Send as SendIcon, Calendar, File, LayoutGrid, Target, Sparkles, LogOut, Rocket, Activity, FileSpreadsheet
} from 'lucide-react';
import { useToast } from '../App';
import { Onboarding } from './Onboarding';
import { AdminDashboard } from '../components/AdminDashboard';
import { supabase } from '../lib/supabase';
import { AIProfileService } from '../services/aiProfileService';
import { EmbeddingService } from '../services/embeddingService';
import { IndustryChallengesMatcher } from '../components/IndustryChallengesMatcher';
import { CreateChallengeModal } from '../components/CreateChallengeModal';
import { PartnerChallengesTracker } from '../components/PartnerChallengesTracker';
import { safeExternalUrl } from '../lib/urlSafety';
import ThemeSwitcher from '../components/ThemeSwitcher';


interface DashboardProps {
  role: UserRole;
  user: User | null;
}

// Reveal-request detection: matches the current bracket tag and the legacy
// emoji-prefixed format so older messages keep rendering correctly.
const isRevealRequestMessage = (text?: string | null): boolean =>
  !!text && (
    text.includes('[REVEAL_REQUEST]') ||
    text.includes('\uD83D\uDD10 Technical Disclosure Request')
  );

// --- MOBILE BOTTOM NAV ---
const MobileNav: React.FC<{ activeTab: string; setActiveTab: (t: any) => void; role: UserRole; unreadCount: number }> = ({ activeTab, setActiveTab, role, unreadCount }) => {
  const tabs = [
    { id: 'overview', icon: LayoutGrid, label: 'Overview' },
    { id: 'matches', icon: Target, label: 'Matches' },
    { id: 'messages', icon: MessageSquare, label: 'Chat' },
    { id: 'profile', icon: UserIcon, label: 'Profile' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200/80 z-40 flex items-center justify-around px-2 py-2 shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all duration-200 relative cursor-pointer ${
              isActive ? 'text-ug-teal' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {isActive && (
              <motion.div 
                layoutId="mobile-nav-active"
                className="absolute inset-0 bg-ug-teal/10 rounded-2xl -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            
            <div className="relative flex items-center justify-center">
              <tab.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} className="transition-transform duration-200" />
              {tab.id === 'messages' && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-ug-teal text-white text-[11px] font-semibold flex items-center justify-center rounded-full shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>

            <span className={`text-[11px] tracking-tight capitalize ${isActive ? 'text-ug-navy font-semibold' : 'text-gray-400 font-bold'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

// --- DESKTOP SIDEBAR ---
const Sidebar: React.FC<{ 
  activeTab: string; 
  setActiveTab: (t: any) => void; 
  role: UserRole; 
  user: User | null;
  adminSubTab?: 'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions';
  setAdminSubTab?: (t: 'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions') => void;
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean) => void;
}> = ({ activeTab, setActiveTab, role, user, adminSubTab = 'metrics', setAdminSubTab, isCollapsed, setIsCollapsed }) => {
  const tabs = [
    { id: 'overview', icon: LayoutGrid, label: 'Overview' },
    { id: 'matches', icon: Target, label: 'Matches' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'profile', icon: UserIcon, label: 'Profile' },
  ];

  const adminTabs = [
    { id: 'metrics', icon: LayoutGrid, label: 'Overview' },
    { id: 'users', icon: Users, label: 'Users Directorate' },
    { id: 'disclosures', icon: FileText, label: 'Disclosure' },
    { id: 'projects', icon: ShieldCheck, label: 'Project Screener' },
    { id: 'news', icon: Globe, label: 'News Curator' },
    { id: 'logs', icon: Activity, label: 'Governance Audit' },
    { id: 'decisions', icon: Fingerprint, label: 'Decision Log' },
  ] as const;

  const getPortalTitle = () => {
    switch(role) {
      case UserRole.Student: return 'STUDENT';
      case UserRole.Investor: return 'INVESTOR';
      case UserRole.IndustryPartner: return 'INDUSTRY';
      case UserRole.Admin: return 'ADMIN';
      default: return 'RESEARCHER';
    }
  };

  return (
    <div className={`hidden lg:flex h-full bg-white border-r border-gray-100 flex-col relative transition-all duration-300 ${isCollapsed ? 'w-20 p-4' : 'w-64 p-6'} shrink-0`}>
      {/* Dynamic Floating Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -right-3.5 -translate-y-1/2 bg-white border border-gray-200 text-[#1a1a4b] hover:bg-[#1a1a4b] hover:text-white h-7 w-7 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all duration-300 z-50 hover:scale-105 active:scale-95 group"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <ChevronLeft 
          size={14} 
          className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180 text-ug-teal' : 'text-gray-500 group-hover:text-white'}`} 
        />
      </button>

      <div className={`mb-12 flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}>
        <div className="bg-ug-navy p-2 rounded-xl text-white shrink-0 transition-transform duration-300">
          <GraduationCap size={20} />
        </div>
        {!isCollapsed && (
          <h2 className="text-sm font-bold text-ug-navy  tracking-wide leading-none block animate-fade-in">
            {getPortalTitle()}<br/><span className="text-ug-teal">PORTAL</span>
          </h2>
        )}
      </div>

      <nav className="flex-1 space-y-2">
        {role === UserRole.Admin ? (
          adminTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (setAdminSubTab) {
                  setAdminSubTab(tab.id);
                }
              }}
              className={`w-full flex items-center rounded-2xl transition-all group duration-300 ${
                isCollapsed ? 'justify-center p-3' : 'justify-between px-5 py-4'
              } ${
                adminSubTab === tab.id 
                  ? 'bg-ug-navy text-white shadow-xl shadow-ug-navy/20 active-nav' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-ug-navy'
              }`}
              title={isCollapsed ? tab.label : undefined}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={18} className="shrink-0" />
                {!isCollapsed && (
                  <span className="text-xs font-bold tracking-wide  whitespace-nowrap">
                    {tab.label}
                  </span>
                )}
              </div>
            </button>
          ))
        ) : (
          tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center rounded-2xl transition-all group duration-300 ${
                isCollapsed ? 'justify-center p-3' : 'justify-between px-5 py-4'
              } ${
                activeTab === tab.id 
                  ? 'bg-ug-navy text-white shadow-xl shadow-ug-navy/20 active-nav' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-ug-navy'
              }`}
              title={isCollapsed ? tab.label : undefined}
            >
                <div className="flex items-center gap-3">
                  <tab.icon size={18} className="shrink-0" />
                  {!isCollapsed && (
                    <span className="text-xs font-bold tracking-wide  whitespace-nowrap">
                      {tab.label}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
      </nav>
    </div>
  );
};

// --- SHARED COMPONENTS ---

const StatCard: React.FC<{ label: string; value: string | number; trend?: string; icon: any; color?: string }> = ({ label, value, trend, icon: Icon }) => (
  <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm relative group hover:shadow-md transition-all flex flex-col gap-2">
    <div className="flex justify-between items-start">
      <span className="text-[11px] font-bold text-gray-400 tracking-wider">{label}</span>
      <Icon size={16} className="text-gray-300 group-hover:text-ug-teal transition duration-500" />
    </div>
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-xl md:text-2xl font-bold text-ug-navy tracking-tight">{value}</h3>
      {trend && (
        <span className="text-[11px] font-bold text-ug-teal bg-ug-teal/5 px-2 py-0.5 rounded-full tracking-wider leading-none">
          {trend}
        </span>
      )}
    </div>
  </div>
);

const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold text-ug-navy flex items-center gap-2">
      <div className="h-6 w-1 bg-ug-teal rounded-full"></div> {title}
    </h2>
    {subtitle && <p className="text-sm text-gray-500 mt-1 font-medium ml-3">{subtitle}</p>}
  </div>
);

// --- HUB STREAM COMPONENT (SIDEBAR) ---
const HubStreamSidebar: React.FC = () => {
  const [trending, setTrending] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    StorageService.getTrendingProjects().then(data => {
      setTrending(data);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-full bg-gray-100 rounded-xl"></div>
      <div className="h-40 w-full bg-gray-50 rounded-2xl"></div>
      <div className="h-40 w-full bg-gray-50 rounded-2xl"></div>
    </div>
  );

  return (
    <aside className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm sticky top-24 z-10">
       <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-bold text-ug-navy">Hub Stream</h3>
            <p className="text-[11px] font-semibold text-ug-teal tracking-[0.2em] mt-1">Trending Innovations</p>
          </div>
          <div className="h-10 w-10 bg-ug-navy text-white rounded-2xl flex items-center justify-center animate-pulse shadow-lg">
             <Zap size={18} className="text-ug-teal" />
          </div>
       </div>

       <div className="space-y-6">
          {trending.map(p => (
            <div 
              key={p.id} 
              onClick={() => navigate(`/projects/${p.id}`)}
              className="group bg-gray-50/50 border border-transparent rounded-2xl p-5 hover:bg-white hover:border-ug-teal/20 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
            >
               <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm shrink-0 border border-white">
                     <img src={p.image_url && p.image_url.trim() !== '' ? p.image_url.split('|')[0] : 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-ug-teal tracking-wide">{p.research_area}</span>
                        <div className="h-1 w-1 bg-gray-200 rounded-full"></div>
                        <span className="text-[11px] font-semibold text-ug-success tracking-wide">{p.status}</span>
                     </div>
                     <h4 className="font-bold text-ug-navy text-xs leading-tight line-clamp-2 group-hover:text-ug-teal transition">{p.title}</h4>
                  </div>
               </div>
               <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 tracking-wide">
                     <Users size={10} /> Active Engagement
                  </div>
                  <div className="text-ug-navy group-hover:translate-x-1 transition-transform">
                     <ArrowRight size={14} />
                  </div>
               </div>
            </div>
          ))}
       </div>
    </aside>
  );
};

// --- PROJECT DISCLOSURE MODAL ---
const ProjectFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  project: Project | null;
}> = ({ isOpen, onClose, onSave, project }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // File states
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [evidenceImage, setEvidenceImage] = useState<File | null>(null);
  const [technicalBrief, setTechnicalBrief] = useState<File | null>(null);

  // Temporary string state for achievements textarea to avoid line deletion and cursor jump behaviors when pressing enter
  const [tmpAchievementsText, setTmpAchievementsText] = useState('');

  const [formData, setFormData] = useState<Partial<Project>>({
    title: '',
    description: '',
    department: '',
    status: ProjectStatus.Concept,
    visibility: Visibility.Public,
    trl: 1,
    research_area: ResearchArea.Diagnostics,
    image_url: '',
    budget: '',
    start_date: new Date().toISOString().split('T')[0],
    funding_amount_usd: '',
    open_to_collaboration: true,
    technical_details_url: '',
    achievements: [],
    needs: []
  });

  useEffect(() => {
    if (project) {
      setFormData(project);
      setTmpAchievementsText(project.achievements?.join('\n') || '');
    } else {
      setFormData({
        title: '',
        description: '',
        department: '',
        status: ProjectStatus.Concept,
        visibility: Visibility.Public,
        trl: 1,
        research_area: ResearchArea.Diagnostics,
        image_url: '',
        budget: '',
        start_date: new Date().toISOString().split('T')[0],
        funding_amount_usd: '',
        open_to_collaboration: true,
        technical_details_url: '',
        achievements: [],
        needs: []
      });
      setTmpAchievementsText('');
    }
    setMainImage(null);
    setEvidenceImage(null);
    setTechnicalBrief(null);
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent, statusOverride?: DisclosureStatus) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = formData.image_url || '';
      let finalBriefUrl = formData.technical_details_url || '';

      // Upload files if selected
      if (mainImage) {
        const url = await StorageService.uploadFile(mainImage, 'projects');
        finalImageUrl = url;
      }

      if (evidenceImage) {
        const url = await StorageService.uploadFile(evidenceImage, 'projects');
        finalImageUrl = finalImageUrl ? `${finalImageUrl}|${url}` : url;
      }

      if (technicalBrief) {
        const url = await StorageService.uploadFile(technicalBrief, 'projects');
        finalBriefUrl = url;
      }

      // Determine disclosure status and visibility
      const finalStatus = statusOverride || formData.disclosure_status || (project ? undefined : DisclosureStatus.Submitted);
      const finalVisibility = statusOverride === DisclosureStatus.Draft ? Visibility.Internal : (project ? formData.visibility : Visibility.Internal);

      const updatedPayload = {
        ...formData,
        image_url: finalImageUrl,
        technical_details_url: finalBriefUrl,
        disclosure_status: finalStatus,
        visibility: finalVisibility
      };

      await StorageService.saveProject(updatedPayload);
      showToast(project ? "Disclosure Updated" : (finalStatus === DisclosureStatus.Draft ? "Saved as Draft" : "Project Submitted for Review"), "success");
      onSave();
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to save disclosure", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 md:p-10 bg-ug-navy/95 backdrop-blur-md overflow-y-auto custom-scrollbar">
      <div className="bg-white rounded-2xl md:rounded-2xl w-full max-w-5xl p-6 md:p-12 shadow-xl relative my-8">
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-ug-teal text-white rounded-2xl flex items-center justify-center shadow-lg">
                <FileCode size={24} />
             </div>
             <div>
               <h2 className="text-2xl md:text-3xl font-bold text-ug-navy tracking-tight">{project ? 'Update Disclosure' : 'New Project Disclosure'}</h2>
               <p className="text-[11px] font-semibold text-gray-400 tracking-[0.3em] mt-1">University of Ghana Research Intelligence</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition hover:rotate-90 duration-300"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-11 gap-12">
          {/* Left Column: Core Identity */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-1 bg-ug-teal rounded-full"></div>
                  <span className="text-[11px] font-semibold text-ug-navy tracking-wide">Identification</span>
               </div>
               <div className="space-y-2">
                 <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Research Title / Product Name</label>
                 <input required type="text" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none transition" placeholder="Enter formal project title..." />
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Research Area</label>
                   <select value={formData.research_area || ''} onChange={e => setFormData({...formData, research_area: e.target.value as ResearchArea})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none cursor-pointer">
                     {Object.values(ResearchArea).map(area => <option key={area} value={area}>{area}</option>)}
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Department</label>
                   <input required type="text" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none" placeholder="e.g. Computer Science" />
                 </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-1 bg-ug-teal rounded-full"></div>
                  <span className="text-[11px] font-semibold text-ug-navy tracking-wide">Content & Maturity</span>
               </div>
               <div className="space-y-2">
                 <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Executive Summary</label>
                 <textarea required rows={4} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-medium text-gray-600 focus:ring-2 focus:ring-ug-teal/20 outline-none resize-none leading-relaxed" placeholder="Describe your research methodology and potential impact..." />
               </div>
 
               <div className="space-y-2">
                 <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Status</label>
                 <select 
                   value={formData.status || ''} 
                   onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus, trl: Object.values(ProjectStatus).indexOf(e.target.value as ProjectStatus) + 1})}
                   className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none cursor-pointer"
                 >
                   {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>
            </div>

            <div className="space-y-4 pt-4">
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-1 bg-ug-teal rounded-full"></div>
                  <span className="text-[11px] font-semibold text-ug-navy tracking-wide">Visual Evidence</span>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-100 rounded-2xl cursor-pointer bg-gray-50 hover:bg-white hover:border-ug-teal/30 transition group overflow-hidden">
                    {mainImage ? (
                       <div className="w-full h-full p-2">
                          <img src={URL.createObjectURL(mainImage)} className="w-full h-full object-cover rounded-2xl" alt="" />
                       </div>
                    ) : (
                      <div className="text-center group-hover:scale-110 transition duration-500">
                        <Camera size={24} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wide">Primary Image</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={e => setMainImage(e.target.files?.[0] || null)} />
                  </label>

                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-100 rounded-2xl cursor-pointer bg-gray-50 hover:bg-white hover:border-ug-teal/30 transition group overflow-hidden">
                    {evidenceImage ? (
                       <div className="w-full h-full p-2">
                          <img src={URL.createObjectURL(evidenceImage)} className="w-full h-full object-cover rounded-2xl" alt="" />
                       </div>
                    ) : (
                      <div className="text-center group-hover:scale-110 transition duration-500">
                        <ImageIcon size={24} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wide">Secondary Proof</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={e => setEvidenceImage(e.target.files?.[0] || null)} />
                  </label>
               </div>
            </div>
          </div>

          {/* Right Column: Technical & Logistics */}
          <div className="lg:col-span-5 space-y-8 bg-gray-50/50 p-6 md:p-8 rounded-2xl border border-gray-100">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                 <div className="h-4 w-1 bg-ug-teal rounded-full"></div>
                 <span className="text-[11px] font-semibold text-ug-navy tracking-wide">Logistics & Funding</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Budget Estimate</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" value={formData.budget || ''} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none" placeholder="$0.00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Key Achievements & Milestones</label>
                <textarea 
                  rows={4} 
                  value={tmpAchievementsText} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const textarea = e.currentTarget;
                      const start = textarea.selectionStart;
                      const textBefore = tmpAchievementsText.substring(0, start);
                      const textAfter = tmpAchievementsText.substring(start);
                      
                      const linesBefore = textBefore.split('\n');
                      const lastLine = linesBefore[linesBefore.length - 1];
                      
                      let prefix = '';
                      if (lastLine.trim().startsWith('•')) {
                        prefix = '• ';
                      } else if (lastLine.trim().startsWith('-')) {
                        prefix = '- ';
                      } else if (/^\d+\./.test(lastLine.trim())) {
                        const match = lastLine.trim().match(/^(\d+)\./);
                        if (match) {
                          const nextNum = parseInt(match[1], 10) + 1;
                          prefix = `${nextNum}. `;
                        }
                      }
                      
                      if (prefix) {
                        e.preventDefault();
                        const newText = textBefore + '\n' + prefix + textAfter;
                        setTmpAchievementsText(newText);
                        
                        const newLines = newText.split('\n').map(s => s.trim()).filter(Boolean);
                        setFormData({
                          ...formData,
                          achievements: newLines
                        });
                        
                        setTimeout(() => {
                          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
                        }, 0);
                      }
                    }
                  }}
                  onChange={e => {
                    const txt = e.target.value;
                    setTmpAchievementsText(txt);
                    const parsedLines = txt.split('\n').map(s => s.trim()).filter(Boolean);
                    setFormData({
                      ...formData,
                      achievements: parsedLines
                    });
                  }} 
                  className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-medium text-gray-700 focus:ring-2 focus:ring-ug-teal/20 outline-none resize-none text-xs leading-relaxed" 
                  placeholder="• Lab validation completed&#10;• Prototype developed&#10;• Clinical testing phase..." 
                />
              </div>

              <div className="space-y-2">
                 <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Technical Briefing (PDF/DOC)</label>
                 <label className="flex items-center gap-4 w-full p-4 bg-white border border-gray-100 rounded-2xl cursor-pointer hover:shadow-xl transition group">
                    <div className="p-3 bg-ug-navy text-ug-teal rounded-xl shadow-lg group-hover:scale-110 transition">
                      <FileUp size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ug-navy truncate">
                         {technicalBrief ? technicalBrief.name : 'Upload Document'}
                      </p>
                      <p className="text-[11px] font-semibold text-gray-400 tracking-wide">Formal Disclosure Brief</p>
                    </div>
                    <input type="file" className="hidden" onChange={e => setTechnicalBrief(e.target.files?.[0] || null)} />
                 </label>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="collab" className="text-[11px] font-semibold text-ug-navy tracking-wide cursor-pointer select-none">Open to Collaboration</label>
                  <label htmlFor="collab" className="relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      id="collab" 
                      checked={!!formData.open_to_collaboration} 
                      onChange={e => setFormData({...formData, open_to_collaboration: e.target.checked})} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-ug-teal after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                  </label>
                </div>
                <p className="text-[11px] font-medium text-gray-400 leading-normal">Enabling this makes your research discoverable to verified industry partners and technical investors.</p>
              </div>

              <div className="pt-6 space-y-4">
                {project ? (
                  <button 
                    type="submit" 
                    onClick={(e) => handleSubmit(e)}
                    disabled={loading} 
                    className="w-full bg-ug-navy text-white py-3.5 rounded-xl font-semibold text-[11px] tracking-[0.25em] shadow-xl hover:bg-ug-teal active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                    Apply Disclosure Changes
                  </button>
                ) : (
                  <>
                    <button 
                      type="button" 
                      onClick={(e) => handleSubmit(e, DisclosureStatus.Submitted)}
                      disabled={loading} 
                      className="w-full bg-ug-teal text-white py-3.5 rounded-xl font-semibold text-[11px] tracking-[0.25em] shadow-xl hover:bg-ug-navy active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                      Submit for Academic Review
                    </button>
                    <button 
                      type="button" 
                      onClick={(e) => handleSubmit(e, DisclosureStatus.Draft)}
                      disabled={loading} 
                      className="w-full bg-gray-100 text-ug-navy hover:bg-gray-200 py-3 rounded-xl font-semibold text-[11px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 cursor-pointer"
                    >
                      Save as Draft
                    </button>
                  </>
                )}
                <button type="button" onClick={onClose} className="w-full py-4 text-gray-400 font-semibold text-[11px] tracking-wide hover:text-red-500 transition-colors">
                  Discard & Close
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

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
interface MessagesSectionProps {
  user: User | null;
  initialThreadId?: string | null;
  onResetInitialThread?: () => void;
}

const MessagesSection: React.FC<MessagesSectionProps> = ({ user, initialThreadId, onResetInitialThread }) => {
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
                          <div className="p-10 text-center text-gray-400 text-[11px] font-bold tracking-wide">
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
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-10 md:p-16 text-center">
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

// --- DASHBOARD WRAPPER ---
interface DashboardsProps extends DashboardProps {
  initialThreadId?: string | null;
  onThreadHandled?: () => void;
  onLogout?: () => void;
  onProfileUpdate?: () => void;
}

const Dashboards: React.FC<DashboardsProps> = ({ role, user, initialThreadId, onThreadHandled, onLogout, onProfileUpdate }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'messages' | 'profile'>('overview');
  const [adminSubTab, setAdminSubTab] = useState<'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions'>('metrics');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [localUser, setLocalUser] = useState<User | null>(user);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [localInitialThreadId, setLocalInitialThreadId] = useState<string | null>(null);
  const [autoOpenCreateChallenge, setAutoOpenCreateChallenge] = useState(false);

  const getWelcomeName = (fullName: string): string => {
    if (!fullName) return '';
    const words = fullName.trim().split(/\s+/);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0];

    const titles = ['dr', 'dr.', 'prof', 'prof.', 'professor', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'rev', 'rev.', 'sir', 'madam', 'dean', 'provost', 'assoc.', 'asst.'];
    const firstWordLower = words[0].toLowerCase();
    
    if (titles.includes(firstWordLower)) {
      const title = words[0];
      const surname = words[words.length - 1];
      if (words.length > 2 && words[1].toLowerCase().startsWith('(') && words[1].toLowerCase().endsWith(')')) {
        return `${title} ${words[1]} ${surname}`;
      }
      return `${title} ${surname}`;
    }
    
    return words[words.length - 1];
  };

  // Synchronize URL search params with active tab state
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'matches', 'messages', 'profile'].includes(tabParam)) {
      if (activeTab !== tabParam) {
        setActiveTab(tabParam as any);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam !== activeTab) {
      setSearchParams((prev) => {
        prev.set('tab', activeTab);
        return prev;
      }, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

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
    if (userId) {
       StorageService.getUnreadCount(userId).then(setInternalUnread).catch(() => {});
    }
  }, [activeTab, localUser?.id, user?.id]);

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
    const freshProfile = await StorageService.getProfile(userId);
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

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar 
        role={role} 
        user={localUser} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        adminSubTab={adminSubTab}
        setAdminSubTab={setAdminSubTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      
      <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        <header className="bg-ug-navy text-white flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 shrink-0 shadow-xl z-50 border-b border-white/10">
          {/* Mobile Brand Identity */}
          <div className="flex sm:hidden items-center gap-2 cursor-pointer group" onClick={() => navigate('/')} title="Return to Home">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ug-teal via-teal-600 to-teal-800 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-teal-900/40 ring-1 ring-white/20 group-hover:scale-105 transition-transform shrink-0">
              <HomeIcon size={16} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs tracking-tight text-white leading-none group-hover:text-ug-teal transition-colors">UG Industry Hub</span>
            </div>
          </div>

          {/* Desktop/Tablet Navigation Links */}
          <nav className="hidden sm:flex items-center gap-6 lg:gap-8 ml-0 lg:ml-8">
             {role !== UserRole.Admin && ['Home', 'Projects', 'Products', 'News'].map(link => (
               <button 
                 key={link} 
                 onClick={() => navigate(link === 'Home' ? '/' : `/${link.toLowerCase()}`)}
                 className="text-xs font-bold   hover:text-ug-teal transition-colors cursor-pointer text-white/80 hover:text-white"
               >
                 {link}
               </button>
             ))}
          </nav>

          {(localUser?.name || user?.name) && (
            <div className="hidden md:flex items-center gap-2.5 px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs shadow-inner">
              <span className="font-light text-white/50">Welcome,</span>
              <span className="font-extrabold text-ug-teal">{getWelcomeName(localUser?.name || user?.name || '')}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse ml-0.5"></span>
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-6">
            {/* Mobile Home Shortcut Button */}
            <button 
              onClick={() => navigate('/')}
              className="sm:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-1 active:scale-95"
              title="Return to Home"
            >
              <HomeIcon size={18} className="text-ug-teal" />
              <span className="text-[11px] font-bold tracking-wider">Home</span>
            </button>

            <button 
              onClick={() => setActiveTab('messages')}
              className={`p-2 transition-all relative group rounded-xl hover:bg-white/10 ${activeTab === 'messages' ? 'text-ug-teal' : 'text-white/70 hover:text-white'}`}
              title="Messages & Notifications"
            >
              <Bell size={18} className="sm:w-[20px] sm:h-[20px]" />
              {internalUnread > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 sm:top-0.5 sm:right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-ug-teal text-white text-[11px] sm:text-[11px] font-semibold flex items-center justify-center rounded-full border border-ug-navy z-10 shadow-lg animate-pulse">
                    {internalUnread > 9 ? '9+' : internalUnread}
                  </span>
                  <span className="absolute -top-1 -right-1 sm:top-0.5 sm:right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-ug-teal rounded-full border border-ug-navy animate-ping opacity-75"></span>
                </>
              )}
            </button>

            <ThemeSwitcher />

            <div className="flex items-center gap-2 sm:gap-4 pl-2 sm:pl-6 border-l border-white/10">
              <button 
                onClick={handleLogout}
                className="p-2 text-white/60 hover:text-red-400 transition-all group relative rounded-xl hover:bg-white/10 flex items-center gap-1.5"
                title="Logout"
              >
                <LogOut size={18} className="sm:w-[20px] sm:h-[20px]" />
                <span className="hidden md:inline text-xs font-bold">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto w-full bg-[#fcfdfe]">
          <div className="max-w-[1600px] mx-auto w-full px-2 sm:px-4 lg:px-6 py-3 sm:py-6 pb-24 lg:pb-8 space-y-4 sm:space-y-6 lg:space-y-8">
          {activeTab === 'overview' && (
            <div className="animate-fade-in space-y-6 md:space-y-8">
              {role === UserRole.Researcher && (
                <ResearcherDashboard 
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
              )}
              {role === UserRole.Student && <StudentDashboard user={localUser} />}
              {(role === UserRole.Investor || role === UserRole.IndustryPartner) && (
                <InvestorDashboard 
                  user={localUser} 
                  setActiveTab={setActiveTab} 
                />
              )}
              {role === UserRole.Admin && (
                <AdminDashboard 
                  user={localUser} 
                  onRefresh={refreshProfile} 
                  activeSubTab={adminSubTab}
                  setActiveSubTab={setAdminSubTab}
                />
              )}
            </div>
          )}

          {activeTab === 'matches' && (
             <MatchesView 
               user={localUser} 
               setActiveTab={setActiveTab} 
               setLocalInitialThreadId={setLocalInitialThreadId} 
               onProfileUpdate={refreshProfile}
               autoOpenCreateChallenge={autoOpenCreateChallenge}
               onCloseCreateChallenge={() => setAutoOpenCreateChallenge(false)}
             />
          )}

          {activeTab === 'messages' && (
            <MessagesSection 
              user={localUser} 
              initialThreadId={localInitialThreadId || initialThreadId} 
              onResetInitialThread={() => setLocalInitialThreadId(null)} 
            />
          )}
          {activeTab === 'profile' && (
            <div className="space-y-6 md:space-y-10 animate-fade-in">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between border-b border-gray-100 pb-6 md:pb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-ug-navy tracking-tight ">Researcher Portfolio</h2>
                  <p className="text-[11px] sm:text-[11px] font-semibold text-gray-400 tracking-[0.2em] sm:tracking-[0.4em] mt-1">Verified Hub Identity Management</p>
                </div>
                {!isRerunningOnboarding && (
                  <div className="flex w-full sm:w-auto bg-gray-100 p-1 rounded-xl sm:rounded-2xl shadow-inner">
                    <button 
                      onClick={() => setProfileMode('identity')}
                      className={`flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-2xl text-[11px] sm:text-[11px] font-semibold tracking-wide transition-all ${profileMode === 'identity' ? 'bg-ug-navy text-white shadow-xl' : 'text-gray-400 hover:text-ug-navy'}`}
                    >
                      Identity & Narrative
                    </button>
                    <button 
                      onClick={() => setProfileMode('insights')}
                      className={`flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-2xl text-[11px] sm:text-[11px] font-semibold tracking-wide transition-all ${profileMode === 'insights' ? 'bg-ug-navy text-white shadow-xl' : 'text-gray-400 hover:text-ug-navy'}`}
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
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 shadow-sm">
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
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                      <div className="lg:col-span-8 flex flex-col gap-10">
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
        </div>
      </main>

      {role !== UserRole.Admin && (
        <MobileNav role={role} activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={internalUnread} />
      )}
    </div>

    {isProjectModalOpen && (
      <ProjectFormModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        onSave={() => setRefreshTrigger(prev => prev + 1)} 
        project={selectedProject} 
      />
    )}
  </div>
);
};

// --- SUB-DASHBOARDS ---

const ResearcherDashboard = ({ 
  user, 
  onUpdate, 
  onOpenModal, 
  refreshTrigger,
  setActiveTab,
  setLocalInitialThreadId
}: { 
  user: User | null; 
  onUpdate: () => void; 
  onOpenModal: (p: Project | null) => void; 
  refreshTrigger: number;
  setActiveTab?: (tab: 'overview' | 'matches' | 'messages' | 'profile') => void;
  setLocalInitialThreadId?: (id: string | null) => void;
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [eois, setEois] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadingRevisedId, setUploadingRevisedId] = useState<string | null>(null);
  const [expandedEoiId, setExpandedEoiId] = useState<string | null>(null);
  const [showAllEois, setShowAllEois] = useState<boolean>(false);
  const [eoiFilter, setEoiFilter] = useState<'all' | 'pending' | 'disclosures' | 'applications'>('all');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleUploadRequestedDoc = async (file: File, project: Project) => {
    if (!user) return;
    setUploadingDocId(project.id);
    try {
      const url = await StorageService.uploadFile(file, 'projects');
      const docObj = {
        id: crypto.randomUUID?.() || Math.random().toString(36).substring(7),
        name: file.name,
        requested_at: new Date().toISOString(),
        status: 'uploaded' as const,
        url: url,
        uploaded_at: new Date().toISOString(),
        by: user.name
      };
      
      const currentRequested = Array.isArray(project.requested_documents) ? project.requested_documents : [];
      let updatedRequested = [...currentRequested];
      
      updatedRequested.push(docObj);
      
      const currentTimeline = Array.isArray(project.disclosure_timeline) ? project.disclosure_timeline : [];
      const timelineEvent = {
        event: 'Documents Uploaded',
        details: `PI uploaded document: ${file.name}`,
        timestamp: new Date().toISOString(),
        user_name: user.name
      };
      
      const updatedProject = {
        ...project,
        requested_documents: updatedRequested,
        disclosure_timeline: [...currentTimeline, timelineEvent],
        disclosure_status: DisclosureStatus.UnderReReview
      };
      
      await StorageService.saveProject(updatedProject);
      showToast(`Document "${file.name}" uploaded successfully! Status updated to Under Re-Review.`, "success");
      await loadData();
      onUpdate();
    } catch (err: any) {
      showToast(err.message || "Failed to upload document", "error");
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleUploadRequestedDocSlot = async (file: File, project: Project, slotId: string) => {
    if (!user) return;
    setUploadingDocId(slotId);
    try {
      const url = await StorageService.uploadFile(file, 'projects');
      
      const currentRequested = Array.isArray(project.requested_documents) ? project.requested_documents : [];
      let slotName = '';
      const updatedRequested = currentRequested.map(doc => {
        if (doc.id === slotId) {
          slotName = doc.name;
          return {
            ...doc,
            status: 'uploaded' as const,
            url: url,
            uploaded_at: new Date().toISOString(),
            by: user.name,
            name: `${doc.name} (${file.name})`
          };
        }
        return doc;
      });
      
      const currentTimeline = Array.isArray(project.disclosure_timeline) ? project.disclosure_timeline : [];
      const timelineEvent = {
        event: 'Documents Uploaded',
        details: `PI uploaded file for slot "${slotName}": ${file.name}`,
        timestamp: new Date().toISOString(),
        user_name: user.name
      };
      
      const allSlotsUploaded = updatedRequested.every(doc => doc.status === 'uploaded' || doc.url);
      const newStatus = allSlotsUploaded ? DisclosureStatus.UnderReReview : DisclosureStatus.DocumentsRequested;
      
      const updatedProject = {
        ...project,
        requested_documents: updatedRequested,
        disclosure_timeline: [...currentTimeline, timelineEvent],
        disclosure_status: newStatus
      };
      
      await StorageService.saveProject(updatedProject);
      showToast(`Document "${file.name}" uploaded successfully for "${slotName}"!`, "success");
      await loadData();
      onUpdate();
    } catch (err: any) {
      showToast(err.message || "Failed to upload document", "error");
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleUploadRevisedBrief = async (file: File, project: Project) => {
    if (!user) return;
    setUploadingRevisedId(project.id);
    try {
      const url = await StorageService.uploadFile(file, 'projects');
      
      const currentTimeline = Array.isArray(project.disclosure_timeline) ? project.disclosure_timeline : [];
      const timelineEvent = {
        event: 'Revised Brief Submitted',
        details: `PI uploaded revised technical brief: ${file.name}`,
        timestamp: new Date().toISOString(),
        user_name: user.name
      };
      
      const updatedProject = {
        ...project,
        technical_details_url: url,
        disclosure_timeline: [...currentTimeline, timelineEvent],
        disclosure_status: DisclosureStatus.UnderReReview
      };
      
      await StorageService.saveProject(updatedProject);
      showToast(`Revised brief "${file.name}" uploaded successfully! Status updated to Under Re-Review.`, "success");
      await loadData();
      onUpdate();
    } catch (err: any) {
      showToast(err.message || "Failed to upload revised brief", "error");
    } finally {
      setUploadingRevisedId(null);
    }
  };

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const pList = await StorageService.getMyProjects(user.id);
      setProjects(pList);
      const eoiList = await StorageService.getEOIsForPI(user.id);
      setEois(eoiList);
    } catch (err: any) {
      showToast(err.message || "Could not load your dashboard data. Please refresh.", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [user?.id, refreshTrigger]);

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
      
      // Update local eois state
      setEois(prev => prev.map(item => item.id === msg.id ? { ...item, status: releaseToken } : item));
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
      
      setEois(prev => prev.map(item => item.id === msg.id ? { ...item, status: 'declined' } : item));
    } catch (e: any) {
      showToast(e.message || "Failed to decline clearance", "error");
    }
  };

  const activeProject = projects[0]; // For visual demonstration of hero card

  const totalViews = projects.reduce((acc, p) => acc + (p.views || 0), 0);
  const totalInteractions = projects.reduce((acc, p) => acc + (p.expressions_of_interest || 0) + (p.requests || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-6">
      <div className="md:col-span-2 lg:col-span-8 lg:col-start-1 space-y-6">
        <UnifiedDashboardProfile user={user} onAction={() => {
           onOpenModal(null);
        }} actionLabel="New Project Disclosure" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Live Disclosures" value={projects.length} icon={FileText} />
          <StatCard label="Total Hub Views" value={totalViews >= 1000 ? `${(totalViews/1000).toFixed(1)}k` : totalViews} icon={Eye} />
          <StatCard label="Interactions" value={totalInteractions} icon={Handshake} />
        </div>

        {activeProject && (
          <ActiveProjectHero project={activeProject} />
        )}

        <section className="bg-white p-3.5 sm:p-6 md:p-8 rounded-2xl md:rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SectionTitle title="My Disclosures" subtitle="Secure Research Record Management" />
          </div>
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="py-10 md:py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400 font-bold text-[11px] md:text-[11px] tracking-wide px-4">No assets disclosed yet.</p>
              </div>
            ) : projects.map(p => {
              const isExpanded = expandedProjectId === p.id;
              const msgCount = eois.filter(e => e.project_id === p.id).length;
              const currentStageIdx = (() => {
                const s = p.disclosure_status || 'Submitted';
                if (s === 'Draft') return -1;
                if (s === 'Submitted') return 0;
                if (s === 'Pending Review') return 1;
                if (s === 'Documents Requested' || s === 'Edits Requested') return 2;
                if (s === 'Under Re-Review') return 3;
                if (s === 'Approved') return 4;
                if (s === 'Published') return 5;
                return 0;
              })();
              
              const timeline = Array.isArray(p.disclosure_timeline) ? p.disclosure_timeline : [];
              const lastAction = timeline.length > 0 ? timeline[timeline.length - 1] : null;
              const reqDocsCount = Array.isArray(p.requested_documents) ? p.requested_documents.length : 0;

              return (
                <div key={p.id} className="border border-gray-100 rounded-2xl bg-gray-50/20 hover:shadow-md transition duration-300 overflow-hidden">
                  {/* Summary row */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between p-5 md:p-6 gap-4">
                    <div className="flex items-start gap-4 cursor-pointer flex-1 min-w-0" onClick={() => navigate(`/projects/${p.id}`)}>
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden shadow-sm bg-gray-100 shrink-0">
                        <img src={p.image_url && p.image_url.trim() !== '' ? p.image_url.split('|')[0] : 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80'} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-[11px] md:text-xs font-bold text-ug-teal tracking-wider">{p.research_area}</span>
                          <span className="text-[11px] text-gray-400">•</span>
                          <span className="text-[11px] text-gray-400 font-bold tracking-wider">Submitted: {new Date(p.created_at || '').toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold text-ug-navy text-sm md:text-base group-hover:text-ug-teal transition truncate">{p.title}</h4>
                        
                        {/* Highlights & Metadata list */}
                        <div className="flex flex-wrap items-center gap-4 mt-2.5 text-[11px] md:text-[11px] font-bold tracking-wider text-gray-400">
                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${
                             p.disclosure_status === 'Published' ? 'bg-green-50 text-green-600' :
                             p.disclosure_status === 'Approved' ? 'bg-blue-50 text-blue-600' :
                             p.disclosure_status === 'Documents Requested' || p.disclosure_status === 'Edits Requested' ? 'bg-red-50 text-red-500' :
                             p.disclosure_status === 'Under Re-Review' ? 'bg-yellow-50 text-yellow-600' :
                             'bg-gray-100 text-gray-500'
                          }`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse"></span>
                            Disclosure: {p.disclosure_status || 'Submitted'}
                          </div>
                          
                          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${
                             p.status === ProjectStatus.Concept ? 'bg-gray-50 text-gray-600 border-gray-100' :
                             p.status === ProjectStatus.ProofOfConcept ? 'bg-blue-50 text-blue-700 border-blue-100' :
                             p.status === ProjectStatus.Prototype ? 'bg-purple-50 text-purple-700 border-purple-100' :
                             p.status === ProjectStatus.Validation ? 'bg-orange-50 text-orange-700 border-orange-100' :
                             p.status === ProjectStatus.Commercialization ? 'bg-teal-50 text-teal-700 border-teal-100' :
                             p.status === ProjectStatus.MarketReady ? 'bg-green-50 text-green-700 border-green-100' :
                             'bg-gray-50 text-gray-600 border-gray-100'
                          }`}>
                            Stage: {p.status}
                          </div>
                          
                          {lastAction && (
                            <div className="text-gray-400 max-w-xs truncate" title={lastAction.details}>
                              Last Action: <span className="text-ug-navy">{lastAction.details}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-end shrink-0">
                      {/* Badge stats */}
                      <div className="flex items-center gap-2">
                        {msgCount > 0 && (
                          <div className="flex items-center gap-1 bg-blue-50 text-blue-500 text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wider" title="Conversation thread activity">
                            <MessageSquare size={10} />
                            {msgCount} MSG
                          </div>
                        )}
                        {reqDocsCount > 0 && (
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wider" title="Requested support documents">
                            <File size={10} />
                            {reqDocsCount} DOCS
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <button 
                        onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                        className={`p-2 rounded-xl transition ${isExpanded ? 'bg-ug-teal/15 text-ug-teal' : 'bg-gray-50 text-gray-400 hover:text-ug-navy'}`}
                        title="View workflow status tracker"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      <button 
                       onClick={() => onOpenModal(p)}
                       className="p-2 text-gray-400 hover:text-ug-teal hover:bg-gray-50 rounded-xl transition"
                       title="Edit project details"
                      >
                        <Pencil size={14} />
                      </button>

                      <button 
                       onClick={async () => {
                         if (!window.confirm("Are you sure you want to permanently withdraw this research project from the platform? This cannot be undone.")) return;
                         try {
                           await StorageService.deleteProject(p.id);
                           showToast("Project successfully withdrawn.", "success");
                           loadData();
                           onUpdate();
                         } catch (err: any) {
                           showToast(err.message || "Failed to withdraw project", "error");
                         }
                       }}
                       className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-xl transition"
                       title="Withdraw Project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Tracker & Actions Panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-white p-6 md:p-8 space-y-8 animate-fadeIn">
                      <div>
                        <h5 className="text-[11px] font-semibold text-ug-navy tracking-wide mb-4 flex items-center gap-2">
                          <Clock size={12} className="text-ug-teal" />
                          DISCLOSURE WORKFLOW PROGRESS TRACKER
                        </h5>
                        
                        {/* Stepper tracker */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-2 relative pt-2">
                          {[
                            { label: 'Submitted', desc: 'Awaiting admin intake screening' },
                            { label: 'Pending Review', desc: 'Panel evaluation in progress' },
                            { label: 'Documents Requested', desc: 'Researcher feedback/docs required' },
                            { label: 'Under Re-Review', desc: 'Revised assets under re-evaluation' },
                            { label: 'Approved', desc: 'Governance clearance completed' },
                            { label: 'Published', desc: 'Disclosed to public Hub marketplace' },
                          ].map((stage, idx) => {
                            const isCompleted = idx < currentStageIdx;
                            const isActive = idx === currentStageIdx;
                            return (
                              <div key={idx} className="flex flex-col items-start gap-2 relative">
                                <div className="flex items-center gap-2 w-full">
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                    isActive ? 'bg-ug-teal text-white ring-4 ring-ug-teal/15' :
                                    isCompleted ? 'bg-ug-teal/10 text-ug-teal border border-ug-teal/30' :
                                    'bg-gray-100 text-gray-400'
                                  }`}>
                                    {isCompleted ? <Check size={10} /> : idx + 1}
                                  </div>
                                  {idx < 5 && (
                                    <div className={`hidden md:block flex-1 h-0.5 ${isCompleted ? 'bg-ug-teal/50' : 'bg-gray-100'}`}></div>
                                  )}
                                </div>
                                <div>
                                  <p className={`text-[11px] font-semibold tracking-wider ${isActive ? 'text-ug-teal' : isCompleted ? 'text-ug-navy' : 'text-gray-400'}`}>
                                    {stage.label}
                                  </p>
                                  <p className="text-[11px] text-gray-400 leading-normal mt-0.5">{stage.desc}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Document Request Actions Upload Zone */}
                      <div className="bg-gray-50/50 rounded-2xl p-5 md:p-6 border border-gray-100 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <h6 className="text-[11px] font-extrabold text-ug-navy tracking-wide flex items-center gap-2">
                              <FileUp size={14} className="text-amber-500" />
                              ADMINISTRATIVE COOPERATIVE FILE INTERACTION
                            </h6>
                            <p className="text-[11px] md:text-xs font-semibold text-gray-500 mt-1 max-w-xl">
                              Support documents, proof of certifications, or technical specifications requested during administrative reviews can be directly uploaded here.
                            </p>
                          </div>
                          
                          {/* Message partner link */}
                          <button
                            onClick={() => {
                              if (setLocalInitialThreadId && setActiveTab) {
                                setLocalInitialThreadId(p.id);
                                setActiveTab('messages');
                              } else {
                                navigate('/dashboard?tab=messages');
                              }
                            }}
                            className="text-[11px] font-extrabold text-ug-teal tracking-wider hover:underline shrink-0 text-left"
                          >
                            Open Message Thread →
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {/* Option 1: File Request Upload */}
                          <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col justify-between hover:border-ug-teal/30 transition shadow-sm">
                            <div>
                              <p className="text-[11px] font-semibold text-ug-navy tracking-wider mb-1">Upload Requested Document</p>
                              <p className="text-[11px] text-gray-400 mb-3">Supporting tables, letters, approvals, certificates, etc.</p>
                            </div>
                            <label className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-ug-navy/5 text-ug-navy rounded-xl cursor-pointer hover:bg-ug-navy/10 active:scale-95 transition text-[11px] font-semibold tracking-wider">
                              <Upload size={12} />
                              {uploadingDocId === p.id ? 'Uploading Security Document...' : 'Select & Upload Document'}
                              <input 
                                type="file" 
                                className="hidden" 
                                disabled={uploadingDocId === p.id}
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadRequestedDoc(file, p);
                                }} 
                              />
                            </label>
                          </div>

                          {/* Option 2: Upload Revised technical detail brief */}
                          <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col justify-between hover:border-ug-teal/30 transition shadow-sm">
                            <div>
                              <p className="text-[11px] font-semibold text-ug-navy tracking-wider mb-1">Submit Updated Technical Brief</p>
                              <p className="text-[11px] text-gray-400 mb-3">Replaces the active PDF draft brief with a revised version.</p>
                            </div>
                            <label className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-ug-teal/5 text-ug-teal rounded-xl cursor-pointer hover:bg-ug-teal/10 active:scale-95 transition text-[11px] font-semibold tracking-wider">
                              <FileUp size={12} />
                              {uploadingRevisedId === p.id ? 'Replacing Active Brief...' : 'Upload Revised Brief'}
                              <input 
                                type="file" 
                                className="hidden" 
                                disabled={uploadingRevisedId === p.id}
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadRevisedBrief(file, p);
                                }} 
                              />
                            </label>
                          </div>
                        </div>

                        {/* Interactive Document Slots Checklist */}
                        {reqDocsCount > 0 && (
                          <div className="space-y-4">
                            {/* Pending Requests */}
                            {p.requested_documents?.some((doc: any) => !doc.url || doc.status === 'requested') && (
                              <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100/50 text-left">
                                <p className="text-[11px] font-semibold text-amber-800 tracking-wider mb-3">REQUIRED DOCUMENT SLOTS (AWAITING UPLOAD)</p>
                                <div className="space-y-2">
                                  {p.requested_documents?.filter((doc: any) => !doc.url || doc.status === 'requested').map((doc: any, dIdx: number) => (
                                    <div key={doc.id || dIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-amber-100 rounded-xl">
                                      <div className="flex items-start gap-2.5 min-w-0 text-left">
                                        <div className="h-5 w-5 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                                          <span className="text-[11px] font-bold text-amber-600">!</span>
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-[11px] font-semibold text-gray-800 leading-normal">{doc.name}</p>
                                          <p className="text-[11px] text-gray-400 mt-0.5">Requested {new Date(doc.requested_at).toLocaleDateString()}</p>
                                        </div>
                                      </div>
                                      
                                      <label className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg cursor-pointer transition text-[11px] font-semibold tracking-wider shrink-0">
                                        <Upload size={10} />
                                        {uploadingDocId === doc.id ? 'Uploading...' : 'Upload File'}
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          disabled={uploadingDocId === doc.id}
                                          onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadRequestedDocSlot(file, p, doc.id);
                                          }} 
                                        />
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Completed Uploads */}
                            {p.requested_documents?.some((doc: any) => doc.url) && (
                              <div className="bg-white p-4 rounded-xl border border-gray-100 text-left">
                                <p className="text-[11px] font-semibold text-ug-navy tracking-wider mb-3">ACTIVE SUBMITTED SUPPORT DOCUMENTS</p>
                                <div className="space-y-2">
                                  {p.requested_documents?.filter((doc: any) => doc.url).map((doc: any, dIdx: number) => (
                                    <div key={doc.id || dIdx} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg text-[11px] font-bold text-gray-600 border border-gray-100 text-left">
                                      <div className="flex items-center gap-2 truncate">
                                        <div className="h-4 w-4 rounded-full bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                                          <span className="text-[11px] font-bold text-green-600">✓</span>
                                        </div>
                                        <span className="truncate font-bold">{doc.name}</span>
                                        <span className="text-[10px] text-gray-400 font-medium">Uploaded by {doc.by || 'PI'}</span>
                                      </div>
                                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-ug-teal hover:underline flex items-center gap-1 shrink-0 ml-1">
                                        <Download size={10} />
                                        DOWNLOAD
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Audit Log / Timeline section */}
                      <div className="bg-gray-50/30 p-5 rounded-2xl border border-gray-100">
                        <h6 className="text-[11px] font-extrabold text-ug-navy tracking-wide mb-3 flex items-center gap-2">
                          <Activity size={12} className="text-gray-400" />
                          PERMANENT DISCLOSURE GOVERNANCE LEDGER & AUDIT TRAIL
                        </h6>
                        {timeline.length === 0 ? (
                          <p className="text-[11px] font-medium text-gray-400 leading-normal">No entries recorded in this disclosure ledgers yet. System lifecycle transitions are registered here dynamically.</p>
                        ) : (
                          <div className="space-y-3.5 border-l-2 border-gray-100 pl-4 ml-2.5 mt-2.5">
                            {timeline.map((event: any, evIdx: number) => (
                              <div key={evIdx} className="relative">
                                <div className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-ug-teal/30 border border-white"></div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-semibold text-ug-teal px-1.5 py-0.5 bg-ug-teal/5 rounded tracking-wider">{event.event || event.status}</span>
                                  <span className="text-[11px] text-gray-400">{new Date(event.timestamp).toLocaleString()}</span>
                                  <span className="text-[11px] text-gray-400">by {event.user_name || event.by || 'Board Administrator'}</span>
                                </div>
                                <p className="text-[11px] font-medium text-gray-600 mt-1">{event.details}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* INBOUND PORTAL - INTERACTION HUB */}
        <section className="bg-white p-3.5 sm:p-6 md:p-8 rounded-2xl md:rounded-2xl border border-gray-100 shadow-sm mt-6 sm:mt-8">
          {/* Header & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
            <div>
              <SectionTitle title="Interaction Hub" subtitle="Student Applications & Technical Disclosures" />
            </div>

            {/* Filter Segmented Control */}
            {eois.length > 0 && (
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto shrink-0">
                <button
                  onClick={() => setEoiFilter('all')}
                  className={`shrink-0 w-full sm:w-auto px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-between sm:justify-start gap-1.5 ${
                    eoiFilter === 'all'
                      ? 'bg-ug-navy text-white shadow-sm ring-1 ring-ug-navy'
                      : 'bg-gray-50 text-gray-600 hover:text-ug-navy hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  <span>All</span>
                  <span className={`px-1.5 py-0.5 text-[11px] rounded-md font-semibold ${eoiFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200/70 text-gray-700'}`}>
                    {eois.length}
                  </span>
                </button>
                <button
                  onClick={() => setEoiFilter('pending')}
                  className={`shrink-0 w-full sm:w-auto px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-between sm:justify-start gap-1.5 ${
                    eoiFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-500'
                      : 'bg-gray-50 text-gray-600 hover:text-amber-700 hover:bg-amber-50/60 border border-gray-100'
                  }`}
                >
                  <span>Pending</span>
                  <span className={`px-1.5 py-0.5 text-[11px] rounded-md font-semibold ${eoiFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                    {eois.filter(e => !e.status || e.status === 'pending').length}
                  </span>
                </button>
                <button
                  onClick={() => setEoiFilter('disclosures')}
                  className={`shrink-0 w-full sm:w-auto px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-between sm:justify-start gap-1.5 ${
                    eoiFilter === 'disclosures'
                      ? 'bg-pink-600 text-white shadow-sm ring-1 ring-pink-600'
                      : 'bg-gray-50 text-gray-600 hover:text-pink-700 hover:bg-pink-50/60 border border-gray-100'
                  }`}
                >
                  <span>Disclosures</span>
                  <span className={`px-1.5 py-0.5 text-[11px] rounded-md font-semibold ${eoiFilter === 'disclosures' ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-800'}`}>
                    {eois.filter(e => isRevealRequestMessage(e.message)).length}
                  </span>
                </button>
                <button
                  onClick={() => setEoiFilter('applications')}
                  className={`shrink-0 w-full sm:w-auto px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-between sm:justify-start gap-1.5 ${
                    eoiFilter === 'applications'
                      ? 'bg-ug-teal text-white shadow-sm ring-1 ring-ug-teal'
                      : 'bg-gray-50 text-gray-600 hover:text-ug-teal hover:bg-teal-50/60 border border-gray-100'
                  }`}
                >
                  <span>Applications</span>
                  <span className={`px-1.5 py-0.5 text-[11px] rounded-md font-semibold ${eoiFilter === 'applications' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'}`}>
                    {eois.filter(e => e.message?.includes('[ASSISTANTSHIP_APPLICATION]') || e.message?.includes('[SCHOLARSHIP_APPLICATION]') || e.message?.includes('[LAB_WORKSPACE_ACCESS]')).length}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3 mt-4">
            {(() => {
              // Sort eois most recent first
              const sortedEois = [...eois].sort((a, b) => {
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return timeB - timeA;
              });

              const filteredEois = sortedEois.filter(eoi => {
                if (eoiFilter === 'pending') {
                  return !eoi.status || eoi.status === 'pending';
                }
                if (eoiFilter === 'disclosures') {
                  return isRevealRequestMessage(eoi.message);
                }
                if (eoiFilter === 'applications') {
                  return eoi.message?.includes('[ASSISTANTSHIP_APPLICATION]') || eoi.message?.includes('[SCHOLARSHIP_APPLICATION]') || eoi.message?.includes('[LAB_WORKSPACE_ACCESS]');
                }
                return true;
              });

              const displayedEois = showAllEois ? filteredEois : filteredEois.slice(0, 5);

              if (filteredEois.length === 0) {
                return (
                  <div className="py-12 text-center bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                    <Inbox className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-gray-500 font-bold text-xs">
                      {eois.length === 0 ? "No requests received yet." : "No interactions match the selected filter."}
                    </p>
                  </div>
                );
              }

              return (
                <>
                  <div className="space-y-3">
                    {displayedEois.map(eoi => {
                      const isReveal = isRevealRequestMessage(eoi.message);
                      const isAssistantship = eoi.message?.includes('[ASSISTANTSHIP_APPLICATION]');
                      const isScholarship = eoi.message?.includes('[SCHOLARSHIP_APPLICATION]');
                      const isLabAccess = eoi.message?.includes('[LAB_WORKSPACE_ACCESS]');
                      const isCollabProposal = eoi.message?.includes('[COLLABORATION_PROPOSAL]');
                      const isIndustryProposal = eoi.message?.includes('[INDUSTRY_CHALLENGE_PROPOSAL]');
                      const isExpressionOfInterest = eoi.message?.includes('[EXPRESSION_OF_INTEREST]');
                      
                      const matchScoreMatch = eoi.message?.match(/\[MATCH_SCORE:\s*(\d+%)\]/);
                      const matchScoreVal = matchScoreMatch ? matchScoreMatch[1] : null;

                      const portfolioPathMatch = eoi.message?.match(/\[RESEARCHER_PORTFOLIO:\s*([^\]]+)\]/);
                      const portfolioPathVal = portfolioPathMatch && portfolioPathMatch[1]?.trim() ? portfolioPathMatch[1].trim() : (eoi.sender_id ? `/researcher/${eoi.sender_id}` : null);

                      let typeLabel = "Inquiry";
                      let badgeColor = "bg-gray-100 text-gray-700 border-gray-200";
                      let IconComponent = FileText;
                      let cleanMessage = eoi.message || '';

                      if (isIndustryProposal) {
                        typeLabel = "Industry Challenge Proposal";
                        badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200/80";
                        IconComponent = Briefcase;
                        cleanMessage = cleanMessage
                          .replace(/\[INDUSTRY_CHALLENGE_PROPOSAL\]/g, '')
                          .replace(/\[MATCH_SCORE:[^\]]+\]/g, '')
                          .replace(/\[RESEARCHER_PORTFOLIO:[^\]]+\]/g, '')
                          .trim();
                      } else if (isReveal) {
                        typeLabel = "Disclosure Request";
                        badgeColor = "bg-pink-50 text-pink-700 border-pink-200/80";
                        IconComponent = Lock;
                        if (isRevealRequestMessage(eoi.message) && eoi.message?.includes(']')) {
                          cleanMessage = eoi.message.substring(eoi.message.indexOf(']') + 1).trim();
                        }
                      } else if (isAssistantship) {
                        typeLabel = "Graduate Assistantship";
                        badgeColor = "bg-blue-50 text-blue-700 border-blue-200/80";
                        IconComponent = GraduationCap;
                        if (eoi.message?.includes(']')) cleanMessage = eoi.message.substring(eoi.message.indexOf(']') + 1).trim();
                      } else if (isScholarship) {
                        typeLabel = "Scholarship Fellow";
                        badgeColor = "bg-amber-50 text-amber-800 border-amber-200/80";
                        IconComponent = Award;
                        if (eoi.message?.includes(']')) cleanMessage = eoi.message.substring(eoi.message.indexOf(']') + 1).trim();
                      } else if (isLabAccess) {
                        typeLabel = "Lab Authorization";
                        badgeColor = "bg-purple-50 text-purple-700 border-purple-200/80";
                        IconComponent = Briefcase;
                        if (eoi.message?.includes(']')) cleanMessage = eoi.message.substring(eoi.message.indexOf(']') + 1).trim();
                      } else if (isCollabProposal) {
                        typeLabel = "Research Proposal";
                        badgeColor = "bg-teal-50 text-teal-800 border-teal-200/80";
                        IconComponent = Handshake;
                        if (eoi.message?.includes(']')) cleanMessage = eoi.message.substring(eoi.message.indexOf(']') + 1).trim();
                      } else if (isExpressionOfInterest) {
                        typeLabel = "Research Interest";
                        badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200/80";
                        IconComponent = FileText;
                        if (eoi.message?.includes(']')) cleanMessage = eoi.message.substring(eoi.message.indexOf(']') + 1).trim();
                      }

                      const isExpanded = expandedEoiId === eoi.id;
                      const previewSnippet = cleanMessage.length > 90 ? cleanMessage.slice(0, 90) + '...' : cleanMessage;

                      return (
                        <div 
                          key={eoi.id} 
                          className={`border rounded-2xl transition duration-200 overflow-hidden ${
                            isExpanded 
                              ? 'bg-white border-ug-teal shadow-md ring-1 ring-ug-teal/20' 
                              : 'bg-white border-gray-200/80 hover:border-ug-teal/40 hover:shadow-sm'
                          }`}
                        >
                          {/* Card Header (Click to expand) */}
                          <div 
                            onClick={() => setExpandedEoiId(isExpanded ? null : eoi.id)}
                            className="p-4 md:p-5 cursor-pointer flex flex-col gap-2.5 select-none"
                          >
                            {/* Top Meta Row */}
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold border ${badgeColor}`}>
                                  <IconComponent size={13} />
                                  {typeLabel}
                                </span>

                                {matchScoreVal && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-md shadow-2xs">
                                    ⚡ {matchScoreVal} Match Score
                                  </span>
                                )}

                                {eoi.created_at && (
                                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                                    <Clock size={11} />
                                    {new Date(eoi.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                              </div>

                              {/* Status Badge & Chevron */}
                              <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
                                {eoi.status && eoi.status.startsWith('released') ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                                    <Check size={12} strokeWidth={2.5} /> Approved
                                  </span>
                                ) : eoi.status === 'declined' ? (
                                  <span className="inline-flex items-center gap-1 text-red-700 text-xs font-bold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200/80">
                                    Declined
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-800 text-xs font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80">
                                    Pending Assessment
                                  </span>
                                )}

                                <div className="p-1 rounded-md text-gray-400 hover:text-ug-navy transition">
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                              </div>
                            </div>

                            {/* Main Content Line */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 pt-0.5">
                              <div className="flex items-center gap-2 text-xs text-gray-700 min-w-0 flex-wrap">
                                <span>From: <strong className="font-extrabold text-ug-navy">{eoi.user_name}</strong></span>
                                <span className="text-gray-300 font-bold">•</span>
                                <span className="text-gray-500 truncate max-w-sm" title={eoi.projects?.title || 'Direct/Hub'}>
                                  Asset: <strong className="font-semibold text-ug-teal">{eoi.projects?.title || 'Direct/Hub'}</strong>
                                </span>
                              </div>

                              {!isExpanded && previewSnippet && (
                                <p className="text-gray-500 text-xs italic truncate max-w-lg font-normal">
                                  "{previewSnippet}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Expanded Card Body */}
                          {isExpanded && (
                            <div className="px-4 pb-5 md:px-5 border-t border-gray-100 pt-4 space-y-4 bg-slate-50/40">
                              {/* Metadata Strip */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
                                <div>
                                  <p className="text-gray-400 font-bold text-[11px] tracking-wider mb-0.5">Applicant / Sender</p>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-ug-navy text-xs">{eoi.user_name}</span>
                                    {portfolioPathVal && (
                                      <Link 
                                        to={portfolioPathVal}
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 text-ug-teal hover:underline font-extrabold text-[11px] bg-ug-teal/10 px-2.5 py-1 rounded-md border border-ug-teal/30"
                                      >
                                        <UserIcon size={11} /> View Researcher Portfolio
                                      </Link>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-gray-400 font-bold text-[11px] tracking-wider mb-0.5">Associated Research Asset / Challenge</p>
                                  <p className="font-bold text-ug-navy text-xs truncate">{eoi.projects?.title || 'Industry Challenge Match'}</p>
                                </div>

                                {eoi.created_at && (
                                  <div>
                                    <p className="text-gray-400 font-bold text-[11px] tracking-wider mb-0.5">Received Date</p>
                                    <p className="font-medium text-gray-700 text-xs">{new Date(eoi.created_at).toLocaleString()}</p>
                                  </div>
                                )}
                              </div>

                              {/* Message Callout Box */}
                              <div>
                                <p className="text-gray-400 font-bold text-[11px] tracking-wider mb-1.5">Submitted Application Message</p>
                                <p className="text-gray-800 text-xs md:text-sm font-medium leading-relaxed italic bg-white border-l-4 border-ug-teal p-4 rounded-r-xl border-y border-r border-gray-200/80 whitespace-pre-wrap shadow-2xs">
                                  "{cleanMessage}"
                                </p>
                              </div>

                              {/* Actions Bar */}
                              <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                                <div>
                                  {(!eoi.status || eoi.status === 'pending') && (
                                    <div className="flex gap-2.5 flex-wrap">
                                      {isReveal ? (
                                        <>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleAcceptReveal(eoi); }}
                                            className="bg-ug-teal text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                                          >
                                            <Award size={14} /> Approve Secure Disclosure
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDeclineReveal(eoi); }}
                                            className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                                          >
                                            Decline Request
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              await StorageService.updateEOIStatus(eoi.id, 'released');
                                              setEois(prev => prev.map(item => item.id === eoi.id ? { ...item, status: 'released' } : item));
                                              showToast("Application accredited and approved successfully!", "success");
                                            } catch (err: any) {
                                              showToast(err.message || "Failed to issue approval", "error");
                                            }
                                          }}
                                          className="bg-ug-navy text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-ug-teal transition flex items-center gap-1.5 shadow-sm active:scale-95"
                                        >
                                          <Award size={14} /> Accredit Application
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={(e) => { e.stopPropagation(); setExpandedEoiId(null); }}
                                  className="text-xs text-gray-500 hover:text-ug-navy font-bold flex items-center gap-1 py-1.5 px-3 rounded-lg hover:bg-gray-200/50 transition ml-auto"
                                >
                                  Close Details <ChevronUp size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Show More / Capped View Controls */}
                  {filteredEois.length > 5 && (
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 font-semibold">
                        Showing <span className="font-bold text-ug-navy">{displayedEois.length}</span> of <span className="font-bold text-ug-navy">{filteredEois.length}</span> recent interactions
                      </p>
                      <button
                        onClick={() => setShowAllEois(!showAllEois)}
                        className="w-full sm:w-auto px-5 py-2 rounded-xl bg-ug-navy text-white text-xs font-bold hover:bg-ug-teal transition duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-95"
                      >
                        {showAllEois ? (
                          <>
                            Show Top 5 Only <ChevronUp size={15} />
                          </>
                        ) : (
                          <>
                            View All ({filteredEois.length}) Interactions <ChevronDown size={15} />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </section>
      </div>

      <div className="md:col-span-2 lg:col-span-4 space-y-6 border-t lg:border-t-0 pt-6 lg:pt-0">
        {user?.id && <BookmarkedProjectsList userId={user.id} />}
        <HubStreamSidebar />
      </div>
    </div>
  );
};

const UnifiedDashboardProfile = ({ user, onAction, actionLabel }: { user: User | null, onAction: () => void, actionLabel: string }) => (
  <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-4 sm:gap-6 relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-ug-teal/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition duration-1000"></div>
    
    <div className="relative shrink-0">
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 border-white shadow-md overflow-hidden bg-ug-navy">
        {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" /> : <UserIcon className="w-full h-full p-4 text-white/20" />}
      </div>
      <div className="absolute -bottom-1 -right-1 bg-ug-teal p-1 rounded-full border border-white text-white shadow-lg">
        <ShieldCheck size={12} className="md:w-3.5 md:h-3.5" />
      </div>
    </div>

    <div className="flex-1 text-center md:text-left min-w-0">
      <h2 className="text-xl md:text-2xl font-bold text-ug-navy tracking-tight mb-1 truncate">{user?.name}</h2>
      <p className="text-[11px] md:text-xs font-semibold text-gray-400 tracking-wider mb-2 truncate">{user?.role} • {user?.department || 'University of Ghana'}</p>
      <div className="flex items-center justify-center md:justify-start gap-1.5 bg-gray-50 w-fit px-2.5 py-1 rounded-lg border border-gray-100 mx-auto md:mx-0">
        <Plus size={10} className="text-ug-teal" />
        <span className="text-[11px] font-bold text-ug-navy tracking-[0.15em]">Identity Verified</span>
      </div>
    </div>

    <button 
      onClick={onAction}
      className="w-full md:w-auto bg-ug-navy text-white px-6 py-3.5 rounded-xl font-bold text-xs  tracking-wide shadow-lg hover:bg-ug-teal transition-all flex items-center justify-center gap-2 active:scale-95"
    >
      <Plus size={14} /> {actionLabel}
    </button>
  </div>
);

const ActiveProjectHero = ({ project }: { project: Project }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden animate-fade-in group">
    <div className="relative h-40 md:h-48 overflow-hidden">
      <img src={project.image_url && project.image_url.trim() !== '' ? project.image_url.split('|')[0] : 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80'} className="w-full h-full object-cover group-hover:scale-105 transition duration-1000" alt="" />
      <div className="absolute inset-0 bg-gradient-to-t from-ug-navy via-ug-navy/50 to-transparent"></div>
      <div className="absolute top-3 left-3 md:top-4 md:left-4 flex flex-col gap-1.5 max-w-[90%]">
        <div className="bg-ug-teal text-white px-2.5 py-1 rounded-md text-[11px] md:text-[11px] font-bold tracking-wider shadow-md animate-pulse w-fit">
          ACTIVE PROJECT
        </div>
        <h3 className="text-lg md:text-2xl font-bold text-white tracking-tight drop-shadow-md line-clamp-2">{project.title}</h3>
      </div>
    </div>

    <div className="p-5 space-y-4">
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">Status</span>
          <span className="text-[11px] md:text-xs font-bold text-ug-teal tracking-wider">{project.status}</span>
        </div>
        
        <div className="relative pt-1">
          {/* Track */}
          <div className="h-1 w-full bg-gray-100 rounded-full flex justify-between px-0.5 items-center">
            {Object.values(ProjectStatus).map((s, idx) => (
              <div 
                key={s} 
                className={`h-2 w-0.5 rounded-full ${s === project.status ? 'bg-ug-teal' : 'bg-gray-300'}`}
              ></div>
            ))}
          </div>
          {/* Progress Overlay */}
          <div className="absolute top-1 left-0 h-1 bg-ug-teal rounded-full transition-all duration-700" style={{ width: `${(Object.values(ProjectStatus).indexOf(project.status)) / (Object.values(ProjectStatus).length - 1) * 100}%` }}></div>
          {/* Thumb */}
          <div className="absolute top-[2px] -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-ug-teal rounded-full shadow-md transition-all duration-700" style={{ left: `calc(${(Object.values(ProjectStatus).indexOf(project.status)) / (Object.values(ProjectStatus).length - 1) * 100}% - 7px)` }}></div>

          <div className="flex justify-between mt-2 overflow-hidden">
             {Object.values(ProjectStatus).map((s, i) => (
               <span key={s} className={`text-[11px] md:text-[11px] font-semibold ${s === project.status ? 'text-ug-teal' : 'text-gray-300'} max-w-[40px] truncate`}>{s}</span>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 font-sans">
        <div>
          <span className="text-[11px] font-bold text-gray-400 tracking-wider mb-2 block">Hub Views</span>
          <p className="text-lg font-bold text-ug-navy leading-none">{project.views ?? 0}</p>
        </div>
        <div>
           <span className="text-[11px] font-bold text-gray-400 tracking-wider mb-2 block">Interests Received</span>
           <p className="text-lg font-bold text-ug-navy leading-none">{project.expressions_of_interest ?? 0}</p>
        </div>
      </div>
    </div>
  </div>
);

const ProfileInsight = ({ profile, onRefresh }: { profile: AIProfile | null, onRefresh?: () => void }) => {
  if (!profile) return (
    <div className="bg-ug-navy/5 border border-dashed border-ug-navy/20 p-6 sm:p-8 md:p-10 rounded-2xl md:rounded-2xl text-center">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
        <Sparkles size={32} className="text-ug-teal/50" />
      </div>
      <h3 className="text-sm font-bold text-ug-navy  tracking-wide mb-2">Profile Insights Pending</h3>
      <p className="text-[11px] text-gray-500 font-medium italic max-w-xs mx-auto">Upload your academic documents or resume in the overview to unlock AI-powered semantic matching and profile insights.</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in group/insight">
      {/* Narrative Section */}
      <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl md:rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-10 transition-opacity">
          <Target size={180} />
        </div>
        
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h4 className="text-[11px] font-semibold text-ug-teal tracking-[0.2em] mb-1 flex items-center gap-2">
              <Sparkles size={12} /> Researcher Intelligence
            </h4>
            <h3 className="text-xl font-bold text-ug-navy  tracking-tight">AI Narrative Summary</h3>
          </div>
          <button 
            onClick={onRefresh}
            className="p-3 bg-gray-50 text-gray-400 hover:text-ug-teal hover:bg-ug-teal/10 rounded-2xl transition opacity-0 group-hover:opacity-100"
            title="Re-process Profile"
          >
            <Upload size={16} />
          </button>
        </div>

        <p className="text-sm md:text-base font-medium text-gray-600 leading-relaxed italic relative z-10 text-justify">
          "{profile.semantic_summary}"
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 pt-10 border-t border-gray-50 relative z-10">
           <div className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 tracking-wide block">Experience Level</span>
              <span className="text-[11px] font-semibold text-ug-navy bg-ug-navy/5 px-3 py-1 rounded-full inline-block">{profile.professional_profile?.experience_level || 'General'}</span>
           </div>
           <div className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 tracking-wide block">Collab Mode</span>
              <span className="text-[11px] font-semibold text-ug-navy bg-ug-navy/5 px-3 py-1 rounded-full inline-block">{profile.collaboration_profile?.preferred_collaboration_types?.[0] || 'Flexible'}</span>
           </div>
           <div className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 tracking-wide block">Projects</span>
              <span className="text-[11px] font-semibold text-ug-navy">{profile.projects?.length || 0} Initiatives</span>
           </div>
           <div className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 tracking-wide block">Education</span>
              <span className="text-[11px] font-semibold text-ug-navy">{profile.education?.length || 0} Credentials</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Skills Stack */}
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl md:rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-ug-navy text-white rounded-xl flex items-center justify-center shadow-lg"><FileCode size={20} /></div>
             <div>
               <h4 className="text-sm font-bold text-ug-navy  tracking-tight">Technological Stack</h4>
               <p className="text-[11px] font-bold text-gray-400 tracking-wide">Validated Skillsets</p>
             </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {((): string[] => {
              const tech = profile.skills?.technical_skills || [];
              const tools = profile.skills?.tools_and_technologies || [];
              return [...tech, ...tools];
            })().map((s, i) => (
              <span key={i} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold text-gray-600 transition hover:border-ug-teal/30 hover:bg-white hover:text-ug-teal cursor-default">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Education Stack */}
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl md:rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-ug-teal text-white rounded-xl flex items-center justify-center shadow-lg"><Award size={20} /></div>
             <div>
               <h4 className="text-sm font-bold text-ug-navy  tracking-tight">Verified Education</h4>
               <p className="text-[11px] font-bold text-gray-400 tracking-wide">Academic Credentials</p>
             </div>
          </div>
          <div className="space-y-6">
            {(profile.education || []).map((edu, i) => (
              <div key={i} className="flex gap-5 items-start group/edu">
                <div className="w-10 h-10 rounded-2xl bg-ug-navy/5 flex items-center justify-center text-ug-navy shrink-0 group-hover/edu:bg-ug-teal group-hover/edu:text-white transition duration-500">
                  <GraduationCap size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-ug-navy leading-tight mb-1  tracking-tight">{edu.degree}</p>
                  <p className="text-[11px] font-bold text-gray-400 tracking-wide">{edu.institution}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-bold text-ug-teal">{edu.field_of_study}</span>
                    <span className="text-[11px] text-gray-300">•</span>
                    <span className="text-[11px] font-bold text-gray-400">{edu.graduation_year}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Initiatives Feed */}
      {(profile.projects?.length || 0) > 0 && (
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl md:rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group/projects">
           <div className="flex items-center gap-3 mb-10">
             <div className="w-10 h-10 bg-ug-teal/10 text-ug-teal rounded-xl flex items-center justify-center"><Rocket size={20} /></div>
             <div>
               <h4 className="text-sm font-bold text-ug-navy  tracking-tight">Key Initiatives</h4>
               <p className="text-[11px] font-bold text-gray-400 tracking-wide">Project Portfolio Analysis</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {(profile.projects || []).map((p, i) => (
              <div key={i} className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-xl hover:border-ug-teal/20 transition-all text-left group/p">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[11px] font-semibold text-ug-teal tracking-wide">{p.industry}</span>
                  <div className="text-gray-200 group-hover/p:text-ug-teal transition"><LinkIcon size={14} /></div>
                </div>
                <h5 className="text-xs font-bold text-ug-navy  leading-tight mb-2">{p.project_name}</h5>
                <p className="text-[11px] text-gray-400 font-medium leading-relaxed line-clamp-2">Research focused on {p.industry.toLowerCase()} innovation and technical implementation.</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MatchesView = ({ 
  user, 
  setActiveTab, 
  setLocalInitialThreadId,
  onProfileUpdate,
  autoOpenCreateChallenge,
  onCloseCreateChallenge
}: { 
  user: User | null; 
  setActiveTab?: (tab: 'overview' | 'matches' | 'messages' | 'profile') => void; 
  setLocalInitialThreadId?: (id: string | null) => void; 
  onProfileUpdate?: () => void;
  autoOpenCreateChallenge?: boolean;
  onCloseCreateChallenge?: () => void;
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTabSub, setActiveTabSub] = useState<'challenges' | 'traditional'>('challenges');

  useEffect(() => {
    if (autoOpenCreateChallenge) {
      setActiveTabSub('challenges');
    }
  }, [autoOpenCreateChallenge]);

  const [profileMatches, setProfileMatches] = useState<any[]>([]);
  const [projectMatches, setProjectMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllProfiles, setShowAllProfiles] = useState(false);

  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalType, setProposalType] = useState<'collab' | 'interest'>('collab');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [customProjectTitle, setCustomProjectTitle] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (user?.id) {
      StorageService.getMyProjects(user.id).then(data => {
        setMyProjects(data || []);
        if (data && data.length > 0) {
          setSelectedProject(data[0]);
        }
      }).catch(err => console.warn("Failed to load own projects for proposals:", err));
    }
  }, [user?.id]);

  const generateProposalTemplate = (
    type: 'collab' | 'interest',
    recipient: any,
    sender: User | null,
    proj: any
  ) => {
    const senderName = sender?.name || 'Researcher';
    const senderDept = sender?.department || 'Biomedical & Engineering Science';
    const recipientName = recipient?.name || recipient?.owner_name || 'Ecosystem Partner';
    const projTitle = proj?.title || proj?.project_name || 'Collaborative Research Initiative';
    const researchArea = proj?.research_area || recipient?.research_area || 'Diagnostics Tools & Systems';

    if (type === 'collab') {
      return {
        subject: `Academic Collaboration Proposal: "${projTitle}"`,
        body: `Dear ${recipientName},

My name is ${senderName} from the ${senderDept} at the University of Ghana. I am reaching out to explore a potential collaboration on your active project, "${projTitle}".

Based on our AI Profile recommendations, our technical competencies in ${researchArea} strongly align with your project's roadmap.

Potential Areas of Exchange:
- Co-validation of laboratory datasets / pilot design
- Sharing specialized equipment or analytical resources
- Research assistantships or co-authorship pipelines

Let's set up a quick 10-minute sync at the department or via video call to exchange ideas.`
      };
    } else {
      return {
        subject: `Expression of Interest: "${projTitle}"`,
        body: `Dear ${recipientName},

My name is ${senderName} from the ${senderDept} at the University of Ghana. I recently reviewed your project, "${projTitle}" on the University of Ghana Virtual Industry Hub, and wanted to express our strong interest in exploring potential collaboration.

Based on our research activities, our expertise in ${researchArea} aligns highly with the goals of this project. We believe there is significant potential for tech transfer, funding support, or technical integration.

I would appreciate the chance to discuss how we might work together on this initiative.

Best regards,
${senderName}`
      };
    }
  };

  const handleExpressInterestClick = (project: any) => {
    setProposalType('interest');
    setSelectedMatch(project);
    const template = generateProposalTemplate('interest', project, user, project);
    setSubject(template.subject);
    setMessageBody(template.body);
    setIsProposalModalOpen(true);
  };

  const handleInitiateCollaborationClick = (profile: any) => {
    setProposalType('collab');
    setSelectedMatch(profile);
    const defaultProj = myProjects.length > 0 ? myProjects[0] : { title: 'Collaborative Research Initiative', research_area: profile.research_area || 'Diagnostics Tools & Systems' };
    setSelectedProject(myProjects.length > 0 ? myProjects[0] : null);
    const template = generateProposalTemplate('collab', profile, user, defaultProj);
    setSubject(template.subject);
    setMessageBody(template.body);
    setIsProposalModalOpen(true);
  };

  const handleProjectChangeInModal = (projId: string) => {
    if (projId === 'custom') {
      setSelectedProject(null);
      const customProj = { title: customProjectTitle || 'Collaborative Research Initiative', research_area: selectedMatch?.research_area || 'Diagnostics Tools & Systems' };
      const template = generateProposalTemplate(proposalType, selectedMatch, user, customProj);
      setSubject(template.subject);
      setMessageBody(template.body);
    } else {
      const proj = myProjects.find(p => p.id === projId);
      setSelectedProject(proj);
      const template = generateProposalTemplate(proposalType, selectedMatch, user, proj);
      setSubject(template.subject);
      setMessageBody(template.body);
    }
  };

  const handleCustomTitleChange = (title: string) => {
    setCustomProjectTitle(title);
    const customProj = { title: title || 'Collaborative Research Initiative', research_area: selectedMatch?.research_area || 'Diagnostics Tools & Systems' };
    const template = generateProposalTemplate(proposalType, selectedMatch, user, customProj);
    setSubject(template.subject);
    setMessageBody(template.body);
  };

  const handleSendProposal = async () => {
    if (!user) {
      showToast("Authentication Required: Please sign in to send messages.", "error");
      return;
    }
    setIsSending(true);
    try {
      const tag = proposalType === 'collab' ? '[COLLABORATION_PROPOSAL]' : '[EXPRESSION_OF_INTEREST]';
      const fullText = `${tag}\n\nSubject: ${subject}\n\n${messageBody}`;
      
      const projectId = proposalType === 'interest' 
        ? selectedMatch?.id 
        : (selectedProject?.id || null);
        
      let recipientId = proposalType === 'interest'
        ? selectedMatch?.owner_id
        : selectedMatch?.id;

      if (!recipientId && proposalType === 'interest' && selectedMatch?.id) {
        // Fallback: Fetch project owner_id directly from Supabase if missing from match vectors
        const { data: projData } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', selectedMatch.id)
          .maybeSingle();
        if (projData?.owner_id) {
          recipientId = projData.owner_id;
        }
      }

      if (!recipientId) {
        throw new Error("Recipient Error: No target identification found.");
      }

      await StorageService.submitEOI(
        projectId,
        user.name,
        fullText,
        recipientId,
        'requests'
      );

      showToast("Proposal sent successfully!", "success");
      setIsProposalModalOpen(false);
    } catch (err: any) {
      showToast(err.message || "Failed to send proposal.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const fetchMatches = async () => {
    if (!user?.id || !user?.embedding) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Safety: Ensure embedding is 768 before sending to RPC
      let currentEmbedding = user.embedding;
      if (currentEmbedding.length !== 768) {
        currentEmbedding = currentEmbedding.slice(0, 768);
        if (currentEmbedding.length < 768) {
           currentEmbedding = [...currentEmbedding, ...new Array(768 - currentEmbedding.length).fill(0)];
        }
      }
      
      const { profiles, projects } = await StorageService.getMatches(user.id, currentEmbedding);
      
      if (profiles.length === 0 && projects.length === 0) {
        setProfileMatches([]);
        setProjectMatches([]);
        setLoading(false);
        return;
      }

      // 1. INSTANT INITIAL DISPLAY (<50ms): Map vector similarity scores directly.
      // Real scores only - never fabricate a score or rationale when data is missing.
      const initialProfiles = profiles.map((p: any) => ({
        ...p,
        ai_score: (typeof p.similarity === 'number' && p.similarity > 0)
          ? Math.round(p.similarity * 100)
          : undefined,
        ai_reasoning: p.ai_reasoning || '',
        ai_label: p.ai_label || ''
      }));

      const initialProjects = projects.map((p: any) => ({
        ...p,
        ai_score: (typeof p.similarity === 'number' && p.similarity > 0)
          ? Math.round(p.similarity * 100)
          : undefined,
        ai_reasoning: p.ai_reasoning || '',
        ai_label: p.ai_label || ''
      }));

      setProfileMatches(initialProfiles);
      setProjectMatches(initialProjects);
      
      // Unblock UI immediately so tab loads instantly
      setLoading(false);

      // 2. BACKGROUND AI RE-RANKING: Asynchronously refine scores with cached or background Gemini ranking
      if (user.ai_profile) {
        setIsProcessing(true);
        Promise.all([
          MatchingService.rankMatches(user.ai_profile, profiles),
          MatchingService.rankMatches(user.ai_profile, projects)
        ]).then(([rankedProfiles, rankedProjects]) => {
          if (rankedProfiles && rankedProfiles.length > 0) setProfileMatches(rankedProfiles);
          if (rankedProjects && rankedProjects.length > 0) setProjectMatches(rankedProjects);
        }).catch((rankError) => {
          console.warn("Background AI Ranking silent fallback:", rankError);
        }).finally(() => {
          setIsProcessing(false);
        });
      }
    } catch (error) {
      console.error("Failed to fetch matches:", error);
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const handleRerunMatching = async () => {
    if (!user?.id) {
      showToast("Authentication required to rerun matching.", "error");
      return;
    }
    
    setIsRerunning(true);
    MatchingService.clearCache(); // Wipe match cache for fresh rerun
    showToast("Updating your matches...", "info");
    
    try {
      let freshProfile: AIProfile;
      const answers = user.answers || {};
      const userType = user.user_type || (user.role === UserRole.Student || user.role === UserRole.Researcher ? 'individual' : 'entity');
      
      if (userType === 'entity') {
        freshProfile = await AIProfileService.processEntityProfile(answers);
      } else {
        const cvText = user.semantic_summary || user.bio || user.ai_profile?.semantic_summary || user.ai_profile?.summary || "";
        freshProfile = await AIProfileService.processProfile(cvText, {
          ...answers,
          role: user.role,
          user_name: user.name
        });
      }
      
      // Generate Embedding for matching
      let embedding: number[] | null | undefined;
      try {
        if (freshProfile.embedding_text) {
          embedding = await EmbeddingService.getEmbedding(freshProfile.embedding_text);
        } else if (freshProfile.semantic_summary) {
          embedding = await EmbeddingService.getEmbedding(freshProfile.semantic_summary);
        }
      } catch (err: any) {
        console.error("Embedding generation failed during rerun:", err);
      }

      // Save to Database
      await StorageService.updateProfile({
        id: user.id,
        ai_profile: freshProfile,
        bio: freshProfile.semantic_summary || user.bio,
        ...(embedding ? { embedding } : {}),
        semantic_summary: freshProfile.semantic_summary || user.semantic_summary
      });
      
      showToast("Matches updated successfully!", "success");
      
      // If we have parent profile refresh, invoke it
      if (onProfileUpdate) {
        await onProfileUpdate();
      }
      
      // Trigger fetch matches immediately
      await fetchMatches();
    } catch (error: any) {
      console.error("Failed to rerun matching:", error);
      showToast(error.message || "Ecosystem re-index failed. Please try again.", "error");
    } finally {
      setIsRerunning(false);
    }
  };

  useEffect(() => {
    const checkAndFetch = async () => {
      if (!user?.id) return;
      
      // If user is missing embedding but has bio/semantic_summary, we might need a refresh
      if (!user.embedding && user.semantic_summary) {
        setLoading(true);
        try {
          // Re-fetch user profile once to see if it was updated in DB
          const updatedUser = await StorageService.getProfile(user.id);
          if (updatedUser?.embedding) {
            // This will trigger the fetchMatches effect below
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Failed to check for user embedding refresh:", e);
        }
      }
      
      fetchMatches();
    };
    
    checkAndFetch();
  }, [user?.id, user?.embedding, user?.semantic_summary]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-4">
        <Loader2 className="animate-spin text-ug-teal" size={40} />
        <p className="text-[11px] font-semibold text-gray-400 tracking-wide animate-pulse">Finding matches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      
      {/* Sub-navigation tabs */}
      <div className="grid grid-cols-2 sm:flex sm:gap-6 border-b border-gray-100">
        <button
          onClick={() => setActiveTabSub('challenges')}
          className={`flex items-center justify-center sm:justify-start gap-2 pb-3 px-1 text-xs font-bold tracking-wide border-b-2 transition-all ${
            activeTabSub === 'challenges'
              ? 'border-ug-teal text-ug-teal'
              : 'border-transparent text-gray-400 hover:text-ug-navy'
          }`}
        >
          <Sparkles size={14} className={activeTabSub === 'challenges' ? 'text-ug-teal' : ''} />
          Challenges
        </button>
        <button
          onClick={() => setActiveTabSub('traditional')}
          className={`flex items-center justify-center sm:justify-start gap-2 pb-3 px-1 text-xs font-bold tracking-wide border-b-2 transition-all ${
            activeTabSub === 'traditional'
              ? 'border-ug-teal text-ug-teal'
              : 'border-transparent text-gray-400 hover:text-ug-navy'
          }`}
        >
          <Target size={14} />
          Projects & People
        </button>
      </div>

      {activeTabSub === 'challenges' ? (
        <IndustryChallengesMatcher 
          user={user} 
          setActiveTab={setActiveTab} 
          setLocalInitialThreadId={setLocalInitialThreadId} 
          autoOpenCreateChallenge={autoOpenCreateChallenge}
          onCloseCreateChallenge={onCloseCreateChallenge}
        />
      ) : (
        <>
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
          <h2 className="text-base sm:text-lg font-bold text-ug-navy">Project Matches</h2>

          {/* Controls: Rerun Matching and Status */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRerunMatching}
              disabled={isRerunning || isProcessing}
              className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[11px] font-semibold tracking-wide transition-all duration-300 shadow-sm ${
                isRerunning
                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-ug-teal text-ug-teal hover:bg-ug-teal hover:text-white active:scale-95 cursor-pointer'
              }`}
            >
              {isRerunning ? (
                <>
                  <Loader2 size={13} className="animate-spin text-gray-400" />
                  Rerunning...
                </>
              ) : (
                <>
                  <Zap size={13} className="fill-current text-ug-teal group-hover:text-white transition-colors duration-200" />
                  Rerun
                </>
              )}
            </button>
            {(isProcessing || isRerunning) && (
              <div className="flex items-center gap-2 bg-ug-teal/5 border border-ug-teal/20 px-3 py-2 rounded-full">
                <span className="w-2 h-2 bg-ug-teal rounded-full animate-pulse"></span>
              </div>
            )}
          </div>
        </div>



        <div className="space-y-4">
          {(showAllProjects ? projectMatches : projectMatches.slice(0, 5)).map((proj, i) => (
            <div key={proj.id} className="p-4 sm:p-5 border border-gray-100 rounded-2xl bg-white hover:border-ug-teal/30 transition-all text-left">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-12 h-12 bg-ug-navy/5 rounded-xl flex items-center justify-center text-ug-navy shrink-0 overflow-hidden">
                  {proj.image_url && proj.image_url.trim() !== '' ?
                    <img src={proj.image_url.split('|')[0] || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80'} className="w-full h-full object-cover" alt="" /> :
                    <Globe size={20} />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-bold text-ug-navy text-sm tracking-tight leading-snug min-w-0">{proj.title}</h4>
                    {proj.ai_score !== undefined && proj.ai_score !== null && !isNaN(Number(proj.ai_score)) && (
                      <span className="shrink-0 text-[11px] font-bold text-ug-teal bg-ug-teal/10 px-2 py-0.5 rounded-full">
                        {Math.round(Number(proj.ai_score))}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    {proj.research_area && <span className="text-[11px] font-semibold text-gray-400">{proj.research_area}</span>}
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                      proj.status === ProjectStatus.Concept ? 'bg-gray-50 text-gray-600 border-gray-100' :
                      proj.status === ProjectStatus.ProofOfConcept ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      proj.status === ProjectStatus.Prototype ? 'bg-purple-50 text-purple-700 border-purple-100' :
                      proj.status === ProjectStatus.Validation ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      proj.status === ProjectStatus.Commercialization ? 'bg-teal-50 text-teal-700 border-teal-100' :
                      proj.status === ProjectStatus.MarketReady ? 'bg-green-50 text-green-700 border-green-100' :
                      'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      {proj.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium line-clamp-2 mt-1.5">"{proj.ai_reasoning || proj.description}"</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                <button onClick={(e) => { e.stopPropagation(); handleExpressInterestClick(proj); }} className="bg-ug-navy text-white px-4 py-2 rounded-xl text-[11px] font-semibold tracking-wide hover:bg-ug-teal transition active:scale-95">Express Interest</button>
              </div>
            </div>
          ))}
          {projectMatches.length > 5 && !showAllProjects && (
            <button 
              onClick={() => setShowAllProjects(true)}
              className="w-full py-3.5 border-2 border-dashed border-gray-100 rounded-2xl text-[11px] font-semibold text-gray-400 tracking-wide hover:border-ug-teal hover:text-ug-teal transition-all"
            >
              See {projectMatches.length - 5} More Projects
            </button>
          )}

          {projectMatches.length === 0 && (
            <div className="py-10 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 p-6">
               <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-200">
                  <Rocket size={28} />
               </div>
               <h4 className="text-sm font-bold text-ug-navy mb-2">No project matches yet</h4>
               <p className="text-[11px] font-medium text-gray-400 max-w-xs mx-auto leading-relaxed mb-4">
                 No initiatives align with your profile yet. Try exploring the project directory.
               </p>
               <button
                 onClick={() => navigate('/projects')}
                 className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-semibold tracking-wide hover:border-ug-teal hover:text-ug-teal transition-all"
               >
                 Explore Projects
               </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <Users size={18} className="text-ug-teal" />
          <h2 className="text-lg md:text-xl font-bold text-ug-navy">Suggested Collaborators</h2>
        </div>

        <div className="space-y-4">
           {(showAllProfiles ? profileMatches : profileMatches.slice(0, 5)).map((collab, i) => (
             <div key={collab.id} className="p-4 sm:p-5 border border-gray-100 rounded-2xl bg-white hover:border-ug-teal/30 transition-all text-left">
               <div className="flex items-start gap-3 sm:gap-4">
                 <div className="w-12 h-12 rounded-xl overflow-hidden bg-ug-navy shrink-0">
                   {collab.avatar_url || collab.image_url ?
                     <img src={collab.avatar_url || collab.image_url} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" /> :
                     <UserIcon className="w-full h-full p-3.5 text-white/20" />
                   }
                 </div>
                 <div className="min-w-0 flex-1">
                   <div className="flex items-start justify-between gap-3">
                     <div className="min-w-0">
                       <h4 className="font-bold text-ug-navy text-sm tracking-tight truncate">{collab.name || 'UG Science Partner'}</h4>
                       <p className="text-[11px] font-semibold text-ug-teal tracking-wide truncate">{collab.role}</p>
                     </div>
                     {collab.ai_score !== undefined && collab.ai_score !== null && !isNaN(Number(collab.ai_score)) && (
                       <span className="shrink-0 text-[11px] font-bold text-ug-teal bg-ug-teal/10 px-2 py-0.5 rounded-full">
                         {Math.round(Number(collab.ai_score))}%
                       </span>
                     )}
                   </div>
                   {(collab.ai_reasoning || collab.semantic_summary) && (
                     <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2 mt-1.5">
                       "{collab.ai_reasoning || collab.semantic_summary}"
                     </p>
                   )}
                 </div>
               </div>
               <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-2">
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     if (setLocalInitialThreadId && setActiveTab) {
                       setLocalInitialThreadId(collab.id);
                       setActiveTab('messages');
                     }
                   }}
                   className="bg-white border border-gray-200 text-ug-navy hover:text-ug-teal hover:border-ug-teal px-3.5 py-2 rounded-xl text-[11px] font-semibold tracking-wide transition active:scale-95"
                   title="Open direct chat"
                 >
                   <span className="flex items-center gap-1"><MessageSquare size={12} /> Chat</span>
                 </button>
                 <button
                   onClick={(e) => { e.stopPropagation(); handleInitiateCollaborationClick(collab); }}
                   className="bg-ug-navy text-white px-4 py-2 rounded-xl text-[11px] font-semibold tracking-wide hover:bg-ug-teal transition active:scale-95"
                 >
                   Initiate Proposal
                 </button>
               </div>
             </div>
           ))}

            {profileMatches.length > 5 && !showAllProfiles && (
               <button
                 onClick={() => setShowAllProfiles(true)}
                 className="w-full py-3.5 border-2 border-dashed border-gray-100 rounded-2xl text-[11px] font-semibold text-gray-400 tracking-wide hover:border-ug-teal hover:text-ug-teal transition-all"
               >
                 See {profileMatches.length - 5} More Collaborators
               </button>
             )}

            {profileMatches.length === 0 && (
              <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50 p-6">
                 <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-200">
                    <Users size={28} />
                 </div>
                 <h4 className="text-sm font-bold text-ug-navy mb-2">No collaborators yet</h4>
                 <p className="text-[11px] font-medium text-gray-400 max-w-xs mx-auto leading-relaxed">
                   As more researchers and partners join, matches will appear here. Refine your research summary to improve results.
                 </p>
              </div>
            )}
        </div>
      </div>

      {/* --- INTERACTIVE PROPOSAL MODAL --- */}
      <AnimatePresence>
        {isProposalModalOpen && selectedMatch && (
          <div className="fixed inset-0 bg-ug-navy/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col p-5 sm:p-6 md:p-8 space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ug-navy/5 rounded-xl flex items-center justify-center text-ug-navy shrink-0">
                    {proposalType === 'collab' ? <Handshake size={20} /> : <Sparkles size={20} className="text-ug-teal" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-ug-navy text-sm tracking-tight">
                      {proposalType === 'collab' ? 'Collaboration Proposal' : 'Express Interest'}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">Review and edit before sending</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProposalModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-ug-navy transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Match Details Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wide leading-none mb-1">From</p>
                  <p className="font-bold text-xs text-ug-navy">{user?.name || 'My Profile'}</p>
                  <p className="text-[11px] text-gray-500 truncate font-medium">{user?.department || 'UG Research Directorate'}</p>
                </div>
                <div className="sm:border-l border-gray-200/60 sm:pl-4">
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wide leading-none mb-1">To</p>
                  <p className="font-bold text-xs text-ug-navy truncate">{selectedMatch.name || selectedMatch.owner_name || 'Ecosystem Partner'}</p>
                  <p className="text-[11px] text-ug-teal font-semibold truncate">{selectedMatch.role || 'Principal Investigator'}</p>
                </div>
              </div>

              {/* Project Association and Variables Controls */}
              {proposalType === 'collab' && (
                <div className="space-y-4">
                  <div className="text-left">
                    <label className="block text-[11px] font-semibold text-ug-navy tracking-wide mb-1.5">Your project</label>
                    <select
                      value={selectedProject?.id || 'custom'}
                      onChange={(e) => handleProjectChangeInModal(e.target.value)}
                      className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:ring-1 focus:ring-ug-teal"
                    >
                      {myProjects.map((proj) => (
                        <option key={proj.id} value={proj.id}>
                          {proj.title} ({proj.research_area || 'Tech Innovation'})
                        </option>
                      ))}
                      <option value="custom">General / Custom Topic</option>
                    </select>
                  </div>

                  {(!selectedProject) && (
                    <div className="text-left">
                      <label className="block text-[11px] font-semibold text-ug-navy tracking-wide mb-1.5">Custom topic</label>
                      <input
                        type="text"
                        placeholder="e.g. Biomedical Laboratory Device Co-validation"
                        value={customProjectTitle}
                        onChange={(e) => handleCustomTitleChange(e.target.value)}
                        className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:ring-1 focus:ring-ug-teal"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Subject Editor */}
              <div className="text-left space-y-1.5">
                <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:ring-1 focus:ring-ug-teal"
                />
              </div>

              {/* Message Body Editor */}
              <div className="text-left space-y-1.5">
                <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Message</label>
                <textarea
                  rows={8}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl p-4 text-xs font-medium text-gray-700 leading-relaxed font-sans focus:outline-none focus:border-ug-teal focus:ring-1 focus:ring-ug-teal resize-none"
                />
              </div>

              {/* Security note */}
              <div className="flex items-center gap-2 p-3 bg-blue-50/30 rounded-xl border border-blue-100/50 text-left">
                <Info size={14} className="text-blue-600 shrink-0" />
                <p className="text-[11px] text-blue-800 font-medium leading-normal">
                  A link to your researcher portfolio is attached automatically.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProposalModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-semibold tracking-wide hover:bg-gray-50 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendProposal}
                  className="px-6 py-2.5 bg-ug-navy text-white rounded-xl text-[11px] font-semibold tracking-wide hover:bg-ug-teal transition-all flex items-center gap-2 disabled:bg-gray-100 disabled:text-gray-400 active:scale-95"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="animate-spin" size={13} /> Sending...
                    </>
                  ) : (
                    <>
                      <SendIcon size={12} /> Send Proposal
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
};

const StudentDashboard = ({ user }: { user: User | null }) => {
   const [projects, setProjects] = useState<Project[]>([]);
   const [applications, setApplications] = useState<any[]>([]);
   const [bookmarks, setBookmarks] = useState<Project[]>([]);
   const [recommendations, setRecommendations] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

   // Drawer States
   const [drawerOpen, setDrawerOpen] = useState(false);
   const [selectedProjectForApp, setSelectedProjectForApp] = useState<Project | null>(null);
   const [appType, setAppType] = useState<'Research Assistantship' | 'Scholarship Application' | 'Lab Workspace Access'>('Research Assistantship');
   const [eduLevel, setEduLevel] = useState('');
   const [program, setProgram] = useState('');
   const [interests, setInterests] = useState('');
   const [availability, setAvailability] = useState('');
   const [message, setMessage] = useState('');
   const [submitting, setSubmitting] = useState(false);

   const navigate = useNavigate();
   const { showToast } = useToast();

   const loadDashboardData = async () => {
     if (!user?.id) return;
     try {
       setLoading(true);
       const allProjects = await StorageService.getProjects();
       setProjects(allProjects);

       const studentApps = await StorageService.getStudentApplications(user.id);
       setApplications(studentApps);

       const bookmarked = await StorageService.getBookmarks(user.id);
       setBookmarks(bookmarked);

       // Recommendations
       const recs = getRecommendations(allProjects, user);
       setRecommendations(recs);
     } catch (err) {
       console.error("Error loading student dashboard:", err);
     } finally {
       setLoading(false);
     }
   };

   useEffect(() => {
     loadDashboardData();
     // Populate default student credentials
     if (user) {
       setEduLevel(user.education_level || '');
       setProgram(user.program || '');
       setInterests(user.looking_for || '');
       setAvailability(user.availability || '');
     }
   }, [user?.id]);

   const getRecommendations = (allProjects: Project[], profile: any) => {
     if (!profile) return [];
     const studentProgram = (profile.program || '').toLowerCase();
     const studentInterests = (profile.looking_for || '').toLowerCase();
     
     const recs = allProjects.map(p => {
       let score = 0;
       let reason = '';
       
       const title = (p.title || '').toLowerCase();
       const desc = (p.description || '').toLowerCase();
       const dept = (p.department || '').toLowerCase();
       const area = (p.research_area || '').toLowerCase();

       if (studentProgram && (title.includes(studentProgram) || desc.includes(studentProgram) || dept.includes(studentProgram) || area.includes(studentProgram))) {
         score += 4;
         reason = `Aligned with your course: ${profile.program}`;
       } else if (studentInterests) {
         const keywords = studentInterests.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
         for (const kw of keywords) {
           if (kw && (title.includes(kw) || desc.includes(kw) || dept.includes(kw) || area.includes(kw))) {
             score += 3;
             reason = `Matches your interest in ${kw}`;
             break;
           }
         }
       }
       
       if (p.open_to_collaboration) {
         score += 1;
         if (!reason) reason = 'Seeking talent';
       }

       return { project: p, score, reason };
     });

     return recs
       .filter(r => r.score > 0)
       .sort((a, b) => b.score - a.score)
       .slice(0, 3);
   };

   const openApplicationDrawer = (proj: Project, defaultType: typeof appType = 'Research Assistantship') => {
     setSelectedProjectForApp(proj);
     setAppType(defaultType);
     
     // Set template cover letter
     let template = '';
     if (defaultType === 'Research Assistantship') {
       template = `Dear Professor,\n\nI am writing to express my strong interest in joining your research team for the project "${proj.title}". My academic background and goals align perfectly with this research, and I am eager to contribute to your goals.`;
     } else if (defaultType === 'Scholarship Application') {
       template = `To the Selection Committee,\n\nI am writing to submit my formal inquiry regarding scholarships, funding, or fellowship opportunities for the project "${proj.title}". I would appreciate the chance to discuss potential pathways to support my research contribution.`;
     } else if (defaultType === 'Lab Workspace Access') {
       template = `Dear Lab Coordinator,\n\nI am requesting authorized workspace or laboratory access in connection with "${proj.title}". I require access to conduct research, run analysis, or collaborate with team members.`;
     }
     setMessage(template);
      setDrawerOpen(true);
   };

   const handleSubmitApplication = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user?.id || !selectedProjectForApp) return;

     try {
       setSubmitting(true);

       // 1. Update Student Profile fields dynamically
       await StorageService.updateStudentProfile(user.id, {
         education_level: eduLevel,
         availability,
         looking_for: interests,
         program
       });

       // 2. Submit EOI with structured prefix and custom message
       let messageText = '';
       if (appType === 'Research Assistantship') {
         messageText = `[ASSISTANTSHIP_APPLICATION] Student "${user.name}" has formally requested consideration for a Laboratory / Research Assistantship on this project. Education Level: ${eduLevel || 'N/A'}. Program/Course: ${program || 'N/A'}. Availability: ${availability || 'N/A'}. Interests: ${interests || 'N/A'}.\n\nPersonal Statement:\n${message}`;
       } else if (appType === 'Scholarship Application') {
         messageText = `[SCHOLARSHIP_APPLICATION] Student "${user.name}" has submitted an inquiry for Academic Scholarship & Fellowships on this project. Education Level: ${eduLevel || 'Graduate'}. Program: ${program || 'N/A'}. Availability: ${availability || 'N/A'}.\n\nStatement of Intent:\n${message}`;
       } else if (appType === 'Lab Workspace Access') {
         messageText = `[LAB_WORKSPACE_ACCESS] Student "${user.name}" is requesting secure authorization to access the workspace relative to this project. Justification:\n${message}`;
       }

       const metric = appType === 'Lab Workspace Access' ? 'requests' : 'expressions_of_interest';
       await StorageService.submitEOI(selectedProjectForApp.id, user.name, messageText, undefined, metric);

       showToast(`Your ${appType} request was submitted!`, "success");
       setDrawerOpen(false);
       
       // Reload dashboard data to update stats and application history
       loadDashboardData();
     } catch (err: any) {
       console.error("Application error:", err);
       showToast(err.message || "Failed to submit application. Please try again.", "error");
     } finally {
       setSubmitting(false);
     }
   };

   const parseAppType = (msg: string) => {
     if (!msg) return 'General Inquiry';
     if (msg.startsWith('[ASSISTANTSHIP_APPLICATION]')) return 'Research Assistantship';
     if (msg.startsWith('[SCHOLARSHIP_APPLICATION]')) return 'Scholarship Inquiry';
     if (msg.startsWith('[LAB_WORKSPACE_ACCESS]')) return 'Lab Workspace Access';
     if (msg.includes('Technical Disclosure')) return 'Technical Disclosure';
     return 'Inquiry';
   };

   const cleanMessage = (msg: string) => {
     if (!msg) return '';
     return msg
       .replace(/^\[ASSISTANTSHIP_APPLICATION\].*?\n\n(Personal Statement:\n)?/s, '')
       .replace(/^\[SCHOLARSHIP_APPLICATION\].*?\n\n(Statement of Intent:\n)?/s, '')
       .replace(/^\[LAB_WORKSPACE_ACCESS\].*?\n\n(Justification:\n)?/s, '')
       .replace(/^(?:[REVEAL_REQUEST]|🔐).*?\n\n/s, '');
   };

   const getStatusBadgeColor = (status: string) => {
     const s = status ? status.toLowerCase() : '';
     if (s === 'approved' || s === 'released' || s.startsWith('released:')) {
       return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
     }
     if (s === 'rejected') {
       return 'bg-rose-50 text-rose-700 border border-rose-100';
     }
     return 'bg-amber-50 text-amber-700 border border-amber-100';
   };

   // Real opportunities are projects looking for collaboration or students
   const openOpportunities = projects.filter(p => p.open_to_collaboration);

   return (
      <div className="space-y-8 animate-fade-in">
         <UnifiedDashboardProfile user={user} onAction={() => navigate('/projects')} actionLabel="Explore Research" />
         
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <StatCard label="Active Opportunities" value={openOpportunities.length.toString()} icon={BookOpen} />
             <StatCard label="My Applications" value={applications.length.toString()} icon={Clock} />
             <StatCard label="Saved Bookmarks" value={bookmarks.length.toString()} icon={Bookmark} />
          </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-2 lg:col-span-8 space-y-8">
               {/* COLLABORATION CALLS */}
               <section className="bg-white p-3.5 sm:p-6 md:p-8 rounded-2xl md:rounded-2xl border border-gray-100 shadow-sm">
                  <SectionTitle title="Collaboration Calls" subtitle="Active Research Projects Seeking Talent" />
                  <div className="space-y-4 mt-6">
                     {openOpportunities.length === 0 ? (
                       <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                          <p className="text-gray-400 text-xs font-bold  ">No active collaboration calls listed.</p>
                       </div>
                     ) : (
                       openOpportunities.slice(0, 3).map(p => (
                          <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 border border-gray-100 rounded-2xl bg-white hover:shadow-lg transition gap-4">
                             <div className="flex gap-4">
                                <div className="w-14 h-14 bg-ug-navy/5 rounded-2xl flex items-center justify-center text-ug-navy shrink-0"><Briefcase size={24} /></div>
                                <div>
                                   <h4 className="font-bold text-ug-navy text-lg">{p.title}</h4>
                                   <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <span className="text-[11px] font-semibold text-ug-teal tracking-wide">{p.department}</span>
                                      <span className="text-gray-300 text-[11px]">•</span>
                                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${
                                        p.status === ProjectStatus.Concept ? 'bg-gray-50 text-gray-600 border-gray-100' :
                                        p.status === ProjectStatus.ProofOfConcept ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                        p.status === ProjectStatus.Prototype ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        p.status === ProjectStatus.Validation ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                        p.status === ProjectStatus.Commercialization ? 'bg-teal-50 text-teal-700 border-teal-100' :
                                        p.status === ProjectStatus.MarketReady ? 'bg-green-50 text-green-700 border-green-100' :
                                        'bg-gray-50 text-gray-600 border-gray-100'
                                      }`}>
                                        {p.status || 'Active'}
                                      </span>
                                   </div>
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => navigate(`/projects/${p.id}`)} className="bg-gray-100 text-ug-navy px-4 py-2 rounded-xl text-[11px] font-semibold tracking-wide hover:bg-gray-200 transition">View</button>
                                <button onClick={() => openApplicationDrawer(p, 'Research Assistantship')} className="bg-ug-navy text-white px-5 py-2 rounded-xl text-[11px] font-semibold tracking-wide hover:bg-ug-teal transition">Apply for Assistantship</button>
                             </div>
                          </div>
                       ))
                     )}
                  </div>
               </section>

               {/* SCHOLARSHIPS */}
               <section className="bg-white p-3.5 sm:p-6 md:p-8 rounded-2xl md:rounded-2xl border border-gray-100 shadow-sm mt-6 sm:mt-8">
                  <SectionTitle title="Scholarships & Research Fellowships" subtitle="Academically Funded Pathways to Support Innovation" />
                  <div className="mt-6 text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                     <p className="text-gray-400 text-xs font-bold">No funded opportunities listed right now.</p>
                     <p className="text-gray-400 text-[11px] font-medium mt-1">Check back soon or ask your department about open calls.</p>
                  </div>
               </section>

               {/* STUDENT SPECIFIC RECOMMENDATIONS */}
               {recommendations.length > 0 && (
                 <section className="bg-gradient-to-tr from-ug-navy/[0.02] to-ug-teal/[0.02] p-3.5 sm:p-6 md:p-8 rounded-2xl md:rounded-2xl border border-gray-100 shadow-sm mt-6 sm:mt-8">
                    <SectionTitle title="Recommended for You" subtitle="Personalized research matches based on your program and profile keywords" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                       {recommendations.map(({ project: p, reason }) => (
                          <div key={p.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                             <div>
                                <span className="bg-ug-teal/10 text-ug-teal text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full mb-3 inline-block">
                                   {reason}
                                </span>
                                <h4 className="font-bold text-ug-navy text-sm leading-snug line-clamp-2 mb-2 hover:text-ug-teal transition cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>{p.title}</h4>
                                <p className="text-gray-400 text-[11px] tracking-wider font-bold mb-4">{p.department}</p>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => openApplicationDrawer(p)} className="flex-1 text-center bg-ug-navy hover:bg-ug-teal text-white py-2 rounded-xl text-[11px] font-semibold tracking-wide transition">Apply</button>
                             </div>
                          </div>
                       ))}
                    </div>
                 </section>
               )}

               {/* APPLICATION HISTORY */}
               <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mt-8">
                  <SectionTitle title="My Applications & Request Tracker" subtitle="Live tracking of your assistantships, fellowship inquiries, and workspace permissions" />
                  <div className="space-y-4 mt-6">
                     {loading ? (
                       <div className="text-center py-8">
                          <p className="text-gray-400 text-xs font-bold  tracking-wide">Loading records...</p>
                       </div>
                     ) : applications.length === 0 ? (
                       <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                          <Inbox className="mx-auto text-gray-300 mb-3" size={32} />
                          <h4 className="font-bold text-ug-navy text-sm">No Active Submissions</h4>
                          <p className="text-gray-400 text-[11px] font-bold mt-1 tracking-wider">Your formal submissions will accumulate here.</p>
                       </div>
                     ) : (
                       applications.map(app => {
                          const type = parseAppType(app.message);
                          const isExpanded = expandedAppId === app.id;
                          return (
                             <div key={app.id} className="p-6 border border-gray-100 rounded-2xl bg-white hover:border-gray-200 transition">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                   <div className="flex items-start gap-4">
                                      <div className="w-10 h-10 bg-ug-teal/5 rounded-xl flex items-center justify-center text-ug-teal shrink-0">
                                         <Clock size={18} />
                                      </div>
                                      <div>
                                         <span className="text-[11px] font-semibold text-ug-teal tracking-wide block mb-1">{type}</span>
                                         <h4 className="font-bold text-ug-navy text-sm">{app.projects?.title || 'General Department Grant'}</h4>
                                         <p className="text-[11px] font-medium text-gray-400 mt-0.5">Submitted: {new Date(app.created_at).toLocaleDateString([], { dateStyle: 'medium' })}</p>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-3 justify-between md:justify-end">
                                      <span className={`px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide ${getStatusBadgeColor(app.status)}`}>
                                         {app.status || 'pending'}
                                      </span>
                                      <button 
                                         onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                                         className="p-1 text-gray-400 hover:text-ug-teal transition"
                                      >
                                         {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                      </button>
                                   </div>
                                </div>
                                {isExpanded && (
                                   <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-600 bg-gray-50/50 p-4 rounded-2xl">
                                      <span className="text-[11px] font-semibold text-gray-400 tracking-wide block mb-2">Message Body</span>
                                      <p className="whitespace-pre-wrap font-medium">{cleanMessage(app.message)}</p>
                                   </div>
                                )}
                             </div>
                          );
                       })
                     )}
                  </div>
               </section>
            </div>

            {/* SIDEBAR RIGHT */}
            <div className="md:col-span-2 lg:col-span-4 space-y-8 border-t lg:border-t-0 pt-8 lg:pt-0">
               {/* SAVED WATCHLIST */}
               <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <SectionTitle title="Bookmarks & Watchlist" subtitle="Your pinned research interests" />
                  <div className="space-y-4 mt-6">
                     {loading ? (
                        <p className="text-gray-400 text-xs font-bold  tracking-wide text-center">Loading watchlist...</p>
                     ) : bookmarks.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100">
                           <Bookmark className="mx-auto text-gray-300 mb-2" size={24} />
                           <p className="text-gray-400 text-[11px] font-semibold tracking-wide">Bookmark items to save them.</p>
                        </div>
                     ) : (
                        bookmarks.map(p => (
                           <div key={p.id} className="flex items-center justify-between p-4 border border-gray-50 rounded-2xl bg-gray-50/30 hover:bg-white hover:shadow-md transition">
                              <div className="flex items-center gap-3 min-w-0">
                                 <div className="w-10 h-10 rounded-xl bg-ug-navy/5 flex items-center justify-center text-ug-navy shrink-0"><Briefcase size={20} /></div>
                                 <div className="min-w-0">
                                    <h5 className="font-bold text-ug-navy text-xs truncate hover:text-ug-teal transition cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>{p.title}</h5>
                                    <p className="text-[11px] font-bold text-gray-400 tracking-wide truncate">{p.department}</p>
                                 </div>
                              </div>
                              <button onClick={() => openApplicationDrawer(p)} className="bg-ug-navy text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide hover:bg-ug-teal transition shrink-0">Apply</button>
                           </div>
                        ))
                     )}
                  </div>
               </section>

               <HubStreamSidebar />
            </div>
         </div>

         {/* APPLICATION DRAWER */}
         <AnimatePresence>
            {drawerOpen && selectedProjectForApp && (
               <>
                  {/* Backdrop */}
                  <motion.div 
                     className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 cursor-pointer"
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => setDrawerOpen(false)}
                  />

                  {/* Drawer Content */}
                  <motion.div 
                     className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl z-50 overflow-y-auto flex flex-col border-l border-gray-100"
                     initial={{ x: '100%' }}
                     animate={{ x: 0 }}
                     exit={{ x: '100%' }}
                     transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  >
                     {/* Drawer Header */}
                     <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-ug-navy text-white sticky top-0 z-20">
                        <div>
                           <span className="text-[11px] font-semibold text-ug-teal tracking-wide block mb-1">Academic Request Portal</span>
                           <h3 className="text-lg sm:text-xl font-bold">Submit Inquiry & Application</h3>
                        </div>
                        <button 
                           type="button"
                           onClick={() => setDrawerOpen(false)}
                           className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer flex items-center gap-1 border border-white/10 px-3 py-1.5"
                        >
                           <X size={16} />
                           <span className="text-[11px] font-semibold tracking-wider">Close</span>
                        </button>
                     </div>

                     {/* Drawer Body */}
                     <form onSubmit={handleSubmitApplication} className="p-4 sm:p-6 flex-1 space-y-4 sm:space-y-5">
                        {/* Target Project Info */}
                        <div className="p-3 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100">
                           <span className="text-[11px] font-semibold text-gray-400 tracking-wide block">Associated Project</span>
                           <h4 className="font-bold text-ug-navy text-xs sm:text-sm mt-1">{selectedProjectForApp.title}</h4>
                           <p className="text-[11px] font-bold text-ug-teal tracking-wider mt-0.5">{selectedProjectForApp.department}</p>
                        </div>

                        {/* Request Type Selector */}
                        <div className="space-y-1.5 sm:space-y-2">
                           <label className="text-[11px] font-semibold text-gray-400 tracking-wide block">Request Category</label>
                           <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                              {[
                                 { id: 'Research Assistantship', label: 'Research Assistantship', desc: 'Apply for a student assistant role inside this laboratory.' },
                                 { id: 'Scholarship Application', label: 'Scholarship / Fellowship', desc: 'Inquire about available funding or stipends.' },
                                 { id: 'Lab Workspace Access', label: 'Lab Workspace Access', desc: 'Request secure physical/digital authorization to access resources.' }
                              ].map(t => (
                                 <div 
                                    key={t.id}
                                    onClick={() => setAppType(t.id as any)}
                                    className={`p-3 sm:p-4 border rounded-2xl cursor-pointer transition text-left select-none ${appType === t.id ? 'border-ug-teal bg-ug-teal/5 text-ug-navy' : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}
                                 >
                                    <h5 className="font-bold text-xs">{t.label}</h5>
                                    <p className="text-[11px] text-gray-400 mt-1">{t.desc}</p>
                                 </div>
                              ))}
                           </div>
                        </div>

                        {/* Student Profile Info Verification */}
                        <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-gray-50">
                           <span className="text-[11px] font-semibold text-ug-teal tracking-wide block">Verify Credentials (Saved to Profile)</span>
                           
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              <div>
                                 <label className="text-[11px] font-bold text-gray-400 tracking-wider block mb-1">Education Level</label>
                                 <input 
                                    type="text" 
                                    className="w-full px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-ug-teal" 
                                    placeholder="e.g. MPhil, PhD, BSc Senior"
                                    value={eduLevel}
                                    onChange={(e) => setEduLevel(e.target.value)}
                                    required
                                 />
                              </div>
                              <div>
                                 <label className="text-[11px] font-bold text-gray-400 tracking-wider block mb-1">Program / Course</label>
                                 <input 
                                    type="text" 
                                    className="w-full px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-ug-teal" 
                                    placeholder="e.g. Biochemistry"
                                    value={program}
                                    onChange={(e) => setProgram(e.target.value)}
                                    required
                                 />
                              </div>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              <div>
                                 <label className="text-[11px] font-bold text-gray-400 tracking-wider block mb-1">Availability</label>
                                 <input 
                                    type="text" 
                                    className="w-full px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-ug-teal" 
                                    placeholder="e.g. 15 hrs/week, Full-time"
                                    value={availability}
                                    onChange={(e) => setAvailability(e.target.value)}
                                    required
                                 />
                              </div>
                              <div>
                                 <label className="text-[11px] font-bold text-gray-400 tracking-wider block mb-1">Interests / Focus</label>
                                 <input 
                                    type="text" 
                                    className="w-full px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-ug-teal" 
                                    placeholder="e.g. Immunology, Vaccines"
                                    value={interests}
                                    onChange={(e) => setInterests(e.target.value)}
                                    required
                                 />
                              </div>
                           </div>
                        </div>

                        {/* Custom Cover Message */}
                        <div className="space-y-2 pt-3 sm:pt-4 border-t border-gray-50">
                           <label className="text-[11px] font-semibold text-gray-400 tracking-wide block">Custom Cover Message / Personal Statement</label>
                           <textarea 
                              rows={4}
                              className="w-full p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-ug-teal"
                              placeholder="Describe your qualifications, goals, and why you should be chosen..."
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              required
                           />
                        </div>

                        {/* Submit Actions */}
                        <div className="pt-4 sm:pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                           <button 
                              type="button"
                              onClick={() => setDrawerOpen(false)}
                              className="w-full sm:w-1/3 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700 py-3.5 rounded-xl text-xs font-bold  tracking-wide transition-all cursor-pointer text-center"
                           >
                              Close
                           </button>
                           <button 
                              type="submit"
                              disabled={submitting}
                              className="w-full sm:w-2/3 flex items-center justify-center gap-2 bg-ug-navy hover:bg-ug-teal text-white py-3.5 rounded-xl text-xs font-bold  tracking-wide transition-all disabled:opacity-50 cursor-pointer"
                           >
                              {submitting ? (
                                <>
                                   <Loader2 className="animate-spin" size={16} />
                                   <span>Submitting...</span>
                                </>
                              ) : (
                                <span>Submit Application</span>
                              )}
                           </button>
                        </div>
                     </form>
                  </motion.div>
               </>
            )}
         </AnimatePresence>
      </div>
   );
};

const InvestorDashboard = ({ 
  user, 
  setActiveTab
}: { 
  user: User | null; 
  setActiveTab?: (tab: 'overview' | 'matches' | 'messages' | 'profile') => void;
}) => {
   const [projects, setProjects] = useState<Project[]>([]);
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
   const [refreshKey, setRefreshKey] = useState(0);
   const navigate = useNavigate();

   useEffect(() => { StorageService.getProjects().then(setProjects); }, []);

   return (
      <div className="space-y-8">
         <UnifiedDashboardProfile 
            user={user} 
            onAction={() => setIsCreateModalOpen(true)} 
            actionLabel="Post New Challenge" 
         />
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard label="Market Ready Assets" value={projects.filter(p => p.status === ProjectStatus.MarketReady).length} icon={ShoppingBag} />
            <StatCard label="Total Inquiries" value={projects.reduce((sum, p) => sum + (p.expressions_of_interest || 0), 0)} icon={Bookmark} />
         </div>

         {/* Commercial Challenges Tracker & Management Ledger */}
         <PartnerChallengesTracker 
            user={user}
            onPostNewChallenge={() => setIsCreateModalOpen(true)}
            setActiveTab={setActiveTab}
            refreshKey={refreshKey}
         />

         {/* Venture Portfolio & Watchlist */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-2 lg:col-span-8 space-y-8">
               <section className="bg-white p-3.5 sm:p-6 md:p-8 rounded-2xl md:rounded-2xl border border-gray-100 shadow-sm">
                  <SectionTitle title="Venture Portfolio" subtitle="Curated Technical Assets from University of Ghana" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {projects.slice(0, 4).map(p => (
                        <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="bg-gray-50 rounded-2xl p-6 hover:bg-white hover:shadow-xl transition border border-gray-100 cursor-pointer group">
                           <h4 className="font-bold text-lg text-ug-navy mb-2 group-hover:text-ug-teal transition">{p.title}</h4>
                           <div className="flex justify-between items-center pt-4 border-t border-gray-200/50">
                              <span className="text-[11px] font-bold text-gray-400 tracking-wide">{p.status}</span>
                              <ArrowRight size={16} className="text-gray-300 group-hover:text-ug-teal" />
                           </div>
                        </div>
                     ))}
                  </div>
               </section>
            </div>
            <div className="md:col-span-2 lg:col-span-4 space-y-8 border-t lg:border-t-0 pt-8 lg:pt-0">
               {user?.id && <BookmarkedProjectsList userId={user.id} />}
               <HubStreamSidebar />
            </div>
         </div>

         {/* Clean Modal for Posting New Challenge directly on Overview */}
         <CreateChallengeModal 
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            user={user}
            onChallengePosted={() => setRefreshKey(prev => prev + 1)}
         />
      </div>
   );
};

// --- CORE UTILITIES ---

const BookmarkedProjectsList: React.FC<{ userId: string }> = ({ userId }) => {
  const [bookmarks, setBookmarks] = useState<Project[]>([]);
  const navigate = useNavigate();
  useEffect(() => { StorageService.getBookmarks(userId).then(setBookmarks); }, [userId]);
  if (bookmarks.length === 0) return null;
  return (
    <section className="bg-white p-3.5 sm:p-6 md:p-8 rounded-2xl md:rounded-2xl border border-gray-100 shadow-sm">
      <SectionTitle title="Watchlist" subtitle="Secured Research Notifications" />
      <div className="space-y-3 mt-4">
        {bookmarks.map(p => (
          <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:border-ug-teal/20 hover:shadow-md transition cursor-pointer group">
            <div className="w-11 h-11 rounded-xl overflow-hidden shadow-sm shrink-0 border border-white"><img src={p.image_url && p.image_url.trim() !== '' ? p.image_url.split('|')[0] : 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt="" /></div>
            <div className="flex-1 min-w-0">
               <h4 className="font-bold text-ug-navy text-xs truncate group-hover:text-ug-teal transition">{p.title}</h4>
               <p className="text-[11px] font-bold text-gray-400 tracking-wide truncate">{p.research_area}</p>
            </div>
            <Bookmark size={16} className="text-ug-teal fill-ug-teal shrink-0" />
          </div>
        ))}
      </div>
    </section>
  );
};

const ProfileSettings: React.FC<{ 
  user: User | null; 
  onUpdate: () => void;
  onRetakeOnboarding?: () => void;
}> = ({ user, onUpdate, onRetakeOnboarding }) => {
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.website_url || '');
  const [website2, setWebsite2] = useState(user?.website_url_2 || '');
  const [website3, setWebsite3] = useState(user?.website_url_3 || '');
  const [website4, setWebsite4] = useState(user?.website_url_4 || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [sectorVector, setSectorVector] = useState<string[]>(user?.ai_profile?.sectorVector || user?.answers?.sectorVector || ['pharmaceutical', 'drugs', 'diagnostics']);
  const [newTag, setNewTag] = useState('');
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarPreview, setEditAvatarPreview] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);

  // Security & Password Reset States
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Delete Account Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReasonCategory, setDeleteReasonCategory] = useState('No longer using the platform / Found an alternative');
  const [deleteReasonDetails, setDeleteReasonDetails] = useState('');
  const [deleteConfirmedCheck, setDeleteConfirmedCheck] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setWebsite(user.website_url || '');
      setWebsite2(user.website_url_2 || '');
      setWebsite3(user.website_url_3 || '');
      setWebsite4(user.website_url_4 || '');
      setAvatarPreview(user.avatar_url || '');
      setSectorVector(user.ai_profile?.sectorVector || user.answers?.sectorVector || ['pharmaceutical', 'drugs', 'diagnostics']);
    }
  }, [user]);

  const openEditModal = () => {
    setEditName(name);
    setEditAvatarPreview(avatarPreview);
    setEditAvatarFile(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast("Name cannot be empty", "error");
      return;
    }
    setName(editName);
    if (editAvatarFile) {
      setAvatarFile(editAvatarFile);
    }
    setAvatarPreview(editAvatarPreview);
    setIsEditModalOpen(false);
    showToast("Profile identity updated locally. Remember to click 'Save My Profile' at the bottom to finalize changes.", "success");
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showToast("Please fill in both password fields", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast("Password updated successfully!", "success");
      setIsResettingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(`Password reset failed: ${err.message}`, "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDownloadData = () => {
    if (!user) {
      showToast("User session not found.", "error");
      return;
    }
    try {
      const dataToDownload = {
        meta: {
          hub_identity: "Verified University of Ghana Virtual Industry Hub Profile Export",
          exported_at: new Date().toISOString(),
          version: "1.0.0"
        },
        personal_data: {
          id: user.id,
          name: name,
          email: user.email,
          role: user.role,
          bio: bio,
          website_url: website,
          website_url_2: website2,
          website_url_3: website3,
          website_url_4: website4,
          avatar_url: avatarPreview,
          status: "Verified"
        },
        ai_profile: user.ai_profile || null
      };
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToDownload, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `ug_hub_profile_data_${user.id || 'export'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      showToast("Your core profile data has been downloaded successfully.", "success");
    } catch (err: any) {
      showToast(`Data packaging failed: ${err.message}`, "error");
    }
  };

  const handleConfirmDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!deletePassword.trim()) {
      showToast("Please enter your current password to confirm deletion.", "error");
      return;
    }
    if (!deleteConfirmedCheck) {
      showToast("Please acknowledge account deletion confirmation.", "error");
      return;
    }

    setDeletingAccount(true);
    try {
      // Verify password with Supabase auth
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword
      });

      if (signInErr) {
        showToast("Incorrect password. Please verify your current password.", "error");
        setDeletingAccount(false);
        return;
      }

      // Record deletion log for admin dashboard records
      await StorageService.recordAccountDeletion({
        user_id: user.id,
        user_email: user.email,
        user_name: user.name || 'Anonymous User',
        user_role: user.role || UserRole.Researcher,
        reason_category: deleteReasonCategory,
        reason_details: deleteReasonDetails.trim() || undefined
      });

      // Execute account deletion and clean profile
      await StorageService.deleteAccount(user.id);

      showToast("Your account has been permanently deleted. Session terminated.", "info");
      setIsDeleteModalOpen(false);
      
      // Navigate to homepage
      window.location.href = '/';
    } catch (err: any) {
      showToast(`Account deletion failed: ${err.message}`, "error");
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true);
    try {
      let avatarUrl = user.avatar_url;
      if (avatarFile) {
        avatarUrl = await StorageService.uploadFile(avatarFile, 'avatars');
      }

      const updatedAnswers = { 
        ...(user.answers || {}), 
        sectorVector 
      };
      
      const updatedAIProfile = {
        ...(user.ai_profile || {}),
        sectorVector
      };

      await StorageService.updateProfile({
        id: user.id,
        name,
        bio,
        role: user.role,
        email: user.email,
        website_url: safeExternalUrl(website),
        website_url_2: safeExternalUrl(website2),
        website_url_3: safeExternalUrl(website3),
        website_url_4: safeExternalUrl(website4),
        avatar_url: avatarUrl,
        answers: updatedAnswers,
        ai_profile: updatedAIProfile
      });
      
      showToast("Profile identity updated", "success");
      onUpdate();
    } catch (err: any) { 
      showToast(`Update failed: ${err.message}`, "error"); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      {/* Identity Card */}
      <div className="bg-white p-5 md:p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 md:gap-10">
        <div>
          <div 
            className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-gray-50 border-4 border-white shadow-lg relative cursor-pointer group/avatar"
            onClick={openEditModal}
          >
            {avatarPreview ? (
              <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-200 bg-ug-navy/5"><UserIcon size={40} strokeWidth={1} /></div>
            )}
            <div className="absolute inset-0 bg-ug-navy/60 opacity-0 group-hover/avatar:opacity-100 transition duration-200 flex flex-col items-center justify-center text-white text-[11px] font-semibold tracking-wider backdrop-blur-[1px]">
              <Camera size={14} className="mb-0.5" />
              Change
            </div>
          </div>
        </div>
        
        <div className="text-center sm:text-left space-y-4 flex-1">
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-ug-navy tracking-tight">{name || 'New Member'}</h3>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2.5 items-center">
              <span className="text-[11px] font-semibold text-ug-teal tracking-[0.2em]">Official Researcher Profile</span>
              <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
              <span className="text-[11px] font-semibold text-gray-400 tracking-wide">{user?.email}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium max-w-2xl leading-relaxed">
            Update your profile details and personal links to ensure the intelligence engine can match you with the right projects and partners.
          </p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-3">
            <button 
              type="button" 
              onClick={openEditModal} 
              className="px-5 py-2.5 bg-ug-navy text-white hover:bg-ug-teal transition rounded-xl text-[11px] font-semibold tracking-wide shadow-md flex items-center gap-1.5"
            >
              <UserIcon size={12} /> Edit Profile
            </button>
            {onRetakeOnboarding && (
              <button 
                type="button" 
                onClick={onRetakeOnboarding} 
                className="px-5 py-2.5 bg-ug-teal/10 hover:bg-ug-teal hover:text-white text-ug-teal transition rounded-xl text-[11px] font-semibold tracking-wide border border-ug-teal/20 flex items-center gap-1.5"
              >
                <Sparkles size={12} /> Refine AI Matching
              </button>
            )}
            <div className="px-5 py-2.5 bg-white text-gray-400 rounded-xl text-[11px] font-semibold tracking-wide border border-gray-100 flex items-center justify-center">Verified Hub</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-white p-5 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 md:space-y-8">
            {/* Biography Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ug-teal/10 text-ug-teal rounded-xl flex items-center justify-center shrink-0"><FileText size={18} /></div>
                <div>
                  <h4 className="text-lg font-bold text-ug-navy tracking-tight ">My Information</h4>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-[0.2em] mt-0.5">Professional Narrative</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-gray-500 tracking-wide ml-1">Full Name / Display Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-4 font-bold text-ug-navy focus:bg-white focus:border-ug-teal focus:ring-4 focus:ring-ug-teal/5 outline-none transition-all shadow-inner text-xs" 
                    placeholder="Your display name..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-gray-500 tracking-wide ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 font-bold text-gray-400 outline-none cursor-not-allowed text-xs shadow-inner" 
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-gray-500 tracking-wide ml-1">Verified Portal Role</label>
                  <input 
                    type="text" 
                    value={user?.role || 'Researcher'} 
                    disabled 
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 font-bold text-gray-400 outline-none cursor-not-allowed text-xs shadow-inner  " 
                  />
                </div>
              </div>
            </div>

            {user?.user_type === 'entity' && (
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ug-teal/10 text-ug-teal rounded-xl flex items-center justify-center shrink-0">
                    <Target size={18} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-ug-navy tracking-tight ">Active Focus Tracks</h4>
                    <p className="text-[11px] font-semibold text-gray-400 tracking-[0.2em] mt-0.5">Manage Sector Tracks & Dynamic Tags</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sectorVector.map(tag => (
                    <span 
                      key={tag} 
                      className="px-3 py-1.5 bg-ug-teal text-white rounded-lg text-[11px] font-semibold tracking-wider flex items-center gap-1.5"
                    >
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => setSectorVector(sectorVector.filter(t => t !== tag))}
                        className="hover:scale-125 transition-transform font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Input other custom dynamic tag..."
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTag.trim() && !sectorVector.includes(newTag.trim().toLowerCase())) {
                          setSectorVector([...sectorVector, newTag.trim().toLowerCase()]);
                          setNewTag('');
                        }
                      }
                    }}
                    className="flex-1 bg-gray-50/50 border border-gray-200 rounded-xl py-3 px-4 font-bold text-ug-navy focus:bg-white focus:border-ug-teal outline-none text-xs shadow-inner"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newTag.trim() && !sectorVector.includes(newTag.trim().toLowerCase())) {
                        setSectorVector([...sectorVector, newTag.trim().toLowerCase()]);
                        setNewTag('');
                      }
                    }}
                    className="px-5 py-2 bg-ug-navy text-white rounded-xl text-xs font-bold   hover:bg-ug-teal transition-colors focus:outline-none"
                  >
                    Add Tag
                  </button>
                </div>
              </div>
            )}

            {/* Portfolio Links */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ug-navy text-white rounded-xl flex items-center justify-center shadow-md shrink-0"><LinkIcon size={18} /></div>
                <div>
                  <h4 className="text-lg font-bold text-ug-navy tracking-tight ">Portfolio Slots</h4>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-[0.2em] mt-0.5">External Research Links (Up to 4)</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {[
                  { label: "Main Portfolio Website", val: website, setter: setWebsite, placeholder: "https://yourwebsite.com" },
                  { label: "LinkedIn Profile", val: website2, setter: setWebsite2, placeholder: "https://linkedin.com/in/..." },
                  { label: "Research Archive Link", val: website3, setter: setWebsite3, placeholder: "Scholar or Project link" },
                  { label: "Extra Portfolio Slot", val: website4, setter: setWebsite4, placeholder: "Any other relevant link" },
                ].map((input, idx) => (
                  <div key={idx} className="space-y-2">
                    <label className="text-[11px] font-semibold text-gray-500 tracking-wide ml-1">{input.label}</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-ug-teal transition-colors">
                        <LinkIcon size={14} />
                      </div>
                      <input 
                        type="url" 
                        placeholder={input.placeholder}
                        value={input.val || ''} 
                        onChange={e => input.setter(e.target.value)} 
                        className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold text-ug-navy focus:bg-white focus:border-ug-teal focus:ring-4 focus:ring-ug-teal/5 outline-none transition-all shadow-inner text-xs" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={loading} 
                className="group w-full sm:w-auto bg-ug-navy text-white px-8 py-3.5 rounded-xl font-semibold text-[11px] tracking-wide shadow-md hover:bg-ug-teal transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} className="group-hover:scale-125 transition-transform" />}
                Save My Profile
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-[11px] font-semibold text-gray-400 tracking-wide px-1">Account Management</h4>
            <div className="space-y-1">
              {isResettingPassword ? (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2.5 animate-fade-in mb-1">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] font-semibold tracking-wide text-ug-navy">Change Password</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsResettingPassword(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="text-[11px] font-semibold tracking-wide text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    <input 
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-ug-navy placeholder-gray-400 focus:border-ug-teal outline-none"
                    />
                    <input 
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-ug-navy placeholder-gray-400 focus:border-ug-teal outline-none"
                    />
                  </div>
                  
                  <button 
                    type="button"
                    disabled={updatingPassword}
                    onClick={handleResetPassword}
                    className="w-full bg-ug-navy hover:bg-ug-teal text-white py-2 rounded-lg font-semibold text-[11px] tracking-wide transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {updatingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setIsResettingPassword(true)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition group text-left border border-transparent hover:border-gray-100 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Lock size={16} className="text-gray-400 group-hover:text-ug-navy transition" />
                    <span className="text-[11px] font-semibold text-gray-500 tracking-wide">Reset Password</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-ug-navy group-hover:translate-x-0.5 transition" />
                </button>
              )}

              <button 
                type="button" 
                onClick={handleDownloadData}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition group text-left border border-transparent hover:border-gray-100 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Download size={16} className="text-gray-400 group-hover:text-ug-navy transition" />
                  <span className="text-[11px] font-semibold text-gray-500 tracking-wide">Download Data</span>
                </div>
              </button>
              
              <button 
                type="button" 
                onClick={() => {
                  setDeletePassword('');
                  setDeleteReasonCategory('No longer using the platform / Found an alternative');
                  setDeleteReasonDetails('');
                  setDeleteConfirmedCheck(false);
                  setIsDeleteModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 hover:bg-red-50 rounded-xl transition group text-left border border-transparent hover:border-red-100 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={16} className="text-gray-400 group-hover:text-red-500 transition" />
                  <span className="text-[11px] font-semibold text-gray-500 tracking-wide group-hover:text-red-600 transition">Delete Account</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Privacy Disclaimer */}
      <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <p className="text-[11px] md:text-xs text-gray-400 font-medium leading-relaxed max-w-2xl">
          "Your data is used specifically for matchmaking and is never shared with third-party advertisers."
        </p>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-ug-teal/5 rounded-full border border-ug-teal/10 shrink-0">
          <span className="w-1.5 h-1.5 bg-ug-teal rounded-full animate-pulse"></span>
          <span className="text-[11px] font-semibold tracking-wide text-ug-teal">Encrypted & Secure</span>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ug-navy/60 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl relative w-full max-w-lg overflow-hidden animate-fade-in z-[160] max-h-[90vh] flex flex-col">
            <div className="p-8 md:p-10 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-ug-navy tracking-tight">Edit Profile Info</h3>
                <p className="text-[11px] font-semibold text-gray-400 tracking-wide mt-1">Name & Profile Picture</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-ug-navy rounded-full flex items-center justify-center transition text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSaveEditModal} className="p-8 md:p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              {/* Profile Picture Selector */}
              <div className="flex flex-col items-center gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-2xl overflow-hidden bg-gray-50 border-4 border-gray-100 shadow-lg cursor-pointer relative group/avatar"
                >
                  {editAvatarPreview ? (
                    <img src={editAvatarPreview} className="w-full h-full object-cover group-hover/avatar:scale-110 transition duration-500" alt="New Avatar" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-ug-navy/5">
                      <UserIcon size={48} strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-ug-navy/60 opacity-0 group-hover/avatar:opacity-100 transition duration-200 flex flex-col items-center justify-center text-white text-[11px] font-semibold tracking-wider backdrop-blur-[2px]">
                    <Camera size={18} className="mb-1" />
                    Upload
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl text-[11px] font-semibold tracking-wide transition"
                >
                  Choose Image
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditAvatarFile(file);
                      setEditAvatarPreview(URL.createObjectURL(file));
                    }
                  }} 
                />
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-gray-500 tracking-wide ml-1">Full Name / Display Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-50 border border-transparent focus:border-ug-teal focus:bg-white focus:ring-4 focus:ring-ug-teal/5 rounded-2xl p-4 font-bold text-ug-navy outline-none transition-all text-sm"
                  placeholder="Enter dynamic display name..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-ug-navy transition rounded-2xl text-[11px] font-semibold tracking-wide"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-ug-navy text-white hover:bg-ug-teal transition rounded-2xl text-[11px] font-semibold tracking-wide shadow-xl font-bold"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 my-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl relative w-full max-w-lg overflow-hidden animate-fade-in my-auto flex flex-col max-h-[85vh] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 flex justify-between items-start shrink-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shrink-0">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-ug-navy">Delete Account</h3>
                  <p className="text-[11px] font-semibold tracking-wider text-gray-400 mt-0.5">Permanent Offboarding & Data Erasure</p>
                </div>
              </div>
              <button 
                type="button"
                disabled={deletingAccount}
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-8 h-8 bg-gray-50 text-gray-400 hover:text-ug-navy rounded-full flex items-center justify-center transition text-xl font-bold cursor-pointer disabled:opacity-50 shrink-0"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
              <div className="p-3.5 sm:p-4 bg-red-50/70 rounded-2xl border border-red-100/90 text-red-800 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-red-600 shrink-0" />
                  Warning: This action cannot be undone.
                </p>
                <p className="text-[11px] text-red-700/90 leading-relaxed">
                  Deleting your account will permanently remove your profile, project associations, watchlist, and saved alert preferences.
                </p>
              </div>

              <form onSubmit={handleConfirmDeleteAccount} className="space-y-5">
                {/* Reason Category Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold tracking-wider text-gray-500 block">
                    Why are you deleting your account? <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={deleteReasonCategory}
                    onChange={(e) => setDeleteReasonCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-ug-navy focus:outline-none focus:ring-2 focus:ring-ug-teal/50 cursor-pointer"
                    required
                  >
                    <option value="No longer using the platform / Found an alternative">No longer using the platform / Found an alternative</option>
                    <option value="Privacy or data security concerns">Privacy or data security concerns</option>
                    <option value="Too many notifications or alerts">Too many notifications or alerts</option>
                    <option value="Created a duplicate or test account">Created a duplicate or test account</option>
                    <option value="Difficulty navigating or using the hub">Difficulty navigating or using the hub</option>
                    <option value="Other reason (please specify below)">Other reason (please specify below)</option>
                  </select>
                </div>

                {/* Additional Details */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold tracking-wider text-gray-500 block">
                    Additional Details / Feedback (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={deleteReasonDetails}
                    onChange={(e) => setDeleteReasonDetails(e.target.value)}
                    placeholder="Please tell us how we could improve the Virtual Industry Hub..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-ug-navy focus:outline-none focus:ring-2 focus:ring-ug-teal/50 resize-none"
                  />
                </div>

                {/* Password Confirmation */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold tracking-wider text-gray-500 block">
                    Confirm Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-ug-navy focus:outline-none focus:ring-2 focus:ring-ug-teal/50"
                  />
                </div>

                {/* Confirmation Checkbox */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="confirmDeleteCheck"
                    checked={deleteConfirmedCheck}
                    onChange={(e) => setDeleteConfirmedCheck(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    required
                  />
                  <label htmlFor="confirmDeleteCheck" className="text-[11px] font-bold text-gray-600 cursor-pointer leading-tight">
                    I understand that deleting my account is permanent and cannot be reversed.
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={deletingAccount}
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold   rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deletingAccount || !deletePassword || !deleteConfirmedCheck}
                    className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold   rounded-xl transition shadow-lg shadow-red-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {deletingAccount ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Deleting Account...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Permanently Delete Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboards;
