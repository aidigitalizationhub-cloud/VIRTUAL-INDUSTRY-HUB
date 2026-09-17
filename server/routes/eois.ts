import type { Express } from 'express';
import { authenticateUser } from '../middleware/auth';
import { getServiceClient, serviceClientConfigError } from '../db/supabase';

export const registerEoisRoutes = (app: Express) => {
  app.post('/api/eois', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const senderId = (req as any).user.id;
      const { projectId, message, recipientId, metric = 'expressions_of_interest' } = req.body || {};
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      if (!message || typeof message !== 'string' || message.length > 10000) return res.status(400).json({ error: 'A valid message is required.' });
      if (metric !== 'expressions_of_interest' && metric !== 'requests') return res.status(400).json({ error: 'Invalid EOI metric.' });
      let targetRecipient = recipientId || null;
      let validProjectId = null;
      let projectCounters: { expressions_of_interest: number; requests: number } | null = null;
      if (projectId) {
        const { data: project } = await db.from('projects').select('id, owner_id, expressions_of_interest, requests').eq('id', projectId).maybeSingle();
        if (!project) return res.status(404).json({ error: 'Project not found.' });
        validProjectId = project.id;
        targetRecipient = targetRecipient || project.owner_id;
        projectCounters = {
          expressions_of_interest: Number(project.expressions_of_interest) || 0,
          requests: Number(project.requests) || 0,
        };
      }
      if (!targetRecipient || targetRecipient === senderId) return res.status(400).json({ error: 'A valid recipient is required.' });
      const { data, error } = await db.from('eois').insert([{
        project_id: validProjectId,
        user_name: (req as any).user.name || 'Platform User',
        message: message.trim(),
        read: false,
        sender_id: senderId,
        recipient_id: targetRecipient,
        status: 'pending',
      }]).select().single();
      if (error) throw error;
      if (validProjectId && projectCounters) {
        const { error: counterError } = await db.from('projects').update({
          [metric]: projectCounters[metric as keyof typeof projectCounters] + 1,
        }).eq('id', validProjectId);
        if (counterError) throw counterError;
      }
      return res.status(201).json({ eoi: data });
    } catch (error: any) {
      console.error('EOI create error:', error);
      return res.status(500).json({ error: 'Message could not be sent.' });
    }
  });

  app.get('/api/eois/sent', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data, error } = await db.from('eois').select('*, projects(*)').eq('sender_id', (req as any).user.id).order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ eois: data || [] });
    } catch (error: any) {
      console.error('Sent EOI load error:', error);
      return res.status(500).json({ error: 'Applications could not be loaded.' });
    }
  });

  app.get('/api/eois/received', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const userId = (req as any).user.id;
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data: ownedProjects, error: projectError } = await db.from('projects').select('id').eq('owner_id', userId);
      if (projectError) throw projectError;
      const projectIds = (ownedProjects || []).map((project: any) => project.id);
      let query = db.from('eois').select('*, projects(*)').order('created_at', { ascending: false });
      query = projectIds.length > 0
        ? query.or(`project_id.in.(${projectIds.join(',')}),recipient_id.eq.${userId}`)
        : query.eq('recipient_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return res.json({ eois: data || [] });
    } catch (error: any) {
      console.error('Received EOI load error:', error);
      return res.status(500).json({ error: 'Received messages could not be loaded.' });
    }
  });

  app.get('/api/eois/conversations', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const userId = (req as any).user.id;
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data, error } = await db.from('eois').select('*, projects(title, image_url)').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ eois: data || [] });
    } catch (error: any) {
      console.error('Conversation load error:', error);
      return res.status(500).json({ error: 'Conversations could not be loaded.' });
    }
  });

  app.get('/api/eois/unread-count', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { count, error } = await db.from('eois').select('id', { count: 'exact', head: true }).eq('recipient_id', (req as any).user.id).eq('read', false);
      if (error) throw error;
      return res.json({ count: count || 0 });
    } catch (error: any) {
      console.error('Unread count error:', error);
      return res.status(500).json({ error: 'Unread count could not be loaded.' });
    }
  });

  app.put('/api/eois/:id/read', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const userId = (req as any).user.id;
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data: eoi } = await db.from('eois').select('sender_id, recipient_id').eq('id', req.params.id).maybeSingle();
      if (!eoi) return res.status(404).json({ error: 'Message not found.' });
      if (eoi.sender_id !== userId && eoi.recipient_id !== userId) return res.status(403).json({ error: 'You cannot update this message.' });
      const { error } = await db.from('eois').update({ read: true }).eq('id', req.params.id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (error: any) {
      console.error('EOI read update error:', error);
      return res.status(500).json({ error: 'Message could not be updated.' });
    }
  });

  app.post('/api/eois/read-thread', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const userId = (req as any).user.id;
      const { partnerId, projectId } = req.body || {};
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      if (!partnerId) return res.status(400).json({ error: 'Conversation participant is required.' });
      let query = db.from('eois').update({ read: true }).eq('recipient_id', userId).eq('sender_id', partnerId).eq('read', false);
      query = projectId ? query.eq('project_id', projectId) : query.is('project_id', null);
      const { error } = await query;
      if (error) throw error;
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Conversation read update error:', error);
      return res.status(500).json({ error: 'Conversation could not be marked as read.' });
    }
  });

  app.put('/api/eois/:id/status', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const userId = (req as any).user.id;
      const status = req.body?.status;
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      if (typeof status !== 'string' || status.length < 1 || status.length > 100) return res.status(400).json({ error: 'Invalid EOI status.' });
      const { data: eoi } = await db.from('eois').select('sender_id, recipient_id').eq('id', req.params.id).maybeSingle();
      if (!eoi) return res.status(404).json({ error: 'Message not found.' });
       if (eoi.recipient_id !== userId && !['Admin', 'Super Admin'].includes((req as any).userRole)) return res.status(403).json({ error: 'Only the recipient or an administrator can change this status.' });
      const { error } = await db.from('eois').update({ status }).eq('id', req.params.id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (error: any) {
      console.error('EOI status update error:', error);
      return res.status(500).json({ error: 'Message status could not be updated.' });
    }
  });

  // 1.5. Live Translation Endpoint using Gemini
};
