import type { Express } from 'express';
import { auth } from '../../lib/auth';
import { adminNewsRequestSchema } from '../../lib/requestSchemas';
import { getServiceClient, serviceClientConfigError } from '../db/supabase';
import { authenticateUser, newsSelectFields, requireRole, Roles } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { newsDedupeKey, normalizeNewsUrl, validateNewsPublication } from '../newsCuration';
import { verifyNewsSourceEvidence, verifyNewsSourceEvidenceLive } from '../services/sourceVerification';

export const registerNewsRoutes = (app: Express) => {
  app.get('/api/news', async (req, res) => {
    try {
      const includeDrafts = req.query.includeDrafts === 'true';
      if (includeDrafts) {
        const session = await (auth as any).api.getSession({ headers: req.headers as any });
        if (!session?.user) return res.status(401).json({ error: 'Authentication required.' });
        const svc = getServiceClient();
        if (!svc) return res.status(503).json({ error: serviceClientConfigError() });
        const { data: profile } = await svc.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
        if (profile?.role !== Roles.Admin) return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
      }
      const db = getServiceClient();
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(150, Math.max(1, Number(req.query.limit) || 20));
      let query = db.from('news').select(newsSelectFields);
      if (!includeDrafts) query = query.eq('status', 'Published');
      if (req.query.category && req.query.category !== 'All') query = query.eq('category', String(req.query.category));
      if (req.query.search) query = query.ilike('title', `%${String(req.query.search).replace(/[%*]/g, '')}%`);
      const { data, error } = await query.order('published_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
      if (error) throw error;
      return res.json({ news: (data || []).filter((item: any) => item.status !== null) });
    } catch (error) {
      console.error('News load error:', error);
      return res.status(500).json({ error: 'News load failed. Please try again.' });
    }
  });

  app.get('/api/news/last-sync', async (_req, res) => {
    const db = getServiceClient();
    if (!db) return res.status(503).json({ error: serviceClientConfigError() });
    const { data } = await db.from('news').select('created_at').not('status', 'is', null).order('created_at', { ascending: false }).limit(1);
    return res.json({ lastSync: data?.[0]?.created_at || null });
  });

  app.post('/api/admin/news', authenticateUser, requireRole(Roles.Admin), validateBody(adminNewsRequestSchema), async (req, res) => {
    try {
      const db = getServiceClient();
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const input = req.body as Record<string, any>;
      const validation = validateNewsPublication(input);
      if (!validation.ok) return res.status(422).json({ error: validation.errors.join(' ') });
      if (input.status === 'Published') {
        const evidence = verifyNewsSourceEvidence(input);
        if (!evidence.ok) return res.status(422).json({ error: evidence.reason });
        const live = await verifyNewsSourceEvidenceLive(input);
        if (!live.ok) return res.status(422).json({ error: live.reason });
        const stamp = live.verified
          .map((v) => `Verified ${v.finalUrl} (HTTP ${v.httpStatus}, sha256:${v.contentHash.slice(0, 12)}, ${v.retrievedAt}${v.trustedHost ? ', trusted host' : ''})`)
          .join('\n');
        const existingNotes = typeof input.source_verification_notes === 'string' ? input.source_verification_notes.trim() : '';
        input.source_verification_notes = existingNotes ? `${existingNotes}\n${stamp}` : stamp;
      }
      const payload = { ...input };
      delete payload.id;
      if (payload.external_url) payload.external_url = normalizeNewsUrl(payload.external_url);
      if (Array.isArray(payload.reference_links)) payload.reference_links = payload.reference_links.map(normalizeNewsUrl).filter(Boolean);
      payload.published_at = payload.published_at || new Date().toISOString();
      payload.status = payload.status || 'Published';
      const key = newsDedupeKey(payload);
      const { data: candidates } = await db.from('news').select(newsSelectFields).limit(500);
      const duplicate =
        !input.id &&
        (candidates || []).find((row: any) => {
          const rowKey = newsDedupeKey(row);
          return (key.url && rowKey.url === key.url) || rowKey.content === key.content;
        });
      if (duplicate) return res.json({ news: duplicate, deduplicated: true });
      const query = input.id ? db.from('news').update(payload).eq('id', input.id) : db.from('news').insert(payload);
      const { data, error } = await query.select().single();
      if (error) throw error;
      return res.json({ news: data });
    } catch (error) {
      console.error('Admin news save error:', error);
      return res.status(500).json({ error: 'News save failed. Please try again.' });
    }
  });

  app.delete('/api/admin/news/:id', authenticateUser, requireRole(Roles.Admin), async (req, res) => {
    const db = getServiceClient();
    if (!db) return res.status(503).json({ error: serviceClientConfigError() });
    const { error } = await db.from('news').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: 'News deletion failed.' });
    return res.json({ success: true });
  });

  app.get('/api/admin/verify', authenticateUser, (req, res) => {
    return res.json({ isAdmin: (req as any).userRole === Roles.Admin });
  });
};
