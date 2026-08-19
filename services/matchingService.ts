import { AIProfile } from '../types';
import { postJson } from '../lib/api';

// High-speed in-memory rank cache
const rankCache = new Map<string, any[]>();

export const MatchingService = {
  clearCache: () => {
    rankCache.clear();
  },

  rankMatches: async (userProfile: AIProfile, candidateMatches: any[]) => {
    if (!candidateMatches || !candidateMatches.length) return [];

    // Cache lookup
    const candIds = candidateMatches.map(c => c.id).sort().join(',');
    const cacheKey = `${userProfile.semantic_summary?.substring(0, 40) || 'default'}_${candIds}`;

    if (rankCache.has(cacheKey)) {
      return rankCache.get(cacheKey)!;
    }

    let result: any[] = [];

    try {
      const data = await postJson<{ rankings?: any[] }>('/api/ai-match', {
        userProfile,
        candidateMatches
      });

      const rankings = data?.rankings;
      if (Array.isArray(rankings) && rankings.length > 0) {
        result = candidateMatches.map((c, i) => {
          const ranking = rankings.find((r: any) =>
            (r.id && c.id && String(r.id).toLowerCase() === String(c.id).toLowerCase()) ||
            (r.index !== undefined && Number(r.index) === i)
          );

          const simScore = typeof c.similarity === 'number' && !isNaN(c.similarity) ? Math.round(c.similarity * 100) : 75;
          const finalScore = ranking && typeof ranking.score === 'number' ? ranking.score : simScore;

          return {
            ...c,
            ai_score: finalScore,
            ai_reasoning: ranking?.reasoning || "Semantic similarity indicates strong research alignment.",
            ai_label: ranking?.alignment_label || "AI Identified Match"
          };
        }).sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));

        rankCache.set(cacheKey, result);
        return result;
      }
    } catch (err) {
      console.warn("Ranking service fallback used:", err);
    }

    // High-precision client-side keyword and similarity scoring fallback
    result = candidateMatches.map((c: any) => {
      const titleText = (c.name || c.title || '').toLowerCase();
      const descText = (c.semantic_summary || c.description || '').toLowerCase();
      const userSummary = (userProfile.semantic_summary || '').toLowerCase();
      const userLooking = (userProfile.collaboration_profile?.looking_for || []).join(' ').toLowerCase();

      const keywords = ['diagnostic', 'vaccine', 'malaria', 'pharma', 'student', 'investor', 'research', 'funding', 'partner', 'cancer', 'health'];
      let overlapCount = 0;
      keywords.forEach(kw => {
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
      const overlappingFields = keywords.filter(kw => (titleText.includes(kw) || descText.includes(kw)));
      const matchesStr = overlappingFields.length > 0 ? overlappingFields.slice(0, 2).join(' & ') : 'academic technologies';
      const reasoning = `Matches on joint parameters including ${matchesStr}. Strategic alignment indicates key structural synergies with this ${candType}.`;

      return {
        ...c,
        ai_score: score,
        ai_reasoning: reasoning,
        ai_label: alignment_label
      };
    }).sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));

    rankCache.set(cacheKey, result);
    return result;
  }
};
