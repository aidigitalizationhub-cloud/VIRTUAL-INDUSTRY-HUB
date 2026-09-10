import { getJson, patchJson, postJson } from '../lib/api';
import type { IpDisclosure, IpFinding, IpLink, IpDecision, IpEvent, IpFileRecord, IpDisclosureWorkspaceCase } from '../types/ip';

export type { IpDisclosure, IpFinding, IpLink, IpDecision, IpEvent, IpFileRecord, IpDisclosureWorkspaceCase };

export interface IpAccessRequest {
  id: string;
  disclosure_id: string;
  requester_id: string;
  purpose: string;
  status: 'pending' | 'approved' | 'denied' | 'revoked' | 'expired';
  decision_note?: string | null;
  created_at: string;
  decided_at?: string | null;
}

const enc = encodeURIComponent;

export const IpDisclosureService = {
  createDraft: async (projectId: string): Promise<IpDisclosure> => {
    const r = await postJson<{ disclosure: IpDisclosure }>('/api/ip/disclosures', { projectId });
    return r.disclosure;
  },
  list: async (status?: string): Promise<IpDisclosure[]> => {
    const q = status ? `?status=${enc(status)}` : '';
    const r = await getJson<{ disclosures: IpDisclosure[] }>(`/api/ip/disclosures${q}`);
    return r.disclosures;
  },
  get: async (id: string): Promise<IpDisclosure> => {
    const r = await getJson<{ disclosure: IpDisclosure }>(`/api/ip/disclosures/${enc(id)}`);
    return r.disclosure;
  },
  workspace: async (id: string): Promise<IpDisclosureWorkspaceCase> => {
    const r = await getJson<{ workspace: IpDisclosureWorkspaceCase }>(`/api/ip/disclosures/${enc(id)}/workspace`);
    return r.workspace;
  },
  updateAnswers: async (id: string, answers: Record<string, unknown>): Promise<IpDisclosure> => {
    const r = await patchJson<{ disclosure: IpDisclosure }>(`/api/ip/disclosures/${enc(id)}`, { answers });
    return r.disclosure;
  },
  submit: async (id: string, input: { route: 'tto_review' | 'tto_opt_out'; policyVersion: string; submissionPolicyVersion: string }): Promise<IpDisclosure> => {
    const r = await postJson<{ disclosure: IpDisclosure }>(`/api/ip/disclosures/${enc(id)}/submit`, {
      ...input, policyAccepted: true, submissionPolicyAccepted: true,
    });
    return r.disclosure;
  },
  adminAccept: async (id: string): Promise<IpDisclosure> => {
    const r = await postJson<{ disclosure: IpDisclosure }>(`/api/ip/disclosures/${enc(id)}/admin-accept`, {});
    return r.disclosure;
  },
  adminReturn: async (id: string, message: string, findingTitle?: string): Promise<IpDisclosure> => {
    const r = await postJson<{ disclosure: IpDisclosure }>(`/api/ip/disclosures/${enc(id)}/admin-return`, { message, findingTitle });
    return r.disclosure;
  },
  aiScreen: async (id: string): Promise<{ disclosure: IpDisclosure; findings: number }> => {
    const r = await postJson<{ disclosure: IpDisclosure; findings: number }>(`/api/ip/disclosures/${enc(id)}/ai-screen`, {});
    return r;
  },
  sendToTto: async (id: string): Promise<IpDisclosure> => {
    const r = await postJson<{ disclosure: IpDisclosure }>(`/api/ip/disclosures/${enc(id)}/send-to-tto`, {});
    return r.disclosure;
  },
  completeTtoReview: async (id: string): Promise<IpDisclosure> => {
    const r = await postJson<{ disclosure: IpDisclosure }>(`/api/ip/disclosures/${enc(id)}/tto-complete`, {});
    return r.disclosure;
  },
  sendToSuperAdmin: async (id: string): Promise<IpDisclosure> => {
    const r = await postJson<{ disclosure: IpDisclosure }>(`/api/ip/disclosures/${enc(id)}/send-to-super-admin`, {});
    return r.disclosure;
  },
  adminDecision: async (id: string, decision: 'accept' | 'request_update' | 'decline', message?: string): Promise<IpDisclosure> => {
    const r = await postJson<{ disclosure: IpDisclosure }>(`/api/ip/disclosures/${enc(id)}/admin-decision`, { decision, message });
    return r.disclosure;
  },
  findings: async (id: string): Promise<IpFinding[]> => {
    const r = await getJson<{ findings: IpFinding[] }>(`/api/ip/disclosures/${enc(id)}/findings`);
    return r.findings;
  },
  signedFileUrl: async (fileId: string): Promise<string> => {
    const r = await postJson<{ url: string }>(`/api/ip/files/${enc(fileId)}/signed-url`, {});
    return r.url;
  },
  approveFile: async (fileId: string): Promise<IpFileRecord> => {
    const r = await postJson<{ file: IpFileRecord }>(`/api/ip/files/${enc(fileId)}/approve`, {});
    return r.file;
  },
  addFinding: async (id: string, input: { category: IpFinding['category']; title: string; body: string; severity?: IpFinding['severity']; visibility?: IpFinding['visibility']; isPreliminary?: boolean }): Promise<IpFinding> => {
    const r = await postJson<{ finding: IpFinding }>(`/api/ip/disclosures/${enc(id)}/findings`, {
      category: input.category, title: input.title, body: input.body,
      severity: input.severity ?? 'info', visibility: input.visibility ?? 'internal', isPreliminary: input.isPreliminary ?? true,
    });
    return r.finding;
  },
  shareFinding: async (id: string, findingId: string, visibility: 'shared_researcher' | 'shared_super_admin'): Promise<IpFinding> => {
    const r = await postJson<{ finding: IpFinding }>(`/api/ip/disclosures/${enc(id)}/share-findings`, { findingId, visibility });
    return r.finding;
  },
  links: async (id: string): Promise<IpLink[]> => {
    const r = await getJson<{ links: IpLink[] }>(`/api/ip/disclosures/${enc(id)}/links`);
    return r.links;
  },
  addLink: async (id: string, input: { url: string; title?: string; sourceType?: IpLink['source_type']; notes?: string }): Promise<IpLink> => {
    const r = await postJson<{ link: IpLink }>(`/api/ip/disclosures/${enc(id)}/links`, {
      url: input.url, title: input.title, sourceType: input.sourceType ?? 'supporting', notes: input.notes,
    });
    return r.link;
  },
  files: async (id: string): Promise<IpFileRecord[]> => {
    const r = await getJson<{ files: IpFileRecord[] }>(`/api/ip/disclosures/${enc(id)}/files`);
    return r.files;
  },
  audit: async (id: string): Promise<IpEvent[]> => {
    const r = await getJson<{ events: IpEvent[] }>(`/api/ip/disclosures/${enc(id)}/audit`);
    return r.events;
  },
  listAccessRequests: async (): Promise<IpAccessRequest[]> => {
    const r = await getJson<{ requests: IpAccessRequest[] }>('/api/ip/access-requests');
    return r.requests;
  },
  decideAccessRequest: async (id: string, decision: 'approved' | 'denied', note?: string): Promise<IpAccessRequest> => {
    const r = await postJson<{ request: IpAccessRequest }>(`/api/ip/access-requests/${enc(id)}/decision`, { decision, note });
    return r.request;
  },
  decidePublication: async (id: string, input: { decision: IpDecision['decision']; reason: string; publicProjection?: Record<string, unknown> }): Promise<{ disclosure: IpDisclosure; decision: IpDecision }> => {
    const r = await postJson<{ disclosure: IpDisclosure; decision: IpDecision }>(`/api/ip/disclosures/${enc(id)}/publication-decision`, {
      decision: input.decision, reason: input.reason, publicProjection: input.publicProjection,
    });
    return r;
  },
};
