import type { Express } from 'express';
import { randomUUID } from 'node:crypto';
import { getBase64DecodedByteLength, validateStorageUpload } from '../../lib/uploadGuard';
import { canAccessReleasedProject, canSignProjectObject } from '../../lib/authorization';
import { getServiceClient, serviceClientConfigError } from '../db/supabase';
import { authenticateUser, Roles } from '../middleware/auth';

export const registerStorageRoutes = (app: Express) => {
  app.post('/api/storage/upload', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const userId = (req as any).user.id;
      const { bucket, fileName, mimeType, contentBase64 } = req.body || {};
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      if (bucket !== 'projects' && bucket !== 'avatars') return res.status(400).json({ error: 'Invalid storage bucket.' });
      if (typeof contentBase64 !== 'string' || !contentBase64) return res.status(400).json({ error: 'File content is required.' });

      const decodedSize = getBase64DecodedByteLength(contentBase64);
      if (decodedSize === null) return res.status(400).json({ error: 'Invalid Base64 file data.' });
      const content = Buffer.from(contentBase64, 'base64');
      const validation = validateStorageUpload({ name: fileName, mimeType, sizeBytes: decodedSize });
      if (!validation.ok) return res.status(400).json({ error: validation.error });

      const extension = String(fileName).split('.').pop()?.toLowerCase() || 'bin';
      const objectPath = `${userId}/${randomUUID()}.${extension}`;
      const { error: uploadError } = await db.storage.from(bucket).upload(objectPath, content, {
        contentType: mimeType || 'application/octet-stream',
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { error: ownerError } = await db
        .schema('storage')
        .from('objects')
        .update({ owner: userId })
        .eq('bucket_id', bucket)
        .eq('name', objectPath);
      if (ownerError) console.warn('Storage owner metadata update failed:', ownerError.message);

      const isImage = String(mimeType || '').startsWith('image/');
      const publicUrl = isImage ? db.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl : null;
      return res.status(201).json({ path: objectPath, url: publicUrl });
    } catch (error: any) {
      console.error('Storage upload error:', error);
      return res.status(500).json({ error: 'File upload failed.' });
    }
  });

  const getStoredObjectPath = (value: string, bucket: string): string => {
    if (!value) return '';
    const marker = `/object/public/${bucket}/`;
    const signedMarker = `/object/sign/${bucket}/`;
    const start = value.indexOf(marker);
    const signedStart = value.indexOf(signedMarker);
    if (start >= 0) return decodeURIComponent(value.slice(start + marker.length).split('?')[0]);
    if (signedStart >= 0) return decodeURIComponent(value.slice(signedStart + signedMarker.length).split('?')[0]);
    return value;
  };

  app.post('/api/storage/sign', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const user = (req as any).user;
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const requests = Array.isArray(req.body?.requests) ? req.body.requests : [];
      if (requests.length > 100) return res.status(400).json({ error: 'Too many storage objects requested.' });
      const isAdmin = (req as any).userRole === Roles.Admin;
      const projectIds = [...new Set(requests.map((item: any) => item?.projectId).filter(Boolean))];
      const { data: projects, error: projectError } = await db.from('projects').select('id, owner_id').in('id', projectIds);
      if (projectError) throw projectError;
      const projectMap = new Map<string, { id: string; owner_id: string }>((projects || []).map((project: any) => [project.id, project]));
      const signed: any[] = [];
      for (const item of requests) {
        if (!item?.projectId || !item?.path || !['image', 'brief', 'document'].includes(item.kind)) continue;
        const project = projectMap.get(item.projectId);
        if (!project) continue;
        const owner = isAdmin || project.owner_id === user.id;
        if (!owner && item.kind === 'brief') {
          const { data: approvals } = await db.from('eois').select('status').eq('sender_id', user.id).eq('project_id', item.projectId);
          if (!canSignProjectObject(item.kind, owner, (approvals || []).map((row: any) => row.status))) continue;
        } else if (!canSignProjectObject(item.kind, owner)) {
          continue;
        }
        const { data, error } = await db.storage.from('projects').createSignedUrl(getStoredObjectPath(String(item.path), 'projects'), item.kind === 'brief' ? 3600 : 3600);
        if (!error && data?.signedUrl) signed.push({ projectIndex: item.projectIndex, docIndex: item.docIndex, kind: item.kind, url: data.signedUrl });
      }
      return res.json({ signed });
    } catch (error: any) {
      console.error('Storage signing error:', error);
      return res.status(500).json({ error: 'Storage objects could not be signed.' });
    }
  });

  app.get('/api/projects/:id/technical-brief', authenticateUser, async (req, res) => {
    try {
      const db = getServiceClient();
      const user = (req as any).user;
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data: project, error } = await db.from('projects').select('owner_id, technical_details_url').eq('id', req.params.id).maybeSingle();
      if (error) throw error;
      if (!project || !project.technical_details_url || project.technical_details_url === 'locked') return res.status(404).json({ error: 'Technical brief not found.' });

      let authorized = project.owner_id === user.id || (req as any).userRole === Roles.Admin;
      if (!authorized) {
        const { data: approvals } = await db.from('eois').select('status').eq('sender_id', user.id).eq('project_id', req.params.id);
        authorized = canAccessReleasedProject((approvals || []).map((row: any) => row.status));
      }
      if (!authorized) return res.status(403).json({ error: 'Secure reveal approval is required.' });

      const objectPath = getStoredObjectPath(project.technical_details_url, 'projects');
      const { data: signed, error: signError } = await db.storage.from('projects').createSignedUrl(objectPath, 3600);
      if (signError || !signed?.signedUrl) throw signError || new Error('Could not sign technical brief.');
      return res.json({ url: signed.signedUrl, expiresIn: 3600 });
    } catch (error: any) {
      console.error('Technical brief access error:', error);
      return res.status(500).json({ error: 'Technical brief could not be opened.' });
    }
  });
};
