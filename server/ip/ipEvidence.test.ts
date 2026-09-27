import { describe, expect, it } from 'vitest';
import { citableSourceIds, formatIpEvidenceForPrompt, formatIpReviewerFinding, type IpEvidenceSource } from './ipEvidence';

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

describe('IP evidence citability', () => {
  const base = { publisher: 'x', retrievedAt: '2026-01-01T00:00:00.000Z' };

  it('cites only sources whose underlying record was retrieved', () => {
    const sources: IpEvidenceSource[] = [
      { ...base, id: 'S1', type: 'scholarly', title: 'Fetched record', url: 'https://example.org/a', retrieval_status: 'retrieved' },
      { ...base, id: 'R1', type: 'researcher_link', title: 'Researcher link', url: 'https://example.org/b', retrieval_status: 'unverified_link' },
      { ...base, id: 'P1', type: 'patent', title: 'Patent search portal', url: 'https://patents.google.com/?q=x', retrieval_status: 'search_lead' },
    ];
    expect(citableSourceIds(sources)).toEqual(['S1']);
  });

  it('fails closed for a source with no retrieval status recorded', () => {
    const sources: IpEvidenceSource[] = [
      { ...base, id: 'X1', type: 'scholarly', title: 'Unknown provenance', url: 'https://example.org/c' },
    ];
    expect(citableSourceIds(sources)).toEqual([]);
  });

  it('marks search portals as not citable in the prompt', () => {
    const sources: IpEvidenceSource[] = [
      { ...base, id: 'P1', type: 'patent', title: 'Patent search for x', url: 'https://patents.google.com/?q=x', retrieval_status: 'search_lead' },
    ];
    const prompt = formatIpEvidenceForPrompt(sources);
    expect(prompt).toContain('NOT CITABLE');
    expect(prompt).toContain('search portal only, no record retrieved');
  });

  it('treats a citation to a search portal as unverified in the finding body', () => {
    const sources: IpEvidenceSource[] = [
      { ...base, id: 'P1', type: 'patent', title: 'Patent search for x', url: 'https://patents.google.com/?q=x', retrieval_status: 'search_lead' },
    ];
    const body = formatIpReviewerFinding({
      summary: 'Review needed',
      reasoning: [{ issue: 'Possible prior patent', why_it_matters: 'Check it.', source_ids: ['P1'] }],
    }, sources, {});
    // The reasoning line must not carry the citation, while the evidence footer
    // still lists the portal so the reviewer can open it.
    const reasoningLine = body.split('\n').find((line) => line.includes('Possible prior patent'))!;
    expect(reasoningLine).toContain('unverified citation');
    expect(reasoningLine).not.toContain('P1');
    expect(body).toContain('[P1] Patent search for x');
  });

  it('surfaces validation limitations to the reviewer', () => {
    const body = formatIpReviewerFinding(
      { summary: 'Review needed', reasoning: [] },
      [],
      {},
      { limitations: ['1 reasoning item(s) were removed because they could not be tied to permitted evidence.'] },
    );
    expect(body).toContain('Validation notes:');
    expect(body).toContain('could not be tied to permitted evidence');
  });
});
