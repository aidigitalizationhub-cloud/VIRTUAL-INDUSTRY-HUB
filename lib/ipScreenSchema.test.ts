import { describe, expect, it } from 'vitest';
import { parseIpScreenOutput, HUMAN_REVIEW_CONFIDENCE_FLOOR } from './ipScreenSchema';

const valid = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  summary: 'Possible prior disclosure and an unclear sponsor obligation.',
  risk: 'high',
  recommendation: 'Refer to the TTO/IP Office.',
  reasoning: [
    { issue: 'Prior public disclosure', source_ids: ['S1'], why_it_matters: 'Affects protection options.', confidence: 0.8 },
    { issue: 'Sponsor terms unclear', source_ids: ['possible_ip'], why_it_matters: 'Ownership not established.', confidence: 0.9 },
  ],
  required_actions: ['Confirm the disclosure date.', 'Obtain the sponsor agreement.'],
  ...overrides,
});

describe('IP screening output contract', () => {
  it('accepts well-formed output and keeps every valid citation', () => {
    const result = parseIpScreenOutput(valid(), ['S1', 'possible_ip']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.risk).toBe('high');
    expect(result.output.reasoning).toHaveLength(2);
    expect(result.validation.invalidCitations).toEqual([]);
    expect(result.validation.needsHumanReview).toBe(true); // risk is medium or above
  });

  it('parses JSON wrapped in a markdown code fence', () => {
    const result = parseIpScreenOutput('```json\n' + valid() + '\n```', ['S1', 'possible_ip']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.reasoning[0].issue).toBe('Prior public disclosure');
  });

  it('parses JSON surrounded by prose', () => {
    const result = parseIpScreenOutput(`Here is my review:\n${valid()}\nLet me know if you need more.`, ['S1', 'possible_ip']);
    expect(result.ok).toBe(true);
  });

  it('fails closed when the model returns prose instead of JSON', () => {
    const result = parseIpScreenOutput('I am unable to complete this review.', ['S1']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('not valid JSON');
  });

  it('fails closed on an out-of-enum risk level rather than defaulting to info', () => {
    const result = parseIpScreenOutput(valid({ risk: 'severe' }), ['S1', 'possible_ip']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('screening contract');
  });

  it('fails closed when reasoning is not an array', () => {
    const result = parseIpScreenOutput(valid({ reasoning: 'lots of concerns' }), ['S1', 'possible_ip']);
    expect(result.ok).toBe(false);
  });

  it('drops reasoning that cites only fabricated source ids', () => {
    const result = parseIpScreenOutput(valid({
      reasoning: [{ issue: 'Invented patent', source_ids: ['P1', 'PATENT-9999'], why_it_matters: 'Blocking.', confidence: 0.95 }],
    }), ['S1', 'possible_ip']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.reasoning).toHaveLength(0);
    expect(result.validation.invalidCitations.sort()).toEqual(['P1', 'PATENT-9999']);
    expect(result.validation.droppedItems).toHaveLength(1);
    expect(result.validation.needsHumanReview).toBe(true);
  });

  it('strips fabricated citations but keeps the item when one citation survives', () => {
    const result = parseIpScreenOutput(valid({
      reasoning: [{ issue: 'Related work', source_ids: ['S1', 'FAKE-1'], why_it_matters: 'Context.', confidence: 0.7 }],
    }), ['S1', 'possible_ip']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.reasoning).toHaveLength(1);
    expect(result.output.reasoning[0].source_ids).toEqual(['S1']);
    expect(result.validation.invalidCitations).toEqual(['FAKE-1']);
  });

  it('flags low-confidence items for human review', () => {
    const result = parseIpScreenOutput(valid({
      risk: 'low',
      reasoning: [{ issue: 'Speculative overlap', source_ids: ['S1'], why_it_matters: 'Unclear.', confidence: HUMAN_REVIEW_CONFIDENCE_FLOOR - 0.1 }],
    }), ['S1', 'possible_ip']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.validation.lowConfidenceItems).toEqual(['Speculative overlap']);
    expect(result.validation.needsHumanReview).toBe(true);
  });

  it('normalises a percentage confidence instead of rejecting it', () => {
    const result = parseIpScreenOutput(valid({
      risk: 'low',
      reasoning: [{ issue: 'Well supported', source_ids: ['S1'], why_it_matters: 'Clear.', confidence: 85 }],
    }), ['S1', 'possible_ip']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.reasoning[0].confidence).toBeCloseTo(0.85);
    expect(result.validation.needsHumanReview).toBe(false);
  });

  it('does not force escalation for a clean low-risk screening', () => {
    const result = parseIpScreenOutput(valid({
      summary: 'No concerns identified.',
      risk: 'low',
      recommendation: 'Continue processing.',
      reasoning: [{ issue: 'Ownership documented', source_ids: ['possible_ip'], why_it_matters: 'No gap.', confidence: 0.95 }],
    }), ['S1', 'possible_ip']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.validation.needsHumanReview).toBe(false);
  });

  it('strips unknown keys instead of failing on them', () => {
    const result = parseIpScreenOutput(valid({ patentability: 'granted', inventorship: ['Dr. Mensah'] }), ['S1', 'possible_ip']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toHaveProperty('patentability');
    expect(result.output).not.toHaveProperty('inventorship');
  });

  it('treats every id as unverifiable when nothing is citable', () => {
    const result = parseIpScreenOutput(valid(), []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.reasoning).toHaveLength(0);
    expect(result.validation.invalidCitations).toContain('S1');
  });
});
