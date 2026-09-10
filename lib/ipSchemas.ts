import { z } from 'zod';

// Client-safe IP schemas. Server requestSchemas remain authoritative.

export const IP_POLICY_VERSION = 'UG-RID-IP-v1.0';
export const IP_SUBMISSION_POLICY_VERSION = 'UG-RID-SUBMIT-v1.0';

export const IP_QUESTIONS = [
  { key: 'possible_ip', label: 'Could this contain a new invention, method, device, software, design, composition, dataset, plant variety, or other IP?' },
  { key: 'publicly_shared', label: 'Has any part been shared publicly (paper, thesis, poster, presentation, website, repo, social media, demo, sale, conference)?' },
  { key: 'ip_filed', label: 'Has an IP application already been filed?' },
  { key: 'contributors', label: 'Who contributed to the work? List names and roles.', freeText: true },
  { key: 'resources_used', label: 'Was university funding, equipment, staff, sponsored research, or another organisation’s material used?' },
  { key: 'agreements', label: 'Is there an NDA, collaboration, material-transfer, sponsor obligation, or third-party IP?' },
  { key: 'safe_public', label: 'Which information is safe for the public summary?', freeText: true },
  { key: 'keep_restricted', label: 'Which files or sections should remain restricted or confidential?', freeText: true },
] as const;

export const ipAnswerValue = z.enum(['yes', 'no', 'not_sure']);

export const ipAnswersSchema = z.record(z.string(), z.unknown());

export type IpAnswerInput = { value?: unknown; text?: unknown };

export const formatIpAnswer = (value: unknown): string => {
  if (value && typeof value === 'object' && 'value' in value) {
    const answer = value as IpAnswerInput;
    const parts = [answer.value, answer.text]
      .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
      .map((part) => part.trim());
    return [...new Set(parts)].join(' · ');
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
};

export const missingIpAnswers = (answers: Record<string, IpAnswerInput | undefined | null>): string[] =>
  IP_QUESTIONS.filter((q) => {
    const a = answers[q.key];
    if (!a) return true;
    if ('freeText' in q && q.freeText) {
      const text = typeof a.text === 'string' && a.text.trim() ? a.text : typeof a.value === 'string' ? a.value : '';
      return !text.trim();
    }
    return a.value !== 'yes' && a.value !== 'no' && a.value !== 'not_sure';
  }).map((q) => q.label);

export const ipRouteSchema = z.enum(['tto_review', 'tto_opt_out']);

export const IP_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  admin_review: 'Admin review',
  ai_screening: 'AI screening',
  tto_review: 'TTO/IP Office review',
  tto_completed: 'TTO/IP Office review completed',
  accepted: 'Accepted by Admin',
  researcher_action_required: 'Action required',
  super_admin_review: 'Final review',
  published: 'Published',
  restricted: 'Restricted',
  confidential_hold: 'Confidential hold',
  rejected: 'Rejected',
};

export const IP_POLICY_TEXT = `I confirm the information and files are submitted for institutional review and technology-transfer activities. I understand publication or sharing may affect confidentiality and IP options. I have identified known contributors, funding, sponsors, agreements, and previous public disclosures to the best of my knowledge. I understand AI output is advisory and an authorised human reviewer makes the final platform decision. Opting out of TTO review does not grant legal clearance or IP protection.`;
