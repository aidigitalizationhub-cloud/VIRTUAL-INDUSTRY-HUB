import { postJson } from '../lib/api';

export const DocumentExtractionService = {
  extractAndAnalyze: async (contentBase64: string, fileName: string, mimeType: string) => {
    try {
      const res = await postJson<{ success?: boolean; needs_review?: boolean; data?: any; error?: string }>('/api/admin/extract-document', {
        contentBase64: contentBase64,
        fileName: fileName,
        mimeType: mimeType
      });

      if (res && res.success !== false && res.data) {
        return { success: true, needs_review: res.needs_review === true || (res.data as any)?.needs_review === true, data: res.data };
      }
      return { success: false, error: res?.error || "Failed to extract text from document." };
    } catch (e: any) {
      console.error("Document extraction service error:", e);
      return {
        success: false,
        error: e.message || "Failed to extract text from document."
      };
    }
  }
};
