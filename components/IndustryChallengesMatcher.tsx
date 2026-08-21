import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Target, Zap, Loader2, Award, ShieldCheck, DollarSign, Calendar, 
  MapPin, UserCheck, X, Check, Briefcase, Plus, Search, FileText, ChevronRight,
  Info, MessageSquare, Send as SendIcon, Rocket, Users, Bookmark, User as UserIcon,
  ChevronDown, ChevronUp, CheckCircle, AlertCircle
} from 'lucide-react';
import { User, IndustryChallenge, ChallengeMatch } from '../types';
import { useToast } from '../App';
import { supabase } from '../lib/supabase';
import { StorageService } from '../services/storageService';
import { ChallengeService } from '../services/challengeService';

// Breathtaking circular progress gauge
const CircularProgress = ({ score }: { score: number }) => {
  const radius = 22;
  const strokeWidth = 4.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-14 h-14 shrink-0 bg-white rounded-full shadow-inner border border-gray-100">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="text-gray-100 stroke-current"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="text-ug-teal stroke-current"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-ug-navy">
        {score}%
      </span>
    </div>
  );
};

// Rich score breakdown detail
const ScoreBreakdown = ({ match }: { match: ChallengeMatch }) => {
  const items = [
    { label: 'Domain Alignment (25%)', score: match.domainScore || 0 },
    { label: 'Skills Compatibility (25%)', score: match.skillScore || 0 },
    { label: 'Experience (15%)', score: match.experienceScore || 0 },
    { label: 'Research Interests (10%)', score: match.interestScore || 0 },
    { label: 'Role Suitability (10%)', score: match.roleSuitabilityScore || 0 },
    { label: 'Location Fit (5%)', score: match.locationScore || 0 },
    { label: 'Availability Fit (5%)', score: match.availabilityScore || 0 },
    { label: 'Verification (5%)', score: match.verificationScore || 0 },
  ];

  return (
    <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100/80 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px] text-gray-500 font-semibold">
      {items.map((item, idx) => (
        <div key={idx} className="flex justify-between items-center border-b border-gray-100/50 pb-1">
          <span className="text-gray-400">{item.label}</span>
          <span className="text-ug-teal font-extrabold">{item.score}/100</span>
        </div>
      ))}
    </div>
  );
};

interface MatcherProps {
  user: User | null;
  setActiveTab?: (tab: 'overview' | 'matches' | 'messages' | 'profile') => void;
  setLocalInitialThreadId?: (id: string | null) => void;
  autoOpenCreateChallenge?: boolean;
  onCloseCreateChallenge?: () => void;
}

export const IndustryChallengesMatcher: React.FC<MatcherProps> = ({
  user,
  setActiveTab,
  setLocalInitialThreadId,
  autoOpenCreateChallenge,
  onCloseCreateChallenge
}) => {
  const { showToast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const [challenges, setChallenges] = useState<IndustryChallenge[]>([]);
  const [challengeMatches, setChallengeMatches] = useState<ChallengeMatch[]>([]);
  const [partnerChallenges, setPartnerChallenges] = useState<IndustryChallenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [showAllChallenges, setShowAllChallenges] = useState<boolean>(false);
  const [partnerActiveTab, setPartnerActiveTab] = useState<'researchers' | 'students'>('researchers');

  // Expanded card state
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // For challenge creation form
  const [isCreateChallengeOpen, setIsCreateChallengeOpen] = useState(false);
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeSummary, setNewChallengeSummary] = useState('');
  const [newChallengeDesc, setNewChallengeDesc] = useState('');
  const [newChallengeCat, setNewChallengeCat] = useState('Diagnostics');
  const [newChallengeSkills, setNewChallengeSkills] = useState('');
  const [newChallengeCollab, setNewChallengeCollab] = useState('Joint R&D');
  const [newChallengeBudget, setNewChallengeBudget] = useState('');
  const [newChallengeDeadline, setNewChallengeDeadline] = useState('');
  const [newChallengeLocation, setNewChallengeLocation] = useState('');
  const [isPostingChallenge, setIsPostingChallenge] = useState(false);

  useEffect(() => {
    if (autoOpenCreateChallenge) {
      setIsCreateChallengeOpen(true);
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [autoOpenCreateChallenge]);

  // Proposal modal states
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<ChallengeMatch | null>(null);
  const [proposalSubject, setProposalSubject] = useState('');
  const [proposalText, setProposalText] = useState('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  const fetchChallengeMatches = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const loadedChallenges = await ChallengeService.getIndustryChallenges();
      setChallenges(loadedChallenges);

      if (user.role === 'Industry/Partner') {
        const myCh = loadedChallenges.filter((c) => c.partner_id === user.id);
        setPartnerChallenges(myCh);
        if (myCh.length > 0 && selectedChallengeId === 'all') {
          setSelectedChallengeId(myCh[0].id);
        }
      }

      await ChallengeService.generateChallengeMatches(
        selectedChallengeId !== 'all' ? selectedChallengeId : undefined,
        user.id
      );

      const loadedMatches = await ChallengeService.getChallengeMatches(
        user.id,
        user.role,
        selectedChallengeId
      );
      setChallengeMatches(loadedMatches);
    } catch (err) {
      console.error('Error loading challenge matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallengeMatches();
  }, [user?.id, selectedChallengeId]);

  const handleUpdateStatus = async (matchId: string, newStatus: ChallengeMatch['status'], toastMsg: string) => {
    try {
      const success = await ChallengeService.updateMatchStatus(matchId, newStatus);
      if (success) {
        showToast(toastMsg, 'success');
        setChallengeMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: newStatus } : m));
      } else {
        showToast('Failed to update status.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  const handleOpenProposal = (match: ChallengeMatch) => {
    setSelectedMatch(match);
    const challengeTitle = match.challenge?.title || 'Industry Challenge';
    const partnerOrg = match.challenge?.partner_company || 'Ecosystem Partner';
    const recRole = match.recommendedRole || 'Technical Contributor';

    setProposalSubject(`Solution Proposal: "${challengeTitle}" [Ref: ${recRole}]`);
    setProposalText(`Dear Engineering & Innovation Team at ${partnerOrg},

My name is ${user?.name || 'Researcher'}. I am excited to submit my expression of interest and solution proposal for your Industry Challenge: "${challengeTitle}".

Based on the Hub's match verification, my credentials align perfectly for the recommended role of ${recRole} (${match.totalScore}% match score).

Why My Background is a Perfect Synergistic Fit:
- Domain Alignment: ${match.matchReasons?.[0] || 'My academic focus aligns perfectly with this field.'}
- Key Skills: ${match.matchedSkills?.slice(0, 4).join(', ') || 'My technical toolsets overlap directly.'}

Proposed Strategic Approach:
I am highly interested in exploring joint validation, pilot research, or technical advisory for this initiative. I look forward to our direct exchange.

Best regards,
${user?.name}`);
    setIsProposalModalOpen(true);
  };

  const handleSubmitProposal = async () => {
    if (!selectedMatch) return;
    setIsSubmittingProposal(true);
    try {
      const matchScore = selectedMatch.totalScore || 0;
      const portfolioPath = user?.id ? `/researcher/${user.id}` : '';
      const challengeTitle = selectedMatch.challenge?.title || 'Industry Challenge';
      const fullText = `[INDUSTRY_CHALLENGE_PROPOSAL][MATCH_SCORE: ${matchScore}%][RESEARCHER_PORTFOLIO: ${portfolioPath}]

Subject: ${proposalSubject}

Target Challenge: ${challengeTitle}
Applicant Researcher: ${user?.name || 'Researcher'}
Hub Compatibility Match Score: ${matchScore}%
Applicant Portfolio: ${window.location.origin}/#${portfolioPath}

--- Proposal & Solution Outline ---
${proposalText}`;

      await StorageService.submitEOI(
        null,
        user?.name || 'Researcher',
        fullText,
        selectedMatch.partnerUserId,
        'requests'
      );

      // Update status to 'interested'
      await ChallengeService.updateMatchStatus(selectedMatch.id, 'interested');

      // Update local state
      setChallengeMatches(prev => prev.map(m => m.id === selectedMatch.id ? { ...m, status: 'interested' } : m));
      showToast('Proposal sent to the partner!', 'success');
      setIsProposalModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit proposal.', 'error');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handlePostChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChallengeTitle || !newChallengeDesc) {
      showToast('Title and Description are required.', 'error');
      return;
    }
    setIsPostingChallenge(true);
    try {
      const parsedSkills = newChallengeSkills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const created = await ChallengeService.createIndustryChallenge({
        title: newChallengeTitle,
        summary: newChallengeSummary || newChallengeDesc.substring(0, 150),
        description: newChallengeDesc,
        category: newChallengeCat,
        required_skills: parsedSkills,
        collaboration_type: newChallengeCollab,
        budget_range: newChallengeBudget,
        deadline: newChallengeDeadline,
        location: newChallengeLocation
      }, user!.id);

      if (created) {
        showToast('Industry Challenge posted and registered successfully!', 'success');
        setIsCreateChallengeOpen(false);
        onCloseCreateChallenge?.();
        // Reset form
        setNewChallengeTitle('');
        setNewChallengeSummary('');
        setNewChallengeDesc('');
        setNewChallengeSkills('');
        setNewChallengeBudget('');
        setNewChallengeDeadline('');
        setNewChallengeLocation('');
        // Reload
        fetchChallengeMatches();
      } else {
        showToast('Failed to post challenge.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred.', 'error');
    } finally {
      setIsPostingChallenge(false);
    }
  };

  // Helper to open chat
  const handleOpenChat = (match: ChallengeMatch) => {
    if (setLocalInitialThreadId && setActiveTab) {
      // Set status to 'viewed' if currently 'recommended'
      if (match.status === 'recommended') {
        handleUpdateStatus(match.id, 'viewed', 'Contact initialized.');
      }
      setLocalInitialThreadId(match.candidate?.id || null);
      setActiveTab('messages');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="animate-spin text-ug-teal" size={32} />
        <p className="text-[11px] font-semibold text-gray-400 tracking-wide animate-pulse">Finding challenges for you...</p>
      </div>
    );
  }

  const isCandidate = user?.role === 'Student' || user?.role === 'Researcher';

  return (
    <div className="space-y-8 text-left font-sans">
      
      {/* ----------------- CANDIDATE VIEW (STUDENTS/RESEARCHERS) ----------------- */}
      {isCandidate && (
        <div className="space-y-6">
          {/* Challenge Matcher Explanation Banner */}
          <div className="bg-gradient-to-r from-ug-navy to-ug-teal p-5 sm:p-6 rounded-2xl text-white shadow-xl">
            <div className="max-w-xl space-y-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight leading-tight">Recommended Challenges</h2>
              <p className="text-xs text-white/80 font-medium leading-relaxed">
                Real-world challenges from industry partners, matched to your profile and skills.
              </p>
            </div>
          </div>

          {/* List of matched challenges */}
          <div className="space-y-4">
            {challengeMatches.length === 0 ? (
              <div className="py-10 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 p-8">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                  <Rocket size={28} />
                </div>
                <h4 className="text-sm font-bold text-ug-navy mb-2">No challenge matches yet</h4>
                <p className="text-[11px] font-medium text-gray-400 max-w-sm mx-auto leading-relaxed mb-4">
                  Partners are posting new challenges. Complete your profile to get better matches.
                </p>
              </div>
            ) : (
              <>
                {(showAllChallenges ? challengeMatches : challengeMatches.slice(0, 5)).map((match, i) => {
                  const ch = match.challenge;
                  if (!ch) return null;
                  const isExpanded = expandedMatchId === match.id;

                  return (
                    <div 
                      key={match.id}
                      className={`p-5 md:p-6 border rounded-2xl bg-white transition-all duration-300 shadow-sm ${
                        match.status === 'invited' 
                          ? 'border-amber-300 bg-amber-50/10 shadow-amber-100/50' 
                          : 'border-gray-100 hover:border-ug-teal/20 hover:shadow-xl'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                        
                        {/* Circular Score & Text details */}
                        <div className="flex items-start gap-4 md:gap-5 flex-1 min-w-0">
                          <CircularProgress score={match.totalScore} />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-semibold text-ug-teal bg-ug-teal/5 px-2.5 py-1 rounded-full tracking-wide">
                                {match.recommendedRole || 'Technical Contributor'}
                              </span>
                              <span className="text-[11px] font-semibold text-gray-400 tracking-wide px-2.5 py-1 bg-gray-100 rounded-full">
                                {ch.category}
                              </span>
                              {match.status === 'invited' && (
                                <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full tracking-wide">
                                  Invited by partner
                                </span>
                              )}
                              {match.status === 'saved' && (
                                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full tracking-wide">
                                  Saved Challenge
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-ug-navy text-sm md:text-base tracking-tight">{ch.title}</h4>
                            <p className="text-[11px] font-semibold text-gray-400 tracking-wider">Posted by: {ch.partner_company || 'Industry Partner'}</p>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed italic">"{ch.summary}"</p>
                          </div>
                        </div>

                        {/* Interactive actions */}
                        <div className="flex items-center lg:items-end justify-between lg:justify-start lg:flex-col gap-3 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
                          <div className="text-left lg:text-right">
                            <p className="text-[11px] font-semibold text-gray-400 tracking-wide leading-none mb-1">Collaboration Type</p>
                            <p className="text-xs font-bold text-ug-navy">{ch.collaboration_type}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            {match.status !== 'interested' ? (
                              <>
                                <button
                                  onClick={() => handleOpenProposal(match)}
                                  className="bg-ug-navy text-white hover:bg-ug-teal px-5 py-2.5 rounded-xl text-[11px] font-semibold tracking-wide transition shadow-md active:scale-95 shrink-0"
                                >
                                  Submit Proposal
                                </button>
                                {match.status !== 'saved' && (
                                  <button
                                    onClick={() => handleUpdateStatus(match.id, 'saved', 'Challenge saved to your matches.')}
                                    className="bg-white border border-gray-200 text-ug-navy hover:text-ug-teal hover:border-ug-teal px-4 py-2.5 rounded-xl text-[11px] font-semibold tracking-wide transition active:scale-95 shrink-0"
                                  >
                                    Save
                                  </button>
                                )}
                                <button
                                  onClick={() => handleUpdateStatus(match.id, 'dismissed', 'Match dismissed.')}
                                  className="bg-white border border-transparent text-gray-400 hover:text-red-500 hover:border-red-100 px-3 py-2.5 rounded-xl text-[11px] font-semibold tracking-wide transition active:scale-95 shrink-0"
                                  title="Dismiss Match"
                                >
                                  <X size={12} />
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl border border-green-100 text-[11px] font-semibold tracking-wide">
                                <Check size={12} className="stroke-[3]" /> Proposal Sent
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Expand/Collapse Breakdown Controls */}
                      <div className="mt-4 border-t border-gray-100/60 pt-3 flex items-center justify-between">
                        <button
                          onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-ug-teal hover:text-ug-navy tracking-wide transition"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={12} /> Hide details
                            </>
                          ) : (
                            <>
                              <ChevronDown size={12} /> View details
                            </>
                          )}
                        </button>
                        
                        <div className="flex flex-wrap gap-4 text-[11px] text-gray-400 font-bold tracking-wider">
                          <div className="flex items-center gap-1">
                            <DollarSign size={11} className="text-ug-teal" /> Budget: <span className="text-ug-navy">{ch.budget_range || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar size={11} className="text-ug-teal" /> Deadline: <span className="text-ug-navy">{ch.deadline || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin size={11} className="text-ug-teal" /> Location: <span className="text-ug-navy">{ch.location || 'Ecowas'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Section: Skills matrix & explanation */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden mt-4 space-y-4 border-t border-gray-50 pt-4"
                          >
                            {/* Skills alignment matrix */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <span className="text-[11px] font-semibold text-emerald-700 tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full">Matched Capabilities</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {match.matchedSkills && match.matchedSkills.length > 0 ? (
                                    match.matchedSkills.map((sk, idx) => (
                                      <span key={idx} className="text-[11px] font-bold text-emerald-800 bg-emerald-50/50 px-2.5 py-1 rounded-xl border border-emerald-100/40 flex items-center gap-1 capitalize">
                                        <Check size={10} className="text-emerald-600 stroke-[3]" /> {sk}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[11px] text-gray-400 font-medium">No specialized required skills matched.</span>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <span className="text-[11px] font-semibold text-gray-500 tracking-wide bg-gray-100 px-2 py-0.5 rounded-full">Outstanding Capabilities</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {ch.required_skills && ch.required_skills.length > 0 ? (
                                    ch.required_skills.filter(sk => !match.matchedSkills?.includes(sk.toLowerCase())).map((sk, idx) => (
                                      <span key={idx} className="text-[11px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-100 flex items-center gap-1 capitalize">
                                        <Info size={10} className="text-gray-400" /> {sk}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[11px] text-gray-400 font-medium">No outstanding required skills.</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Match reasoning lists */}
                            <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-2">
                              <h5 className="text-[11px] font-semibold text-ug-navy tracking-wide flex items-center gap-1">
                                <Sparkles size={11} className="stroke-[2.5]" /> Why you match
                              </h5>
                              <ul className="space-y-1.5 text-xs text-gray-600 font-medium">
                                {match.matchReasons && match.matchReasons.map((reason, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-ug-teal mt-1 shrink-0">•</span>
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Weighting score breakdown */}
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-semibold text-gray-400 tracking-wide">Score breakdown</h5>
                              <ScoreBreakdown match={match} />
                            </div>

                            {/* Challenge Full Description */}
                            <div className="space-y-1.5 p-4 bg-gray-50/30 rounded-2xl border border-gray-100 text-xs text-gray-600 leading-relaxed font-sans">
                              <span className="text-[11px] font-semibold text-ug-navy tracking-wide block mb-1">Full description</span>
                              <p className="whitespace-pre-line">{ch.description}</p>
                            </div>

                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  );
                })}

                {challengeMatches.length > 5 && !showAllChallenges && (
                  <button
                    onClick={() => setShowAllChallenges(true)}
                    className="w-full py-3.5 border-2 border-dashed border-gray-100 rounded-2xl text-[11px] font-semibold text-gray-400 tracking-wide hover:border-ug-teal hover:text-ug-teal transition-all"
                  >
                    See {challengeMatches.length - 5} More Challenges
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ----------------- PARTNER / INDUSTRY VIEW (CHALLENGE TALENT FINDER) ----------------- */}
      {!isCandidate && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-ug-navy to-ug-teal p-5 sm:p-6 rounded-2xl text-white shadow-xl">
            <div className="max-w-md space-y-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight leading-tight">Challenge Talent Finder</h2>
              <p className="text-xs text-white/80 font-medium leading-relaxed">
                Discover academic talent matched to your active challenges.
              </p>
            </div>
          </div>

          {/* Expandable Challenge Creator Form */}
          <AnimatePresence>
            {isCreateChallengeOpen && (
              <motion.div
                ref={formRef}
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-ug-teal/10 rounded-xl text-ug-teal">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-ug-navy text-sm sm:text-base tracking-tight">Post a Challenge</h3>
                      <p className="text-[11px] text-gray-500 font-medium">Describe your technical needs to match with university researchers</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsCreateChallengeOpen(false);
                      onCloseCreateChallenge?.();
                    }} 
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition"
                    title="Close Form"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handlePostChallenge} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Challenge Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Rapid Biosensor for Malaria Antigen Detection"
                        value={newChallengeTitle}
                        onChange={(e) => setNewChallengeTitle(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Challenge Category</label>
                      <select
                        value={newChallengeCat}
                        onChange={(e) => setNewChallengeCat(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal"
                      >
                        <option value="Diagnostics">Diagnostics</option>
                        <option value="Pharmaceutical">Pharmaceutical</option>
                        <option value="Vaccines">Vaccines</option>
                        <option value="Other">Other Medical Innovation</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Brief Summary</label>
                    <input
                      type="text"
                      placeholder="A short one-sentence overview explaining the key requirement."
                      value={newChallengeSummary}
                      onChange={(e) => setNewChallengeSummary(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Scope & Challenge Description</label>
                    <textarea
                      rows={4}
                      placeholder="Provide full technical parameters, testing milestones, laboratory constraints, and commercial alignment requirements."
                      value={newChallengeDesc}
                      onChange={(e) => setNewChallengeDesc(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-medium text-gray-700 leading-relaxed focus:outline-none focus:border-ug-teal"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Required Skills (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. Assay design, PCR, diagnostics, microfluidics"
                        value={newChallengeSkills}
                        onChange={(e) => setNewChallengeSkills(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Collaboration Type</label>
                      <select
                        value={newChallengeCollab}
                        onChange={(e) => setNewChallengeCollab(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal"
                      >
                        <option value="Joint R&D">Joint R&D Pipeline</option>
                        <option value="Licensing">Technology Licensing</option>
                        <option value="Consultancy">Specialist Consultancy</option>
                        <option value="Student Internship">Student Research Assistantship</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Funding / Budget Range</label>
                      <input
                        type="text"
                        placeholder="e.g. GH₵ 30,000 - 60,000"
                        value={newChallengeBudget}
                        onChange={(e) => setNewChallengeBudget(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Submission Deadline</label>
                      <input
                        type="date"
                        value={newChallengeDeadline}
                        onChange={(e) => setNewChallengeDeadline(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Regulatory Market Fit / Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Accra, Ghana"
                        value={newChallengeLocation}
                        onChange={(e) => setNewChallengeLocation(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateChallengeOpen(false);
                        onCloseCreateChallenge?.();
                      }}
                      className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-[11px] font-semibold tracking-wide text-gray-700 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPostingChallenge}
                      className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-ug-navy hover:bg-ug-teal text-white rounded-xl text-[11px] font-semibold tracking-wide transition flex items-center justify-center gap-1.5 shadow-md disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {isPostingChallenge ? <Loader2 className="animate-spin" size={12} /> : null}
                      Post Challenge
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Challenge Selector */}
          <div className="p-5 bg-white border border-gray-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Select Challenge to Filter Candidates</label>
              <select
                value={selectedChallengeId}
                onChange={(e) => setSelectedChallengeId(e.target.value)}
                className="w-full max-w-md bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal"
              >
                {partnerChallenges.length === 0 ? (
                  <option value="none">You have no posted challenges yet.</option>
                ) : (
                  <>
                    <option value="all">Analyze All Active Challenges</option>
                    {partnerChallenges.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.category})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setPartnerActiveTab('researchers')}
                className={`px-5 py-2.5 rounded-full text-[11px] font-semibold tracking-wide transition-all ${
                  partnerActiveTab === 'researchers'
                    ? 'bg-ug-navy text-white shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                Researchers
              </button>
              <button
                onClick={() => setPartnerActiveTab('students')}
                className={`px-5 py-2.5 rounded-full text-[11px] font-semibold tracking-wide transition-all ${
                  partnerActiveTab === 'students'
                    ? 'bg-ug-navy text-white shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                Students
              </button>
            </div>
          </div>

          {/* Matches lists */}
          <div className="space-y-4">
            {partnerChallenges.length === 0 ? (
              <div className="py-10 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 p-8">
                <Users size={32} className="text-gray-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-ug-navy mb-1.5">Post your first challenge</h4>
                <p className="text-[11px] font-medium text-gray-400 max-w-sm mx-auto leading-relaxed mb-4">
                  Once posted, we scan university profiles to map researchers and students to it.
                </p>
                <button
                  onClick={() => setIsCreateChallengeOpen(true)}
                  className="px-5 py-2.5 bg-ug-navy hover:bg-ug-teal text-white rounded-xl text-[11px] font-semibold tracking-wide transition shadow-md"
                >
                  Post a Challenge
                </button>
              </div>
            ) : (
              <>
                {(() => {
                  const filteredMatches = challengeMatches.filter(m => {
                    const candRole = m.candidateRole;
                    if (partnerActiveTab === 'researchers' && candRole !== 'researcher') return false;
                    if (partnerActiveTab === 'students' && candRole !== 'student') return false;
                    return true;
                  });

                  if (filteredMatches.length === 0) {
                    return (
                      <div className="py-10 text-center bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
                        <AlertCircle size={24} className="text-gray-300 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-ug-navy">No {partnerActiveTab === 'researchers' ? 'Researchers' : 'Students'} mapped for this challenge.</h4>
                        <p className="text-[11px] font-medium text-gray-400 mt-1">Try broadening the required skills or category parameters.</p>
                      </div>
                    );
                  }

                  return filteredMatches.map(match => {
                    const cand = match.candidate;
                    if (!cand) return null;
                    const isExpanded = expandedMatchId === match.id;

                    return (
                      <div 
                        key={match.id}
                        className="p-5 md:p-6 bg-white border border-gray-100 rounded-2xl hover:border-ug-teal/20 hover:shadow-lg transition-all duration-300 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          
                          {/* Profile Details */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl shadow border border-gray-100 overflow-hidden bg-ug-navy shrink-0 relative">
                              {cand.avatar_url ? (
                                <img src={cand.avatar_url} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                              ) : (
                                <UserIcon className="w-full h-full p-3.5 text-white/20" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-ug-teal bg-ug-teal/5 px-2 py-0.5 rounded-full tracking-wide">
                                  Score: {match.totalScore}%
                                </span>
                                <span className="text-[11px] font-semibold text-gray-400 tracking-wide">
                                  {match.recommendedRole || 'Technical Assistant'}
                                </span>
                              </div>
                              <h4 className="font-bold text-ug-navy text-sm tracking-tight truncate">{cand.name}</h4>
                              <p className="text-[11px] text-gray-400 font-bold tracking-wider">{cand.department || 'Biomedical Directorate'}</p>
                            </div>
                          </div>

                          {/* Dynamic actions for partner */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            
                            {match.status === 'invited' ? (
                              <div className="flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-[11px] font-semibold tracking-wide">
                                <CheckCircle size={11} /> Invite Sent
                              </div>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(match.id, 'invited', 'Candidate invited to apply for challenge.')}
                                className="bg-ug-navy text-white hover:bg-ug-teal px-4 py-2.5 rounded-xl text-[11px] font-semibold tracking-wide transition"
                              >
                                Invite To Apply
                              </button>
                            )}

                            {match.status === 'shortlisted' ? (
                              <div className="flex items-center gap-1 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl text-[11px] font-semibold tracking-wide">
                                <Bookmark size={11} /> Shortlisted
                              </div>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(match.id, 'shortlisted', 'Candidate added to shortlist.')}
                                className="bg-white border border-gray-200 text-ug-navy hover:text-ug-teal hover:border-ug-teal px-3 py-2.5 rounded-xl text-[11px] font-semibold tracking-wide transition"
                              >
                                Shortlist
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenChat(match)}
                              className="bg-white border border-gray-200 text-ug-navy hover:text-ug-teal hover:border-ug-teal px-3 py-2.5 rounded-xl text-[11px] font-semibold tracking-wide transition flex items-center gap-1"
                            >
                              <MessageSquare size={12} /> Chat
                            </button>

                          </div>

                        </div>

                        {/* Expandable score weighting */}
                        <div className="border-t border-gray-50 pt-3 flex items-center justify-between">
                          <button
                            onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-ug-teal hover:text-ug-navy tracking-wide transition"
                          >
                            {isExpanded ? <><ChevronUp size={12} /> Hide breakdown</> : <><ChevronDown size={12} /> View breakdown</>}
                          </button>
                          
                          <div className="flex gap-2">
                            {cand.skills?.slice(0, 3).map((sk, idx) => (
                              <span key={idx} className="text-[11px] font-bold text-gray-400 px-2 py-0.5 bg-gray-50 rounded-lg capitalize border border-gray-100">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-4 pt-3 border-t border-gray-50"
                            >
                              <div className="p-4 bg-gray-50/40 rounded-2xl border border-gray-100 text-xs text-gray-600 space-y-1 italic">
                                <span className="text-[11px] font-semibold text-ug-navy tracking-wide block mb-1">Academic Profile Highlight</span>
                                <p>"{cand.bio || 'Dynamic academic profile with matching molecular capabilities.'}"</p>
                              </div>

                              <div className="space-y-2">
                                <h5 className="text-[11px] font-semibold text-gray-400 tracking-wide">Score breakdown</h5>
                                <ScoreBreakdown match={match} />
                              </div>

                              {/* Reasoning */}
                              <div className="p-4 bg-emerald-50/10 rounded-2xl border border-emerald-100/50 text-xs text-emerald-900 space-y-1.5">
                                <span className="text-[11px] font-semibold text-emerald-800 tracking-wide block mb-1">Why they match</span>
                                <ul className="space-y-1 list-disc list-inside">
                                  {match.matchReasons?.map((r, idx) => (
                                    <li key={idx}>{r}</li>
                                  ))}
                                </ul>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    );
                  });
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* --- PROPOSAL MODAL --- */}
      <AnimatePresence>
        {isProposalModalOpen && selectedMatch && (
          <div className="fixed inset-0 bg-ug-navy/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col p-6 md:p-8 space-y-6"
            >
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-ug-teal/10 rounded-2xl text-ug-teal">
                    <SendIcon size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-ug-navy text-sm tracking-tight">Submit Proposal</h3>
                    <p className="text-[11px] text-gray-400 font-medium">Review and edit before sending</p>
                  </div>
                </div>
                <button onClick={() => setIsProposalModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                  <X size={18} />
                </button>
              </div>

              <div className="text-left space-y-1.5">
                <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Subject</label>
                <input
                  type="text"
                  value={proposalSubject}
                  onChange={(e) => setProposalSubject(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none"
                />
              </div>

              <div className="text-left space-y-1.5">
                <label className="block text-[11px] font-semibold text-ug-navy tracking-wide">Message</label>
                <textarea
                  rows={8}
                  value={proposalText}
                  onChange={(e) => setProposalText(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-medium text-gray-700 leading-relaxed font-sans focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  onClick={() => setIsProposalModalOpen(false)}
                  className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[11px] font-semibold tracking-wide"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitProposal}
                  disabled={isSubmittingProposal}
                  className="px-8 py-3 bg-ug-navy text-white rounded-xl text-[11px] font-semibold tracking-wide hover:bg-ug-teal transition flex items-center gap-2"
                >
                  {isSubmittingProposal ? <Loader2 className="animate-spin" size={12} /> : null}
                  Send Proposal
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
