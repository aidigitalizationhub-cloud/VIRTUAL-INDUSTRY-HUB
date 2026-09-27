import { AIProfile } from "../types";
import { postJson } from "../lib/api";
import { buildUnavailableProfile } from "../lib/profileExtractionFallback";

export const AIProfileService = {
  processProfile: async (cvText: string = "", questionnaire: any = {}): Promise<AIProfile> => {
    const currentRole = questionnaire?.currentRole || questionnaire?.role || "";

    try {
      // Match server prompt limits (server slices to 15k anyway) — avoids oversized-payload 400s
      const clampedCv = cvText.length > 15000 ? cvText.slice(0, 15000) : cvText;
      const data = await postJson<{ profile?: AIProfile }>('/api/ai-profile', {
        cvText: clampedCv,
        questionnaire,
        userType: currentRole
      });
      if (data?.profile && data.profile.personal_information) {
        return data.profile;
      }
    } catch (err) {
      console.warn("AI Profile service unavailable:", err);
    }

    // The request failed. Return only what the person supplied rather than a
    // fabricated profile: invented education, GPA, employment and funding data
    // must never reach a research matchmaking record. The returned profile is
    // marked extraction_status: 'unavailable' so the UI can say so.
    return buildUnavailableProfile({ questionnaire, userType: currentRole });
  },

  processEntityProfile: async (answers: any): Promise<AIProfile> => {
    return AIProfileService.processProfile("", answers);
  }
};
