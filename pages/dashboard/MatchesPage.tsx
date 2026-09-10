import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Globe,
  Handshake,
  Info,
  Loader2,
  MessageSquare,
  Rocket,
  Send as SendIcon,
  Sparkles,
  Target,
  User as UserIcon,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IndustryChallengesMatcher } from '../../components/IndustryChallengesMatcher';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import { AIProfileService } from '../../services/aiProfileService';
import { EmbeddingService } from '../../services/embeddingService';
import { MatchingService } from '../../services/matchingService';
import { StorageService } from '../../services/storageService';
import { AIProfile, ProjectStatus, User, UserRole } from '../../types';

export const MatchesPage = ({ 
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
      // Safety: Ensure embedding is 768 before sending to Postgres
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
        (async () => {
          const rankedProfiles = await MatchingService.rankMatches(user.ai_profile!, profiles);
          const rankedProjects = await MatchingService.rankMatches(user.ai_profile!, projects);
          if (rankedProfiles && rankedProfiles.length > 0) setProfileMatches(rankedProfiles);
          if (rankedProjects && rankedProjects.length > 0) setProjectMatches(rankedProjects);
        })().catch((rankError) => {
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
          // Re-fetch user profile once to see if it was updated in background
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
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 className="animate-spin text-ug-teal" size={32} />
        <p className="text-[11px] font-medium text-gray-400 tracking-wide animate-pulse">Finding matches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 font-sans text-sm">
      <header className="border-b border-slate-200/80 pb-5">
        <p className="text-xs font-medium text-ug-teal">Discovery workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ug-navy md:text-3xl">Find your next match</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">Explore research challenges, projects, and people aligned with your profile.</p>
      </header>
      
      {/* Sub-navigation tabs */}
      <div className="grid grid-cols-2 gap-1 border border-slate-200/80 bg-slate-50 p-1 sm:inline-flex sm:w-auto">
        <button
          type="button"
          onClick={() => setActiveTabSub('challenges')}
          className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold transition-all sm:min-w-36 ${
            activeTabSub === 'challenges'
              ? 'bg-white text-ug-navy shadow-sm'
              : 'text-slate-500 hover:text-ug-navy'
          }`}
        >
          <Sparkles size={14} className={activeTabSub === 'challenges' ? 'text-ug-teal' : ''} />
          Challenges
        </button>
        <button
          type="button"
          onClick={() => setActiveTabSub('traditional')}
          className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold transition-all sm:min-w-36 ${
            activeTabSub === 'traditional'
              ? 'bg-white text-ug-navy shadow-sm'
              : 'text-slate-500 hover:text-ug-navy'
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
           <div className="border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6">
         <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
           <div><h2 className="text-lg font-semibold tracking-tight text-ug-navy">Project matches</h2><p className="mt-1 text-xs text-slate-500">Projects where your profile may create value.</p></div>

          {/* Controls: Rerun Matching and Status */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRerunMatching}
              disabled={isRerunning || isProcessing}
              className={`group flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-300 ${
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



        <div className="space-y-3">
          {(showAllProjects ? projectMatches : projectMatches.slice(0, 5)).map((proj, i) => (
             <div key={proj.id} className="border border-slate-200/80 bg-white p-4 text-left transition-all hover:border-ug-teal/30 hover:shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                 <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ug-navy/5 text-ug-navy">
                  {proj.image_url && proj.image_url.trim() !== '' ?
                    <img src={proj.image_url.split('|')[0] || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80'} className="w-full h-full object-cover" alt="" /> :
                    <Globe size={20} />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="min-w-0 text-sm font-semibold leading-snug tracking-tight text-ug-navy sm:text-base">{proj.title}</h4>
                    {proj.ai_score !== undefined && proj.ai_score !== null && !isNaN(Number(proj.ai_score)) && (
                       <span className="shrink-0 rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-ug-teal">
                        {Math.round(Number(proj.ai_score))}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                     {proj.research_area && <span className="text-xs font-medium text-slate-500">{proj.research_area}</span>}
                     <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
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
                    <p className="mt-2 line-clamp-2 text-sm font-normal leading-relaxed text-slate-600">{proj.ai_reasoning || proj.description || 'Profile alignment identified from your matching signals.'}</p>
                </div>
              </div>
               <div className="mt-4 flex justify-stretch border-t border-slate-100 pt-4 sm:justify-end">
                 <button onClick={(e) => { e.stopPropagation(); handleExpressInterestClick(proj); }} className="w-full bg-ug-navy px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-ug-teal active:scale-[.98] sm:w-auto">Express interest</button>
              </div>
            </div>
          ))}
          {projectMatches.length > 5 && !showAllProjects && (
            <button 
              onClick={() => setShowAllProjects(true)}
               className="w-full border border-dashed border-slate-200 py-3 text-xs font-semibold text-slate-500 transition-all hover:border-ug-teal hover:text-ug-teal"
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

       <div className="border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6">
         <div className="mb-5 flex items-center gap-2.5 border-b border-slate-100 pb-4">
           <Users size={16} className="text-ug-teal" />
           <div><h2 className="text-lg font-semibold tracking-tight text-ug-navy">Suggested collaborators</h2><p className="mt-1 text-xs text-slate-500">People with complementary expertise.</p></div>
        </div>

        <div className="space-y-3">
           {(showAllProfiles ? profileMatches : profileMatches.slice(0, 5)).map((collab, i) => (
             <div key={collab.id} className="border border-slate-200/80 bg-white p-4 text-left transition-all hover:border-ug-teal/30 hover:shadow-sm sm:p-5">
               <div className="flex items-start gap-3">
                 <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden bg-ug-navy shrink-0">
                   {collab.avatar_url || collab.image_url ?
                     <img src={collab.avatar_url || collab.image_url} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" /> :
                     <UserIcon className="w-full h-full p-3.5 text-white/20" />
                   }
                 </div>
                 <div className="min-w-0 flex-1">
                   <div className="flex items-start justify-between gap-3">
                     <div className="min-w-0">
                         <h4 className="truncate text-sm font-semibold tracking-tight text-ug-navy sm:text-base">{collab.name || 'UG Science Partner'}</h4>
                         <p className="truncate text-xs font-medium text-ug-teal">{collab.role}</p>
                     </div>
                     {collab.ai_score !== undefined && collab.ai_score !== null && !isNaN(Number(collab.ai_score)) && (
                       <span className="shrink-0 rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-ug-teal">
                         {Math.round(Number(collab.ai_score))}%
                       </span>
                     )}
                   </div>
                   {(collab.ai_reasoning || collab.semantic_summary) && (
                       <p className="mt-2 line-clamp-2 text-sm font-normal leading-relaxed text-slate-600">
                         {collab.ai_reasoning || collab.semantic_summary}
                      </p>
                   )}
                 </div>
               </div>
                 <div className="mt-4 flex flex-row gap-2 border-t border-slate-100 pt-4 sm:justify-end">
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     if (setLocalInitialThreadId && setActiveTab) {
                       setLocalInitialThreadId(collab.id);
                       setActiveTab('messages');
                     }
                   }}
                     className="min-w-0 flex-1 border border-slate-200 bg-white px-2 py-2.5 text-xs font-semibold text-ug-navy transition hover:border-ug-teal hover:text-ug-teal active:scale-[.98] sm:flex-none sm:px-3"
                   title="Open direct chat"
                 >
                   <span className="flex items-center gap-1"><MessageSquare size={12} /> Chat</span>
                 </button>
                 <button
                   onClick={(e) => { e.stopPropagation(); handleInitiateCollaborationClick(collab); }}
                     className="min-w-0 flex-1 bg-ug-navy px-2 py-2.5 text-xs font-semibold text-white transition hover:bg-ug-teal active:scale-[.98] sm:flex-none sm:px-3.5"
                 >
                   Initiate Proposal
                 </button>
               </div>
             </div>
           ))}

            {profileMatches.length > 5 && !showAllProfiles && (
               <button
                 onClick={() => setShowAllProfiles(true)}
                  className="w-full border border-dashed border-slate-200 py-3 text-xs font-semibold text-slate-500 transition-all hover:border-ug-teal hover:text-ug-teal"
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
               className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col space-y-5 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl sm:p-6 md:p-8"
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
