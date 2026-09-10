import { describe, expect, it } from 'vitest';
import { buildAdvisoryFindings } from './ipAi';

describe('IP advisory screening', () => {
  it('flags possible IP and stays advisory', () => {
    const r = buildAdvisoryFindings({ title: 'Test', description: 'Short', answers: { possible_ip: 'yes' }, route: 'tto_review' });
    expect(r.findings.length).toBeGreaterThan(0);
    expect(r.needsHumanReview).toBe(true);
  });
  it('flags prior disclosure and agreements', () => {
    const r = buildAdvisoryFindings({ answers: { publicly_shared: 'yes', agreements: 'yes' } });
    expect(r.findings.some((f) => f.category === 'evidence')).toBe(true);
    expect(r.findings.some((f) => f.category === 'ownership')).toBe(true);
  });
});
