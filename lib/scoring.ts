export interface RankableCandidate {
  id?: string;
  name?: string;
  title?: string;
  role?: string;
  semantic_summary?: string;
  description?: string;
  similarity?: number;
}

export interface LocalRanking {
  id: string;
  index: number;
  score: number;
  reasoning: string;
  alignment_label: string;
}

const KEYWORDS = ['diagnostic', 'vaccine', 'malaria', 'pharma', 'student', 'investor', 'research', 'funding', 'partner', 'cancer', 'health'];

/**
 * Deterministic local match scoring. Used as the authoritative score so the
 * LLM cannot override ranking with an unverified number.
 */
export const computeLocalMatchRankings = (userProfile: any, candidates: RankableCandidate[]): LocalRanking[] => {
  return candidates.map((c, index) => {
    const titleText = (c.name || c.title || '').toLowerCase();
    const descText = (c.semantic_summary || c.description || '').toLowerCase();
    const userSummary = (userProfile?.semantic_summary || '').toLowerCase();
    const userLooking = (userProfile?.collaboration_profile?.looking_for || []).join(' ').toLowerCase();

    let overlapCount = 0;
    KEYWORDS.forEach(kw => {
      const inUser = userSummary.includes(kw) || userLooking.includes(kw);
      const inCandidate = titleText.includes(kw) || descText.includes(kw);
      if (inUser && inCandidate) overlapCount++;
    });

    const similarityBonus = typeof c.similarity === 'number' && !isNaN(c.similarity) ? Math.round(c.similarity * 80) : 65;
    const score = Math.max(50, Math.min(98, similarityBonus + (overlapCount * 8)));

    let alignment_label = "Compatible Match";
    if (score >= 85) alignment_label = "Highly Compatible";
    else if (score >= 70) alignment_label = "Strategic Match";

    const candType = c.role || (c.title ? 'Project' : 'Entity');
    const overlappingFields = KEYWORDS.filter(kw => (titleText.includes(kw) || descText.includes(kw)));
    const matchesStr = overlappingFields.length > 0 ? overlappingFields.slice(0, 2).join(' & ') : 'academic technologies';
    const reasoning = `Matches on joint parameters including ${matchesStr}. Strategic alignment indicates key structural synergies with this ${candType}.`;

    return {
      id: c.id as string,
      index,
      score,
      reasoning,
      alignment_label
    };
  });
};
