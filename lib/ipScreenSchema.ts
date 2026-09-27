import { z } from 'zod';
import { extractJson } from './aiSchemas';

// Output contract for the advisory assistant-reviewer screening call.
//
// This exists because a bare JSON.parse failure used to fall back to
// `{ summary: rawText }`, which left `risk` undefined and silently downgraded
// the finding to severity 'info'. Output that cannot be validated is now
// escalated to human review instead of being persisted as a low-severity
// advisory (see server/ip/ipScreenResult.ts).

export const IP_RISK_LEVELS = ['info', 'low', 'medium', 'high', 'critical'] as const;
export type IpRiskLevel = (typeof IP_RISK_LEVELS)[number];

/** Findings below this confidence are surfaced to a human rather than trusted. */
export const HUMAN_REVIEW_CONFIDENCE_FLOOR = 0.6;

const RISK_LEVEL_SET = new Set<string>(IP_RISK_LEVELS);
export const isIpRiskLevel = (value: unknown): value is IpRiskLevel =>
  typeof value === 'string' && RISK_LEVEL_SET.has(value);

/** Models occasionally report confidence as 0-100; normalise rather than reject. */
const confidenceSchema = z.preprocess((value) => {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return undefined;
  return numeric > 1 ? numeric / 100 : numeric;
}, z.number().min(0).max(1).optional());

export const ipScreenReasoningSchema = z.object({
  issue: z.string().min(1),
  source_ids: z.array(z.string()).default([]),
  why_it_matters: z.string().default(''),
  confidence: confidenceSchema,
});

// Unknown keys are stripped (zod default) rather than passed through or fatal,
// so a slightly over-broad model response still yields a usable finding.
export const ipScreenOutputSchema = z.object({
  summary: z.string().default(''),
  risk: z.enum(IP_RISK_LEVELS).optional(),
  recommendation: z.string().default(''),
  reasoning: z.array(ipScreenReasoningSchema).default([]),
  required_actions: z.array(z.string()).default([]),
});

export type IpScreenOutput = z.infer<typeof ipScreenOutputSchema>;
export type IpScreenReasoning = z.infer<typeof ipScreenReasoningSchema>;

export interface DroppedReasoning {
  issue: string;
  reason: string;
}

export interface IpScreenValidation {
  droppedItems: DroppedReasoning[];
  invalidCitations: string[];
  lowConfidenceItems: string[];
  limitations: string[];
  needsHumanReview: boolean;
}

export type IpScreenParse =
  | { ok: true; output: IpScreenOutput; validation: IpScreenValidation }
  | { ok: false; reason: string };

const describeIssues = (error: z.ZodError): string =>
  error.issues
    .slice(0, 6)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');

/**
 * Parse and validate assistant-reviewer output against the screening contract.
 *
 * `citableIds` is the authoritative allow-list. Any reasoning item whose
 * citations are entirely outside that set is dropped, and any item that keeps
 * at least one valid citation has its unverifiable citations stripped. Every
 * removal is reported so it can be shown to the reviewer rather than hidden.
 */
export const parseIpScreenOutput = (raw: string, citableIds: Iterable<string>): IpScreenParse => {
  const allowed = new Set<string>();
  for (const id of citableIds) allowed.add(String(id));

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch (error) {
    return { ok: false, reason: `Model output was not valid JSON (${error instanceof Error ? error.message : String(error)}).` };
  }

  const result = ipScreenOutputSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, reason: `Model output did not match the screening contract (${describeIssues(result.error)}).` };
  }

  const output = result.data;
  const invalidCitations = new Set<string>();
  const droppedItems: DroppedReasoning[] = [];
  const lowConfidenceItems: string[] = [];
  const kept: IpScreenReasoning[] = [];

  for (const item of output.reasoning) {
    const validIds = item.source_ids.filter((id) => allowed.has(id));
    for (const id of item.source_ids) {
      if (!allowed.has(id)) invalidCitations.add(id);
    }

    if (validIds.length === 0) {
      droppedItems.push({ issue: item.issue, reason: 'no citable source id remained after validation' });
      continue;
    }
    if (validIds.length !== item.source_ids.length) {
      droppedItems.push({ issue: item.issue, reason: 'unverifiable citations removed' });
    }
    if (typeof item.confidence === 'number' && item.confidence < HUMAN_REVIEW_CONFIDENCE_FLOOR) {
      lowConfidenceItems.push(item.issue);
    }
    kept.push({ ...item, source_ids: validIds });
  }

  const limitations: string[] = [];
  if (invalidCitations.size) {
    limitations.push(`Discarded unverifiable source id(s): ${[...invalidCitations].join(', ')}.`);
  }
  if (droppedItems.length) {
    limitations.push(`${droppedItems.length} reasoning item(s) were removed because they could not be tied to permitted evidence.`);
  }
  if (lowConfidenceItems.length) {
    limitations.push(`Below-confidence item(s) require verification: ${lowConfidenceItems.join('; ')}.`);
  }
  if (!kept.length) {
    limitations.push('No reasoning item survived citation validation.');
  }
  if (output.risk && RISK_LEVEL_SET.has(output.risk) && output.risk !== 'info' && output.risk !== 'low') {
    limitations.push('Model-reported risk is medium or above and requires reviewer confirmation.');
  }

  const needsHumanReview =
    droppedItems.length > 0 || lowConfidenceItems.length > 0 || (output.risk !== undefined && output.risk !== 'info' && output.risk !== 'low');

  return {
    ok: true,
    output: { ...output, reasoning: kept },
    validation: {
      droppedItems,
      invalidCitations: [...invalidCitations],
      lowConfidenceItems,
      limitations,
      needsHumanReview,
    },
  };
};
