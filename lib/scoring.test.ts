import { describe, it, expect } from 'vitest';
import { computeLocalMatchRankings } from './scoring';

describe('computeLocalMatchRankings', () => {
  const userProfile = {
    semantic_summary: 'researcher in diagnostics and vaccines',
    collaboration_profile: { looking_for: ['funding', 'partners'] },
  };

  it('returns one ranking per candidate', () => {
    const rankings = computeLocalMatchRankings(userProfile, [
      { id: 'a', name: 'Diagnostics Lab', semantic_summary: 'diagnostics' },
      { id: 'b', name: 'Other', semantic_summary: 'unrelated topic' },
    ]);
    expect(rankings).toHaveLength(2);
  });

  it('clamps scores to the 50..98 range', () => {
    const rankings = computeLocalMatchRankings(userProfile, [
      { id: 'a', name: 'x', semantic_summary: '' },
    ]);
    expect(rankings[0].score).toBeGreaterThanOrEqual(50);
    expect(rankings[0].score).toBeLessThanOrEqual(98);
  });

  it('scores a matching candidate higher than an unrelated one', () => {
    const rankings = computeLocalMatchRankings(userProfile, [
      { id: 'match', name: 'Diagnostics', semantic_summary: 'diagnostics and vaccines' },
      { id: 'nomatch', name: 'Other', semantic_summary: 'nothing related here' },
    ]);
    const match = rankings.find(r => r.id === 'match');
    const nomatch = rankings.find(r => r.id === 'nomatch');
    expect(match!.score).toBeGreaterThan(nomatch!.score);
  });

  it('gives a higher score to a more similar candidate', () => {
    const high = computeLocalMatchRankings(userProfile, [{ id: 'h', similarity: 0.9 }])[0];
    const low = computeLocalMatchRankings(userProfile, [{ id: 'l', similarity: 0.1 }])[0];
    expect(high.score).toBeGreaterThan(low.score);
  });

  it('includes index, reasoning and alignment_label', () => {
    const [r] = computeLocalMatchRankings(userProfile, [{ id: 'a', name: 'X', role: 'Researcher' }]);
    expect(r.index).toBe(0);
    expect(r.reasoning).toBeTruthy();
    expect(r.alignment_label).toBeTruthy();
  });
});
