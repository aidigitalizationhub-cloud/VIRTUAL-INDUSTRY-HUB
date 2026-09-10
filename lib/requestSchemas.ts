import { z } from 'zod';

// --- Server request-body schemas (size-capped, unknown fields stripped) ---

export const translateRequestSchema = z.object({
  text: z.string().max(5000).optional(),
  texts: z.array(z.string().max(2000)).max(100).optional(),
  targetLang: z.string().min(2).max(10),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(20000),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({ text: z.string().max(20000) })).max(100),
  })).max(50).optional(),
});

export const embedRequestSchema = z.object({
  // Sanity cap only — server truncates to model-safe length before calling the provider
  text: z.string().min(1).max(200_000),
});

export const extractDocumentRequestSchema = z.object({
  fileBase64: z.string().min(1).max(20_000_000),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(100).optional(),
});

export const aiProfileRequestSchema = z.object({
  // Sanity cap only — server slices to 15k chars for the extraction prompt
  cvText: z.string().max(500_000).optional(),
  questionnaire: z.record(z.string(), z.any()).optional(),
  userType: z.string().max(50).optional(),
});

export const profileUpdateRequestSchema = z.object({
  profile: z.record(z.string(), z.any()),
  answers: z.record(z.string(), z.any()).optional(),
});

export const matchesRequestSchema = z.object({
  userId: z.string().max(100),
  embedding: z.array(z.number()).max(2048).optional(),
});

export const aiScoutSyncRequestSchema = z.object({
  force: z.boolean().optional(),
});

export const aiDecisionRecordSchema = z.object({
  decision_type: z.string().min(1).max(100),
  subject_id: z.string().max(200).optional(),
  provider: z.string().max(100).optional(),
  model: z.string().max(200).optional(),
  prompt_version: z.string().max(50).optional(),
  input_hash: z.string().max(200).optional(),
  output_hash: z.string().max(200).optional(),
  result: z.record(z.string(), z.any()).optional(),
}).passthrough();

export const aiMatchRequestSchema = z.object({
  userProfile: z.record(z.string(), z.any()).optional(),
  candidateMatches: z.array(z.record(z.string(), z.any())).max(100).optional(),
});

export const createChallengeRequestSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).optional(),
  description: z.string().max(10000).optional(),
  category: z.string().max(100).optional(),
  required_skills: z.array(z.string().max(100)).max(50).optional(),
  collaboration_type: z.string().max(100).optional(),
  budget_range: z.string().max(100).optional(),
  deadline: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
});

export const updateChallengeRequestSchema = createChallengeRequestSchema.partial().extend({
  status: z.enum(['Open', 'Closed', 'Draft', 'Completed']).optional(),
});

export const generateMatchesRequestSchema = z.object({
  challengeId: z.string().max(100).optional(),
});

export const updateMatchStatusRequestSchema = z.object({
  status: z.enum(['recommended', 'viewed', 'saved', 'invited', 'interested', 'shortlisted', 'dismissed', 'accepted']),
});

export const createIpDisclosureRequestSchema = z.object({
  projectId: z.string().uuid(),
  answers: z.record(z.string(), z.unknown()).default({}),
  policyVersion: z.string().min(1).max(100).optional(),
  submissionPolicyVersion: z.string().min(1).max(100).optional(),
});

export const submitIpDisclosureRequestSchema = z.object({
  route: z.enum(['tto_review', 'tto_opt_out']),
  policyVersion: z.string().min(1).max(100),
  submissionPolicyVersion: z.string().min(1).max(100),
  policyAccepted: z.literal(true),
  submissionPolicyAccepted: z.literal(true),
});

export const listIpDisclosuresQuerySchema = z.object({
  status: z.string().max(50).optional(),
});

export const patchIpDisclosureRequestSchema = z.object({
  answers: z.record(z.string(), z.unknown()).optional(),
  policyVersion: z.string().min(1).max(100).optional(),
  submissionPolicyVersion: z.string().min(1).max(100).optional(),
});

export const adminReturnIpDisclosureRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  findingTitle: z.string().max(200).optional(),
});

export const createIpFindingRequestSchema = z.object({
  category: z.enum(['admin', 'ai', 'tto', 'authenticity', 'confidentiality', 'ownership', 'evidence', 'quality']),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).default('info'),
  visibility: z.enum(['internal', 'shared_researcher', 'shared_super_admin']).default('internal'),
  isPreliminary: z.boolean().default(true),
});

export const shareIpFindingRequestSchema = z.object({
  findingId: z.string().uuid(),
  visibility: z.enum(['shared_researcher', 'shared_super_admin']),
});

export const createIpLinkRequestSchema = z.object({
  url: z.string().url().max(2000),
  title: z.string().max(300).optional(),
  sourceType: z.enum(['publication', 'patent', 'technology', 'supporting']).default('supporting'),
  notes: z.string().max(5000).optional(),
});

export const publicationDecisionRequestSchema = z.object({
  decision: z.enum(['publish', 'restrict', 'confidential_hold', 'request_information', 'reject']),
  reason: z.string().min(1).max(5000),
  publicProjection: z.record(z.string(), z.unknown()).optional(),
});

export const registerIpFileRequestSchema = z.object({
  objectKey: z.string().min(1).max(1000),
  originalName: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(150),
  sizeBytes: z.number().int().positive().max(100_000_000),
  sha256: z.string().max(200).optional(),
  classification: z.string().max(50).default('CONFIDENTIAL'),
});

export const createAccessRequestSchema = z.object({
  disclosureId: z.string().uuid(),
  purpose: z.string().min(1).max(5000),
});

export const decideAccessRequestSchema = z.object({
  decision: z.enum(['approved', 'denied', 'revoked', 'expired']),
  note: z.string().max(5000).optional(),
});
