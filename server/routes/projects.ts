import type { Express } from 'express';
import { getServiceClient, serviceClientConfigError } from '../db/supabase';
import { authenticateUser, PROJECT_MUTABLE_FIELDS, Roles } from '../middleware/auth';
import { protectProjectPublication } from '../../lib/projectPublication';

export const registerProjectsRoutes = (app: Express) => {
  app.get('/api/projects/mine', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const userId = (req as any).user.id;
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data, error } = await db.from('projects').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ projects: data || [] });
    } catch (error: any) {
      console.error('Owned projects load error:', error);
      return res.status(500).json({ error: 'Projects could not be loaded.' });
    }
  });

  app.post('/api/projects', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const incoming = req.body?.project || req.body || {};
      const project = protectProjectPublication(
        Object.fromEntries(Object.entries(incoming).filter(([key]) => PROJECT_MUTABLE_FIELDS.has(key))),
        { create: true },
      );
      project.owner_id = (req as any).user.id;
      const { data, error } = await db.from('projects').insert([project]).select().single();
      if (error) throw error;
      return res.status(201).json({ project: data });
    } catch (error: any) {
      console.error('Project create error:', error);
      return res.status(500).json({ error: 'Project could not be created.' });
    }
  });

  app.put('/api/projects/:id', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const user = (req as any).user;
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data: existing, error: existingError } = await db.from('projects').select('owner_id, visibility, disclosure_status').eq('id', req.params.id).maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return res.status(404).json({ error: 'Project not found.' });
      if (existing.owner_id !== user.id && (req as any).userRole !== Roles.Admin) {
        return res.status(403).json({ error: 'You do not have permission to modify this project.' });
      }
      const incoming = req.body?.project || req.body || {};
      const ownerEdit = existing.owner_id === user.id && (req as any).userRole !== Roles.Admin;
      const grandfathered = existing.visibility === 'Public' || existing.disclosure_status === 'Published';
      const project = protectProjectPublication(
        Object.fromEntries(Object.entries(incoming).filter(([key]) => PROJECT_MUTABLE_FIELDS.has(key))),
        { create: false, ownerEdit, grandfathered },
      );
      delete project.owner_id;
      const { data, error } = await db.from('projects').update(project).eq('id', req.params.id).select().single();
      if (error) throw error;
      return res.json({ project: data });
    } catch (error: any) {
      console.error('Project update error:', error);
      if (error?.status) return res.status(error.status).json({ error: error.message });
      return res.status(500).json({ error: 'Project could not be updated.' });
    }
  });

  app.delete('/api/projects/:id', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const user = (req as any).user;
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data: existing } = await db.from('projects').select('owner_id').eq('id', req.params.id).maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Project not found.' });
      if (existing.owner_id !== user.id && (req as any).userRole !== Roles.Admin) {
        return res.status(403).json({ error: 'You do not have permission to delete this project.' });
      }
      const { error } = await db.from('projects').delete().eq('id', req.params.id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Project delete error:', error);
      return res.status(500).json({ error: 'Project could not be deleted.' });
    }
  });

  app.get('/api/projects/trending', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data: projects, error: projectError } = await db
        .from('projects')
        .select('id, title, description, department, research_area, status, visibility, image_url, views, expressions_of_interest, requests, created_at')
        .eq('visibility', 'Public')
        .in('disclosure_status', ['Approved', 'Published'])
        .limit(100);
      if (projectError) throw projectError;
      if (!projects?.length) return res.json({ projects: [] });

      const { data: eois, error: eoiError } = await db.from('eois').select('project_id').in('project_id', projects.map((project: any) => project.id));
      if (eoiError) throw eoiError;
      const inquiryCounts = new Map<string, number>();
      for (const eoi of eois || []) inquiryCounts.set(eoi.project_id, (inquiryCounts.get(eoi.project_id) || 0) + 1);
      const now = Date.now();
      const ranked = projects.map((project: any) => {
        const ageDays = project.created_at ? Math.max(0, Math.floor((now - new Date(project.created_at).getTime()) / 86400000)) : 0;
        const recencyBoost = Math.max(0, 30 - ageDays);
        const engagementScore = (Number(project.views) || 0) + ((Number(project.expressions_of_interest) || 0) * 10) + ((Number(project.requests) || 0) * 12) + ((inquiryCounts.get(project.id) || 0) * 10);
        return { ...project, trendScore: engagementScore + recencyBoost };
      }).sort((a: any, b: any) => b.trendScore - a.trendScore).slice(0, 5);
      return res.json({ projects: ranked.map(({ trendScore, ...project }: any) => project) });
    } catch (error: any) {
      console.error('Trending projects load error:', error);
      return res.status(500).json({ error: 'Trending projects could not be loaded.' });
    }
  });

  app.get('/api/bookmarks', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data, error } = await db.from('bookmarks').select('id, project_id, projects(*)').eq('user_id', (req as any).user.id);
      if (error) throw error;
      return res.json({ bookmarks: (data || []).map((row: any) => row.projects).filter(Boolean) });
    } catch (error: any) {
      console.error('Bookmarks load error:', error);
      return res.status(500).json({ error: 'Bookmarks could not be loaded.' });
    }
  });

  app.get('/api/bookmarks/:projectId/check', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data, error } = await db.from('bookmarks').select('id').eq('user_id', (req as any).user.id).eq('project_id', req.params.projectId).maybeSingle();
      if (error) throw error;
      return res.json({ bookmarked: Boolean(data) });
    } catch (error: any) {
      console.error('Bookmark status error:', error);
      return res.status(500).json({ error: 'Bookmark status could not be loaded.' });
    }
  });

  app.post('/api/bookmarks/toggle', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const userId = (req as any).user.id;
      const projectId = req.body?.projectId;
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      if (!projectId) return res.status(400).json({ error: 'Project ID is required.' });
      const { data: existing } = await db.from('bookmarks').select('id').eq('user_id', userId).eq('project_id', projectId).maybeSingle();
      if (existing) {
        const { error } = await db.from('bookmarks').delete().eq('id', existing.id);
        if (error) throw error;
        return res.json({ bookmarked: false });
      }
      const { error } = await db.from('bookmarks').insert([{ user_id: userId, project_id: projectId }]);
      if (error) throw error;
      return res.json({ bookmarked: true });
    } catch (error: any) {
      console.error('Bookmark mutation error:', error);
      return res.status(500).json({ error: 'Bookmark could not be updated.' });
    }
  });
};
