
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, DollarSign, Microscope, ShieldCheck, TrendingUp, 
  Users, Bookmark, FileText, CheckCircle2, AlertCircle, Send, Check, Image as ImageIcon,
  Handshake, Lock, Download, Loader2, User as UserIcon, Mail, Building2, ExternalLink, Share2, MessageSquare, X,
  Briefcase, Heart, Lightbulb, FileCode, GraduationCap, Key, BookOpen, Clock, Edit, Trash2
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Project, ProjectStatus, User, Visibility, ResearchArea, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../App';
import { Tr } from '../components/Tr';

// --- CONTACT PI MODAL ---
const ContactPIModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  recipientName: string;
  projectId: string;
}> = ({ isOpen, onClose, recipientName, projectId }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showToast("Authentication Required. Please log in to connect.", "error");
        setSending(false);
        return;
      }

      let senderName = "Research Partner";
      const profile = await StorageService.getProfile(session.user.id);
      if (profile?.name) senderName = profile.name;

      await StorageService.submitEOI(projectId, senderName, `[DIRECT MESSAGE] ${message}`);
      setSent(true);
      showToast("Message Transmitted to PI", "success");
      setTimeout(() => { setSent(false); setMessage(''); onClose(); }, 2000);
    } catch (err: any) {
      showToast(err.message || "Transmission failed. Check your login status.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ug-navy/80 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-fade-in-up relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-ug-teal"></div>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-ug-navy">Connect with PI</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20} /></button>
        </div>
        {sent ? (
          <div className="py-12 text-center animate-fade-in">
             <div className="w-16 h-16 bg-ug-success text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-ug-success/20"><Check size={32} /></div>
             <p className="font-black text-ug-navy uppercase tracking-widest text-sm">Dispatched</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recipient</p><p className="font-bold text-ug-navy">{recipientName}</p></div>
            <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your inquiry..." className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ug-teal/20 font-medium text-gray-700 resize-none"></textarea>
            <button type="submit" disabled={sending} className="w-full bg-[#0092B0] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-ug-navy transition-all">
              {sending ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> Send Message</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// --- EDIT PROJECT MODAL ---
const EditProjectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSave: (updated: Project) => void;
}> = ({ isOpen, onClose, project, onSave }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Project>>({...project});

  useEffect(() => {
    setFormData({...project});
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await StorageService.saveProject(formData);
      showToast("Project record updated successfully.", "success");
      onSave(updated as Project);
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to update project", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ug-navy/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-6 md:p-10 shadow-2xl animate-fade-in-up relative my-8 max-h-[90vh] overflow-y-auto custom-scrollbar text-gray-900">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-ug-navy">Manage Disclosure</h2>
            <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mt-0.5 font-black">Academic Record Administration</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-105 rounded-full transition"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 tracking-widest block uppercase font-mono">Project Title</label>
            <input 
              required 
              type="text" 
              value={formData.title || ''} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold text-ug-navy focus:outline-none focus:ring-2 focus:ring-ug-teal/20" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 tracking-widest block uppercase font-mono">Research Area</label>
              <select 
                value={formData.research_area || ''} 
                onChange={e => setFormData({...formData, research_area: e.target.value as ResearchArea})} 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold text-ug-navy focus:outline-none cursor-pointer"
              >
                {Object.values(ResearchArea).map(area => <option key={area} value={area}>{area}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 tracking-widest block uppercase font-mono">Department</label>
              <input 
                required 
                type="text" 
                value={formData.department || ''} 
                onChange={e => setFormData({...formData, department: e.target.value})} 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold text-ug-navy focus:outline-none" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 tracking-widest block uppercase font-mono">Executive Abstract</label>
            <textarea 
              required 
              rows={4} 
              value={formData.description || ''} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-medium text-gray-600 focus:outline-none resize-none leading-relaxed" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 tracking-widest block uppercase font-mono font-black">Development Stage</label>
              <select 
                value={formData.status || ''} 
                onChange={e => {
                  const status = e.target.value as ProjectStatus;
                  const trl = Object.values(ProjectStatus).indexOf(status) + 1;
                  setFormData({...formData, status, trl});
                }} 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold text-ug-navy focus:outline-none cursor-pointer"
              >
                {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 tracking-widest block uppercase font-mono">Visibility Mode</label>
              <select 
                value={formData.visibility || ''} 
                onChange={e => setFormData({...formData, visibility: e.target.value as Visibility})} 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold text-ug-navy focus:outline-none cursor-pointer"
              >
                {Object.values(Visibility).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 tracking-widest block uppercase font-mono">Estimated Budget</label>
              <input 
                type="text" 
                value={formData.budget || ''} 
                onChange={e => setFormData({...formData, budget: e.target.value})} 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold text-ug-navy focus:outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 tracking-widest block uppercase font-mono">Collaboration Status</label>
              <div className="flex h-14 items-center pl-4 bg-gray-50 border border-gray-200 rounded-2xl">
                <input 
                  type="checkbox" 
                  id="collab-check"
                  checked={formData.open_to_collaboration || false} 
                  onChange={e => setFormData({...formData, open_to_collaboration: e.target.checked})} 
                  className="rounded text-ug-teal focus:ring-ug-teal/20 h-4 w-4 cursor-pointer" 
                />
                <label htmlFor="collab-check" className="ml-3 font-bold text-xs text-ug-navy cursor-pointer">Open to External Proposals</label>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#0092B0] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-ug-navy transition-all">
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [revealCleared, setRevealCleared] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submittingEOI, setSubmittingEOI] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState(false);
  
  // Dynamic Disclosure lock states
  const [pageLoading, setPageLoading] = useState(true);
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);
  const [revealReason, setRevealReason] = useState('Interested in collaboration and potential funding discussion.');
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
  const [downloadingBrief, setDownloadingBrief] = useState(false);
  
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      setPageLoading(true);
      StorageService.getProjects().then(data => {
        const found = data.find(p => p.id === id);
        if (found) {
          setProject({
            ...found,
            views: (found.views || 0) + 1
          });
          if (found.owner_id) StorageService.getProfile(found.owner_id).then(setOwnerProfile);
          // Increment views
          StorageService.incrementProjectMetric(id, 'views');
        }
      }).catch(err => {
        console.error("Failed to load project details:", err);
      }).finally(() => {
        setPageLoading(false);
      });

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          StorageService.isBookmarked(session.user.id, id).then(setIsBookmarked);
          StorageService.getProfile(session.user.id).then(profile => {
            setCurrentUserProfile(profile);
            StorageService.getRevealApprovalDetails(session.user.id, id).then(details => {
              setRevealCleared(details.approved);
              setRemainingMinutes(details.approved ? details.remainingMinutes : null);
            });
          });
        }
      });
    }
  }, [id]);

  useEffect(() => {
    if (!revealCleared || !id || !currentUserProfile?.id) return;
    
    // Periodically sync remaining minutes
    const interval = setInterval(() => {
      StorageService.getRevealApprovalDetails(currentUserProfile.id, id).then(details => {
        setRevealCleared(details.approved);
        setRemainingMinutes(details.approved ? details.remainingMinutes : null);
      });
    }, 15000); // sync every 15 seconds for snappiness
    
    return () => clearInterval(interval);
  }, [revealCleared, id, currentUserProfile?.id]);

  const handleDeleteProject = async () => {
    if (!window.confirm("Are you sure you want to permanently withdraw this research project from the platform? This cannot be undone.")) return;
    try {
      if (project?.id) {
        await StorageService.deleteProject(project.id);
        showToast("Project successfully withdrawn and removed from catalog.", "success");
        navigate('/projects');
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete project", "error");
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `UG Hub: ${project?.title}`, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareFeedback(true);
        showToast("Link Copied", "success");
        setTimeout(() => setShareFeedback(false), 2000);
      }
    } catch (e) {}
  };

  const submitFormalInterest = async (type: string, customReason?: string) => {
    if (!id) return;
    setSubmittingEOI(type);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showToast("Session Required. Please log in.", "error");
        setSubmittingEOI(null);
        return;
      }

      let senderName = "User in Hub";
      const profile = await StorageService.getProfile(session.user.id);
      if (profile?.name) senderName = profile.name;

      let messageText = `[FORMAL EOI] Submission for ${type}. This partner wishes to engage in ${type.toLowerCase()} regarding this innovation.`;

      if (type === 'Graduate Assistantship' || type === 'Research Assistantship') {
        messageText = `[ASSISTANTSHIP_APPLICATION] Student "${senderName}" has formally requested consideration for a Laboratory / Research Assistantship on this project. Education Level: ${profile?.education_level || 'N/A'}. Program/Course: ${profile?.program || 'N/A'}.`;
      } else if (type === 'Scholarship Application') {
        messageText = `[SCHOLARSHIP_APPLICATION] Student "${senderName}" has submitted an inquiry for Academic Scholarship & Fellowships on this project. Current Track: ${profile?.education_level || 'Graduate'}.`;
      } else if (type === 'Lab Workspace Access') {
        messageText = `[LAB_WORKSPACE_ACCESS] Student "${senderName}" is requesting secure authorization to access the workspace relative to this project. Justification: Innovation analysis.`;
      } else if (type === 'Secure Project Reveal') {
        const finalReason = customReason || revealReason;
        messageText = `🔐 Technical Disclosure Request\n\n[${senderName}] has requested access to the technical brief for:\n\nProject: ${project?.title || 'AI-Driven Crop Disease Detection System'}\n\n\nreason \n${finalReason}`;
      }

      // Determine correct metric category based on the interaction type
      const metricToIncrement: 'expressions_of_interest' | 'requests' = (
        type === 'Secure Project Reveal' ||
        type === 'Graduate Assistantship' ||
        type === 'Research Assistantship' ||
        type === 'Scholarship Application' ||
        type === 'Lab Workspace Access'
      ) ? 'requests' : 'expressions_of_interest';

      await StorageService.submitEOI(id, senderName, messageText, undefined, metricToIncrement);
      showToast(`${type} Request Sent`, "success");

      // Instantly increment on local UI state!
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [metricToIncrement]: (prev[metricToIncrement] || 0) + 1
        };
      });

      if (type === 'Secure Project Reveal') {
        showToast("Reveal Request Submitted to PI. Access pending authorization.", "info");
        setIsRevealModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || "Submission failed. Ensure you are signed in.", "error");
    } finally {
      setSubmittingEOI(null);
    }
  };

  const handleDownloadBrief = async () => {
    if (!project?.id) return;
    setDownloadingBrief(true);
    showToast("Authenticating One-Hour Time-Limited Session...", "info");
    
    try {
      // Dynamically fetch the short-lived signed URL from backend to guarantee 1-hour access is strictly enforced
      const signedUrl = await StorageService.getSignedTechnicalBrief(project.id);
      
      const watermarkText = `Shared with ${currentUserProfile?.name || currentUserProfile?.email || 'Authorized Partner'} via Virtual Hub`;
      showToast(`Watermark Applied: "${watermarkText}"`, "success");
      
      setTimeout(() => {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
        setDownloadingBrief(false);
      }, 1000);
    } catch (err: any) {
      showToast(err.message || "Access denied or session expired. Please request reveal again.", "error");
      setDownloadingBrief(false);
    }
  };

  const handleToggleBookmark = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast("Authentication Required. Please log in to bookmark projects.", "error");
        return;
      }
      if (!id) return;
      const result = await StorageService.toggleBookmark(session.user.id, id);
      setIsBookmarked(result);
      if (result) {
        showToast("Project saved to bookmarks.", "success");
        setProject(prev => {
          if (!prev) return null;
          return {
            ...prev,
            impact_metrics: {
              ...(prev.impact_metrics || { views: 0, requests: 0, bookmarks: 0 }),
              bookmarks: ((prev.impact_metrics?.bookmarks || 0) + 1)
            }
          };
        });
      } else {
        showToast("Project removed from bookmarks.", "info");
        setProject(prev => {
          if (!prev) return null;
          return {
            ...prev,
            impact_metrics: {
              ...(prev.impact_metrics || { views: 0, requests: 0, bookmarks: 0 }),
              bookmarks: Math.max(0, (prev.impact_metrics?.bookmarks || 1) - 1)
            }
          };
        });
      }
    } catch (err: any) {
      showToast(err.message || "Failed to toggle bookmark", "error");
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-ug-teal" size={40} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white border border-gray-100 rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-ug-navy uppercase tracking-tight">Node Access Secure</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              This academic blueprint is restricted, internal-only, draft status, or does not exist. Authorized researchers must login to retrieve internal research.
            </p>
          </div>
          <button 
            onClick={() => navigate('/projects')} 
            className="w-full bg-[#0092B0] hover:bg-ug-navy text-white font-black uppercase text-xs tracking-widest py-3.5 rounded-2xl transition shadow-md"
          >
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  const images = (project.image_url || '').split('|').filter(Boolean);
  if (images.length === 0) {
    images.push('https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="relative min-h-[480px] md:h-[480px] w-full overflow-hidden flex items-end pb-8 md:pb-16 pt-24">
        <img src={images[0]} alt={project.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ug-navy via-ug-navy/60 to-transparent"></div>
        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <button onClick={() => navigate('/projects')} className="text-white/60 hover:text-white flex items-center gap-2 mb-6 text-xs font-black uppercase tracking-[0.2em] cursor-pointer"><ArrowLeft size={16} /> <Tr text="Return to Hub" /></button>
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 text-white backdrop-blur-md border border-white/20"><Tr text={project.status} /></span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter drop-shadow-2xl leading-tight"><Tr text={project.title} /></h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 animate-fade-in-up mt-4 md:mt-0">
              <button onClick={handleShare} className="relative h-[56px] w-[56px] md:h-[64px] md:w-[64px] rounded-[18px] bg-white/10 border border-white/20 shadow-lg hover:bg-white/20 transition-all flex items-center justify-center text-white group cursor-pointer" title="Share Project">
                <Share2 size={24} className="group-hover:scale-110 transition" />
              </button>
              {currentUserProfile && (
                <button 
                  onClick={handleToggleBookmark} 
                  className={`relative h-[56px] w-[56px] md:h-[64px] md:w-[64px] rounded-[18px] border shadow-lg transition-all flex items-center justify-center group cursor-pointer ${isBookmarked ? 'bg-ug-teal text-white border-ug-teal hover:bg-ug-teal/90' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`} 
                  title={isBookmarked ? "Remove Bookmark" : "Bookmark Project"}
                >
                  <Bookmark size={24} className={`transition group-hover:scale-110 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
              )}
              <button 
                onClick={() => {
                  if (!currentUserProfile) {
                    showToast("Authentication Required. Please log in to connect with PI.", "error");
                  } else {
                    setIsContactModalOpen(true);
                  }
                }} 
                className="px-6 md:px-10 h-[56px] md:h-[64px] bg-[#0092B0] hover:bg-[#007C96] rounded-[22px] shadow-xl flex items-center justify-center gap-3 md:gap-4 transition-all active:scale-95 group relative overflow-hidden border border-white/10 cursor-pointer"
              >
                <MessageSquare size={20} className="text-white" />
                <span className="text-white font-black text-xs md:text-sm uppercase tracking-widest leading-tight text-left"><Tr text="Connect with PI" /></span>
              </button>
              {(currentUserProfile?.id === project.owner_id || currentUserProfile?.role === UserRole.Admin) && (
                <>
                  <button onClick={() => setIsEditModalOpen(true)} className="px-6 md:px-8 h-[56px] md:h-[64px] bg-white text-ug-navy hover:bg-gray-100 rounded-[22px] shadow-xl flex items-center justify-center gap-2.5 transition-all active:scale-95 border border-gray-200 cursor-pointer">
                    <Edit size={18} className="text-[#0092B0]" />
                    <span className="font-black text-[10px] md:text-[11px] uppercase tracking-wider text-ug-navy text-left leading-tight"><Tr text="Manage Disclosure" /></span>
                  </button>
                  <button onClick={handleDeleteProject} className="px-6 md:px-8 h-[56px] md:h-[64px] bg-red-600 hover:bg-red-700 text-white rounded-[22px] shadow-xl flex items-center justify-center gap-2.5 transition-all active:scale-95 border border-red-500 cursor-pointer">
                    <Trash2 size={18} className="text-white" />
                    <span className="font-black text-[10px] md:text-[11px] uppercase tracking-wider text-left leading-tight text-white"><Tr text="Withdraw Record" /></span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          {!currentUserProfile && (
            <div className="p-8 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 flex items-start gap-4 shadow-sm animate-fade-in">
              <span className="p-3 bg-indigo-600 text-white rounded-2xl shrink-0">
                <Lock size={20} />
              </span>
              <div>
                <h4 className="font-black text-indigo-900 text-sm uppercase tracking-wider"><Tr text="Public Visitor Mode" /></h4>
                <p className="text-gray-600 text-xs font-medium leading-relaxed mt-1">
                  <Tr text="Sensitive technical specs, full blueprints, laboratory logs, and direct expression of interest actions on this research project are restricted to verified institutional members." />
                  <span className="font-bold text-indigo-900 ml-1"><Tr text="Please log in to your account to request authorized disclosure or connect with the PI." /></span>
                </p>
              </div>
            </div>
          )}

          {/* Executive Summary */}
          <section className="bg-white p-5 md:p-10 lg:p-12 rounded-2xl md:rounded-[2.5rem] lg:rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden">
            <h2 className="text-2xl font-black text-ug-navy mb-6 flex items-center gap-3"><FileText className="text-ug-teal" /> <Tr text="Executive Summary" /></h2>
            <p className="text-gray-600 leading-relaxed text-lg md:text-xl font-normal text-left sm:text-justify" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
              <Tr text={project.description?.replace(/[\u00ad\u200b\u200c\u200d\ufeff]/g, '') || ''} />
            </p>
          </section>

          {images[1] && (
            <section className="bg-white p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] lg:rounded-[3rem] border border-gray-100 shadow-sm">
              <h2 className="text-2xl font-black text-ug-navy mb-6 flex items-center gap-3"><ImageIcon className="text-ug-teal" /> <Tr text="Visual Disclosure" /></h2>
              <img src={images[1]} alt="Evidence" className="w-full rounded-xl md:rounded-[2rem] shadow-lg" />
            </section>
          )}

          {project.achievements && project.achievements.length > 0 && (
            <section className="bg-white p-5 md:p-10 lg:p-12 rounded-2xl md:rounded-[2.5rem] lg:rounded-[3rem] border border-gray-100 shadow-sm">
              <h2 className="text-xl md:text-2xl font-black text-ug-navy mb-6 md:mb-8 flex items-center gap-3 md:gap-4">
                <CheckCircle2 className="text-ug-success" size={24} /> <Tr text="Key Milestones & Achievements" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {project.achievements.map((item, i) => {
                  const cleanedItem = item.replace(/^(\s*[•\-\*]|\s*\d+\.)\s*/, '');
                  return (
                    <div key={i} className="flex items-start gap-4 md:gap-5 p-4 md:p-6 bg-gray-50 rounded-2xl md:rounded-3xl border border-gray-100 group hover:border-ug-teal/20 hover:bg-white transition-all duration-300">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-ug-teal/10 text-ug-teal font-black text-xs flex items-center justify-center shrink-0 group-hover:bg-ug-teal group-hover:text-white transition-all duration-300">
                        {i + 1}
                      </div>
                      <p className="text-gray-600 font-bold leading-relaxed text-xs md:text-sm"><Tr text={cleanedItem} /></p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* PI CARD */}
          <section className="bg-white p-5 md:p-8 lg:p-10 rounded-2xl md:rounded-[2.5rem] lg:rounded-[3rem] border border-gray-100 shadow-sm">
            <h3 className="text-base md:text-lg font-black text-ug-navy mb-4 md:mb-6 flex items-center gap-2"><UserIcon size={18} className="text-ug-teal" /> <Tr text="Lead Investigator" /></h3>
            {ownerProfile ? (
              <div className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden border-2 border-ug-teal/20 shadow-sm"><img src={ownerProfile.avatar_url} className="w-full h-full object-cover" /></div>
                  <div>
                    <h4 className="font-black text-ug-navy text-base md:text-lg leading-tight">{ownerProfile.name}</h4>
                    <p className="text-[9px] md:text-[10px] font-black text-ug-teal uppercase tracking-widest mt-1"><Tr text={ownerProfile.role} /></p>
                  </div>
                </div>
                <Link to={`/researcher/${ownerProfile.id}`} className="w-full py-3 md:py-4 bg-ug-navy text-white font-black text-[9px] md:text-[10px] uppercase tracking-[0.25em] md:tracking-[0.3em] rounded-xl md:rounded-2xl flex items-center justify-center gap-2 hover:bg-ug-teal transition-all shadow-lg text-center"><Tr text="Access Full Portfolio" /> <ExternalLink size={12} /></Link>
              </div>
            ) : <div className="text-center py-4 md:py-6 text-gray-400 font-bold text-xs"><Tr text="Bio Loading..." /></div>}
          </section>

          {/* DEDICATED DOWNLOAD BLOCK - If Available */}
          {project.technical_details_url && (
            <section className="bg-white p-5 md:p-6 lg:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-lg animate-fade-in-up relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-ug-navy/5 rounded-full blur-2xl group-hover:bg-ug-navy/10 transition-colors"></div>
              <div className="relative z-10">
                <h3 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 md:mb-4 flex items-center gap-2">
                  <FileCode size={14} className="text-ug-navy" /> Technical Brief
                </h3>

                {(currentUserProfile?.id === project.owner_id || revealCleared) ? (
                  <div className="p-4 md:p-6 bg-ug-teal/5 rounded-2xl md:rounded-3xl border border-ug-teal/15 flex flex-col items-center text-center">
                    {remainingMinutes !== null && (
                      <span className="mb-3 md:mb-4 flex items-center gap-1.5 text-pink-700 text-[9px] md:text-xs font-extrabold uppercase tracking-wider bg-pink-50 px-2.5 py-1 rounded-lg md:rounded-xl border border-pink-150">
                        <Clock size={11} className="animate-pulse animate-duration-1000 shrink-0" /> Decrypted Access: {remainingMinutes} min remaining
                      </span>
                    )}
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl shadow-sm flex items-center justify-center text-ug-teal mb-3 md:mb-4 group-hover:scale-105 transition-transform">
                      {downloadingBrief ? <Loader2 className="animate-spin text-ug-navy" size={24} /> : <Download size={24} />}
                    </div>
                    <h4 className="font-bold text-ug-navy text-xs md:text-sm mb-0.5">{downloadingBrief ? "Authenticating Session..." : "Technical Disclosure"}</h4>
                    <p className="text-[8px] md:text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-4 md:mb-6">PDF Document • {project.research_area}</p>
                    <button 
                      onClick={handleDownloadBrief}
                      disabled={downloadingBrief}
                      className="w-full py-2.5 md:py-3 px-4 bg-ug-teal text-white rounded-xl md:rounded-2xl font-bold text-xs md:text-sm uppercase tracking-wider hover:bg-ug-navy transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingBrief ? "Generating Document..." : "Download Document"}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 md:p-6 bg-gray-50 rounded-2xl md:rounded-3xl border border-gray-200 flex flex-col items-center text-center relative overflow-hidden min-h-[160px] md:min-h-[180px]">
                    <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 md:p-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-ug-navy text-white rounded-full flex items-center justify-center shadow-lg mb-2.5">
                        <Lock size={16} />
                      </div>
                      <h4 className="font-bold text-ug-navy text-xs md:text-sm mb-0.5 uppercase tracking-wide">🔒 Disclosure Locked</h4>
                      <p className="text-[8px] md:text-[9px] text-gray-500 font-medium uppercase tracking-wider text-center px-2 md:px-4 leading-relaxed mb-3 md:mb-4">
                        Requires Lead Investigator Approval & Privacy Agreement Clearance.
                      </p>
                      <button 
                        onClick={() => {
                          setRevealReason('Interested in collaboration and potential funding discussion.');
                          setIsRevealModalOpen(true);
                        }}
                        className="bg-ug-navy hover:bg-pink-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-xs font-bold uppercase tracking-wider transition shadow-md hover:scale-[1.02] active:scale-95 cursor-pointer"
                      >
                        Request Reveal
                      </button>
                    </div>
                    {/* Blurred background preview */}
                    <div className="opacity-10 pointer-events-none select-none filter blur-md w-full flex flex-col items-center py-2">
                      <div className="w-12 h-12 bg-gray-200 rounded-2xl mb-4"></div>
                      <div className="h-4 bg-gray-300 w-3/4 rounded mb-2"></div>
                      <div className="h-3 bg-gray-300 w-1/2 rounded"></div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* COMPACT SUBMISSION OF INTEREST BLOCK */}
          <section className="bg-ug-navy p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl relative overflow-hidden text-white border border-white/10">
            <div className="absolute top-0 right-0 w-24 h-24 bg-ug-teal/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <h2 className="text-xs md:text-sm font-black mb-0.5 flex items-center gap-1.5">
                <Briefcase className="text-ug-teal" size={16} /> 
                {currentUserProfile?.role === 'Student' ? 'Student Application' : 'Submission of Interest'}
              </h2>
              <p className="text-gray-400 text-[7.5px] md:text-[8px] mb-4 md:mb-5 font-bold uppercase tracking-widest">
                {currentUserProfile?.role === 'Student' ? 'Academic Opportunities Track' : 'Formal partnership track'}
              </p>
              
              <div className="flex flex-col gap-2 md:gap-2.5">
                {(currentUserProfile?.role === 'Student' ? [
                  { label: "Research Assistantship", icon: GraduationCap, color: "hover:bg-ug-teal" },
                  { label: "Scholarship Application", icon: DollarSign, color: "hover:bg-ug-success" },
                  { label: "Lab Workspace Access", icon: Key, color: "hover:bg-purple-500" }
                ] : currentUserProfile?.role === 'Researcher' ? [
                  { label: "Partner/Co-Investigate", icon: Users, color: "hover:bg-ug-teal" },
                  { label: "Venture Funding", icon: DollarSign, color: "hover:bg-ug-success" },
                  { label: "Resource Access", icon: Key, color: "hover:bg-purple-500" }
                ] : [
                  { label: "Commercialization", icon: TrendingUp, color: "hover:bg-ug-teal" },
                  { label: "Venture Funding", icon: DollarSign, color: "hover:bg-ug-success" },
                  { label: "Technical Mentorship", icon: Lightbulb, color: "hover:bg-purple-500" }
                ]).map((action) => (
                  <button
                    key={action.label}
                    disabled={!!submittingEOI}
                    onClick={() => submitFormalInterest(action.label)}
                    className={`flex items-center gap-2.5 md:gap-3.5 p-2.5 md:p-3 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl transition-all group ${action.color} disabled:opacity-50 text-left cursor-pointer`}
                  >
                    <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-white/10 text-ug-teal group-hover:text-white transition-colors flex-shrink-0">
                      {submittingEOI === action.label ? <Loader2 className="animate-spin" size={14} /> : <action.icon size={15} />}
                    </div>
                    <span className="text-[9px] md:text-xs font-black uppercase tracking-widest">{action.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 md:mt-5 text-[8px] md:text-[9px] text-gray-500 font-bold uppercase tracking-widest text-center">Instant portal notification triggered on click.</p>
            </div>
          </section>

          {/* IMPACT SCORING */}
          <section className="bg-white p-5 md:p-6 lg:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm">
             <h3 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-ug-teal" /> Ecosystem Impact
             </h3>
             
             {/* COMPOSITE SCORE MODULE */}
             {(() => {
                const viewsCount = project.views || 0;
                const eoiCount = project.expressions_of_interest || 0;
                const requestsCount = project.requests || 0;
                const dynamicIndex = (viewsCount * 1) + (eoiCount * 8) + (requestsCount * 15);
                
                let tractionRank = "Inception Stage";
                let rankColor = "text-blue-700 bg-blue-50 border-blue-200/40";
                let progressPercentage = Math.min((dynamicIndex / 150) * 100, 100);
                
                if (dynamicIndex >= 150) {
                  tractionRank = "Ecosystem Breakthrough";
                  rankColor = "text-pink-700 bg-pink-50 border-pink-200/40 animate-pulse";
                } else if (dynamicIndex >= 50) {
                  tractionRank = "High-Engagement Innovation";
                  rankColor = "text-purple-700 bg-purple-50 border-purple-200/40";
                } else if (dynamicIndex >= 10) {
                  tractionRank = "Active Traction";
                  rankColor = "text-ug-teal bg-ug-teal/5 border-ug-teal/20";
                }

                return (
                  <div className="space-y-4">
                    {/* Compact Score Header */}
                    <div className="bg-gradient-to-br from-ug-navy to-slate-900 text-white rounded-xl p-3.5 shadow-md relative overflow-hidden flex items-center justify-between gap-3">
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0092B0_1px,transparent_1px)] [background-size:16px_16px]"></div>
                      <div className="relative z-10 flex flex-col items-start">
                        <span className="text-[8px] md:text-[9px] font-bold text-ug-teal uppercase tracking-wider block mb-0.5">Ecosystem Impact Index</span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[7.5px] md:text-[8px] font-bold uppercase tracking-wider border ${rankColor}`}>
                          {tractionRank}
                        </span>
                      </div>
                      <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm relative z-10 pr-1">{dynamicIndex}</span>
                    </div>

                    {/* Progress Bar of Traction */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        <span>Milestone Progress</span>
                        <span>{Math.round(progressPercentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-ug-teal to-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Breakdown of real numbers */}
                    <div className="space-y-2 pt-0.5">
                       <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Traction Breakdown</span>
                       
                       <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                         <div className="p-2 bg-gray-50 rounded-xl border border-gray-100/50 text-center flex flex-col justify-between min-h-[56px] hover:bg-gray-100/30 transition-colors">
                           <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate">Views</span>
                           <span className="text-xs md:text-sm font-black text-ug-navy my-0.5">{viewsCount}</span>
                           <span className="text-[7px] text-gray-400 font-semibold uppercase tracking-wide shrink-0">+1 Pt</span>
                         </div>
                         <div className="p-2 bg-gray-50 rounded-xl border border-gray-100/50 text-center flex flex-col justify-between min-h-[56px] hover:bg-gray-100/30 transition-colors">
                           <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate">EOIs</span>
                           <span className="text-xs md:text-sm font-black text-ug-navy my-0.5">{eoiCount}</span>
                           <span className="text-[7px] text-gray-400 font-semibold uppercase tracking-wide shrink-0">+8 Pts</span>
                         </div>
                         <div className="p-2 bg-gray-50 rounded-xl border border-gray-100/50 text-center flex flex-col justify-between min-h-[56px] hover:bg-gray-100/30 transition-colors">
                           <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate">Requests</span>
                           <span className="text-xs md:text-sm font-black text-ug-navy my-0.5">{requestsCount}</span>
                           <span className="text-[7px] text-gray-400 font-semibold uppercase tracking-wide shrink-0">+15 Pts</span>
                         </div>
                       </div>

                       {!project.technical_details_url && (
                         <div className="p-2 bg-red-50/50 rounded-xl flex items-center gap-2 border border-red-100/30">
                           <AlertCircle size={12} className="text-red-400 shrink-0" />
                           <span className="text-[7.5px] md:text-[8px] font-bold text-red-700 uppercase tracking-wider leading-relaxed">
                             Technical Brief is restricted for non-owners
                           </span>
                         </div>
                       )}
                    </div>
                  </div>
                );
             })()}
          </section>
        </div>
      </div>
      <ContactPIModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} recipientName={ownerProfile?.name || "PI"} projectId={id!} />

      {/* REVEAL PROMPT MODAL */}
      {isRevealModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ug-navy/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-fade-in-up relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-pink-600"></div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-ug-navy flex items-center gap-2">
                <Lock size={20} className="text-pink-600 animate-pulse" /> Request Secure Reveal
              </h2>
              <button onClick={() => setIsRevealModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20} /></button>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed mb-6 font-medium">
              You are requesting temporary, time-limited 1-hour session access to analyze the decrypted Technical Disclosure brief for:
              <strong className="block text-ug-navy mt-1">"{project?.title}"</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Statement of Intended Reason / Justification</label>
                <textarea 
                  required
                  rows={4}
                  value={revealReason}
                  onChange={(e) => setRevealReason(e.target.value)}
                  placeholder="E.g. Interested in scientific collaboration or licensing inquiry..."
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 font-medium text-xs text-gray-700 resize-none focus:bg-white transition-all"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRevealModalOpen(false)}
                  className="flex-1 py-3.5 border border-gray-200 text-gray-500 font-black text-[10px] uppercase tracking-wider rounded-2xl hover:bg-gray-50 transition animate-duration-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingEOI === 'Secure Project Reveal' || !revealReason.trim()}
                  onClick={() => submitFormalInterest('Secure Project Reveal')}
                  className="flex-1 py-3.5 bg-pink-600 hover:bg-pink-700 text-white font-black text-[10px] uppercase tracking-wider rounded-2xl transition shadow-lg shadow-pink-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingEOI === 'Secure Project Reveal' ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isEditModalOpen && project && (
        <EditProjectModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          project={project} 
          onSave={(updated) => setProject(updated)} 
        />
      )}
    </div>
  );
};

export default ProjectDetail;
