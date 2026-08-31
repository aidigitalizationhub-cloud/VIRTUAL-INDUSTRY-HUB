import { postJson } from '../lib/api';

export const EmbeddingService = {
  ensureDimension: (arr: number[] | null | undefined, dimension = 768): number[] => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return [];
    if (arr.length === dimension) return arr;
    if (arr.length > dimension) return arr.slice(0, dimension);
    return [...arr, ...new Array(dimension - arr.length).fill(0)];
  },

  // Returns null on failure — never fabricates a fake vector.
  getEmbedding: async (text: string | null | undefined): Promise<number[] | null> => {
    // The AI-extracted profile can come back without embedding_text — bail out cleanly
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.warn("Embedding skipped: no embedding_text available on profile.");
      return null;
    }
    try {
      // Client-side clamp (server also truncates) — embedding models are token-limited
      const EMBED_MAX_CHARS = 8_000;
      const clamped = text.length > EMBED_MAX_CHARS ? text.slice(0, EMBED_MAX_CHARS) : text;
      const data = await postJson<{ embedding?: number[] | null }>('/api/gemini/embed', { text: clamped });
      if (data?.embedding && Array.isArray(data.embedding) && data.embedding.length > 0) {
        return EmbeddingService.ensureDimension(data.embedding, 768);
      }
    } catch (error: any) {
      console.warn("[embeddingService v2] Embedding generation failed:", error?.message || error, "\n", error?.stack);
    }
    return null;
  }
};
