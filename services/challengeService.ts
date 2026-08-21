import { supabase } from '../lib/supabase';
import { postJson } from '../lib/api';
import { IndustryChallenge, ChallengeMatch } from '../types';

const mapMatchRow = (m: any): ChallengeMatch => ({
  id: m.id,
  challengeId: m.challenge_id,
  candidateUserId: m.candidate_user_id,
  partnerUserId: m.partner_user_id,
  candidateRole: m.candidate_role,
  totalScore: m.total_score,
  domainScore: m.domain_score,
  skillScore: m.skill_score,
  experienceScore: m.experience_score,
  interestScore: m.interest_score,
  roleSuitabilityScore: m.role_suitability_score,
  locationScore: m.location_score,
  availabilityScore: m.availability_score,
  verificationScore: m.verification_score,
  matchedSkills: m.matched_skills || [],
  missingSkills: m.missing_skills || [],
  matchReasons: m.match_reasons || [],
  recommendedRole: m.recommended_role,
  status: m.status,
  createdAt: m.created_at,
  updatedAt: m.updated_at,
  challenge: m.industry_challenges ? {
    id: m.industry_challenges.id,
    title: m.industry_challenges.title,
    summary: m.industry_challenges.summary,
    description: m.industry_challenges.description,
    category: m.industry_challenges.category,
    required_skills: m.industry_challenges.required_skills || [],
    collaboration_type: m.industry_challenges.collaboration_type,
    budget_range: m.industry_challenges.budget_range,
    deadline: m.industry_challenges.deadline,
    location: m.industry_challenges.location,
    status: m.industry_challenges.status,
    partner_id: m.industry_challenges.partner_id
  } : undefined,
  candidate: m.profiles ? {
    id: m.profiles.id,
    name: m.profiles.name || 'University Researcher',
    email: m.profiles.email || '',
    role: m.profiles.role || 'Researcher',
    avatar_url: m.profiles.avatar_url,
    bio: m.profiles.bio,
    company: m.profiles.company,
    department: m.profiles.department,
    education_level: m.profiles.education_level,
    availability: m.profiles.availability,
    skills: m.profiles.ai_profile?.skills?.technical_skills || [],
    research_interests: m.profiles.ai_profile?.research_information?.research_interests || [],
    ai_profile: m.profiles.ai_profile
  } : undefined
});

export const ChallengeService = {
  getIndustryChallenges: async (): Promise<IndustryChallenge[]> => {
    try {
      const { data: challenges, error } = await supabase
        .from('industry_challenges')
        .select('*, profiles(name, company)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Could not query industry_challenges from Supabase:", error.message);
        return [];
      }

      return (challenges || []).map((ch: any) => ({
        id: ch.id,
        title: ch.title,
        summary: ch.summary || '',
        description: ch.description || '',
        category: ch.category || 'General',
        required_skills: ch.required_skills || [],
        collaboration_type: ch.collaboration_type || 'Co-Development',
        budget_range: ch.budget_range,
        deadline: ch.deadline,
        location: ch.location,
        status: ch.status || 'Open',
        partner_id: ch.partner_id,
        partner_name: ch.profiles?.name || 'Industry Partner',
        partner_company: ch.profiles?.company || 'Ecosystem Partner',
        created_at: ch.created_at,
        updated_at: ch.updated_at
      }));
    } catch (e) {
      console.error("Error fetching industry challenges:", e);
      return [];
    }
  },

  createIndustryChallenge: async (challengeData: Partial<IndustryChallenge>, partnerId: string): Promise<IndustryChallenge | null> => {
    try {
      const { data, error } = await supabase
        .from('industry_challenges')
        .insert({
          title: challengeData.title,
          summary: challengeData.summary,
          description: challengeData.description,
          category: challengeData.category,
          required_skills: challengeData.required_skills,
          collaboration_type: challengeData.collaboration_type || 'Co-Development',
          budget_range: challengeData.budget_range,
          deadline: challengeData.deadline,
          location: challengeData.location,
          partner_id: partnerId,
          status: challengeData.status || 'Open'
        })
        .select('*')
        .single();

      if (error) {
        console.error("Error creating industry challenge:", error);
        throw error;
      }

      return data as IndustryChallenge;
    } catch (e) {
      console.error("Error in createIndustryChallenge:", e);
      throw e;
    }
  },

  getChallengeMatches: async (userId: string, role: string, selectedChallengeId?: string): Promise<ChallengeMatch[]> => {
    try {
      let query = supabase.from('challenge_matches').select('*, industry_challenges(*), profiles!candidate_user_id(*)');

      if (role === 'Industry/Partner') {
        query = query.eq('partner_user_id', userId);
        if (selectedChallengeId && selectedChallengeId !== 'all') {
          query = query.eq('challenge_id', selectedChallengeId);
        }
      } else {
        query = query.eq('candidate_user_id', userId);
        if (selectedChallengeId && selectedChallengeId !== 'all') {
          query = query.eq('challenge_id', selectedChallengeId);
        }
      }

      const { data, error } = await query.order('total_score', { ascending: false });

      if (error) {
        console.warn("Could not fetch challenge matches from Supabase:", error.message);
        return [];
      }

      return (data || []).map(mapMatchRow);
    } catch (e) {
      console.error("Error in getChallengeMatches:", e);
      return [];
    }
  },

  // Admin-wide fetch for reporting. RLS restricts results to admins automatically.
  getAllMatches: async (): Promise<ChallengeMatch[]> => {
    try {
      const { data, error } = await supabase
        .from('challenge_matches')
        .select('*, industry_challenges(*), profiles!candidate_user_id(*)')
        .order('total_score', { ascending: false });

      if (error) {
        console.warn("Could not fetch all challenge matches:", error.message);
        return [];
      }

      return (data || []).map(mapMatchRow);
    } catch (e) {
      console.error("Error in getAllMatches:", e);
      return [];
    }
  },

  updateMatchStatus: async (matchId: string, status: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('challenge_matches')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', matchId);

      if (error) {
        console.error("Error updating match status:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Error in updateMatchStatus:", e);
      return false;
    }
  },

  generateChallengeMatches: async (targetChallengeId?: string, currentUserId?: string): Promise<void> => {
    try {
      await postJson('/api/challenge-matches/generate', {
        challengeId: targetChallengeId && targetChallengeId !== 'all' ? targetChallengeId : undefined
      });
    } catch (e) {
      console.warn("Match generation failed:", e);
    }
  },

  updateChallengeStatus: async (challengeId: string, status: 'Open' | 'Closed' | 'Draft' | 'Completed'): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('industry_challenges')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', challengeId);

      if (error) {
        console.warn("Supabase update error, falling back to API route:", error.message);
        const res = await fetch(`/api/industry-challenges/${challengeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        return res.ok;
      }
      return true;
    } catch (e) {
      console.error("Error in updateChallengeStatus:", e);
      return false;
    }
  },

  deleteChallenge: async (challengeId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('industry_challenges')
        .delete()
        .eq('id', challengeId);

      if (error) {
        console.warn("Supabase delete error, falling back to API route:", error.message);
        const res = await fetch(`/api/industry-challenges/${challengeId}`, {
          method: 'DELETE'
        });
        return res.ok;
      }
      return true;
    } catch (e) {
      console.error("Error in deleteChallenge:", e);
      return false;
    }
  }
};
