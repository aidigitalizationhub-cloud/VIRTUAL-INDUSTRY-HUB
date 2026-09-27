import { describe, expect, it } from 'vitest';
import { buildUnavailableProfile, PROFILE_EXTRACTION_UNAVAILABLE_NOTICE } from './profileExtractionFallback';

describe('unavailable AI profile fallback', () => {
  it('invents nothing when no questionnaire data exists at all', () => {
    const profile = buildUnavailableProfile();

    expect(profile.education).toEqual([]);
    expect(profile.work_experience).toEqual([]);
    expect(profile.publications).toEqual([]);
    expect(profile.certifications).toEqual([]);
    expect(profile.projects).toEqual([]);
    expect(profile.industries).toEqual([]);
    expect(profile.personal_information).toEqual({
      full_name: '', email: '', phone: '', country: '', city: '', linkedin: '', github: '', portfolio_website: '',
    });
    expect(profile.professional_profile.years_of_experience).toBe('');
    expect(profile.professional_profile.experience_level).toBe('');
    expect(profile.professional_profile.institution_or_company).toBe('');
    expect(profile.research_information.research_areas).toEqual([]);
    expect(profile.research_information.research_keywords).toEqual([]);
    expect(profile.research_information.methodologies).toEqual([]);
    expect(profile.research_information.research_domains).toEqual([]);
    expect(profile.semantic_tags).toEqual([]);
    expect(profile.semantic_summary).toBe('');
    expect(profile.embedding_text).toBe('');
  });

  it('never asserts defaults that were previously fabricated', () => {
    const profile = buildUnavailableProfile({ questionnaire: { fullName: 'Ama Mensah' } });
    const serialised = JSON.stringify(profile);

    // The removed mocks invented all of these.
    for (const invented of [
      'University of Ghana', 'Legon', 'innovator@ug.edu.gh', 'Noguchi', 'Ghana', 'Accra',
      'Postgraduate Degree', 'Bachelor of Science', 'Biotech', 'PCR', 'Gel Electrophoresis',
      'Biosafety Certificate', '3.7', '3.8', '$25,000', 'Pre-seed', 'TRL 4', '12%',
      'Genomic Analysis', 'Phytotherapy',
    ]) {
      expect(serialised).not.toContain(invented);
    }
  });

  it('leaves every commercial claim false rather than optimistic', () => {
    const profile = buildUnavailableProfile({ questionnaire: { fullName: 'Kofi Boateng' } });
    expect(profile.startup_and_innovation_signals).toEqual({
      startup_experience: false,
      prototype_built: false,
      patents: [],
      commercial_research: false,
      market_validation: false,
      entrepreneurial_interests: [],
    });
    expect(profile.investment_and_funding_profile.seeking_funding).toBe(false);
    expect(profile.collaboration_profile.availability).toBe('');
  });

  it('carries over only what the person actually supplied', () => {
    const profile = buildUnavailableProfile({
      userType: 'PhD Researcher',
      questionnaire: {
        fullName: 'Ama Mensah',
        email: 'ama@ug.edu.gh',
        phone: '+233201234567',
        institution: 'Noguchi Memorial Institute',
        primarySkills: 'Python, Flow Cytometry',
        researchInterests: 'Malaria genomics, Vaccine design',
      },
    });

    expect(profile.personal_information.full_name).toBe('Ama Mensah');
    expect(profile.personal_information.email).toBe('ama@ug.edu.gh');
    expect(profile.personal_information.phone).toBe('+233201234567');
    expect(profile.professional_profile.current_role).toBe('PhD Researcher');
    expect(profile.professional_profile.institution_or_company).toBe('Noguchi Memorial Institute');
    expect(profile.skills.technical_skills).toEqual(['Python', 'Flow Cytometry']);
    expect(profile.research_information.research_interests).toEqual(['Malaria genomics', 'Vaccine design']);
    // The supplied values above are the person's own, but no model ran, so the
    // profile is still not a successful extraction and must stay marked as such.
    expect(profile.extraction_status).toBe('unavailable');
  });

  it('accepts array-valued skills as well as comma-separated strings', () => {
    const profile = buildUnavailableProfile({
      questionnaire: { primarySkills: ['Python', ' R ', ''], researchInterests: [] },
    });
    expect(profile.skills.technical_skills).toEqual(['Python', 'R']);
    expect(profile.research_information.research_interests).toEqual([]);
  });

  it('falls back to the request userType when the questionnaire has no role', () => {
    const profile = buildUnavailableProfile({ userType: 'Research Fellow' });
    expect(profile.professional_profile.current_role).toBe('Research Fellow');
    expect(profile.professional_profile.professional_title).toBe('Research Fellow');
  });

  it('marks the profile so callers can tell it apart from a real extraction', () => {
    const profile = buildUnavailableProfile({ questionnaire: { fullName: 'Ama Mensah' } });
    expect(profile.extraction_status).toBe('unavailable');
    expect(profile.partial).toBe(true);
    expect(profile.extraction_notice).toBe(PROFILE_EXTRACTION_UNAVAILABLE_NOTICE);
  });

  it('preserves the full AIProfile shape so downstream readers cannot crash', () => {
    const profile = buildUnavailableProfile();
    for (const key of [
      'personal_information', 'professional_profile', 'education', 'skills', 'work_experience',
      'research_information', 'projects', 'publications', 'certifications', 'industries',
      'startup_and_innovation_signals', 'collaboration_profile', 'investment_and_funding_profile',
      'student_profile', 'semantic_tags', 'semantic_summary', 'embedding_text',
    ]) {
      expect(profile).toHaveProperty(key);
    }
  });
});
