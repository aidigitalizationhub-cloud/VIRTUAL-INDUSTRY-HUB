import type { Express } from 'express';
import { authenticateUser, getDbClientForRequest } from '../middleware/auth';
import { isAdminRole } from '../ip/ipAuthz';

export const registerAdminRoutes = (app: Express) => {
  app.get('/api/admin/overview', authenticateUser, async (req, res) => {
      try {
        const db = getDbClientForRequest(req);
        const role = (req as any).userRole;
        const canViewOverview = role === 'Admin' || role === 'Super Admin' || role === 'TTO' || role === 'TTO/IP' || role === 'IP Office';
        if (!db || !canViewOverview) return res.status(403).json({ error: 'Forbidden: overview access required.' });

        const [profilesResult, projectsResult, eoisResult] = await Promise.all([
          db.from('profiles').select(isAdminRole(role) ? 'id, name, email, role, department, company' : 'id, name, role, department, company'),
          db.from('projects').select('id, title, research_area, department, views, expressions_of_interest, created_at, status, visibility, disclosure_status'),
          db.from('eois').select('id'),
        ]);
        for (const result of [profilesResult, projectsResult, eoisResult]) {
          if (result.error) throw result.error;
        }
        return res.json({ overview: {
          profiles: isAdminRole(role) ? (profilesResult.data || []) : [],
          projects: projectsResult.data || [],
          eois: isAdminRole(role) ? (eoisResult.data || []) : [],
        }});
      } catch (error: any) {
        return res.status(500).json({ error: error?.message || 'Admin overview could not be loaded.' });
      }
    });
};
