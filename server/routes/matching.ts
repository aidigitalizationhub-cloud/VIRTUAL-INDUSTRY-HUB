import type { Express } from 'express';
import { isSelfMatchRequest } from '../../lib/authorization';
import { authenticateUser, getDbClientForRequest, getRequestProfileId, normalizeEmbedding } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { serviceClientConfigError } from '../db/supabase';
import { isSupabaseApiKeyError } from '../config/env';
import { matchesRequestSchema } from '../../lib/requestSchemas';

export const registerMatchingRoutes = (app: Express) => {
  app.post('/api/matches', validateBody(matchesRequestSchema), authenticateUser, async (req, res) => {
      try {
        const profileId = getRequestProfileId(req);
        const requestedUserId = req.body.userId;
        if (!isSelfMatchRequest(profileId, requestedUserId)) {
          return res.status(403).json({ error: 'Unauthorized: Match request is invalid.' });
        }

        const db = getDbClientForRequest(req);
        if (!db) {
          return res.status(503).json({ error: serviceClientConfigError() });
        }

        const validEmbedding = normalizeEmbedding(req.body.embedding, 768);
        let finalProfiles: any[] = [];
        let finalProjects: any[] = [];

        if (validEmbedding.length > 0) {
          const [{ data: profiles, error: profErr }, { data: projects, error: projErr }] = await Promise.all([
            db.rpc('match_profiles', {
              query_embedding: validEmbedding,
              match_threshold: 0.0,
              match_count: 20,
              excluded_id: profileId,
            }),
            db.rpc('match_projects', {
              query_embedding: validEmbedding,
              match_threshold: 0.0,
              match_count: 20,
            }),
          ]);

          if (profErr) console.warn('match_profiles RPC warning/error:', profErr);
          if (projErr) console.warn('match_projects RPC warning/error:', projErr);
          finalProfiles = profiles || [];
          finalProjects = projects || [];
        }

        if (finalProfiles.length === 0) {
          const { data: fallbackProfiles } = await db
            .from('profiles')
            .select('id, name, role, ai_profile, semantic_summary, avatar_url')
            .neq('id', profileId)
            .limit(10);
          finalProfiles = (fallbackProfiles || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            role: p.role || 'Researcher',
            ai_profile: p.ai_profile,
            semantic_summary: p.semantic_summary || 'Digital identity registered in University of Ghana Ecosystem.',
            similarity: 0.82,
            avatar_url: p.avatar_url,
          }));
        }

        if (finalProjects.length === 0) {
          const { data: fallbackProjects } = await db
            .from('projects')
            .select('id, title, description, image_url, research_area, visibility, owner_id, disclosure_status')
            .limit(10);
          finalProjects = (fallbackProjects || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            image_url: p.image_url,
            research_area: p.research_area || 'General Research',
            visibility: p.visibility,
            owner_id: p.owner_id,
            disclosure_status: p.disclosure_status,
            similarity: 0.80,
          }));
        }

        return res.json({ profiles: finalProfiles, projects: finalProjects });
      } catch (error: any) {
        console.error('Server match retrieval error:', error);
        if (isSupabaseApiKeyError(error)) {
          return res.status(503).json({ error: 'Server Supabase service key is invalid. Check SUPABASE_SERVICE_ROLE_KEY and restart the server.' });
        }
        return res.json({ profiles: [], projects: [] });
      }
    });
};
