import { postJson } from '../lib/api';

export const EmbeddingService = {
  ensureDimension: (arr: number[] | null | undefined, dimension = 768): number[] => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return [];
    if (arr.length === dimension) return arr;
    if (arr.length > dimension) return arr.slice(0, dimension);
    return [...arr, ...new Array(dimension - arr.length).fill(0)];
  },

  // Returns null on failure — never fabricates a fake vector.
  getEmbedding: async (text: string): Promise<number[] | null> => {
    try {
      const data = await postJson<{ embedding?: number[] | null }>('/api/gemini/embed', { text });
      if (data?.embedding && Array.isArray(data.embedding) && data.embedding.length > 0) {
        return EmbeddingService.ensureDimension(data.embedding, 768);
      }
    } catch (error: any) {
      console.warn("Embedding generation failed:", error?.message || error);
    }
    return null;
  }
};
