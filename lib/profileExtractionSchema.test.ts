import { describe, expect, it } from 'vitest';
import { parseProfileExtraction } from './profileExtractionSchema';

// A CV that supports only these facts. Everything in the invented payloads below
// is deliberately absent from it.
const CV = `
Ama Mensah
PhD Researcher, Department of Biochemistry, University of Ghana
Email: ama.mensah@ug.edu.gh

EDUCATION
MSc Biochemistry, University of Ghana, graduated 2023.
BSc Zoology, University of Ghana, graduated 2019.

SKILLS
Python, Flow Cytometry, R, ELISA, field sampling

RESEARCH
My dissertation covers malaria genomics and vaccine design.
I use PCR assays and genome sequencing to study drug resistance.

EXPERIENCE
Teaching Assistant, Department of Biochemistry, 2023 to 2024.
Supported laboratory practicals for undergraduate students.
`;

const json = (profile: Record<string, unknown>) => JSON.stringify({ profile });

describe('AI profile extraction grounding', () => {
  it('keeps claims that the CV supports', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah', email: 'ama.mensah@ug.edu.gh' },
        professional_profile: { current_role: 'PhD Researcher', institution_or_company: 'University of Ghana', experience_level: '' },
        education: [{ institution: 'University of Ghana', degree: 'MSc Biochemistry', graduation_year: '2023' }],
        skills: { technical_skills: ['Python', 'Flow Cytometry'], research_skills: ['ELISA'] },
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.education[0].graduation_year).toBe('2023');
    expect(result.profile.skills.technical_skills).toEqual(['Python', 'Flow Cytometry']);
    expect(result.profile.professional_profile.current_role).toBe('PhD Researcher');
  });

  it('drops a GPA that never appears in the source', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        education: [{ institution: 'University of Ghana', degree: 'BSc Zoology', graduation_year: '2019', gpa: '3.7' }],
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.education[0].gpa).toBeUndefined();
    expect(result.validation.dropped_claims.join(' ')).toContain('education.gpa');
  });

  it('keeps a GPA that the CV states', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        education: [{ institution: 'University of Ghana', degree: 'BSc Zoology', gpa: '3.7' }],
      }),
      { cvText: `${CV}\nGPA: 3.7` },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.education[0].gpa).toBe('3.7');
  });

  it('drops invented employers and job history', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        work_experience: [
          { role: 'Academic / Lab Associate', organization: 'Noguchi Memorial Institute for Medical Research', duration: '18 Months', achievements: ['Successfully reduced reagent waste by 12%'] },
          { role: 'Teaching Assistant', organization: 'University of Ghana', duration: '2023 to 2024' },
        ],
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.work_experience).toHaveLength(1);
    expect(result.profile.work_experience[0].organization).toBe('University of Ghana');
    // The whole invented employer entry is recorded as dropped, so the audit
    // trail shows what the model asserted rather than only what survived.
    expect(result.validation.dropped_claims.join(' ')).toContain('Noguchi');
  });

  it('rejects a fabricated funding need', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        professional_profile: { current_role: 'PhD Researcher', institution_or_company: 'University of Ghana' },
        investment_and_funding_profile: { seeking_funding: true, funding_stage: 'Pre-seed', estimated_budget_needs: '$25,000' },
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.investment_and_funding_profile.estimated_budget_needs).toBe('');
    expect(result.profile.investment_and_funding_profile.funding_stage).toBe('');
    // No funding vocabulary in the CV, so the unsupported claim is reset.
    expect(result.profile.investment_and_funding_profile.seeking_funding).toBe(false);
  });

  it('rejects an invented commercialization claim with a TRL level', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        projects: [
          {
            project_name: 'Malaria drug resistance sequencing',
            description: 'Genome sequencing of malaria to study drug resistance.',
            impact: 'Dramatically improves regional screening latency.',
            commercialization_potential: 'High; current technology validation achieves TRL 4.',
          },
        ],
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.projects[0].commercialization_potential).toBeUndefined();
    expect(result.profile.projects[0].impact).toBeUndefined();
  });

  it('resets prototype_built when the source never mentions a prototype', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        skills: { technical_skills: ['Python'] },
        startup_and_innovation_signals: { prototype_built: true, startup_experience: true, commercial_research: true, market_validation: false, patents: [], entrepreneurial_interests: [] },
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const signals = result.profile.startup_and_innovation_signals;
    expect(signals.prototype_built).toBe(false);
    expect(signals.startup_experience).toBe(false);
    expect(signals.commercial_research).toBe(false);
    expect(signals.market_validation).toBe(false);
  });

  it('keeps prototype_built when the source does support it', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        skills: { technical_skills: ['Python'] },
        startup_and_innovation_signals: { prototype_built: true, startup_experience: false, commercial_research: false, market_validation: false, patents: [], entrepreneurial_interests: [] },
      }),
      { cvText: `${CV}\nI built a working prototype of the assay.` },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.startup_and_innovation_signals.prototype_built).toBe(true);
  });

  it('drops named certifications, publications and institutions it cannot support', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        skills: { technical_skills: ['Python'] },
        certifications: ['UG Lab Biosafety Certificate', 'First Aid'],
        publications: [{ title: 'A review of CRISPR gene drives in Anopheles gambiae', year: '2024', publication_type: 'journal article' }],
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.certifications).not.toContain('UG Lab Biosafety Certificate');
    expect(result.profile.publications).toHaveLength(0);
  });

  it('fails closed when nothing in the output is supported', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Someone Else' },
        education: [{ institution: 'Harvard University', degree: 'MBA', graduation_year: '2015', gpa: '3.9' }],
        certifications: ['CFA Chartered'],
        work_experience: [{ role: 'CEO', organization: 'Acme Robotics', duration: '5 years' }],
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('no_grounded_claims');
  });

  it('fails closed when the source was empty', () => {
    const result = parseProfileExtraction(json({ personal_information: { full_name: 'Ama Mensah' } }), { cvText: '' });
    expect(result.ok).toBe(false);
  });

  it('accepts an entirely empty model response as a failure rather than success', () => {
    const result = parseProfileExtraction(json({}), { cvText: CV });
    expect(result.ok).toBe(false);
  });

  it('fails closed when the model returns non-JSON', () => {
    const result = parseProfileExtraction('I could not extract a profile.', { cvText: CV });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not_json');
  });

  it('reads "false" strings as false rather than truthy', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        skills: { technical_skills: ['Python'] },
        startup_and_innovation_signals: { prototype_built: 'false', startup_experience: 'no', commercial_research: 'true', market_validation: 0, patents: [], entrepreneurial_interests: [] },
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const signals = result.profile.startup_and_innovation_signals;
    expect(signals.prototype_built).toBe(false);
    expect(signals.startup_experience).toBe(false);
    expect(signals.commercial_research).toBe(false);
    expect(signals.market_validation).toBe(false);
  });

  it('never lets a questionnaire key ground a claim', () => {
    const result = parseProfileExtraction(
      json({ personal_information: { full_name: 'Ama Mensah' }, skills: { technical_skills: ['Python'] }, certifications: ['gpa'] }),
      { questionnaire: { primarySkills: 'Python', gpa: '3.7' } },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // "gpa" appears only as a JSON key, which is not evidence.
    expect(result.profile.certifications).toEqual([]);
  });

  it('grounds claims against questionnaire values', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        skills: { technical_skills: ['Mass spectrometry', 'Astrophysics'] },
      }),
      { questionnaire: { primarySkills: 'Mass spectrometry, ICP-MS' } },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.skills.technical_skills).toEqual(['Mass spectrometry']);
  });

  it('always returns a structurally complete profile when ok', () => {
    const result = parseProfileExtraction(
      json({ personal_information: { full_name: 'Ama Mensah' }, skills: { technical_skills: ['Python'] } }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const key of [
      'personal_information', 'professional_profile', 'education', 'skills', 'work_experience',
      'research_information', 'projects', 'publications', 'certifications', 'industries',
      'startup_and_innovation_signals', 'collaboration_profile', 'investment_and_funding_profile',
      'student_profile', 'semantic_tags', 'semantic_summary', 'embedding_text',
    ]) {
      expect(result.profile).toHaveProperty(key);
    }
  });

  it('strips unsupported numbers from the semantic summary but keeps grounded prose', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        semantic_summary: 'PhD researcher working on malaria genomics.',
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.semantic_summary).toBe('PhD researcher working on malaria genomics.');
  });

  it('rejects a summary that invents a metric', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        skills: { technical_skills: ['Python'] },
        semantic_summary: 'PhD researcher who improved throughput by 12% and raised $25,000.',
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.semantic_summary).toBe('');
  });

  it('parses JSON wrapped in a markdown code fence', () => {
    const result = parseProfileExtraction(
      '```json\n' + json({ personal_information: { full_name: 'Ama Mensah' }, skills: { technical_skills: ['Python'] } }) + '\n```',
      { cvText: CV },
    );
    expect(result.ok).toBe(true);
  });

  it('normalises numbers so 2023.0 does not count as a new fact', () => {
    const result = parseProfileExtraction(
      json({
        personal_information: { full_name: 'Ama Mensah' },
        education: [{ institution: 'University of Ghana', degree: 'MSc Biochemistry', graduation_year: '2023.0' }],
      }),
      { cvText: CV },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.education[0].graduation_year).toBe('2023.0');
  });
});
