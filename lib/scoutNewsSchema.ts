import { z } from 'zod';

// Validates the news items the ecosystem scout produces.
//
// This validator is deliberately different from the other two. The profile
// extractor and the document-draft extractor are both given a source text, so
// a claim can be checked against it. The scout is not: it is asked to find
// recent breakthroughs from a list of URLs, and generateWithProviders runs it
// with no search or retrieval tool. The model therefore writes these items from
// parametric memory, and any external_url or source_name it returns is
// invented rather than retrieved.
//
// So there is nothing here to ground against, and pretending otherwise would
// reject every legitimate item. What can be enforced is structure, and what
// must be made unmistakable is provenance:
//
// - category is restricted to the five values the prompt offers, because it is
//   stored and used as a public filter
// - relevance_score must be an integer within 1..100. It was previously an
//   unvalidated number, and News.tsx shows a high-relevance badge above 80, so
//   an inflated score put a badge on an unverified draft
// - external_url must be an absolute http(s) URL. An item without one can never
//   satisfy validateNewsPublication, so keeping it only fills the admin queue
// - every item carries an explicit unverified notice in
//   source_verification_notes, replacing any note the model wrote that sounded
//   like a completed check
//
// These items are still inserted as Drafts. The publication path is what
// actually verifies them: /api/admin/news requires an admin role and performs a
// live fetch that records the HTTP status and a sha256 of the retrieved bytes.
// Nothing here bypasses that.

const NEWS_CATEGORIES = [
  'Announcement',
  'Grant Opportunity',
  'Strategic Partnership',
  'Research Release',
  'Ecosystem Updates',
] as const;

const TITLE_MAX_CHARS = 200;
const SUMMARY_MAX_CHARS = 1500;
const TAG_MAX_CHARS = 60;
const TAGS_MAX = 5;
const TAGS_MIN = 3;

export const SCOUT_UNVERIFIED_NOTICE =
  'UNVERIFIED: written by a model with no access to live sources. Not confirmed against any ' +
  'publication. Treat every claim as unconfirmed until the linked source has been opened and ' +
  'checked by a person.';

// Each field carries its own .catch() so one wrong-typed field degrades to its
// default instead of failing the whole object parse and discarding an otherwise
// usable item.
const shape = z
  .object({
    title: z.string().catch(''),
    summary: z.string().catch(''),
    category: z.string().catch(''),
    tags: z.array(z.string()).catch([]),
    relevance_score: z.number().catch(0),
    source_verification_notes: z.string().catch(''),
    source_name: z.string().catch(''),
    external_url: z.string().catch(''),
  })
  .loose();

export type ScoutedNewsItem = {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  relevance_score: number;
  source_verification_notes: string;
  source_name: string;
  external_url: string;
};

export type ScoutedNewsValidation = {
  items: ScoutedNewsItem[];
  validation: {
    checked: number;
    kept: number;
    dropped: number;
    dropped_details: string[];
  };
};

const absoluteHttpUrl = (value: string): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const extractJsonArray = (raw: string): any[] => {
  if (typeof raw !== 'string') return [];
  const candidates: string[] = [];
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) candidates.push(fence[1].trim());
  candidates.push(raw.trim());
  const first = raw.indexOf('[');
  const last = raw.lastIndexOf(']');
  if (first !== -1 && last > first) candidates.push(raw.slice(first, last + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // try the next candidate
    }
  }
  return [];
};

export const parseScoutedNews = (raw: string): ScoutedNewsValidation => {
  const entries = extractJsonArray(raw);
  const items: ScoutedNewsItem[] = [];
  const dropped_details: string[] = [];

  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== 'object') {
      dropped_details.push(`item ${index}: not an object`);
      continue;
    }
    const parsed = shape.safeParse(entry);
    const value = (parsed.success ? parsed.data : {}) as Record<string, unknown>;

    const title = String(value.title ?? '').trim().slice(0, TITLE_MAX_CHARS);
    const summary = String(value.summary ?? '').trim().slice(0, SUMMARY_MAX_CHARS);
    const url = absoluteHttpUrl(String(value.external_url ?? '').trim());
    const sourceName = String(value.source_name ?? '').trim().slice(0, 120);

    // An item that cannot pass validateNewsPublication is dead weight in the
    // admin queue, so it is dropped here with the reason recorded.
    if (!title) {
      dropped_details.push(`item ${index}: no title`);
      continue;
    }
    if (!summary) {
      dropped_details.push(`item ${index}: no summary`);
      continue;
    }
    if (!url) {
      dropped_details.push(`item ${index}: no usable external_url (${String(value.external_url ?? '').slice(0, 60)})`);
      continue;
    }

    const rawCategory = String(value.category ?? '').trim();
    const category = NEWS_CATEGORIES.find((c) => c.toLowerCase() === rawCategory.toLowerCase()) || '';
    if (!category) dropped_details.push(`item ${index}: unsupported category "${rawCategory.slice(0, 40)}"`);

    const rawScore = Number(value.relevance_score);
    const hasScore = Number.isInteger(rawScore) && rawScore >= 1 && rawScore <= 100;
    if (!hasScore) dropped_details.push(`item ${index}: relevance_score ${String(value.relevance_score)} outside 1..100`);

    const tags: string[] = [];
    const rawTags = Array.isArray(value.tags) ? value.tags : [];
    for (const tag of rawTags) {
      const clean = String(tag ?? '').trim().slice(0, TAG_MAX_CHARS);
      if (!clean) continue;
      if (tags.length >= TAGS_MAX) {
        dropped_details.push(`item ${index}: tag beyond the ${TAGS_MAX} tag limit`);
        continue;
      }
      if (!tags.includes(clean)) tags.push(clean);
    }
    if (rawTags.length && tags.length < TAGS_MIN) {
      dropped_details.push(`item ${index}: only ${tags.length} usable tag(s), expected at least ${TAGS_MIN}`);
    }

    // The model's own note is kept after the notice, never in place of it, so
    // an audit note written by the model cannot read as a completed check.
    const modelNote = String(value.source_verification_notes ?? '').trim().slice(0, 400);

    items.push({
      title,
      summary,
      category,
      tags,
      relevance_score: hasScore ? rawScore : 0,
      source_verification_notes: modelNote ? `${SCOUT_UNVERIFIED_NOTICE}\nModel note (unconfirmed): ${modelNote}` : SCOUT_UNVERIFIED_NOTICE,
      source_name: sourceName,
      external_url: url,
    });
  }

  return {
    items,
    validation: {
      checked: entries.length,
      kept: items.length,
      dropped: entries.length - items.length,
      dropped_details: dropped_details.slice(0, 20),
    },
  };
};

// NOTE: scouted items are validated by parseScoutedNews. Do not reintroduce the
// permissive newsItemsSchema in ./aiSchemas: it accepted any relevance_score
// (including 99, which the UI badges as high relevance) and any category, and
// it let the model's own note stand in for a verification note.
