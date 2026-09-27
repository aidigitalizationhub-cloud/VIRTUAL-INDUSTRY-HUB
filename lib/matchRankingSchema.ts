import { createGrounding, isSupported, numbersAreGrounded, type Grounding } from './grounding';

// Validates ONLY the LLM enrichment for match rankings.
//
// The ranking architecture is already sound: computeLocalMatchRankings() in
// lib/scoring.ts produces the authoritative score, id and index, and scout.ts
// maps over those local rows, so the model cannot introduce a candidate, change
// a score, or reorder the results. The model supplies prose only.
//
// That prose is still a correctness problem: "reasoning" is shown to a
// researcher as the justification for being connected to a specific person or
// organisation, so an ungrounded sentence is an unverified claim about a third
// party. "alignment_label" was unconstrained open text and is persisted as-is.
//
// Rejecting bad enrichment is cheap here because the deterministic
// localReasoning/alignment_label are always available as the fallback.

export const MATCH_ALIGNMENT_LABELS = [
  'Highly Compatible',
  'Strategic Match',
  'Compatible Match',
  'Potential Overlay',
  'Weak Alignment',
] as const;

export type MatchAlignmentLabel = (typeof MATCH_ALIGNMENT_LABELS)[number];

/** Reasonable ceiling for a two-sentence explanation. */
export const MAX_REASONING_CHARS = 600;

export interface MatchEnrichment {
  reasoning?: string;
  alignment_label?: MatchAlignmentLabel;
}

export interface MatchEnrichmentValidation {
  ok: boolean;
  reason?: string;
  accepted: number;
  dropped: number;
  dropped_details: string[];
}

export interface CandidateContext {
  /** Deterministic local rankings, which define the real candidate set. */
  localRankings: { id?: string | null; index: number }[];
  /** Free text per candidate index, used to ground claims about that candidate. */
  candidateTextByIndex: Map<number, string>;
  /** Text describing the researcher doing the matching. */
  userText: string;
}

const isAlignmentLabel = (value: string): value is MatchAlignmentLabel =>
  (MATCH_ALIGNMENT_LABELS as readonly string[]).includes(value);

/** Canonical key so callers can look up enrichment by id or by index. */
const keyOf = (id: unknown, index: unknown): string | null => {
  const rawId = typeof id === 'string' ? id.trim().toLowerCase() : '';
  if (rawId) return `id:${rawId}`;
  if (index !== undefined && index !== null && Number.isFinite(Number(index))) return `idx:${Number(index)}`;
  return null;
};

const extractJson = (raw: string): unknown => {
  const text = String(raw ?? '').trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const obj = text.match(/\{[\s\S]*\}/);
    if (!obj) return null;
    try {
      return JSON.parse(obj[0]);
    } catch {
      return null;
    }
  }
};

/**
 * Parse and ground the model's ranking enrichment.
 *
 * Returns a map keyed by `id:<uuid>` or `idx:<n>`, containing only enrichment
 * that is safe to show a researcher. Ungrounded reasoning, over-long text,
 * unknown labels and entries matching no real candidate are all dropped; the
 * caller keeps its deterministic values in those cases.
 */
export const parseMatchEnrichment = (
  raw: string,
  context: CandidateContext,
): { byKey: Map<string, MatchEnrichment>; validation: MatchEnrichmentValidation } => {
  const byKey = new Map<string, MatchEnrichment>();
  const dropped_details: string[] = [];

  const realIds = new Set<string>();
  const realIndexes = new Set<number>();
  for (const lr of context.localRankings) {
    const id = typeof lr.id === 'string' ? lr.id.trim().toLowerCase() : '';
    if (id) realIds.add(id);
    if (Number.isFinite(Number(lr.index))) realIndexes.add(Number(lr.index));
  }

  // A two-sentence strategic-fit explanation legitimately uses framing and
  // connective vocabulary that appears in neither profile: "shared focus on",
  // "complementary expertise in". Those words are semantically empty -- a claim
  // built only from them carries no factual content, so admitting them cannot
  // lend support to a fabrication. Specific nouns and numbers are what make a
  // claim checkable, and those are still held to the source.
  const CONNECTING_VOCABULARY = [
    'match', 'matches', 'matching', 'compatible', 'compatibility', 'strategic', 'strategy',
    'alignment', 'aligned', 'synergy', 'synergies', 'research', 'researcher', 'collaboration',
    'collaborate', 'complementary', 'overlap', 'overlaps', 'strong', 'potential', 'fit', 'relevant',
    'shared', 'share', 'shares', 'focus', 'focused', 'focuses', 'common', 'joint', 'both',
    'emphasis', 'expertise', 'experience', 'specialisation', 'specialization', 'background',
    'offer', 'offers', 'offered', 'offering', 'providing', 'provides', 'provide', 'include',
    'including', 'includes', 'across', 'domain', 'domains', 'field', 'fields', 'topic', 'topics',
    'interest', 'interests', 'skill', 'skills', 'work', 'works', 'working', 'area', 'areas',
    'likely', 'would', 'could', 'may', 'able', 'help', 'helps', 'assist', 'partner', 'partners',
    'partnership', 'organisation', 'organization', 'institution', 'university', 'team', 'teams',
    'related', 'applicable', 'useful', 'valuable', 'helpfully', 'naturally', 'particularly',
    'notably', 'suitable', 'promising', 'clear', 'directly', 'closely', 'well',
  ].join(' ');

  const parsed = extractJson(raw);
  const rankings =
    parsed && typeof parsed === 'object' && Array.isArray((parsed as { rankings?: unknown }).rankings)
      ? ((parsed as { rankings: unknown[] }).rankings as unknown[])
      : [];

  if (parsed === null) {
    return {
      byKey,
      validation: { ok: false, reason: 'not_json', accepted: 0, dropped: 0, dropped_details: ['response was not valid JSON'] },
    };
  }
  if (rankings.length === 0) {
    return {
      byKey,
      validation: { ok: false, reason: 'no_rankings', accepted: 0, dropped: 0, dropped_details: [] },
    };
  }

  let accepted = 0;
  let dropped = 0;

  for (const entry of rankings) {
    if (!entry || typeof entry !== 'object') {
      dropped += 1;
      dropped_details.push('ranking entry was not an object');
      continue;
    }
    const record = entry as Record<string, unknown>;
    const key = keyOf(record.id, record.index);
    if (!key) {
      dropped += 1;
      dropped_details.push('ranking entry had neither a usable id nor index');
      continue;
    }

    // Defence in depth: the caller already ignores unknown candidates, but an
    // entry naming a candidate that does not exist must not be recorded.
    const referencedId = typeof record.id === 'string' ? record.id.trim().toLowerCase() : '';
    const referencedIndex = Number.isFinite(Number(record.index)) ? Number(record.index) : null;
    const matchesRealCandidate =
      (referencedId !== '' && realIds.has(referencedId)) || (referencedIndex !== null && realIndexes.has(referencedIndex));
    if (!matchesRealCandidate) {
      dropped += 1;
      dropped_details.push(`ranking referenced no known candidate: ${key}`);
      continue;
    }

    const candidateText = referencedIndex !== null ? context.candidateTextByIndex.get(referencedIndex) : undefined;
    const grounding: Grounding = createGrounding([
      context.userText,
      candidateText || '',
      CONNECTING_VOCABULARY,
    ]);

    const enrichment: MatchEnrichment = {};

    // If this entry offered a rationale and the rationale was rejected, the
    // model's judgement about this candidate is not trustworthy, so its label
    // goes with it. Otherwise a fabricated explanation could still leave the
    // candidate labelled "Highly Compatible".
    let reasoningRejected = false;

    const rawReasoning = typeof record.reasoning === 'string' ? record.reasoning.trim() : '';
    if (rawReasoning) {
      if (rawReasoning.length > MAX_REASONING_CHARS) {
        dropped += 1;
        reasoningRejected = true;
        dropped_details.push(`reasoning for ${key} exceeded ${MAX_REASONING_CHARS} characters`);
      } else if (!isSupported(rawReasoning, grounding) || !numbersAreGrounded(rawReasoning, grounding)) {
        // This is the case that matters: a claim about a third party that the
        // supplied profile text does not support.
        dropped += 1;
        reasoningRejected = true;
        dropped_details.push(`ungrounded reasoning for ${key}: ${rawReasoning.slice(0, 120)}`);
      } else {
        enrichment.reasoning = rawReasoning;
      }
    }

    const rawLabel = typeof record.alignment_label === 'string' ? record.alignment_label.trim() : '';
    if (rawLabel) {
      if (reasoningRejected) {
        dropped += 1;
        dropped_details.push(`alignment_label for ${key} discarded because its reasoning was rejected`);
      } else if (isAlignmentLabel(rawLabel)) {
        enrichment.alignment_label = rawLabel;
      } else {
        dropped += 1;
        dropped_details.push(`unsupported alignment_label for ${key}: ${rawLabel}`);
      }
    }

    if (enrichment.reasoning || enrichment.alignment_label) {
      // An entry may legitimately enrich only the label, so merge into any
      // existing enrichment rather than replacing it.
      byKey.set(key, { ...(byKey.get(key) || {}), ...enrichment });
      accepted += 1;
    }
  }

  return {
    byKey,
    validation: { ok: accepted > 0, accepted, dropped, dropped_details: dropped_details.slice(0, 20) },
  };
};
