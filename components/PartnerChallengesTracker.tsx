import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, Plus, Search, Filter, Calendar, MapPin, DollarSign, 
  Trash2, Edit3, CheckCircle, Clock, AlertCircle, Users, ExternalLink, RefreshCw 
} from 'lucide-react';
import { useToast } from '../App';
import { ChallengeService } from '../services/challengeService';
import { User, IndustryChallenge } from '../types';

interface PartnerChallengesTrackerProps {
  user: User | null;
  onPostNewChallenge: () => void;
  setActiveTab?: (tab: 'overview' | 'matches' | 'messages' | 'profile') => void;
  refreshKey?: number;
}

export const PartnerChallengesTracker: React.FC<PartnerChallengesTrackerProps> = ({
  user,
  onPostNewChallenge,
  setActiveTab,
  refreshKey = 0
}) => {
  const { showToast } = useToast();
  const [challenges, setChallenges] = useState<IndustryChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const allChallenges = await ChallengeService.getIndustryChallenges();
      // Filter for current partner if user exists, otherwise display all
      const myChallenges = user?.id 
        ? allChallenges.filter(c => c.partner_id === user.id || !c.partner_id || c.partner_name === user.name)
        : allChallenges;

      setChallenges(myChallenges.length > 0 ? myChallenges : allChallenges);
    } catch (err) {
      console.error("Error loading partner challenges:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [user?.id, refreshKey]);

  const handleStatusChange = async (challengeId: string, newStatus: any) => {
    setUpdatingId(challengeId);
    try {
      const ok = await ChallengeService.updateChallengeStatus(challengeId, newStatus);
      if (ok) {
        showToast(`Challenge status updated to "${newStatus}"`, 'success');
        setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, status: newStatus } : c));
      } else {
        showToast('Failed to update challenge status.', 'error');
      }
    } catch (err) {
      showToast('Error updating status.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (challengeId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const ok = await ChallengeService.deleteChallenge(challengeId);
      if (ok) {
        showToast('Challenge removed successfully.', 'success');
        setChallenges(prev => prev.filter(c => c.id !== challengeId));
      } else {
        showToast('Failed to delete challenge.', 'error');
      }
    } catch (err) {
      showToast('Error deleting challenge.', 'error');
    }
  };

  const filteredChallenges = challenges.filter(c => {
    const matchesSearch = 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.summary && c.summary.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In-Review':
      case 'In Review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Closed':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  return (
    <section className="bg-white rounded-2xl sm:rounded-[2.5rem] p-3.5 sm:p-8 border border-gray-100 shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black uppercase bg-ug-teal/10 text-ug-teal px-3 py-1 rounded-full tracking-widest">
              Industry Portfolio Ledger
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-ug-navy uppercase tracking-tight leading-tight">
            Track Commercial Challenges
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Monitor research briefs, manage status milestones, and review matched academic talent.
          </p>
        </div>

        <button
          onClick={onPostNewChallenge}
          className="bg-ug-navy hover:bg-ug-teal text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-lg shrink-0 cursor-pointer"
        >
          <Plus size={16} className="stroke-[3]" />
          <span>Post New Challenge</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search challenges by title or domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:bg-white transition"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
          {['All', 'Open', 'In-Review', 'Completed', 'Closed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                statusFilter === tab
                  ? 'bg-white text-ug-navy shadow-sm'
                  : 'text-gray-500 hover:text-ug-navy'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Challenges List / Cards */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="animate-spin mx-auto text-ug-teal" size={24} />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading commercial challenges...</p>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="bg-gray-50/70 border border-dashed border-gray-200 rounded-3xl p-8 text-center space-y-4">
          <div className="p-4 bg-white rounded-2xl w-14 h-14 mx-auto flex items-center justify-center text-ug-teal shadow-sm border border-gray-100">
            <Briefcase size={24} />
          </div>
          <div>
            <h3 className="font-black text-ug-navy text-sm uppercase tracking-tight">No Challenges Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {searchQuery || statusFilter !== 'All' 
                ? 'No commercial challenges match your current search criteria or filter.' 
                : 'Formulate your first commercial research challenge to connect with top researchers and students.'}
            </p>
          </div>
          <button
            onClick={onPostNewChallenge}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ug-navy text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-ug-teal transition cursor-pointer"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>Post New Challenge</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredChallenges.map((challenge) => (
            <div
              key={challenge.id}
              className="bg-gray-50/60 hover:bg-white hover:shadow-xl transition-all duration-300 border border-gray-100 rounded-3xl p-5 sm:p-6 space-y-4 group"
            >
              {/* Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-ug-navy text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                      {challenge.category || 'Diagnostics'}
                    </span>
                    {challenge.collaboration_type && (
                      <span className="bg-gray-200 text-gray-700 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                        {challenge.collaboration_type}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-ug-navy group-hover:text-ug-teal transition">
                    {challenge.title}
                  </h3>
                </div>

                {/* Status Dropdown / Badge */}
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:inline">Status:</span>
                  <select
                    value={challenge.status || 'Open'}
                    disabled={updatingId === challenge.id}
                    onChange={(e) => handleStatusChange(challenge.id, e.target.value as any)}
                    className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer transition ${getStatusColor(challenge.status || 'Open')}`}
                  >
                    <option value="Open">Open</option>
                    <option value="In-Review">In-Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Summary / Description */}
              <p className="text-xs text-gray-600 font-medium leading-relaxed line-clamp-2">
                {challenge.summary || challenge.description}
              </p>

              {/* Required Skills Badges */}
              {challenge.required_skills && challenge.required_skills.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {challenge.required_skills.slice(0, 5).map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-bold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg"
                    >
                      #{skill}
                    </span>
                  ))}
                  {challenge.required_skills.length > 5 && (
                    <span className="text-[9px] font-bold text-gray-400 px-1">
                      +{challenge.required_skills.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Bottom Info & Action Bar */}
              <div className="pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500 font-medium">
                <div className="flex items-center gap-4 flex-wrap">
                  {challenge.budget_range && (
                    <span className="flex items-center gap-1 text-ug-navy font-bold">
                      <DollarSign size={14} className="text-ug-teal" />
                      {challenge.budget_range}
                    </span>
                  )}
                  {challenge.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      Deadline: {challenge.deadline}
                    </span>
                  )}
                  {challenge.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-gray-400" />
                      {challenge.location}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {setActiveTab && (
                    <button
                      onClick={() => setActiveTab('matches')}
                      className="px-3.5 py-1.5 bg-ug-teal/10 hover:bg-ug-teal text-ug-teal hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                      title="Review AI talent matches for this challenge"
                    >
                      <Users size={13} />
                      <span>Talent Matches</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(challenge.id, challenge.title)}
                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition cursor-pointer"
                    title="Delete challenge"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
