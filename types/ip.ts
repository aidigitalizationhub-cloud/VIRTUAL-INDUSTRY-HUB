// Shared IP disclosure domain types.
// Server remains authoritative for transitions; these types are for UI + service layers.

export type IpStatus =
  | 'draft'
  | 'submitted'
  | 'admin_review'
  | 'ai_screening'
   | 'tto_review'
   | 'tto_completed'
   | 'accepted'
  | 'researcher_action_required'
  | 'super_admin_review'
  | 'published'
  | 'restricted'
  | 'confidential_hold'
  | 'rejected';

export type IpRoute = 'tto_review' | 'tto_opt_out';

export type IpFindingCategory =
  | 'admin'
  | 'ai'
  | 'tto'
  | 'authenticity'
  | 'confidentiality'
  | 'ownership'
  | 'evidence'
  | 'quality';

export type IpFindingVisibility = 'internal' | 'shared_researcher' | 'shared_super_admin';

export interface IpDisclosure {
  id: string;
  project_id: string;
  researcher_id: string;
  status: IpStatus;
  route: IpRoute | null;
  answers: Record<string, unknown>;
  policy_version?: string | null;
  submission_policy_version?: string | null;
  tto_opt_out: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
}

export interface IpFinding {
  id: string;
  disclosure_id: string;
  author_id: string;
  author_role: string;
  category: IpFindingCategory;
  title: string;
  body: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  source_type: 'reviewer' | 'ai' | 'source_link' | 'file';
  visibility: IpFindingVisibility;
  is_preliminary: boolean;
  created_at: string;
}

export interface IpLink {
  id: string;
  disclosure_id: string;
  added_by: string;
  url: string;
  title?: string | null;
  source_type: 'publication' | 'patent' | 'technology' | 'supporting';
  notes?: string | null;
  created_at: string;
}

export interface IpDecision {
  id: string;
  disclosure_id: string;
  decided_by: string;
  decision: 'publish' | 'restrict' | 'confidential_hold' | 'request_information' | 'reject';
  reason: string;
  public_projection?: Record<string, unknown> | null;
  created_at: string;
}

export interface IpEvent {
  id: string;
  disclosure_id: string;
  actor_id?: string | null;
  actor_role?: string | null;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface IpFileRecord {
  id: string;
  disclosure_id: string;
  uploaded_by: string;
  object_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  sha256?: string | null;
  classification: string;
  scan_status: 'pending' | 'clean' | 'rejected';
  created_at: string;
}

export interface IpDisclosureWorkspaceCase {
  disclosure: IpDisclosure;
  project: {
    id: string;
    title?: string | null;
    description?: string | null;
    department?: string | null;
    research_area?: string | null;
  } | null;
  findings: IpFinding[];
  links: IpLink[];
  files: IpFileRecord[];
  events: IpEvent[];
}
