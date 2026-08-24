import { AIProfile } from '../types';
import { computeLocalMatchRankings } from '../lib/scoring';
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

          const simScore = typeof c.similarity === 'number' && !isNaN(c.similarity) ? Math.round(c.similarity * 100) : undefined;
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

    // Shared deterministic fallback - single source of truth lives in lib/scoring
    const localRankings = computeLocalMatchRankings(userProfile as any, candidateMatches);
    result = localRankings.map((r) => ({
      ...candidateMatches[r.index],
      ai_score: r.score,
      ai_reasoning: r.reasoning,
      ai_label: r.alignment_label
    })).sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
    rankCache.set(cacheKey, result);
    return result;
  }
};
