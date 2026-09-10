import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Download, ChevronDown, ChevronUp, Lock, Check, Award, GraduationCap, Eye, Inbox, Briefcase, Handshake, Upload, User as UserIcon, Pencil, Trash2, FileUp, MessageSquare, Clock, File, Activity } from 'lucide-react';
import { Project, User, DisclosureStatus, ProjectStatus } from '../../types';
import { StorageService } from '../../services/storageService';
import { useToast } from '../../contexts/ToastContext';
import { SectionTitle, StatCard } from '../../components/dashboard/DashboardPrimitives';
import { ActiveProjectHero, BookmarkedProjectsList, HubStreamSidebar, UnifiedDashboardProfile } from '../../components/dashboard/DashboardWidgets';
import { isRevealRequestMessage } from '../../lib/messageUtils';

export const ResearcherOverviewPage = ({ 
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
  const [, setLoading] = useState(true);
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
      const [pList, eoiList] = await Promise.all([
        StorageService.getMyProjects(user.id),
        StorageService.getEOIsForPI(user.id),
      ]);
      setProjects(pList);
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
    <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
      <div className="space-y-5 md:col-span-2 lg:col-start-1 lg:col-span-8">
        <UnifiedDashboardProfile user={user} onAction={() => {
           onOpenModal(null);
        }} actionLabel="New Project Disclosure" />
        
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <StatCard label="Live Disclosures" value={projects.length} icon={FileText} />
          <StatCard label="Total Hub Views" value={totalViews >= 1000 ? `${(totalViews/1000).toFixed(1)}k` : totalViews} icon={Eye} />
          <StatCard label="Interactions" value={totalInteractions} icon={Handshake} />
        </div>

        {activeProject && (
          <ActiveProjectHero project={activeProject} />
        )}

        <section className="border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6 md:p-7">
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
        <section className="border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6 md:p-7">
          {/* Header & Filter Controls */}
          <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-ug-teal" /><h2 className="text-lg font-semibold tracking-tight text-ug-navy md:text-xl">Interaction Hub</h2></div>
              <p className="ml-3 mt-1.5 text-sm leading-relaxed text-slate-500">Student applications and technical disclosures</p>
            </div>

            {/* Filter Segmented Control */}
            {eois.length > 0 && (
              <div className="grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto sm:flex-nowrap lg:justify-end">
                <button
                  type="button"
                  aria-pressed={eoiFilter === 'all'}
                  onClick={() => setEoiFilter('all')}
                  className={`flex w-full shrink-0 items-center justify-between gap-2 rounded-full border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all sm:w-auto sm:justify-start ${
                    eoiFilter === 'all'
                      ? 'border-ug-navy bg-ug-navy text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-ug-navy'
                  }`}
                >
                  <span>All</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${eoiFilter === 'all' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {eois.length}
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={eoiFilter === 'pending'}
                  onClick={() => setEoiFilter('pending')}
                  className={`flex w-full shrink-0 items-center justify-between gap-2 rounded-full border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all sm:w-auto sm:justify-start ${
                    eoiFilter === 'pending'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-amber-700'
                  }`}
                >
                  <span>Pending</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${eoiFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'}`}>
                    {eois.filter(e => !e.status || e.status === 'pending').length}
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={eoiFilter === 'disclosures'}
                  onClick={() => setEoiFilter('disclosures')}
                  className={`flex w-full shrink-0 items-center justify-between gap-2 rounded-full border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all sm:w-auto sm:justify-start ${
                    eoiFilter === 'disclosures'
                      ? 'border-pink-600 bg-pink-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-pink-200 hover:text-pink-700'
                  }`}
                >
                  <span>Disclosures</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${eoiFilter === 'disclosures' ? 'bg-white/20 text-white' : 'bg-pink-50 text-pink-700'}`}>
                    {eois.filter(e => isRevealRequestMessage(e.message)).length}
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={eoiFilter === 'applications'}
                  onClick={() => setEoiFilter('applications')}
                  className={`flex w-full shrink-0 items-center justify-between gap-2 rounded-full border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all sm:w-auto sm:justify-start ${
                    eoiFilter === 'applications'
                      ? 'border-ug-teal bg-ug-teal text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-ug-teal'
                  }`}
                >
                  <span>Applications</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${eoiFilter === 'applications' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700'}`}>
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
