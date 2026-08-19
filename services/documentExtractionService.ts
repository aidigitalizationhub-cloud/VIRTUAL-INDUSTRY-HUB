import { postJson } from '../lib/api';

export const DocumentExtractionService = {
  extractAndAnalyze: async (fileBase64: string, fileName: string, mimeType: string) => {
    try {
      const res = await postJson<{ success?: boolean; data?: any; error?: string }>('/api/admin/extract-document', {
        fileBase64,
        fileName,
        mimeType
      });

      if (res && res.success !== false && res.data) {
        return { success: true, data: res.data };
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
