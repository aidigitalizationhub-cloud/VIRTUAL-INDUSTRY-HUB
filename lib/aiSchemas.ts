import { z } from 'zod';

// --- AI output schemas (validated server-side before any DB write) ---
//
// NOTE: profile extraction is validated by parseProfileExtraction in
// ./profileExtractionSchema, which checks the full shape and grounds every
// factual claim in the source text. Do not reintroduce a permissive
// profile-only schema here; the previous one accepted invented education,
// GPA and employment because it passed everything through unchecked.
//
// NOTE: news draft extraction is validated by parseNewsDraft in
// ./newsDraftSchema, which grounds each field in the uploaded document and
// constrains the category. The permissive newsDraftSchema that used to live
// here accepted invented grant amounts and partner names, and the endpoint
// reported needs_review: false whenever the JSON merely parsed, which
// suppressed the admin review prompt.
//
// NOTE: scouted news items are validated by parseScoutedNews in
// ./scoutNewsSchema. The permissive newsItemSchema and newsItemsSchema that
// used to live here accepted any relevance_score -- including 99, which the UI
// badges as high relevance -- and let the model's own note stand in for a
// verification note.

export const stringArraySchema = z.array(z.string());

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
