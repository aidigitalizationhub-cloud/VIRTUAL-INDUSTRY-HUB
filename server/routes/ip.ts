import type { Express } from 'express';
import express from 'express';
import { transitionIpWorkflow } from '../../lib/ipWorkflow';
import { applyTransition, isUuid, missingTables } from '../ip/ipService';
import { canViewDisclosure, canAdminReview, canTtoReview, canDecidePublication, isTtoRole, isAdminRole } from '../ip/ipAuthz';
import { writeIpEvent } from '../ip/ipAudit';
import { buildAdvisoryFindings } from '../ip/ipAi';
import { collectIpEvidence, formatIpEvidenceForPrompt, formatIpReviewerFinding } from '../ip/ipEvidence';
import { getServiceClient, serviceClientConfigError } from '../db/supabase';
import { authenticateUser, getDbClientForRequest, getRequestProfileId } from '../middleware/auth';
import { throttleLimit } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';
import { generateWithAssistantReviewer, recordAiDecision } from '../services/aiGateway';
import { AiProvenancePersistenceError } from '../../lib/aiProvenance';
import {
  createIpDisclosureRequestSchema, submitIpDisclosureRequestSchema, listIpDisclosuresQuerySchema,
  patchIpDisclosureRequestSchema, adminReturnIpDisclosureRequestSchema, createIpFindingRequestSchema,
  shareIpFindingRequestSchema, createIpLinkRequestSchema, publicationDecisionRequestSchema,
  registerIpFileRequestSchema, createAccessRequestSchema, decideAccessRequestSchema,
} from '../../lib/requestSchemas';

export const registerIpRoutes = (app: Express) => {
  // --- IP disclosure workflow (scalable domain service + thin route adapters) ---
  // Separate tables; never mutates legacy projects.disclosure_status except on final publication.
  const ipMissing = (res: express.Response) =>
    res.status(503).json({ error: 'IP disclosure storage is not enabled yet. Apply the Phase 1 database migration.' });
  
  const ipSendError = (res: express.Response, err: any, fallback: string) => {
    if (missingTables(err)) return ipMissing(res);
    if (err?.status === 404) return res.status(404).json({ error: err.message });
    if (err?.status === 409) return res.status(409).json({ error: err.message });
    if (err?.status === 403) return res.status(403).json({ error: err.message });
    console.error(fallback, err);
    return res.status(500).json({ error: fallback });
  };

  const projectObjectKey = (value: unknown): string | null => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const marker = '/object/public/';
    const markerIndex = raw.indexOf(marker);
    if (markerIndex >= 0) return decodeURIComponent(raw.slice(markerIndex + marker.length).split('?')[0]);
    if (/^[a-z0-9_-]+\/[^/]+/i.test(raw) && !raw.includes('://')) return raw.split('?')[0];
    return null;
  };

  const projectFileName = (objectKey: string, fallback: string): string => {
    const name = decodeURIComponent(objectKey.split('/').pop() || '').trim();
    return name || fallback;
  };

  const projectFileMime = (objectKey: string): string => {
    const extension = objectKey.split('?')[0].split('.').pop()?.toLowerCase();
    const mimeByExtension: Record<string, string> = {
      pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
    };
    return mimeByExtension[extension || ''] || 'application/octet-stream';
  };

  const attachProjectEvidence = async (db: any, params: { disclosureId: string; researcherId: string; imageUrl?: unknown; technicalDetailsUrl?: unknown }) => {
    const sources = [
      ...String(params.imageUrl || '').split('|').map((value) => ({ value, fallback: 'project-evidence' })),
      { value: params.technicalDetailsUrl, fallback: 'technical-brief' },
    ];
    for (const source of sources) {
      const objectKey = projectObjectKey(source.value);
      if (!objectKey) continue;
      const existing = await db.from('ip_disclosure_files').select('id').eq('disclosure_id', params.disclosureId).eq('object_key', objectKey).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) continue;
      const inserted = await db.from('ip_disclosure_files').insert({
        disclosure_id: params.disclosureId,
        uploaded_by: params.researcherId,
        object_key: objectKey,
        original_name: projectFileName(objectKey, source.fallback),
        mime_type: projectFileMime(objectKey),
        size_bytes: 1,
        classification: 'CONFIDENTIAL',
        scan_status: 'pending',
      });
      if (inserted.error) throw inserted.error;
    }
  };

  app.post('/api/ip/disclosures', authenticateUser, validateBody(createIpDisclosureRequestSchema), async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const researcherId = getRequestProfileId(req);
      if (!db || !researcherId) return res.status(503).json({ error: serviceClientConfigError() });
      const input = req.body;
      const { data: project, error: projectError } = await db.from('projects').select('id, owner_id').eq('id', input.projectId).maybeSingle();
      if (projectError) throw projectError;
      if (!project) { const e: any = new Error('Project not found.'); e.status = 404; throw e; }
      if (project.owner_id !== researcherId) { const e: any = new Error('Only the project owner can create its disclosure.'); e.status = 403; throw e; }
      const { data: existing, error: existingError } = await db.from('ip_disclosures').select('id').eq('project_id', input.projectId).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return res.json({ disclosure: (await db.from('ip_disclosures').select('*').eq('id', existing.id).single()).data });
      const { data: disclosure, error: insertError } = await db.from('ip_disclosures').insert({
        project_id: input.projectId, researcher_id: researcherId, status: 'draft',
        answers: input.answers ?? {}, policy_version: input.policyVersion ?? null,
        submission_policy_version: input.submissionPolicyVersion ?? null,
      }).select('*').single();
      if (insertError) throw insertError;
      await writeIpEvent(db, { disclosure_id: disclosure.id, actor_id: researcherId, actor_role: 'Researcher', action: 'create_draft', to_status: 'draft', details: { project_id: input.projectId } });
      return res.status(201).json({ disclosure });
    } catch (error: any) {
      return ipSendError(res, error, 'IP disclosure could not be created.');
    }
  });

  app.post('/api/ip/disclosures/:id/submit', authenticateUser, validateBody(submitIpDisclosureRequestSchema), async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const researcherId = getRequestProfileId(req);
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!db || !researcherId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const cur = await db.from('ip_disclosures').select('id, project_id, researcher_id, status, version').eq('id', disclosureId).maybeSingle();
      if (cur.error) throw cur.error;
      if (!cur.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
      if (cur.data.researcher_id !== researcherId) { const e: any = new Error('Only the researcher can submit this disclosure.'); e.status = 403; throw e; }
      if (cur.data.status !== 'draft' && cur.data.status !== 'researcher_action_required') { const e: any = new Error('This disclosure is not ready for researcher submission.'); e.status = 409; throw e; }
      const input = req.body as any;
      const projectResult = await db.from('projects').select('title, description, image_url, technical_details_url').eq('id', cur.data.project_id).maybeSingle();
      if (projectResult.error) throw projectResult.error;
      await attachProjectEvidence(db, {
        disclosureId,
        researcherId,
        imageUrl: projectResult.data?.image_url,
        technicalDetailsUrl: projectResult.data?.technical_details_url,
      });
      // TTO-routed drafts go straight to the IP Office; opt-outs stay in
      // `submitted` for Admin triage. Resubmissions always return to triage.
      const action = cur.data.status === 'draft'
        ? (input.route === 'tto_review' ? 'submit_to_tto' : 'submit')
        : 'resubmit';
      const next = transitionIpWorkflow(cur.data.status, action as any);
      const now = new Date().toISOString();
      const updated = await db.from('ip_disclosures').update({
        status: next.status, route: input.route, tto_opt_out: input.route === 'tto_opt_out',
        policy_version: input.policyVersion, policy_accepted_at: now,
        submission_policy_version: input.submissionPolicyVersion, submission_policy_accepted_at: now,
        submitted_at: now, version: (cur.data.version ?? 0) + 1, updated_at: now,
      }).eq('id', disclosureId).eq('version', cur.data.version).select('*').maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) { const e: any = new Error('Disclosure changed while submitting. Reload and try again.'); e.status = 409; throw e; }
      await writeIpEvent(db, { disclosure_id: disclosureId, actor_id: researcherId, actor_role: 'Researcher', action, from_status: cur.data.status, to_status: next.status, details: { route: input.route } });
      try {
         const projectResult = await db.from('projects').select('title, description').eq('id', updated.data.project_id).maybeSingle();
        const screened = buildAdvisoryFindings({
          title: projectResult.data?.title,
          description: projectResult.data?.description,
          answers: updated.data.answers ?? {},
          route: input.route,
        });
        for (const finding of screened.findings) {
          await db.from('ip_disclosure_findings').insert({
            disclosure_id: disclosureId,
            author_id: researcherId,
            author_role: 'AI screening',
            category: input.route === 'tto_opt_out' ? 'authenticity' : finding.category,
            title: input.route === 'tto_opt_out' ? `Authenticity advisory: ${finding.title}` : finding.title,
            body: `${finding.body}\n\nAI advisory only. This is not legal clearance or a publication decision.`,
            severity: finding.severity,
            source_type: 'ai',
            visibility: 'internal',
            is_preliminary: true,
          });
        }
         const { data: submittedLinks } = await db.from('ip_disclosure_links').select('url, title, source_type, notes').eq('disclosure_id', disclosureId).limit(20);
         const evidenceSources = await collectIpEvidence({ db, title: projectResult.data?.title, description: projectResult.data?.description, links: submittedLinks || [] });
         const aiPrompt = `Review this university IP disclosure for potential IP protection, prior disclosure, ownership, confidentiality, and authenticity concerns. Return JSON with summary (string), risk (info|low|medium|high|critical), recommendation (string), reasoning (array of objects with issue, source_ids, why_it_matters, confidence), and required_actions (array of strings). Every reasoning item must cite one or more source IDs from the evidence packet or answer keys. Distinguish reported facts, potential implications, and items requiring verification. Do not claim that rights are forfeited, determine inventorship, or make a legal or publication decision. Project title: ${projectResult.data?.title || ''}. Description: ${projectResult.data?.description || ''}. Answers: ${JSON.stringify(updated.data.answers ?? {})}\nEvidence packet:\n${formatIpEvidenceForPrompt(evidenceSources)}`;
         const providerResult = await generateWithAssistantReviewer(aiPrompt);
        if (providerResult) {
          let aiOutput: any = null;
          try { aiOutput = JSON.parse(providerResult.text); } catch { aiOutput = { summary: providerResult.text }; }
          await db.from('ip_disclosure_findings').insert({
            disclosure_id: disclosureId,
            author_id: researcherId,
             author_role: 'Assistant reviewer',
            category: input.route === 'tto_opt_out' ? 'authenticity' : 'ai',
             title: 'Assistant reviewer advisory screening result',
             body: formatIpReviewerFinding(aiOutput, evidenceSources, updated.data.answers ?? {}),
            severity: ['info', 'low', 'medium', 'high', 'critical'].includes(aiOutput?.risk) ? aiOutput.risk : 'info',
            source_type: 'ai',
            visibility: 'internal',
            is_preliminary: true,
          });
           await recordAiDecision({ decision_type: input.route === 'tto_opt_out' ? 'ip_authenticity_screening' : 'ip_advisory_screening', subject_id: disclosureId, provider: providerResult.provider, model: providerResult.model, prompt_version: 'ip-disclosure-v2', result: { ...aiOutput, evidence_sources: evidenceSources } });
        }
        await writeIpEvent(db, { disclosure_id: disclosureId, actor_id: researcherId, actor_role: 'System', action: 'ai_screen_completed', from_status: next.status, to_status: next.status, details: { count: screened.findings.length, automatic: true, route: input.route } });
      } catch (screenError) {
        console.error('Automatic IP screening failed; disclosure remains available for reviewer screening:', screenError);
        if (screenError instanceof AiProvenancePersistenceError) throw screenError;
      }
      return res.json({ disclosure: updated.data });
    } catch (error: any) {
      return ipSendError(res, error, 'IP disclosure could not be submitted.');
    }
  });

  app.get('/api/ip/disclosures', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const userId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !userId) return res.status(503).json({ error: serviceClientConfigError() });
      const parsedQuery = listIpDisclosuresQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) return res.status(400).json({ error: 'Invalid disclosure filter.' });
      let query = db.from('ip_disclosures').select('id, project_id, researcher_id, status, route, updated_at, submitted_at, version').order('updated_at', { ascending: false }).limit(200);
      const isReviewer = role === 'Admin' || role === 'Super Admin' || role === 'TTO' || role === 'TTO/IP' || role === 'IP Office';
      if (!isReviewer) query = query.eq('researcher_id', userId);
      else if (isTtoRole(role) && !isAdminRole(role)) query = query.in('status', ['tto_review', 'tto_completed', 'super_admin_review']);
      if (parsedQuery.data.status) query = query.eq('status', parsedQuery.data.status);
      const { data, error } = await query;
      if (error) throw error;
      return res.json({ disclosures: data || [] });
    } catch (error: any) {
      return ipSendError(res, error, 'IP disclosures could not be loaded.');
    }
  });

    app.get('/api/ip/disclosures/:id', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const userId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !userId) return res.status(503).json({ error: serviceClientConfigError() });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const { data, error } = await db.from('ip_disclosures').select('*').eq('id', disclosureId).maybeSingle();
      if (error) throw error;
      if (!data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
      if (!canViewDisclosure({ disclosureResearcherId: data.researcher_id, viewerId: userId, viewerRole: role, disclosureStatus: data.status })) {
        const e: any = new Error('You are not authorized to view this disclosure.'); e.status = 403; throw e;
      }
      return res.json({ disclosure: data });
    } catch (error: any) {
      return ipSendError(res, error, 'IP disclosure could not be loaded.');
    }
  });

  app.get('/api/ip/disclosures/:id/workspace', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const userId = getRequestProfileId(req);
      const role = (req as any).userRole;
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!db || !userId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });

      const d = await db.from('ip_disclosures').select('*').eq('id', disclosureId).maybeSingle();
      if (d.error) throw d.error;
      if (!d.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
      if (!canViewDisclosure({ disclosureResearcherId: d.data.researcher_id, viewerId: userId, viewerRole: role, disclosureStatus: d.data.status })) {
        const e: any = new Error('You are not authorized to view this disclosure.'); e.status = 403; throw e;
      }

      const reviewer = canAdminReview(role) || canTtoReview(role);
      const [projectResult, findingsResult, linksResult, filesResult, eventsResult] = await Promise.all([
        db.from('projects').select('id, title, description, department, research_area').eq('id', d.data.project_id).maybeSingle(),
        db.from('ip_disclosure_findings').select('*').eq('disclosure_id', disclosureId).order('created_at', { ascending: false }),
        db.from('ip_disclosure_links').select('*').eq('disclosure_id', disclosureId).order('created_at', { ascending: false }),
        db.from('ip_disclosure_files').select('id, disclosure_id, uploaded_by, original_name, mime_type, size_bytes, classification, scan_status, created_at').eq('disclosure_id', disclosureId).order('created_at', { ascending: false }),
        db.from('ip_disclosure_events').select('*').eq('disclosure_id', disclosureId).order('created_at', { ascending: false }),
      ]);
      for (const result of [projectResult, findingsResult, linksResult, filesResult, eventsResult]) {
        if (result.error) throw result.error;
      }

      return res.json({ workspace: {
        disclosure: d.data,
        project: projectResult.data || null,
        findings: reviewer ? (findingsResult.data || []) : (findingsResult.data || []).filter((f: any) => f.visibility === 'shared_researcher'),
        links: linksResult.data || [],
        files: filesResult.data || [],
        events: eventsResult.data || [],
      }});
    } catch (error: any) {
      return ipSendError(res, error, 'Disclosure workspace could not be loaded.');
    }
  });

  app.patch('/api/ip/disclosures/:id', authenticateUser, validateBody(patchIpDisclosureRequestSchema), async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const userId = getRequestProfileId(req);
      if (!db || !userId) return res.status(503).json({ error: serviceClientConfigError() });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const cur = await db.from('ip_disclosures').select('id, researcher_id, status, version, answers').eq('id', disclosureId).maybeSingle();
      if (cur.error) throw cur.error;
      if (!cur.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
      if (cur.data.researcher_id !== userId) { const e: any = new Error('Only the researcher can edit this draft.'); e.status = 403; throw e; }
      if (cur.data.status !== 'draft' && cur.data.status !== 'researcher_action_required') { const e: any = new Error('Disclosure is locked for editing in its current status.'); e.status = 409; throw e; }
      const input = req.body;
      const now = new Date().toISOString();
      const updated = await db.from('ip_disclosures').update({
        answers: input.answers ?? cur.data.answers,
        policy_version: input.policyVersion ?? undefined,
        submission_policy_version: input.submissionPolicyVersion ?? undefined,
        version: (cur.data.version ?? 0) + 1, updated_at: now,
      }).eq('id', disclosureId).eq('version', cur.data.version).select('*').maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) { const e: any = new Error('Disclosure changed while saving. Reload and try again.'); e.status = 409; throw e; }
      await writeIpEvent(db, { disclosure_id: disclosureId, actor_id: userId, actor_role: 'Researcher', action: 'update_draft', from_status: cur.data.status, to_status: cur.data.status, details: {} });
      return res.json({ disclosure: updated.data });
    } catch (error: any) {
      return ipSendError(res, error, 'IP disclosure could not be updated.');
    }
  });

  app.post('/api/ip/disclosures/:id/admin-accept', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!canAdminReview(role)) return res.status(403).json({ error: 'Forbidden: Admin role required.' });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const cur = await db.from('ip_disclosures').select('id, status').eq('id', disclosureId).maybeSingle();
      if (cur.error) throw cur.error;
      if (!cur.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
      let result = cur.data;
      if (cur.data.status === 'submitted') {
        result = (await applyTransition({ db, disclosureId, actorId, actorRole: String(role), action: 'accept_completeness', eventAction: 'admin_accept', eventDetails: {} })).disclosure;
      }
      if (result.status === 'admin_review') {
        result = (await applyTransition({ db, disclosureId, actorId, actorRole: String(role), action: 'start_ai_screening', eventAction: 'start_ai_screening', eventDetails: { auto: true } })).disclosure;
      }
      return res.json({ disclosure: result });
    } catch (error: any) {
      return ipSendError(res, error, 'Admin accept failed.');
    }
  });

  app.post('/api/ip/disclosures/:id/admin-return', authenticateUser, validateBody(adminReturnIpDisclosureRequestSchema), async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!canAdminReview(role)) return res.status(403).json({ error: 'Forbidden: Admin role required.' });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const input = req.body;
      const { disclosure } = await applyTransition({ db, disclosureId, actorId, actorRole: String(role), action: 'request_researcher_action', eventAction: 'admin_return', eventDetails: { message: input.message } });
      await db.from('ip_disclosure_findings').insert({
        disclosure_id: disclosureId, author_id: actorId, author_role: String(role),
        category: 'admin', title: input.findingTitle || 'Information requested',
        body: input.message, severity: 'medium', source_type: 'reviewer', visibility: 'shared_researcher', is_preliminary: false,
      });
      return res.json({ disclosure });
    } catch (error: any) {
      return ipSendError(res, error, 'Admin return failed.');
    }
  });

  app.post('/api/ip/disclosures/:id/ai-screen', authenticateUser, throttleLimit(10, 60 * 1000), async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!canAdminReview(role)) return res.status(403).json({ error: 'Forbidden: Admin role required.' });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const d = await db.from('ip_disclosures').select('id, project_id, answers, route, status').eq('id', disclosureId).maybeSingle();
      if (d.error) throw d.error;
      if (!d.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
      let proj: any = null;
      if (d.data.project_id) {
        const p = await db.from('projects').select('title, description').eq('id', d.data.project_id).maybeSingle();
        if (!p.error) proj = p.data;
      }
      const { findings } = buildAdvisoryFindings({ title: proj?.title, description: proj?.description, answers: d.data.answers ?? {}, route: d.data.route });
      let disclosure = d.data;
      if (d.data.status === 'admin_review') {
        disclosure = (await applyTransition({ db, disclosureId, actorId, actorRole: String(role), action: 'start_ai_screening', eventAction: 'start_ai_screening', eventDetails: {} })).disclosure;
      }
      for (const f of findings) {
        await db.from('ip_disclosure_findings').insert({
          disclosure_id: disclosureId, author_id: actorId, author_role: 'AI screening',
          category: f.category, title: f.title, body: `${f.body}\n\nAdvisory only. Not a legal, patentability, or safety decision.`,
          severity: f.severity, source_type: 'ai', visibility: 'internal', is_preliminary: true,
        });
      }
      const { data: reviewLinks } = await db.from('ip_disclosure_links').select('url, title, source_type, notes').eq('disclosure_id', disclosureId).limit(20);
      const evidenceSources = await collectIpEvidence({ db, title: proj?.title, description: proj?.description, links: reviewLinks || [] });
      const aiPrompt = `Review this university IP disclosure for potential IP protection, prior disclosure, ownership, confidentiality, and authenticity concerns. Return JSON with summary (string), risk (info|low|medium|high|critical), recommendation (string), reasoning (array of objects with issue, source_ids, why_it_matters, confidence), and required_actions (array of strings). Every reasoning item must cite one or more source IDs from the evidence packet or answer keys. Distinguish reported facts, potential implications, and items requiring verification. Do not claim that rights are forfeited, determine inventorship, or make a legal or publication decision. Project title: ${proj?.title || ''}. Description: ${proj?.description || ''}. Answers: ${JSON.stringify(d.data.answers ?? {})}\nEvidence packet:\n${formatIpEvidenceForPrompt(evidenceSources)}`;
      const providerResult = await generateWithAssistantReviewer(aiPrompt);
      if (providerResult) {
        let aiOutput: any = null;
        try { aiOutput = JSON.parse(providerResult.text); } catch { aiOutput = { summary: providerResult.text }; }
        await db.from('ip_disclosure_findings').insert({
          disclosure_id: disclosureId, author_id: actorId, author_role: 'Assistant reviewer',
          category: 'ai', title: 'Assistant reviewer advisory screening result',
          body: formatIpReviewerFinding(aiOutput, evidenceSources, d.data.answers ?? {}),
          severity: ['info', 'low', 'medium', 'high', 'critical'].includes(aiOutput?.risk) ? aiOutput.risk : 'info',
          source_type: 'ai', visibility: 'internal', is_preliminary: true,
        });
        await recordAiDecision({ decision_type: 'ip_advisory_screening', subject_id: disclosureId, provider: providerResult.provider, model: providerResult.model, prompt_version: 'ip-disclosure-v2', result: { ...aiOutput, evidence_sources: evidenceSources } });
      }
      try {
        await recordAiDecision({ decision_type: 'ip_advisory_screening', subject_id: disclosureId, provider: 'rules', model: 'ip-rules-v1', prompt_version: 'v1', result: { count: findings.length } });
      } catch {}
      await writeIpEvent(db, { disclosure_id: disclosureId, actor_id: actorId, actor_role: String(role), action: 'ai_screen_completed', from_status: disclosure.status, to_status: disclosure.status, details: { count: findings.length } });
      return res.status(202).json({ disclosure, findings: findings.length, status: 'REVIEW_REQUIRED' });
    } catch (error: any) {
      return ipSendError(res, error, 'AI screening failed.');
    }
  });

  app.get('/api/ip/disclosures/:id/findings', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const userId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !userId) return res.status(503).json({ error: serviceClientConfigError() });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const d = await db.from('ip_disclosures').select('id, researcher_id, status').eq('id', disclosureId).maybeSingle();
      if (d.error) throw d.error;
      if (!d.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
       if (!canViewDisclosure({ disclosureResearcherId: d.data.researcher_id, viewerId: userId, viewerRole: role, disclosureStatus: d.data.status })) { const e: any = new Error('Forbidden.'); e.status = 403; throw e; }
      const isOwner = d.data.researcher_id === userId && role !== 'Admin' && role !== 'TTO' && role !== 'Super Admin';
      let q = db.from('ip_disclosure_findings').select('*').eq('disclosure_id', disclosureId).order('created_at', { ascending: false }).limit(200);
      if (isOwner) q = q.eq('visibility', 'shared_researcher');
      const { data, error } = await q;
      if (error) throw error;
      return res.json({ findings: data || [] });
    } catch (error: any) {
      return ipSendError(res, error, 'Findings could not be loaded.');
    }
  });

  app.post('/api/ip/disclosures/:id/findings', authenticateUser, validateBody(createIpFindingRequestSchema), async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const d = await db.from('ip_disclosures').select('id, researcher_id, status').eq('id', disclosureId).maybeSingle();
      if (d.error) throw d.error;
      if (!d.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
      const input = req.body;
      const isTtoFinding = input.category === 'tto';
      const allowed = isTtoFinding ? canTtoReview(role) : canAdminReview(role) || canTtoReview(role);
      if (!allowed) return res.status(403).json({ error: 'Forbidden: reviewer role required.' });
      if (input.visibility !== 'internal' && !canAdminReview(role) && !canTtoReview(role)) return res.status(403).json({ error: 'Forbidden.' });
      const ins = await db.from('ip_disclosure_findings').insert({
        disclosure_id: disclosureId, author_id: actorId, author_role: String(role),
        category: input.category, title: input.title, body: input.body,
        severity: input.severity, source_type: 'reviewer', visibility: input.visibility, is_preliminary: input.isPreliminary,
      }).select('*').single();
      if (ins.error) throw ins.error;
      await writeIpEvent(db, { disclosure_id: disclosureId, actor_id: actorId, actor_role: String(role), action: 'add_finding', from_status: d.data.status, to_status: d.data.status, details: { finding_id: ins.data.id, category: input.category } });
      return res.status(201).json({ finding: ins.data });
    } catch (error: any) {
      return ipSendError(res, error, 'Finding could not be saved.');
    }
  });

  app.post('/api/ip/disclosures/:id/links', authenticateUser, validateBody(createIpLinkRequestSchema), async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!canTtoReview(role) && !canAdminReview(role)) return res.status(403).json({ error: 'Forbidden: reviewer role required.' });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const input = req.body;
      const host = new URL(input.url).hostname.toLowerCase();
      if (host.includes('localhost') || host.startsWith('127.') || host === '::1') return res.status(400).json({ error: 'URL host is not allowed.' });
      const ins = await db.from('ip_disclosure_links').insert({
        disclosure_id: disclosureId, added_by: actorId, url: input.url,
        title: input.title ?? null, source_type: input.sourceType, notes: input.notes ?? null,
      }).select('*').single();
      if (ins.error) throw ins.error;
      await writeIpEvent(db, { disclosure_id: disclosureId, actor_id: actorId, actor_role: String(role), action: 'add_link', details: { link_id: ins.data.id } });
      return res.status(201).json({ link: ins.data });
    } catch (error: any) {
      return ipSendError(res, error, 'Link could not be saved.');
    }
  });

  app.get('/api/ip/disclosures/:id/links', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const userId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !userId) return res.status(503).json({ error: serviceClientConfigError() });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const d = await db.from('ip_disclosures').select('id, researcher_id, status').eq('id', disclosureId).maybeSingle();
      if (d.error) throw d.error;
      if (!d.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
       if (!canViewDisclosure({ disclosureResearcherId: d.data.researcher_id, viewerId: userId, viewerRole: role, disclosureStatus: d.data.status })) { const e: any = new Error('Forbidden.'); e.status = 403; throw e; }
      const { data, error } = await db.from('ip_disclosure_links').select('*').eq('disclosure_id', disclosureId).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return res.json({ links: data || [] });
    } catch (error: any) {
      return ipSendError(res, error, 'Links could not be loaded.');
    }
  });

  app.post('/api/ip/disclosures/:id/files', authenticateUser, validateBody(registerIpFileRequestSchema), async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const d = await db.from('ip_disclosures').select('id, researcher_id, status').eq('id', disclosureId).maybeSingle();
      if (d.error) throw d.error;
      if (!d.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
       if (!canViewDisclosure({ disclosureResearcherId: d.data.researcher_id, viewerId: actorId, viewerRole: role, disclosureStatus: d.data.status })) { const e: any = new Error('Forbidden.'); e.status = 403; throw e; }
      const input = req.body;
      const parts = String(input.objectKey).split('/');
      if (parts.length < 2) return res.status(400).json({ error: 'objectKey must be bucket/path.' });
      const ins = await db.from('ip_disclosure_files').insert({
        disclosure_id: disclosureId, uploaded_by: actorId, object_key: input.objectKey,
        original_name: input.originalName, mime_type: input.mimeType, size_bytes: input.sizeBytes,
        sha256: input.sha256 ?? null, classification: input.classification, scan_status: 'pending',
      }).select('*').single();
      if (ins.error) throw ins.error;
      await writeIpEvent(db, { disclosure_id: disclosureId, actor_id: actorId, actor_role: String(role), action: 'register_file', details: { file_id: ins.data.id } });
      return res.status(201).json({ file: ins.data });
    } catch (error: any) {
      return ipSendError(res, error, 'File could not be registered.');
    }
  });

  app.get('/api/ip/disclosures/:id/files', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const userId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !userId) return res.status(503).json({ error: serviceClientConfigError() });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const d = await db.from('ip_disclosures').select('id, researcher_id, status').eq('id', disclosureId).maybeSingle();
      if (d.error) throw d.error;
      if (!d.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
       if (!canViewDisclosure({ disclosureResearcherId: d.data.researcher_id, viewerId: userId, viewerRole: role, disclosureStatus: d.data.status })) { const e: any = new Error('Forbidden.'); e.status = 403; throw e; }
      const { data, error } = await db.from('ip_disclosure_files').select('id, disclosure_id, original_name, mime_type, size_bytes, classification, scan_status, created_at').eq('disclosure_id', disclosureId).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return res.json({ files: data || [] });
    } catch (error: any) {
      return ipSendError(res, error, 'Files could not be loaded.');
    }
  });

  app.post('/api/ip/files/:id/approve', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
       if (!canTtoReview(role) && !canDecidePublication(role)) return res.status(403).json({ error: 'Forbidden: reviewer role required.' });
      const fileId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(fileId)) return res.status(400).json({ error: 'Invalid file ID.' });
      const file = await db.from('ip_disclosure_files').select('id, disclosure_id, scan_status').eq('id', fileId).maybeSingle();
      if (file.error) throw file.error;
      if (!file.data) { const e: any = new Error('File not found.'); e.status = 404; throw e; }
      const disclosure = await db.from('ip_disclosures').select('id, status').eq('id', file.data.disclosure_id).maybeSingle();
      if (disclosure.error) throw disclosure.error;
      if (!disclosure.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
       if (!['tto_review', 'tto_completed', 'super_admin_review'].includes(disclosure.data.status)) return res.status(409).json({ error: 'Files can only be approved during an active review.' });
      const updated = await db.from('ip_disclosure_files').update({ scan_status: 'clean' }).eq('id', fileId).select('*').single();
      if (updated.error) throw updated.error;
      await writeIpEvent(db, { disclosure_id: disclosure.data.id, actor_id: actorId, actor_role: String(role), action: 'approve_file', details: { file_id: fileId, previous_status: file.data.scan_status } });
      return res.json({ file: updated.data });
    } catch (error: any) {
      return ipSendError(res, error, 'File approval could not be saved.');
    }
  });

  app.post('/api/ip/files/:id/signed-url', authenticateUser, async (req, res) => {
    try {
      const svc = getServiceClient();
      const db = getDbClientForRequest(req);
      const userId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!svc || !db || !userId) return res.status(503).json({ error: serviceClientConfigError() });
      const fileId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(fileId)) return res.status(400).json({ error: 'Invalid file ID.' });
      const f = await db.from('ip_disclosure_files').select('id, disclosure_id, object_key, scan_status').eq('id', fileId).maybeSingle();
      if (f.error) throw f.error;
      if (!f.data) { const e: any = new Error('File not found.'); e.status = 404; throw e; }
      if (f.data.scan_status !== 'clean') return res.status(403).json({ error: 'File failed safety review.' });
      const d = await db.from('ip_disclosures').select('id, researcher_id, status').eq('id', f.data.disclosure_id).maybeSingle();
      if (d.error) throw d.error;
      if (!d.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
       if (!canViewDisclosure({ disclosureResearcherId: d.data.researcher_id, viewerId: userId, viewerRole: role, disclosureStatus: d.data.status })) { const e: any = new Error('Forbidden.'); e.status = 403; throw e; }
      const [bucket, ...rest] = String(f.data.object_key).split('/');
      const objectPath = rest.join('/');
      if (!bucket || !objectPath) return res.status(400).json({ error: 'Stored object reference is invalid.' });
      const { data, error } = await svc.storage.from(bucket).createSignedUrl(objectPath, 300);
      if (error) throw error;
      await writeIpEvent(db, { disclosure_id: d.data.id, actor_id: userId, actor_role: String(role), action: 'issue_file_url', details: { file_id: fileId } });
      return res.json({ url: data.signedUrl, expiresIn: 300 });
    } catch (error: any) {
      return ipSendError(res, error, 'Signed URL could not be issued.');
    }
  });

  app.post('/api/ip/disclosures/:id/share-findings', authenticateUser, validateBody(shareIpFindingRequestSchema), async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!canAdminReview(role) && !canTtoReview(role)) return res.status(403).json({ error: 'Forbidden: reviewer role required.' });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const input = req.body;
      const f = await db.from('ip_disclosure_findings').select('id, disclosure_id').eq('id', input.findingId).eq('disclosure_id', disclosureId).maybeSingle();
      if (f.error) throw f.error;
      if (!f.data) { const e: any = new Error('Finding not found.'); e.status = 404; throw e; }
      const current = await db.from('ip_disclosures').select('status').eq('id', disclosureId).maybeSingle();
      if (current.error) throw current.error;
      if (!current.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
      if (input.visibility === 'shared_super_admin' && !['ai_screening', 'tto_review', 'super_admin_review'].includes(current.data.status)) {
        const e: any = new Error('Findings can only be sent to final review from AI screening or TTO review.');
        e.status = 409;
        throw e;
      }
      const upd = await db.from('ip_disclosure_findings').update({ visibility: input.visibility }).eq('id', input.findingId).select('*').single();
      if (upd.error) throw upd.error;
      await writeIpEvent(db, { disclosure_id: disclosureId, actor_id: actorId, actor_role: String(role), action: 'share_finding', details: { finding_id: input.findingId, visibility: input.visibility } });
      let disclosure;
      if (input.visibility === 'shared_super_admin' && current.data.status !== 'super_admin_review') {
        ({ disclosure } = await applyTransition({
          db,
          disclosureId,
          actorId,
          actorRole: String(role),
          action: 'share_findings',
          eventAction: 'send_to_final_review',
          eventDetails: { finding_id: input.findingId },
        }));
      }
      return res.json({ finding: upd.data, disclosure });
    } catch (error: any) {
      return ipSendError(res, error, 'Finding could not be shared.');
    }
  });

  app.post('/api/ip/disclosures/:id/send-to-tto', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!canAdminReview(role)) return res.status(403).json({ error: 'Forbidden: Admin role required.' });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const { disclosure } = await applyTransition({ db, disclosureId, actorId, actorRole: String(role), action: 'send_to_tto', eventAction: 'send_to_tto', eventDetails: {} });
      return res.json({ disclosure });
    } catch (error: any) {
      return ipSendError(res, error, 'Send to TTO failed.');
    }
  });

  app.post('/api/ip/disclosures/:id/publication-decision', authenticateUser, validateBody(publicationDecisionRequestSchema), async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!canDecidePublication(role)) return res.status(403).json({ error: 'Forbidden: Super Admin role required.' });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const input = req.body;
      const actionMap: Record<string, 'publish' | 'restrict' | 'hold_confidential' | 'request_researcher_action' | 'reject'> = {
        publish: 'publish', restrict: 'restrict', confidential_hold: 'hold_confidential', request_information: 'request_researcher_action', reject: 'reject',
      };
      const action = actionMap[input.decision];
      if (!action) return res.status(400).json({ error: 'Invalid decision.' });
      const cur = await db.from('ip_disclosures').select('id, project_id, status').eq('id', disclosureId).maybeSingle();
      if (cur.error) throw cur.error;
      if (!cur.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
      if (cur.data.status !== 'super_admin_review') { const e: any = new Error('Disclosure must be in final review before a publication decision.'); e.status = 409; throw e; }
      const { disclosure } = await applyTransition({ db, disclosureId, actorId, actorRole: String(role), action, eventAction: 'publication_decision', eventDetails: { decision: input.decision } });
      const dec = await db.from('ip_disclosure_decisions').insert({
        disclosure_id: disclosureId, decided_by: actorId, decision: input.decision,
        reason: input.reason, public_projection: input.publicProjection ?? null,
      }).select('*').single();
      if (dec.error) throw dec.error;
      if (cur.data.project_id && (input.decision === 'publish' || input.decision === 'restrict')) {
        try {
          await db.from('projects').update({
            disclosure_status: input.decision === 'publish' ? 'Published' : 'Approved',
            visibility: input.decision === 'publish' ? 'Public' : 'Internal',
          }).eq('id', cur.data.project_id);
        } catch (projErr) {
          console.warn('Linked project projection update failed:', projErr);
        }
      }
      return res.json({ disclosure, decision: dec.data });
    } catch (error: any) {
      return ipSendError(res, error, 'Publication decision failed.');
    }
  });

  app.get('/api/ip/disclosures/:id/audit', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const userId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !userId) return res.status(503).json({ error: serviceClientConfigError() });
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const d = await db.from('ip_disclosures').select('id, researcher_id, status').eq('id', disclosureId).maybeSingle();
      if (d.error) throw d.error;
      if (!d.data) { const e: any = new Error('IP disclosure not found.'); e.status = 404; throw e; }
      if (!canViewDisclosure({ disclosureResearcherId: d.data.researcher_id, viewerId: userId, viewerRole: role, disclosureStatus: d.data.status })) { const e: any = new Error('Forbidden.'); e.status = 403; throw e; }
      const { data, error } = await db.from('ip_disclosure_events').select('id, action, actor_role, from_status, to_status, created_at, details').eq('disclosure_id', disclosureId).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return res.json({ events: data || [] });
    } catch (error: any) {
      return ipSendError(res, error, 'Audit could not be loaded.');
    }
  });

  app.get('/api/ip/access-requests', authenticateUser, async (req, res) => {
    try {
      const role = (req as any).userRole;
      const reviewer = canTtoReview(role) || canDecidePublication(role);
      const db = reviewer ? getServiceClient() : getDbClientForRequest(req);
      if (!db) return res.status(503).json({ error: serviceClientConfigError() });
      const { data, error } = await db.from('ip_access_requests').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return res.json({ requests: data || [] });
    } catch (error: any) {
      if (missingTables(error)) return res.status(503).json({ error: 'Access requests are not enabled yet. Apply the Phase 2 database migration.' });
      return ipSendError(res, error, 'Access requests could not be loaded.');
    }
  });

  app.post('/api/ip/disclosures/:id/tto-complete', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!canTtoReview(role)) return res.status(403).json({ error: 'Forbidden: TTO/IP Office role required.' });
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const { disclosure } = await applyTransition({ db, disclosureId, actorId, actorRole: String(role), action: 'complete_tto_review', eventAction: 'complete_tto_review', eventDetails: { destination: 'admin_disclosure' } });
      return res.json({ disclosure });
    } catch (error: any) {
      return ipSendError(res, error, 'TTO review could not be completed.');
    }
  });

  app.post('/api/ip/disclosures/:id/send-to-super-admin', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!canTtoReview(role)) return res.status(403).json({ error: 'Forbidden: TTO/IP Office role required.' });
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      const { disclosure } = await applyTransition({
        db,
        disclosureId,
        actorId,
        actorRole: String(role),
        action: 'send_to_super_admin',
        eventAction: 'send_to_super_admin',
        eventDetails: { destination: 'super_admin_review', internal: true },
      });
      return res.json({ disclosure });
    } catch (error: any) {
      return ipSendError(res, error, 'Disclosure could not be sent to Super Admin.');
    }
  });

  app.post('/api/ip/disclosures/:id/admin-decision', authenticateUser, async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      const disclosureId = typeof req.params.id === 'string' ? req.params.id : '';
      const decision = req.body?.decision;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!canAdminReview(role)) return res.status(403).json({ error: 'Forbidden: Admin role required.' });
      if (!isUuid(disclosureId)) return res.status(400).json({ error: 'Invalid disclosure ID.' });
      if (!['accept', 'request_update', 'decline'].includes(decision)) return res.status(400).json({ error: 'Invalid Admin decision.' });
      if (decision === 'request_update' && !String(req.body?.message || '').trim()) return res.status(400).json({ error: 'A request message is required.' });
      const action = decision === 'accept' ? 'accept_admin' : decision === 'request_update' ? 'request_researcher_action' : 'reject';
      const { disclosure } = await applyTransition({ db, disclosureId, actorId, actorRole: String(role), action: action as any, eventAction: `admin_${decision}`, eventDetails: { message: String(req.body?.message || '').trim() } });
      if (decision === 'request_update') {
        await db.from('ip_disclosure_findings').insert({ disclosure_id: disclosureId, author_id: actorId, author_role: String(role), category: 'admin', title: 'Update requested by Admin', body: String(req.body.message).trim(), severity: 'medium', source_type: 'reviewer', visibility: 'shared_researcher', is_preliminary: false });
      }
      if (decision === 'decline') {
        await db.from('ip_disclosure_findings').insert({ disclosure_id: disclosureId, author_id: actorId, author_role: String(role), category: 'admin', title: 'Disclosure declined by Admin', body: String(req.body?.message || 'The disclosure was declined after administrative review.'), severity: 'high', source_type: 'reviewer', visibility: 'shared_researcher', is_preliminary: false });
      }
      return res.json({ disclosure });
    } catch (error: any) {
      return ipSendError(res, error, 'Admin disclosure decision failed.');
    }
  });

  app.post('/api/ip/access-requests', authenticateUser, validateBody(createAccessRequestSchema), async (req, res) => {
    try {
      const db = getDbClientForRequest(req);
      const userId = getRequestProfileId(req);
      if (!db || !userId) return res.status(503).json({ error: serviceClientConfigError() });
      const input = req.body;
      const ins = await db.from('ip_access_requests').insert({ disclosure_id: input.disclosureId, requester_id: userId, purpose: input.purpose, status: 'pending' }).select('*').single();
      if (ins.error) throw ins.error;
      await writeIpEvent(db, { disclosure_id: input.disclosureId, actor_id: userId, actor_role: String((req as any).userRole), action: 'access_request', details: { request_id: ins.data.id } });
      return res.status(201).json({ request: ins.data });
    } catch (error: any) {
      if (missingTables(error)) return res.status(503).json({ error: 'Access requests are not enabled yet. Apply the Phase 2 database migration.' });
      return ipSendError(res, error, 'Access request could not be created.');
    }
  });

  app.post('/api/ip/access-requests/:id/decision', authenticateUser, validateBody(decideAccessRequestSchema), async (req, res) => {
    try {
      const db = getServiceClient();
      const actorId = getRequestProfileId(req);
      const role = (req as any).userRole;
      if (!db || !actorId) return res.status(503).json({ error: serviceClientConfigError() });
      if (!canTtoReview(role) && !canDecidePublication(role)) return res.status(403).json({ error: 'Forbidden: TTO role required.' });
      const requestId = typeof req.params.id === 'string' ? req.params.id : '';
      if (!isUuid(requestId)) return res.status(400).json({ error: 'Invalid request ID.' });
      const input = req.body;
      const upd = await db.from('ip_access_requests').update({ status: input.decision, decided_by: actorId, decision_note: input.note ?? null, decided_at: new Date().toISOString() }).eq('id', requestId).select('*').single();
      if (upd.error) throw upd.error;
      await writeIpEvent(db, { disclosure_id: upd.data.disclosure_id, actor_id: actorId, actor_role: String(role), action: 'access_decision', details: { request_id: requestId, decision: input.decision } });
      return res.json({ request: upd.data });
    } catch (error: any) {
      if (missingTables(error)) return res.status(503).json({ error: 'Access requests are not enabled yet. Apply the Phase 2 database migration.' });
      return ipSendError(res, error, 'Access decision failed.');
    }
  });
};
