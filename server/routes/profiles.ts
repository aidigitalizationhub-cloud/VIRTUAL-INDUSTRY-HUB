import type { Express } from 'express';
import { profileUpdateRequestSchema } from '../../lib/requestSchemas';
import { getServiceClient, serviceClientConfigError } from '../db/supabase';
import { isSupabaseApiKeyError } from '../config/env';
import { PUBLIC_PROFILE_FIELDS, toPublicProfile } from '../../lib/publicProfile';
import {
  authenticateUser,
  getDbClientForRequest,
  getRequestProfileId,
  PROFILE_MUTABLE_FIELDS,
  Roles,
  SELF_ASSIGNABLE_ROLES,
} from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const registerProfileRoutes = (app: Express) => {
  app.get('/api/profile/me', authenticateUser, async (req, res) => {
    try {
      const profileId = getRequestProfileId(req);
      const db = getDbClientForRequest(req);
      if (!db || !profileId) {
        return res.status(503).json({ error: serviceClientConfigError() });
      }

      const { data: profile, error } = await db.from('profiles').select('*').eq('id', profileId).maybeSingle();
      if (error) throw error;
      return res.json({ profile: profile || null });
    } catch (error: any) {
      console.error('Server profile load error:', error);
      if (isSupabaseApiKeyError(error)) {
        return res.status(503).json({ error: 'Server Supabase service key is invalid. Check SUPABASE_SERVICE_ROLE_KEY and restart the server.' });
      }
      return res.status(500).json({ error: 'Profile load failed. Please try again.' });
    }
  });

  app.get('/api/profile/:id', async (req, res) => {
    try {
      const profileId = req.params.id;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) {
        return res.status(400).json({ error: 'Invalid profile ID.' });
      }

      const db = getServiceClient();
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });

      let { data: profile, error } = await db
        .from('profiles')
        .select(PUBLIC_PROFILE_FIELDS.join(', '))
        .eq('id', profileId)
        .maybeSingle();
      if (error) {
        console.warn('Public profile projection unavailable; using base columns:', error.message);
        const fallback = await db.from('profiles').select('id, name, role').eq('id', profileId).maybeSingle();
        profile = fallback.data;
        error = fallback.error;
      }
      if (error) throw error;
      if (!profile) return res.json({ profile: null });
      return res.json({ profile: toPublicProfile(profile) });
    } catch (error: any) {
      console.error('Public profile load error:', error);
      return res.status(500).json({ error: 'Profile load failed. Please try again.' });
    }
  });

  app.post('/api/profile/update', validateBody(profileUpdateRequestSchema), authenticateUser, async (req, res) => {
    try {
      const serviceClient = getServiceClient();
      if (!serviceClient) {
        return res.status(503).json({ error: serviceClientConfigError() });
      }

      const incomingProfile = req.body.profile || {};
      const answers = req.body.answers || incomingProfile.answers;
      const authUser = (req as any).user;
      const resolvedProfileId = (req as any).resolvedProfileId;
      const targetProfileId = resolvedProfileId || authUser?.id;
      const allowedIds = new Set([authUser?.id, resolvedProfileId].filter(Boolean));

      if (!targetProfileId || !allowedIds.has(targetProfileId)) {
        return res.status(403).json({ error: 'Unauthorized: Profile mutation request is invalid.' });
      }

      const profilePayload = Object.fromEntries(
        Object.entries(incomingProfile).filter(([key]) => PROFILE_MUTABLE_FIELDS.has(key)),
      );
      const mainProfile: Record<string, any> = {
        id: targetProfileId,
        ...profilePayload,
        email: authUser?.email || null,
      };

      const { data: existing } = await serviceClient.from('profiles').select('id, role').eq('id', targetProfileId).maybeSingle();

      if (existing) {
        mainProfile.role = existing.role;
      } else {
        const requestedRole = incomingProfile.role;
        mainProfile.role = SELF_ASSIGNABLE_ROLES.has(requestedRole) ? requestedRole : Roles.Researcher;
      }

      const result = existing
        ? await serviceClient.from('profiles').update(mainProfile).eq('id', targetProfileId)
        : await serviceClient.from('profiles').insert([mainProfile]);

      if (result.error) throw result.error;

      if (answers && mainProfile.role) {
        if (mainProfile.role === 'Student') {
          await serviceClient.from('student_profiles').upsert({
            user_id: targetProfileId,
            education_level: answers.edu_level,
            availability: answers.availability,
            looking_for: Array.isArray(answers.looking_for) ? answers.looking_for.join(', ') : answers.looking_for,
          });
        } else if (mainProfile.role === 'Researcher') {
          await serviceClient.from('researcher_profiles').upsert({
            user_id: targetProfileId,
            research_stage: answers.research_stage,
            funding_needed: answers.funding_needed,
            needs_students: answers.needs_students,
          });
        } else if (mainProfile.role === 'Investor') {
          await serviceClient.from('investor_profiles').upsert({
            user_id: targetProfileId,
            funding_range: answers.funding_range,
            investment_focus: answers.investment_focus,
          });
        } else if (mainProfile.role === 'Industry/Partner') {
          await serviceClient.from('industry_profiles').upsert({
            user_id: targetProfileId,
            sector: answers.sector,
            collaboration_type: answers.collab_type,
          });
        }
      }

      return res.json({ success: true, profileId: targetProfileId });
    } catch (error: any) {
      console.error('Server profile update error:', error);
      if (isSupabaseApiKeyError(error)) {
        return res.status(503).json({ error: 'Server Supabase service key is invalid. Check SUPABASE_SERVICE_ROLE_KEY and restart the server.' });
      }
      return res.status(500).json({ error: 'Profile update failed. Please try again.' });
    }
  });
};
