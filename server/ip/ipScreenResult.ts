import { createHash } from 'node:crypto';
import { citableSourceIds, formatIpEvidenceForPrompt, formatIpReviewerFinding, type IpEvidenceSource } from './ipEvidence';
import { parseIpScreenOutput } from '../../lib/ipScreenSchema';
import { generateWithAssistantReviewer, recordAiDecision } from '../services/aiGateway';

// Single place where advisory screening output becomes a persisted finding.
//
// Rules enforced here, for both the submit path and the manual re-screen path:
//  - output must satisfy the screening contract in lib/ipScreenSchema.ts
//  - citations must resolve to records the platform actually retrieved
//  - output that cannot be validated is escalated, never downgraded to 'info'
//  - the ledger records input/output hashes so the run is tamper-evident

export const IP_SCREEN_PROMPT_VERSION = 'ip-disclosure-v3';

const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

export const buildIpScreenPrompt = (params: {
  title?: string | null;
  description?: string | null;
  answers: Record<string, unknown>;
  sources: IpEvidenceSource[];
}): string => {
  const citable = citableSourceIds(params.sources);
  const citableLine = citable.length
    ? citable.join(', ')
    : 'none - no external record was retrieved, so no finding may cite an external source';
  return [
    'Review this university IP disclosure for potential IP protection, prior disclosure, ownership, confidentiality, and authenticity concerns.',
    'Return JSON with summary (string), risk (info|low|medium|high|critical), recommendation (string), reasoning (array of objects with issue, source_ids, why_it_matters, confidence), and required_actions (array of strings).',
    `Every reasoning item must cite one or more source IDs from this citable set: ${citableLine}.`,
    'Source IDs marked NOT CITABLE in the evidence packet are search portals or unopened links. Citing one will cause the item to be discarded and routed to human review. Never invent a source ID.',
    'Distinguish reported facts, potential implications, and items requiring verification.',
    'Do not claim that rights are forfeited, determine inventorship, or make a legal or publication decision.',
    `Project title: ${params.title || ''}. Description: ${params.description || ''}.`,
    `Answers: ${JSON.stringify(params.answers ?? {})}`,
    'Evidence packet:',
    formatIpEvidenceForPrompt(params.sources),
  ].join('\n');
};

export interface AssistantScreenOutcome {
  /** False when the provider returned nothing at all (no finding is written). */
  recorded: boolean;
  /** Non-null when the model output failed validation and needs a human. */
  escalation: string | null;
  needsHumanReview: boolean;
}

export const runAssistantReviewerScreen = async (params: {
  db: any;
  disclosureId: string;
  authorId: string;
  category: 'ai' | 'authenticity';
  answers: Record<string, unknown>;
  sources: IpEvidenceSource[];
  prompt: string;
  decisionType: string;
}): Promise<AssistantScreenOutcome> => {
  const { db, disclosureId, authorId, category, answers, sources, prompt, decisionType } = params;

  const providerResult = await generateWithAssistantReviewer(prompt);
  if (!providerResult) return { recorded: false, escalation: null, needsHumanReview: true };

  const inputHash = sha256(prompt);
  const outputHash = sha256(providerResult.text);
  const citable = [...citableSourceIds(sources), ...Object.keys(answers || {})];
  const parsed = parseIpScreenOutput(providerResult.text, citable);

  let title: string;
  let body: string;
  let severity: string;

  if (parsed.ok) {
    title = 'Assistant reviewer advisory screening result';
    body = formatIpReviewerFinding(parsed.output, sources, answers, {
      droppedItems: parsed.validation.droppedItems,
      invalidCitations: parsed.validation.invalidCitations,
      limitations: parsed.validation.limitations,
    });
    severity = parsed.output.risk ?? 'info';
  } else {
    // The previous behaviour stored unparseable output as a plain summary with
    // severity 'info'. A screening that could not be validated is a gap in the
    // process, so it is recorded as high severity and routed to a human.
    title = 'Assistant reviewer screening could not be validated';
    severity = 'high';
    body = [
      'The assistant reviewer returned output that did not satisfy the required screening contract, so no advisory finding was derived from it.',
      `Validation failure: ${parsed.reason}`,
      `Raw response length: ${providerResult.text.length} characters. Raw text is not stored; see the provenance ledger hashes.`,
      'A human reviewer must complete this screening. Do not treat the absence of findings as an absence of risk.',
      '',
      'AI advisory only. This is not legal clearance or a publication decision.',
    ].join('\n');
  }

  await db.from('ip_disclosure_findings').insert({
    disclosure_id: disclosureId,
    author_id: authorId,
    author_role: 'Assistant reviewer',
    category,
    title,
    body,
    severity,
    source_type: 'ai',
    visibility: 'internal',
    is_preliminary: true,
  });

  await recordAiDecision({
    decision_type: decisionType,
    subject_id: disclosureId,
    provider: providerResult.provider,
    model: providerResult.model,
    prompt_version: IP_SCREEN_PROMPT_VERSION,
    input_hash: inputHash,
    output_hash: outputHash,
    result: parsed.ok
      ? { ...parsed.output, evidence_sources: sources, validation: parsed.validation }
      : { validation_error: parsed.reason, raw_length: providerResult.text.length, evidence_sources: sources },
  });

  return {
    recorded: true,
    escalation: parsed.ok ? null : parsed.reason,
    needsHumanReview: !parsed.ok || parsed.validation.needsHumanReview,
  };
};
