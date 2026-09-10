import { describe, expect, it } from 'vitest';
import { formatIpEvidenceForPrompt, formatIpReviewerFinding, type IpEvidenceSource } from './ipEvidence';

describe('IP evidence citations', () => {
  it('formats stable source IDs and URLs for the reviewer prompt', () => {
    const source: IpEvidenceSource = {
      id: 'S1', type: 'scholarly', title: 'A related study', publisher: 'OpenAlex',
      url: 'https://example.org/study', excerpt: 'Relevant abstract.', retrievedAt: '2026-01-01T00:00:00.000Z',
    };
    const prompt = formatIpEvidenceForPrompt([source]);
    expect(prompt).toContain('[S1] scholarly');
    expect(prompt).toContain('https://example.org/study');
  });

  it('makes unavailable evidence explicit', () => {
    expect(formatIpEvidenceForPrompt([])).toContain('No external evidence sources were available');
  });

  it('marks citations outside the evidence packet as unverified', () => {
    const body = formatIpReviewerFinding({
      summary: 'Review needed',
      reasoning: [{ issue: 'Prior art', why_it_matters: 'Compare claims.', source_ids: ['FAKE-99'] }],
    }, [], { possible_ip: 'yes' });
    expect(body).toContain('unverified citation');
    expect(body).not.toContain('FAKE-99');
  });
});
