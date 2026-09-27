import type { AIProfile } from '../types/domain';

// Replaces three hand-written "mock profile" fallbacks that invented education,
// GPA, employment, certifications, funding needs and research interests for a
// researcher who had supplied none of them. On a research matchmaking platform
// those invented values were indistinguishable from real extraction.
//
// The rule now: when a model is unavailable, return a structurally complete
// profile containing only what the person actually supplied, and mark it so
// every layer can tell the difference.

export const PROFILE_EXTRACTION_UNAVAILABLE_NOTICE =
  'AI profile extraction was unavailable. Only values you supplied are shown - nothing was generated or inferred. Complete your profile manually or try again later.';

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const list = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(str).filter(Boolean);
  const raw = str(value);
  return raw ? raw.split(',').map((item) => item.trim()).filter(Boolean) : [];
};

export const buildUnavailableProfile = (input: { questionnaire?: any; userType?: unknown } = {}): AIProfile => {
  const q = input.questionnaire ?? {};

  const fullName = str(q.fullName ?? q.full_name);
  const email = str(q.email);
  const phone = str(q.phone);
  const role = str(q.currentRole ?? q.role ?? q.selectedRole ?? q.userRole ?? input.userType);
  const institution = str(q.institution ?? q.company);
  const technicalSkills = list(q.primarySkills ?? q.technical_skills);
  const researchInterests = list(q.researchInterests ?? q.research_interests);

  const embeddingText = [fullName, role, institution].filter(Boolean).join(' ');

  return {
    personal_information: {
      full_name: fullName,
      email,
      phone,
      country: '',
      city: '',
      linkedin: '',
      github: '',
      portfolio_website: '',
    },
    professional_profile: {
      professional_title: role,
      current_role: role,
      institution_or_company: institution,
      years_of_experience: '',
      experience_level: '',
    },
    education: [],
    skills: {
      technical_skills: technicalSkills,
      research_skills: [],
      business_skills: [],
      soft_skills: [],
      tools_and_technologies: [],
    },
    work_experience: [],
    research_information: {
      research_interests: researchInterests,
      research_areas: [],
      research_keywords: [],
      methodologies: [],
      research_domains: [],
    },
    projects: [],
    publications: [],
    certifications: [],
    industries: [],
    startup_and_innovation_signals: {
      startup_experience: false,
      prototype_built: false,
      patents: [],
      commercial_research: false,
      market_validation: false,
      entrepreneurial_interests: [],
    },
    collaboration_profile: {
      looking_for: [],
      can_offer: [],
      preferred_collaboration_types: [],
      availability: '',
      preferred_regions: [],
    },
    investment_and_funding_profile: {
      seeking_funding: false,
      investment_interests: [],
      funding_stage: '',
      estimated_budget_needs: '',
      target_industries: [],
    },
    student_profile: {
      internship_interests: [],
      career_goals: [],
      preferred_industries: [],
      learning_interests: [],
    },
    semantic_tags: [],
    semantic_summary: '',
    embedding_text: embeddingText,
    extraction_status: 'unavailable',
    partial: true,
    extraction_notice: PROFILE_EXTRACTION_UNAVAILABLE_NOTICE,
  };
};
