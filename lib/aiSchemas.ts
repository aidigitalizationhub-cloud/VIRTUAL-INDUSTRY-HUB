import { z } from 'zod';

// --- AI output schemas (validated server-side before any DB write) ---

export const newsItemSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  relevance_score: z.number().optional(),
  source_verification_notes: z.string().optional(),
  source_name: z.string().optional(),
  external_url: z.string().optional(),
}).passthrough();

export const newsDraftSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source_verification_notes: z.string().optional(),
}).passthrough();

export const matchRankingSchema = z.object({
  id: z.string().optional(),
  index: z.number().optional(),
  score: z.number().optional(),
  reasoning: z.string().optional(),
  alignment_label: z.string().optional(),
}).passthrough();

export const matchRankingsSchema = z.object({
  rankings: z.array(matchRankingSchema),
}).passthrough();

export const profileSchema = z.object({
  personal_information: z.object({
    full_name: z.string().optional(),
    email: z.string().optional(),
  }).passthrough(),
}).passthrough();

export const stringArraySchema = z.array(z.string());

export const newsItemsSchema = z.array(newsItemSchema);

/**
 * Extract and parse JSON from raw AI text. Handles markdown code fences and
 * text-wrapped JSON objects/arrays. Throws if the content is not valid JSON.
 */
export const extractJson = (raw: string): any => {
  if (!raw) throw new Error('Empty AI response');
  let text = raw.trim();
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[0]); } catch {}
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch {}
    }
    throw new Error('AI response was not valid JSON');
  }
};

/**
 * Parse + validate AI output with a Zod schema. Throws on invalid structure.
 */
export const parseAIJson = <T>(schema: z.ZodType<T>, raw: string): T => {
  const parsed = extractJson(raw);
  return schema.parse(parsed);
};
