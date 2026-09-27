import { describe, expect, it } from 'vitest';
import { parseMatchEnrichment, MATCH_ALIGNMENT_LABELS, MAX_REASONING_CHARS } from './matchRankingSchema';

const USER_TEXT =
  'PhD researcher at University of Ghana. Summary: malaria genomics and vaccine design research. Looking for: research partners in diagnostics. Technical skills: Python, Flow Cytometry, PCR.';

const candidateText = (i: number) =>
  new Map<number, string>([
    [0, 'Dr Kofi Mensah, Lecturer in Molecular Biology. Research on malaria drug resistance and genome sequencing. Skills: PCR, sequencing.'],
    [1, 'Acme Diagnostics Ltd, a company developing rapid diagnostic tests for malaria.'],
  ]).get(i) || '';

const context = (overrides: { localRankings?: { id?: string | null; index: number }[] } = {}) => ({
  localRankings: overrides.localRankings || [
    { id: 'aaaa-1111', index: 0 },
    { id: 'bbbb-2222', index: 1 },
  ],
  candidateTextByIndex: new Map<number, string>([
    [0, candidateText(0)],
    [1, candidateText(1)],
  ]),
  userText: USER_TEXT,
});

const rankings = (rows: unknown[]) => JSON.stringify({ rankings: rows });

describe('match ranking enrichment validation', () => {
  it('accepts reasoning grounded in the user and candidate text', () => {
    const result = parseMatchEnrichment(
      rankings([
        { id: 'aaaa-1111', index: 0, score: 95, reasoning: 'Strong strategic match on malaria genomics research and PCR skills.', alignment_label: 'Highly Compatible' },
      ]),
      context(),
    );

    expect(result.byKey.get('id:aaaa-1111')?.reasoning).toBe(
      'Strong strategic match on malaria genomics research and PCR skills.',
    );
    expect(result.byKey.get('id:aaaa-1111')?.alignment_label).toBe('Highly Compatible');
    expect(result.validation.ok).toBe(true);
  });

  it('drops reasoning that invents a capability for the other party', () => {
    const result = parseMatchEnrichment(
      rankings([
        { id: 'aaaa-1111', index: 0, reasoning: 'He is an expert in CRISPR cancer therapy and holds three patents in oncology.', alignment_label: 'Highly Compatible' },
      ]),
      context(),
    );

    expect(result.byKey.get('id:aaaa-1111')?.reasoning).toBeUndefined();
    expect(result.validation.dropped_details.join(' ')).toContain('ungrounded reasoning');
  });

  it('discards the label when the entry offered a rationale that was rejected', () => {
    // Otherwise a fabricated explanation could still leave the candidate
    // presented to the researcher as "Highly Compatible".
    const result = parseMatchEnrichment(
      rankings([
        { id: 'aaaa-1111', index: 0, reasoning: 'He is an expert in CRISPR cancer therapy and holds three patents in oncology.', alignment_label: 'Highly Compatible' },
      ]),
      context(),
    );

    expect(result.byKey.get('id:aaaa-1111')?.alignment_label).toBeUndefined();
    expect(result.validation.dropped_details.join(' ')).toContain('discarded because its reasoning was rejected');
  });

  it('discards the label when the rationale was too long', () => {
    const result = parseMatchEnrichment(
      rankings([{ id: 'aaaa-1111', index: 0, reasoning: 'malaria '.repeat(200), alignment_label: 'Highly Compatible' }]),
      context(),
    );

    expect(result.byKey.get('id:aaaa-1111')?.alignment_label).toBeUndefined();
  });

  it('still accepts a label when the entry offered no rationale at all', () => {
    // An entry may legitimately enrich only the label, and the controlled
    // vocabulary makes that safe on its own.
    const result = parseMatchEnrichment(
      rankings([{ id: 'aaaa-1111', index: 0, alignment_label: 'Strategic Match' }]),
      context(),
    );

    expect(result.byKey.get('id:aaaa-1111')?.alignment_label).toBe('Strategic Match');
  });

  it('rejects an alignment label outside the allowed set', () => {
    const result = parseMatchEnrichment(
      rankings([{ id: 'aaaa-1111', index: 0, reasoning: 'Compatible on malaria research.', alignment_label: 'Perfect Dream Match!' }]),
      context(),
    );

    expect(result.byKey.get('id:aaaa-1111')?.alignment_label).toBeUndefined();
    expect(result.validation.dropped_details.join(' ')).toContain('unsupported alignment_label');
  });

  it('accepts every label the deterministic engine can produce', () => {
    for (const label of ['Highly Compatible', 'Strategic Match', 'Compatible Match'] as const) {
      const result = parseMatchEnrichment(
        rankings([{ id: 'aaaa-1111', index: 0, reasoning: 'Compatible on malaria research.', alignment_label: label }]),
        context(),
      );
      expect(result.byKey.get('id:aaaa-1111')?.alignment_label).toBe(label);
    }
    expect(MATCH_ALIGNMENT_LABELS).toContain('Potential Overlay');
  });

  it('drops an entry referencing a candidate that does not exist', () => {
    const result = parseMatchEnrichment(
      rankings([{ id: 'not-a-real-candidate', index: 9, reasoning: 'Excellent fit for vaccine design research.', alignment_label: 'Strategic Match' }]),
      context(),
    );

    expect(result.byKey.size).toBe(0);
    expect(result.validation.dropped_details.join(' ')).toContain('no known candidate');
  });

  it('matches enrichment by index when no id is returned', () => {
    const result = parseMatchEnrichment(
      rankings([{ index: 1, reasoning: 'Company develops rapid diagnostic tests for malaria.', alignment_label: 'Strategic Match' }]),
      context(),
    );

    expect(result.byKey.get('idx:1')?.alignment_label).toBe('Strategic Match');
  });

  it('rejects reasoning that exceeds the length cap', () => {
    const long = 'malaria research '.repeat(80);
    const result = parseMatchEnrichment(
      rankings([{ id: 'aaaa-1111', index: 0, reasoning: long, alignment_label: 'Highly Compatible' }]),
      context(),
    );

    expect(long.length).toBeGreaterThan(MAX_REASONING_CHARS);
    expect(result.byKey.get('id:aaaa-1111')?.reasoning).toBeUndefined();
    expect(result.validation.dropped_details.join(' ')).toContain('exceeded');
  });

  it('rejects reasoning that introduces a number absent from the source', () => {
    const result = parseMatchEnrichment(
      rankings([{ id: 'aaaa-1111', index: 0, reasoning: 'Has published 47 papers on malaria genomics.', alignment_label: 'Highly Compatible' }]),
      context(),
    );

    expect(result.byKey.get('id:aaaa-1111')?.reasoning).toBeUndefined();
  });

  it('returns an empty enrichment map for non-JSON output', () => {
    const result = parseMatchEnrichment('I cannot rank these.', context());
    expect(result.byKey.size).toBe(0);
    expect(result.validation.ok).toBe(false);
    expect(result.validation.reason).toBe('not_json');
  });

  it('returns an empty enrichment map for an empty rankings array', () => {
    const result = parseMatchEnrichment(rankings([]), context());
    expect(result.byKey.size).toBe(0);
    expect(result.validation.reason).toBe('no_rankings');
  });

  it('never lets an unknown score or index change the caller-owned fields', () => {
    // The parser returns only reasoning/label; score and index are not carried.
    const result = parseMatchEnrichment(
      rankings([{ id: 'aaaa-1111', index: 0, score: 100, reasoning: 'Compatible on malaria research.', alignment_label: 'Highly Compatible' }]),
      context(),
    );
    expect(result.byKey.get('id:aaaa-1111')).toEqual({
      reasoning: 'Compatible on malaria research.',
      alignment_label: 'Highly Compatible',
    });
  });

  it('parses output wrapped in a markdown code fence', () => {
    const result = parseMatchEnrichment(
      '```json\n' + rankings([{ id: 'aaaa-1111', index: 0, reasoning: 'Compatible on malaria research.', alignment_label: 'Strategic Match' }]) + '\n```',
      context(),
    );
    expect(result.byKey.get('id:aaaa-1111')?.alignment_label).toBe('Strategic Match');
  });

  it('drops non-object entries without throwing', () => {
    const result = parseMatchEnrichment(rankings(['nonsense', null, { id: 'aaaa-1111', index: 0, alignment_label: 'Compatible Match' }]), context());
    expect(result.byKey.get('id:aaaa-1111')?.alignment_label).toBe('Compatible Match');
    expect(result.validation.dropped).toBe(2);
  });
});
