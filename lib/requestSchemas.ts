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
  text: z.string().min(1).max(20000),
});

export const extractDocumentRequestSchema = z.object({
  fileBase64: z.string().min(1).max(20_000_000),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(100).optional(),
});

export const aiProfileRequestSchema = z.object({
  cvText: z.string().max(20000).optional(),
  questionnaire: z.record(z.string(), z.any()).optional(),
  userType: z.string().max(50).optional(),
});

export const aiScoutSyncRequestSchema = z.object({
  force: z.boolean().optional(),
});

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
