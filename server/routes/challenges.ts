import type { Express } from 'express';
import { canMutateMatch } from '../../lib/authorization';
import { authenticateUser, getDbClientForRequest, getRequestProfileId, Roles } from '../middleware/auth';
import { throttleLimit } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';
import { getServiceClient, getSupabaseClient } from '../db/supabase';
import { createChallengeRequestSchema, updateChallengeRequestSchema, generateMatchesRequestSchema, updateMatchStatusRequestSchema } from '../../lib/requestSchemas';

export const registerChallengesRoutes = (app: Express) => {
  app.get('/api/industry-challenges', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
      const supabaseClient = getSupabaseClient(token)!;
      if (!supabaseClient) {
        return res.json({ challenges: [] });
      }
      const { data: challenges, error } = await supabaseClient
        .from('industry_challenges')
        .select('*')
        .order('created_at', { ascending: false });
  
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "industry_challenges" does not exist')) {
          return res.json({ challenges: [] });
        }
        return res.json({ challenges: [] });
      }
  
      const partnerIds = Array.from(new Set((challenges || []).map((challenge: any) => challenge.partner_id).filter(Boolean)));
      const { data: partnerProfiles } = partnerIds.length
        ? await supabaseClient.from('profiles').select('id, name, company').in('id', partnerIds)
        : { data: [] };
      const partnerMap = new Map((partnerProfiles || []).map((profile: any) => [profile.id, profile]));
      const formatted = (challenges || []).map((ch: any) => ({
        ...ch,
        partner_name: (partnerMap.get(ch.partner_id) as any)?.name || 'Industry Partner',
        partner_company: (partnerMap.get(ch.partner_id) as any)?.company || 'Partner Org',
      }));
  
      res.json({ challenges: formatted });
    } catch (error: any) {
      console.error('Failed to get industry challenges:', error);
      res.json({ challenges: [] });
    }
  });
  
  // POST /api/industry-challenges - Create a new industry challenge

  app.post('/api/industry-challenges', validateBody(createChallengeRequestSchema), authenticateUser, async (req, res) => {
    try {
      const { title, summary, description, category, required_skills, collaboration_type, budget_range, deadline, location } = req.body;
      const partner_id = getRequestProfileId(req);
  
      if (!title || !category) {
        return res.status(400).json({ error: 'Title and Category are required.' });
      }
  
      const supabaseClient = getDbClientForRequest(req)!;
      if (!supabaseClient || !partner_id) {
        return res.status(503).json({ error: 'Database client is not configured for authenticated writes.' });
      }
      
      // Check if user is Partner or Admin
      const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', partner_id).single();
      if (profile?.role !== 'Industry/Partner' && profile?.role !== 'Admin') {
        return res.status(403).json({ error: 'Only Industry Partners or Administrators can post challenges.' });
      }
  
      const { data: challenge, error } = await supabaseClient
        .from('industry_challenges')
        .insert([{
          title,
          summary,
          description,
          category,
          required_skills: required_skills || [],
          collaboration_type,
          budget_range,
          deadline,
          location,
          status: 'Open',
          partner_id
        }])
        .select()
        .single();
  
      if (error) throw error;
      res.json({ success: true, challenge });
    } catch (error: any) {
      console.error('Failed to create industry challenge:', error);
      console.error('API route error:', error.message);
        res.status(500).json({ error: 'An internal error occurred. Please try again later.' });
    }
  });
  
  // PUT /api/industry-challenges/:id - Update challenge status or content

  app.put('/api/industry-challenges/:id', validateBody(updateChallengeRequestSchema), authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = getRequestProfileId(req);
      const supabaseClient = getDbClientForRequest(req)!;
      if (!supabaseClient || !userId) {
        return res.status(503).json({ error: 'Database client is not configured for authenticated writes.' });
      }
  
      const { data: challenge } = await supabaseClient.from('industry_challenges').select('partner_id').eq('id', id).single();
      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found.' });
      }
  
      const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', userId).single();
      const isAdmin = profile?.role === 'Admin';
  
      if (challenge.partner_id !== userId && !isAdmin) {
        return res.status(403).json({ error: 'Unauthorized to modify this challenge.' });
      }
  
      const allowedFields = ['title', 'summary', 'description', 'category', 'required_skills', 'collaboration_type', 'budget_range', 'deadline', 'location', 'status'];
      const filteredUpdates: any = {};
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      });
      filteredUpdates.updated_at = new Date().toISOString();
  
      const { data: updated, error } = await supabaseClient
        .from('industry_challenges')
        .update(filteredUpdates)
        .eq('id', id)
        .select()
        .single();
  
      if (error) throw error;
      res.json({ success: true, challenge: updated });
    } catch (error: any) {
      console.error('Failed to update industry challenge:', error);
      console.error('API route error:', error.message);
        res.status(500).json({ error: 'An internal error occurred. Please try again later.' });
    }
  });
  
  // DELETE /api/industry-challenges/:id - Delete a challenge

  app.delete('/api/industry-challenges/:id', authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getRequestProfileId(req);
      const supabaseClient = getDbClientForRequest(req)!;
      if (!supabaseClient || !userId) {
        return res.status(503).json({ error: 'Database client is not configured for authenticated writes.' });
      }
  
      const { data: challenge } = await supabaseClient.from('industry_challenges').select('partner_id').eq('id', id).single();
      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found.' });
      }
  
      const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', userId).single();
      const isAdmin = profile?.role === 'Admin';
  
      if (challenge.partner_id !== userId && !isAdmin) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }
  
      const { error } = await supabaseClient.from('industry_challenges').delete().eq('id', id);
      if (error) throw error;
  
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to delete industry challenge:', error);
      console.error('API route error:', error.message);
        res.status(500).json({ error: 'An internal error occurred. Please try again later.' });
    }
  });
  
  // GET /api/challenge-matches - Fetch matches for logged-in user

  app.get('/api/challenge-matches', authenticateUser, async (req, res) => {
    try {
      const userId = getRequestProfileId(req);
      const { challengeId, role } = req.query;
      const supabaseClient = getDbClientForRequest(req)!;
      if (!supabaseClient) {
        return res.json({ matches: [] });
      }
  
      const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', userId).single();
      const isPartner = profile?.role === 'Industry/Partner';
  
      let query = supabaseClient.from('challenge_matches').select('*');
  
      if (isPartner) {
        query = query.eq('partner_user_id', userId);
        if (challengeId) {
          query = query.eq('challenge_id', challengeId);
        }
        if (role) {
          query = query.eq('candidate_role', role);
        }
      } else {
        query = query.eq('candidate_user_id', userId).neq('status', 'dismissed');
      }
  
      const { data: matches, error } = await query.order('total_score', { ascending: false });
  
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "challenge_matches" does not exist')) {
          return res.json({ matches: [] });
        }
        throw error;
      }
  
      const formattedMatches = [];
      for (const match of (matches || [])) {
         const { data: ch } = await supabaseClient.from('industry_challenges').select('*').eq('id', match.challenge_id).maybeSingle();
         const { data: partner } = ch?.partner_id
           ? await supabaseClient.from('profiles').select('name, company').eq('id', ch.partner_id).maybeSingle()
           : { data: null };
        
        let challengeDetails = null;
        if (ch) {
          challengeDetails = {
            ...ch,
             partner_name: partner?.name || 'Industry Partner',
             partner_company: partner?.company || 'Partner Org'
          };
        }
  
        const { data: cand } = await supabaseClient.from('profiles').select('*').eq('id', match.candidate_user_id).maybeSingle();
        let candidateDetails = null;
        if (cand) {
          const skillsArray = cand.ai_profile?.skills?.technical_skills || [];
          const interestsArray = cand.ai_profile?.research_information?.research_interests || [];
          
          let education = '';
          let availabilityStr = '';
          if (cand.role === 'Student') {
            const { data: stud } = await supabaseClient.from('student_profiles').select('*').eq('user_id', cand.id).maybeSingle();
            education = stud?.education_level || 'Undergraduate';
            availabilityStr = stud?.availability || 'Part-time';
          } else if (cand.role === 'Researcher') {
            const { data: reser } = await supabaseClient.from('researcher_profiles').select('*').eq('user_id', cand.id).maybeSingle();
            education = reser?.research_stage || 'PhD / Senior Researcher';
          }
  
          candidateDetails = {
            id: cand.id,
            name: cand.name,
            role: cand.role,
            avatar_url: cand.avatar_url,
            bio: cand.bio,
            company: cand.company,
            department: cand.department,
            education_level: education,
            availability: availabilityStr,
            skills: skillsArray,
            research_interests: interestsArray,
            ai_profile: cand.ai_profile
          };
        }
  
        formattedMatches.push({
          id: match.id,
          challengeId: match.challenge_id,
          candidateUserId: match.candidate_user_id,
          partnerUserId: match.partner_user_id,
          candidateRole: match.candidate_role,
          totalScore: match.total_score,
          domainScore: match.domain_score,
          skillScore: match.skill_score,
          experienceScore: match.experience_score,
          interestScore: match.interest_score,
          roleSuitabilityScore: match.role_suitability_score,
          locationScore: match.location_score,
          availabilityScore: match.availability_score,
          verificationScore: match.verification_score,
          matchedSkills: match.matched_skills || [],
          missingSkills: match.missing_skills || [],
          matchReasons: match.match_reasons || [],
          recommendedRole: match.recommended_role,
          status: match.status,
          createdAt: match.created_at,
          updatedAt: match.updated_at,
          challenge: challengeDetails,
          candidate: candidateDetails
        });
      }
  
      res.json({ matches: formattedMatches });
    } catch (error: any) {
      console.error('Failed to get challenge matches:', error);
      res.json({ matches: [] });
    }
  });
  
  // Helper for parsing candidate skills
  const getSkills = (user: any) => {
    let skills: string[] = [];
    if (user.ai_profile?.skills) {
      const s = user.ai_profile.skills;
      skills = [
        ...(s.technical_skills || []),
        ...(s.research_skills || []),
        ...(s.business_skills || []),
        ...(s.tools_and_technologies || [])
      ];
    }
    return Array.from(new Set(skills.map(x => String(x).toLowerCase())));
  };
  
  // Helper for parsing candidate interests
  const getInterests = (user: any) => {
    let interests: string[] = [];
    if (user.ai_profile?.research_information) {
      const ri = user.ai_profile.research_information;
      interests = [
        ...(ri.research_interests || []),
        ...(ri.research_areas || []),
        ...(ri.research_keywords || []),
        ...(ri.research_domains || [])
      ];
    }
    return Array.from(new Set(interests.map(x => String(x).toLowerCase())));
  };
  
  // POST /api/challenge-matches/generate - Calculate match scores

  app.post('/api/challenge-matches/generate', validateBody(generateMatchesRequestSchema), authenticateUser, throttleLimit(12, 60 * 1000), async (req, res) => {
    try {
      const userId = getRequestProfileId(req);
      const { challengeId } = req.body;
      const supabaseClient = getDbClientForRequest(req)!;
      const serviceClient = getServiceClient();
      const matchWriter = (serviceClient || supabaseClient)!;
      if (!supabaseClient || !userId) {
        return res.status(503).json({ error: 'Database client is not configured for authenticated matching.' });
      }
  
      const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found.' });
      }
  
      const isPartner = profile.role === 'Industry/Partner';
  
      let challengesToMatch: any[] = [];
      let candidatesToMatch: any[] = [];
  
      if (isPartner) {
        let query = supabaseClient.from('industry_challenges').select('*').eq('partner_id', userId);
        if (challengeId) {
          query = query.eq('id', challengeId);
        }
        const { data: challenges } = await query;
        challengesToMatch = challenges || [];
  
        const { data: candidates } = await supabaseClient.from('profiles').select('*').in('role', ['Student', 'Researcher']);
        candidatesToMatch = candidates || [];
      } else {
        candidatesToMatch = [profile];
  
        const { data: challenges } = await supabaseClient.from('industry_challenges').select('*').eq('status', 'Open');
        challengesToMatch = challenges || [];
      }
  
      if (!challengesToMatch.length || !candidatesToMatch.length) {
        return res.json({ success: true, count: 0 });
      }
  
      let insertCount = 0;
  
      for (const challenge of challengesToMatch) {
        for (const candidate of candidatesToMatch) {
          if (candidate.id === challenge.partner_id) continue;
  
          let domainScore = 60;
          const challengeCat: string = (challenge.category || '').toLowerCase();
          const candInterests = getInterests(candidate);
          const candBio = (candidate.bio || '').toLowerCase();
          if (challengeCat && (candInterests.some(i => i.includes(challengeCat)) || candBio.includes(challengeCat))) {
            domainScore = 100;
          } else if (challengeCat) {
            const words = challengeCat.split(/\s+/);
            const hasMatch = words.some(w => w.length > 3 && (candBio.includes(w) || candInterests.some(i => i.includes(w))));
            if (hasMatch) domainScore = 85;
          }
  
          const reqSkills = (challenge.required_skills || []).map((s: string) => s.toLowerCase());
          const candSkills = getSkills(candidate);
          const matchedSkills = reqSkills.filter((s: string) => candSkills.some((cs: string) => cs.includes(s) || s.includes(cs)));
          const missingSkills = reqSkills.filter((s: string) => !candSkills.some((cs: string) => cs.includes(s) || s.includes(cs)));
          const skillScore = reqSkills.length === 0 ? 100 : Math.round((matchedSkills.length / reqSkills.length) * 100);
  
          let experienceScore = 70;
          if (candidate.ai_profile?.professional_profile?.years_of_experience) {
            const yrs = parseInt(candidate.ai_profile.professional_profile.years_of_experience, 10);
            if (yrs >= 5) experienceScore = 95;
            else if (yrs >= 2) experienceScore = 85;
          }
  
          const chText = `${challenge.title} ${challenge.summary} ${challenge.description}`.toLowerCase();
          const candInts = getInterests(candidate);
          const matchedInts = candInts.filter(i => chText.includes(i));
          const interestScore = Math.min(100, 50 + (matchedInts.length * 15));
  
          const roleSuitabilityScore = candidate.role === 'Researcher' ? 95 : 85;
          
          let recommendedRole = 'Technical Contributor';
          if (candidate.role === 'Researcher') {
            recommendedRole = 'Principal Investigator';
          } else {
            const lowerSkills = candSkills.join(' ');
            if (lowerSkills.includes('data') || lowerSkills.includes('python') || lowerSkills.includes('statistics') || lowerSkills.includes('analysis')) {
              recommendedRole = 'Data Analyst';
            } else if (lowerSkills.includes('lab') || lowerSkills.includes('pcr') || lowerSkills.includes('assay') || lowerSkills.includes('biosensor')) {
              recommendedRole = 'Laboratory Support';
            } else if (lowerSkills.includes('research') || lowerSkills.includes('academic') || lowerSkills.includes('literature')) {
              recommendedRole = 'Research Assistant';
            } else {
              recommendedRole = 'Student Researcher';
            }
          }
  
          const locationScore = (challenge.location && candidate.ai_profile?.personal_information?.city &&
            String(challenge.location).toLowerCase().includes(String(candidate.ai_profile?.personal_information?.city).toLowerCase())) ? 100 : 70;
  
          const availabilityScore = (candidate.availability || candidate.ai_profile?.collaboration_profile?.availability) ? 100 : 80;
          const verificationScore = candidate.ai_profile ? 100 : 70;
  
          const totalScore = Math.round(
            0.25 * domainScore +
            0.25 * skillScore +
            0.15 * experienceScore +
            0.10 * interestScore +
            0.10 * roleSuitabilityScore +
            0.05 * locationScore +
            0.05 * availabilityScore +
            0.05 * verificationScore
          );
  
          const matchReasons = [];
          if (domainScore >= 85) {
            matchReasons.push(`Your research domain aligns strongly with the "${challenge.category || 'Expertise'}" field.`);
          }
          if (matchedSkills.length > 0) {
            matchReasons.push(`Your listed skills in [${matchedSkills.slice(0, 2).join(', ')}] match required capabilities.`);
          } else if (reqSkills.length === 0) {
            matchReasons.push(`Your general technical and academic skill set is highly suitable for this initiative.`);
          }
          if (experienceScore >= 85) {
            matchReasons.push(`Your professional and academic background supports specialized execution.`);
          }
          if (matchReasons.length === 0) {
            matchReasons.push(`Your research interests align structurally with this challenge scope.`);
          }
  
          const { data: existing } = await matchWriter
            .from('challenge_matches')
            .select('status')
            .eq('challenge_id', challenge.id)
            .eq('candidate_user_id', candidate.id)
            .maybeSingle();
  
          const currentStatus = existing?.status || 'recommended';
  
          const { error: upsertError } = await matchWriter
            .from('challenge_matches')
            .upsert({
              challenge_id: challenge.id,
              candidate_user_id: candidate.id,
              partner_user_id: challenge.partner_id,
              candidate_role: candidate.role === 'Student' ? 'student' : 'researcher',
              total_score: totalScore,
              domain_score: domainScore,
              skill_score: skillScore,
              experience_score: experienceScore,
              interest_score: interestScore,
              role_suitability_score: roleSuitabilityScore,
              location_score: locationScore,
              availability_score: availabilityScore,
              verification_score: verificationScore,
              matched_skills: matchedSkills,
              missing_skills: missingSkills,
              match_reasons: matchReasons,
              recommended_role: recommendedRole,
              status: currentStatus,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'challenge_id,candidate_user_id'
            });
  
          if (!upsertError) {
            insertCount++;
          }
        }
      }
  
      res.json({ success: true, count: insertCount });
    } catch (error: any) {
      console.error('Failed to generate challenge matches:', error);
      console.error('API route error:', error.message);
        res.status(500).json({ error: 'An internal error occurred. Please try again later.' });
    }
  });
  
  // PUT /api/challenge-matches/:id - Update match status

  app.put('/api/challenge-matches/:id', validateBody(updateMatchStatusRequestSchema), authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = getRequestProfileId(req);
  
      if (!status) {
        return res.status(400).json({ error: 'Status is required.' });
      }
  
      const supabaseClient = getDbClientForRequest(req)!;
      if (!supabaseClient || !userId) {
        return res.status(503).json({ error: 'Database client is not configured for authenticated writes.' });
      }
      const { data: match } = await supabaseClient.from('challenge_matches').select('*').eq('id', id).maybeSingle();
      
      if (!match) {
        return res.status(404).json({ error: 'Match record not found.' });
      }
  
      if (!canMutateMatch(userId, match.candidate_user_id, match.partner_user_id, (req as any).userRole === Roles.Admin)) {
        return res.status(403).json({ error: 'Unauthorized to update this match status.' });
      }
  
      const { data: updated, error } = await supabaseClient
        .from('challenge_matches')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
  
      if (error) throw error;
      res.json({ success: true, match: updated });
    } catch (error: any) {
      console.error('Failed to update match status:', error);
      console.error('API route error:', error.message);
        res.status(500).json({ error: 'An internal error occurred. Please try again later.' });
    }
  });
  
  
  // --- AI Decision Provenance Ledger (Admin) ---
};
