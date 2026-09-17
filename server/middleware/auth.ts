import type { NextFunction, Request, Response } from 'express';
import { auth, markPasswordResetComplete } from '../../lib/auth';
import { getServiceClient } from '../db/supabase';
import { getSupabaseClient } from '../db/supabase';

export const Roles = {
  Admin: 'Admin',
  SuperAdmin: 'Super Admin',
  IndustryPartner: 'Industry/Partner',
  Researcher: 'Researcher',
  Student: 'Student',
  Investor: 'Investor',
} as const;

export const isAdminRole = (role: unknown): boolean => role === Roles.Admin || role === Roles.SuperAdmin;

export const SELF_ASSIGNABLE_ROLES = new Set([
  Roles.IndustryPartner,
  Roles.Researcher,
  Roles.Student,
  Roles.Investor,
]);

export const PROFILE_MUTABLE_FIELDS = new Set([
  'name', 'title', 'bio', 'company', 'department', 'website_url', 'website_url_2',
  'website_url_3', 'website_url_4', 'avatar_url', 'user_type', 'education_level',
  'program', 'research_area', 'research_stage', 'funding_needed', 'needs_students',
  'availability', 'looking_for', 'funding_range', 'investment_focus', 'sector',
  'collaboration_type', 'ai_profile', 'semantic_summary', 'embedding',
]);

export const PROJECT_MUTABLE_FIELDS = new Set([
  'title', 'description', 'department', 'status', 'visibility', 'trl', 'research_area',
  'image_url', 'budget', 'start_date', 'funding_amount_usd', 'open_to_collaboration',
  'technical_details_url', 'achievements', 'needs', 'embedding', 'disclosure_status',
  'internal_notes', 'requested_documents', 'disclosure_timeline', 'ai_verification',
]);

export const newsSelectFields = 'id, title, category, published_at, image_url, summary, external_url, is_ai_generated, source_name, status, reference_links, tags, relevance_score, source_verification_notes, created_at';

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await (auth as any).api.getSession({ headers: req.headers as any });
    if (!session?.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    (req as any).user = session.user;
    (req as any).userToken = null;
    (req as any).authSource = 'better-auth';

    try {
      await markPasswordResetComplete(session.user.id);
    } catch (error) {
      console.warn('[better-auth] Could not update migration reset status:', error);
    }

    const svc = getServiceClient();
    if (svc) {
      let profile: any = null;
      const { data: byId } = await svc.from('profiles').select('id, role').eq('id', session.user.id).maybeSingle();
      profile = byId;
      if (!profile && session.user.email) {
        const { data: byEmail } = await svc.from('profiles').select('id, role').eq('email', session.user.email).maybeSingle();
        profile = byEmail;
        if (profile?.id) {
          (req as any).resolvedProfileId = profile.id;
        }
      }
      (req as any).userRole = profile?.role || 'Guest';
    } else {
      (req as any).userRole = 'Guest';
    }
    return next();
  } catch (err: any) {
    console.error('Authentication Error:', err);
    res.status(401).json({ error: 'Unauthorized: Authentication service error' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).userRole || 'Guest';
    if (!roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
    }
    next();
  };
};

export const getRequestProfileId = (req: Request): string | undefined =>
  (req as any).resolvedProfileId || (req as any).user?.id;

export const getDbClientForRequest = (req: Request) => {
  const token = (req as any).userToken;
  if (token) return getSupabaseClient(token);
  return getServiceClient();
};

export const normalizeEmbedding = (embedding: unknown, dimension = 768): number[] => {
  if (!Array.isArray(embedding) || embedding.length === 0) return [];
  const values = embedding.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (values.length === 0) return [];
  if (values.length === dimension) return values;
  if (values.length > dimension) return values.slice(0, dimension);
  return [...values, ...new Array(dimension - values.length).fill(0)];
};
