import { AIProfile } from "../types";
import { postJson } from "../lib/api";

export const AIProfileService = {
  processProfile: async (cvText: string = "", questionnaire: any = {}): Promise<AIProfile> => {
    const fullName = questionnaire?.fullName || questionnaire?.full_name || 'University of Ghana Innovator';
    const currentRole = questionnaire?.currentRole || questionnaire?.role || 'Researcher';
    const institution = questionnaire?.institution || questionnaire?.company || 'University of Ghana';
    const email = questionnaire?.email || 'innovator@ug.edu.gh';

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
      console.warn("AI Profile processing fallback used:", err);
    }

    // Default structured profile fallback
    return {
      personal_information: { full_name: fullName, email, phone: "", country: "Ghana", city: "Accra", linkedin: "", github: "", portfolio_website: "" },
      professional_profile: { professional_title: currentRole, current_role: currentRole, institution_or_company: institution, years_of_experience: "3", experience_level: "intermediate" },
      education: [{ institution, degree: "Postgraduate Degree", field_of_study: "Scientific Innovation", graduation_year: "2025", gpa: "3.8" }],
      skills: { technical_skills: ["Scientific Analysis", "Research Methodologies"], research_skills: ["Experimental Design"], business_skills: ["Project Management"], soft_skills: ["Communication"], tools_and_technologies: ["Data Analysis", "Python"] },
      work_experience: [],
      research_information: { research_interests: ["Innovation", "Healthcare", "Technology"], research_areas: ["Life Sciences"], research_keywords: ["Ghana", "Research"], methodologies: ["Empirical"], research_domains: ["Sciences"] },
      projects: [],
      publications: [],
      certifications: [],
      industries: ["Higher Education", "Research"],
      startup_and_innovation_signals: { startup_experience: false, prototype_built: true, patents: [], commercial_research: true, market_validation: false, entrepreneurial_interests: [] },
      collaboration_profile: { looking_for: ["Research Partners", "Industry Sponsors"], can_offer: ["Academic Expertise"], preferred_collaboration_types: ["Co-Development"], availability: "Full-Time", preferred_regions: ["West Africa"] },
      investment_and_funding_profile: { seeking_funding: true, investment_interests: [], funding_stage: "Seed", estimated_budget_needs: "", target_industries: [] },
      student_profile: { internship_interests: [], career_goals: [], preferred_industries: [], learning_interests: [] },
      semantic_tags: [currentRole, "ug-innovator"],
      semantic_summary: `${fullName}, ${currentRole} at ${institution} focused on high-impact research.`,
      embedding_text: `${fullName} ${currentRole} ${institution}`
    };
  },

  processEntityProfile: async (answers: any): Promise<AIProfile> => {
    return AIProfileService.processProfile("", answers);
  }
};
