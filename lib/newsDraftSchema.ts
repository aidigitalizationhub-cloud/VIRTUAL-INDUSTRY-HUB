import { z } from 'zod';
import { createGrounding, isSupported, numbersAreGrounded, type Grounding } from './grounding';

// Validates the structured news draft the model extracts from an uploaded
// document.
//
// Why this is checked at all: the publication path already verifies the
// *provenance* of an item (admin role, a source URL, and a live fetch that
// records the HTTP status and a sha256 of what was retrieved). That proves where
// the text came from. It does not prove the summary we wrote *about* that text
// is accurate. A model that invents a grant amount or a partner name produces
// a perfectly valid JSON object that would otherwise be stored with
// needs_review: false, which disarms the human-review prompt in the admin UI.
//
// So the rule here is the same one used for profile extraction and match
// reasoning: a factual field is kept only if the source document supports it.

const NEWS_CATEGORIES = [
  'Announcement',
  'Grant Opportunity',
  'Strategic Partnership',
  'Research Release',
  'Ecosystem Updates',
] as const;

/** The prompt asks for a 120-150 word summary; anything far beyond that is a runaway. */
const SUMMARY_MAX_CHARS = 1200;
const TITLE_MAX_CHARS = 200;
const NOTES_MAX_CHARS = 600;
const TAGS_MAX = 8;

const shape = z
  .object({
    title: z.string().default(''),
    summary: z.string().default(''),
    category: z.string().default(''),
    tags: z.array(z.string()).default([]),
    source_verification_notes: z.string().default(''),
  })
  .loose();

export type NewsDraftInput = z.infer<typeof shape>;

export type NewsDraftValidation = {
  ok: boolean;
  /** Only ever contains fields the source document supports. */
  data: {
    title: string;
    summary: string;
    category: string;
    tags: string[];
    source_verification_notes: string;
  };
  needs_review: boolean;
  validation: {
    checked: number;
    supported: number;
    dropped: number;
    dropped_details: string[];
  };
};

/**
 * Verification notes are audit metadata *about* the checking process, not a
 * factual claim about the announcement, so they are deliberately not held to
 * the same prose-grounding rule as the title or summary. A note reading
 * "cross-checked against the department press release" describes work that
 * happened, and none of that vocabulary appears in the document; grounding it
 * would reject essentially every honest answer.
 *
 * What still applies is the numeric guard and the length cap, because that is
 * where fabricated detail hides: a note asserting a date, a reviewer count or
 * a figure the document never stated is the failure mode worth catching. The
 * field is always AI-written and is shown to an admin as part of the review,
 * so the exposure is a credibility claim read by the person deciding to
 * publish, not a claim presented to a researcher as fact.
 */
const keepText = (
  value: unknown,
  path: string,
  g: Grounding,
  dropped: string[],
  stats: { checked: number; supported: number },
  options: { numeric?: boolean; maxChars?: number; grounded?: boolean } = {},
): string => {
  const claim = typeof value === 'string' ? value.trim() : '';
  if (!claim) return '';
  stats.checked += 1;
  if (options.maxChars && claim.length > options.maxChars) {
    dropped.push(`${path}: exceeds ${options.maxChars} characters`);
    return '';
  }
  const ok =
    (options.grounded === false ? true : isSupported(claim, g)) &&
    (!options.numeric || numbersAreGrounded(claim, g));
  if (ok) {
    stats.supported += 1;
    return claim;
  }
  dropped.push(`${path}: ${claim}`);
  return '';
};

const keepTags = (
  tags: unknown,
  g: Grounding,
  dropped: string[],
  stats: { checked: number; supported: number },
): string[] => {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  for (const raw of tags.slice(0, TAGS_MAX)) {
    const tag = typeof raw === 'string' ? raw.trim() : '';
    if (!tag) continue;
    stats.checked += 1;
    if (isSupported(tag, g) && numbersAreGrounded(tag, g)) {
      stats.supported += 1;
      if (!out.includes(tag)) out.push(tag);
    } else {
      dropped.push(`tags: ${tag}`);
    }
  }
  return out;
};

/**
 * Validate an extracted news draft against the document text the model was
 * shown. Returns a trimmed, source-supported draft plus an honest review flag.
 */
export const parseNewsDraft = (raw: string, sourceText: string): NewsDraftValidation => {
  const source = typeof sourceText === 'string' ? sourceText : '';
  const g = createGrounding([source]);

  const parsedShape = shape.safeParse(extractJson(raw) || {});
  const input = (parsedShape.success ? parsedShape.data : {}) as Record<string, unknown>;

  const dropped: string[] = [];
  const stats = { checked: 0, supported: 0 };

  const title = keepText(input.title, 'title', g, dropped, stats, {
    numeric: true,
    maxChars: TITLE_MAX_CHARS,
  });
  const summary = keepText(input.summary, 'summary', g, dropped, stats, {
    numeric: true,
    maxChars: SUMMARY_MAX_CHARS,
  });

  // The category is a controlled value used as a public filter, so it must be
  // one the prompt actually offered rather than whatever the model returned.
  const rawCategory = typeof input.category === 'string' ? input.category.trim() : '';
  stats.checked += 1;
  let category = '';
  if (rawCategory) {
    const match = NEWS_CATEGORIES.find((c) => c.toLowerCase() === rawCategory.toLowerCase());
    if (match) {
      category = match;
      stats.supported += 1;
    } else {
      dropped.push(`category: ${rawCategory}`);
    }
  }

  const tags = keepTags(input.tags, g, dropped, stats);
  const notes = keepText(input.source_verification_notes, 'source_verification_notes', g, dropped, stats, {
    numeric: true,
    maxChars: NOTES_MAX_CHARS,
    grounded: false,
  });

  // A draft with no title or no summary is not usable as news. The caller falls
  // back to a raw excerpt of the document, which is grounded by construction.
  const ok = Boolean(title) && Boolean(summary);

  return {
    ok,
    data: { title, summary, category, tags, source_verification_notes: notes },
    needs_review: !ok || dropped.length > 0,
    validation: {
      checked: stats.checked,
      supported: stats.supported,
      dropped: dropped.length,
      dropped_details: dropped,
    },
  };
};

/**
 * Tolerant JSON extraction, mirroring extractJson in ./aiSchemas. Kept local so
 * this validator has no dependency on the permissive schema module it replaces.
 */
const extractJson = (raw: string): any => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidates: string[] = [];
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) candidates.push(fence[1].trim());
  candidates.push(trimmed);
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  return null;
};

// NOTE: draft extraction is validated by parseNewsDraft, which grounds each
// factual field in the uploaded document. Do not reintroduce a permissive
// news-draft schema in ./aiSchemas: it accepted invented grant amounts and
// partner names and reported needs_review: false, which suppressed the admin
// human-review prompt.
