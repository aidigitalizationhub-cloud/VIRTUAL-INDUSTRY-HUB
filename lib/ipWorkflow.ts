export const IP_WORKFLOW_STATUSES = [
  'draft',
  'submitted',
  'admin_review',
  'ai_screening',
  'tto_review',
  'tto_completed',
  'accepted',
  'researcher_action_required',
  'super_admin_review',
  'published',
  'restricted',
  'confidential_hold',
  'rejected',
] as const;

export type IpWorkflowStatus = typeof IP_WORKFLOW_STATUSES[number];

export type IpWorkflowRoute = 'tto_review' | 'tto_opt_out';

export type IpWorkflowAction =
  | 'submit'
  | 'submit_to_tto'
  | 'accept_completeness'
  | 'start_ai_screening'
  | 'send_to_tto'
  | 'opt_out_tto'
  | 'request_researcher_action'
  | 'resubmit'
  | 'share_findings'
  | 'complete_tto_review'
  | 'send_to_super_admin'
  | 'accept_admin'
  | 'publish'
  | 'restrict'
  | 'hold_confidential'
  | 'reject';

export type IpWorkflowDecision = {
  status: IpWorkflowStatus;
  route?: IpWorkflowRoute;
};

const transitions: Record<IpWorkflowStatus, Partial<Record<IpWorkflowAction, IpWorkflowDecision>>> = {
  draft: {
    submit: { status: 'submitted' },
    submit_to_tto: { status: 'tto_review', route: 'tto_review' },
  },
  submitted: {
    accept_completeness: { status: 'admin_review' },
    accept_admin: { status: 'accepted' },
    request_researcher_action: { status: 'researcher_action_required' },
    reject: { status: 'rejected' },
  },
  admin_review: {
    start_ai_screening: { status: 'ai_screening' },
    send_to_tto: { status: 'tto_review', route: 'tto_review' },
    opt_out_tto: { status: 'ai_screening', route: 'tto_opt_out' },
    request_researcher_action: { status: 'researcher_action_required' },
    reject: { status: 'rejected' },
  },
  ai_screening: {
    send_to_tto: { status: 'tto_review', route: 'tto_review' },
    share_findings: { status: 'super_admin_review' },
    request_researcher_action: { status: 'researcher_action_required' },
    reject: { status: 'rejected' },
  },
  tto_review: {
    share_findings: { status: 'super_admin_review' },
    complete_tto_review: { status: 'tto_completed' },
    send_to_super_admin: { status: 'super_admin_review' },
    request_researcher_action: { status: 'researcher_action_required' },
    reject: { status: 'rejected' },
  },
  researcher_action_required: {
    resubmit: { status: 'submitted' },
  },
  tto_completed: {
    send_to_super_admin: { status: 'super_admin_review' },
    accept_admin: { status: 'accepted' },
    request_researcher_action: { status: 'researcher_action_required' },
    reject: { status: 'rejected' },
  },
  accepted: {},
  super_admin_review: {
    publish: { status: 'published' },
    restrict: { status: 'restricted' },
    hold_confidential: { status: 'confidential_hold' },
    request_researcher_action: { status: 'researcher_action_required' },
    reject: { status: 'rejected' },
  },
  published: {},
  restricted: {},
  confidential_hold: {},
  rejected: {},
};

export const transitionIpWorkflow = (
  current: IpWorkflowStatus,
  action: IpWorkflowAction,
): IpWorkflowDecision => {
  const next = transitions[current][action];
  if (!next) {
    throw new Error(`Invalid IP workflow transition: ${current} -> ${action}`);
  }
  return next;
};

export const isIpWorkflowStatus = (value: unknown): value is IpWorkflowStatus =>
  typeof value === 'string' && (IP_WORKFLOW_STATUSES as readonly string[]).includes(value);

export const isFinalReviewStatus = (value: unknown): value is 'super_admin_review' => value === 'super_admin_review';
