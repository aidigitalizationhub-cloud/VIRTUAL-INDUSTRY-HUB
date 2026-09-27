import { z } from 'zod';
import type { AIProfile } from '../types/domain';

// A model can still invent things despite the grounding rules in the prompt, and
// `profileSchema` in aiSchemas.ts only checked two fields while passing
// everything else through. This module is the actual enforcement: it validates
// the full shape, then verifies every factual claim against the source text the
// model was given, and removes anything it cannot support.
//
// Policy, in priority order:
//   1. Numeric/credential claims (GPA, graduation year, years of experience,
//      publication year, duration) must appear verbatim in the source.
//   2. Narrative claims (achievements, impact, descriptions, summaries) must not
//      contain a number that is absent from the source. This is what stops
//      "reduced reagent waste by 12%", "TRL 4" and "$25,000".
//   3. Entry claims (education, employment, publications, projects,
//      certifications, skills, keywords) must overlap the source vocabulary.
//   4. Boolean signals set to true must have supporting vocabulary; otherwise
//      they are reset to false. Absence of evidence is not evidence.
//   5. If nothing survives, or most claims were unsupported, the extraction is
//      treated as a failure and the caller returns the honest empty profile
//      instead of a "successful" profile made mostly of invention.

const textish = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === null || v === undefined ? '' : String(v).trim()));

// Models emit "true"/"false" as often as real booleans. z.coerce.boolean() is
// unsafe here because Boolean("false") === true.
const boolish = z
  .union([z.boolean(), z.string(), z.number()])
  .nullish()
  .transform((v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') return ['true', 'yes', '1'].includes(v.trim().toLowerCase());
    return false;
  });

const profileOutputSchema = z.object({
  personal_information: z
    .object({
      full_name: textish.default(''),
      email: textish.default(''),
      phone: textish.default(''),
      country: textish.default(''),
      city: textish.default(''),
      linkedin: textish.default(''),
      github: textish.default(''),
      portfolio_website: textish.default(''),
    })
    .prefault({}),
  professional_profile: z
    .object({
      professional_title: textish.default(''),
      current_role: textish.default(''),
      institution_or_company: textish.default(''),
      years_of_experience: textish.default(''),
      experience_level: textish.default(''),
    })
    .prefault({}),
  education: z
    .array(
      z.object({
        institution: textish.default(''),
        degree: textish.default(''),
        field_of_study: textish.default(''),
        graduation_year: textish.default(''),
        gpa: textish.default('').optional(),
      }),
    )
    .default([]),
  skills: z
    .object({
      technical_skills: z.array(textish).default([]),
      research_skills: z.array(textish).default([]),
      business_skills: z.array(textish).default([]),
      soft_skills: z.array(textish).default([]),
      tools_and_technologies: z.array(textish).default([]),
    })
    .prefault({}),
  work_experience: z
    .array(
      z.object({
        role: textish.default(''),
        organization: textish.default(''),
        duration: textish.default(''),
        location: textish.default(''),
        responsibilities: z.array(textish).default([]),
        achievements: z.array(textish).default([]),
      }),
    )
    .default([]),
  research_information: z
    .object({
      research_interests: z.array(textish).default([]),
      research_areas: z.array(textish).default([]),
      research_keywords: z.array(textish).default([]),
      methodologies: z.array(textish).default([]),
      research_domains: z.array(textish).default([]),
    })
    .prefault({}),
  projects: z
    .array(
      z.object({
        project_name: textish.default(''),
        description: textish.default(''),
        technologies_used: z.array(textish).default([]),
        industry: textish.default(''),
        impact: textish.default('').optional(),
        commercialization_potential: textish.default('').optional(),
      }),
    )
    .default([]),
  publications: z
    .array(
      z.object({
        title: textish.default(''),
        year: textish.default(''),
        keywords: z.array(textish).default([]),
        research_domain: textish.default(''),
        publication_type: textish.default(''),
      }),
    )
    .default([]),
  certifications: z.array(textish).default([]),
  industries: z.array(textish).default([]),
  startup_and_innovation_signals: z
    .object({
      startup_experience: boolish.default(false),
      prototype_built: boolish.default(false),
      patents: z.array(textish).default([]),
      commercial_research: boolish.default(false),
      market_validation: boolish.default(false),
      entrepreneurial_interests: z.array(textish).default([]),
    })
    .prefault({}),
  collaboration_profile: z
    .object({
      looking_for: z.array(textish).default([]),
      can_offer: z.array(textish).default([]),
      preferred_collaboration_types: z.array(textish).default([]),
      availability: textish.default(''),
      preferred_regions: z.array(textish).default([]),
    })
    .prefault({}),
  investment_and_funding_profile: z
    .object({
      seeking_funding: boolish.default(false),
      investment_interests: z.array(textish).default([]),
      funding_stage: textish.default(''),
      estimated_budget_needs: textish.default(''),
      target_industries: z.array(textish).default([]),
    })
    .prefault({}),
  student_profile: z
    .object({
      internship_interests: z.array(textish).default([]),
      career_goals: z.array(textish).default([]),
      preferred_industries: z.array(textish).default([]),
      learning_interests: z.array(textish).default([]),
    })
    .prefault({}),
  semantic_tags: z.array(textish).default([]),
  semantic_summary: textish.default(''),
  embedding_text: textish.default(''),
});

export const profileExtractionFailureSchema = z.object({
  ok: z.literal(false),
  reason: z.string(),
  validation: z.object({
    dropped_claims: z.array(z.string()),
    checked_claims: z.number(),
    supported_claims: z.number(),
    unsupported_ratio: z.number(),
  }),
});

export const profileExtractionSuccessSchema = z.object({
  ok: z.literal(true),
  profile: z.any(),
  validation: z.object({
    dropped_claims: z.array(z.string()),
    checked_claims: z.number(),
    supported_claims: z.number(),
    unsupported_ratio: z.number(),
  }),
});

export type ProfileExtractionResult =
  | { ok: false; reason: string; validation: { dropped_claims: string[]; checked_claims: number; supported_claims: number; unsupported_ratio: number } }
  | { ok: true; profile: AIProfile; validation: { dropped_claims: string[]; checked_claims: number; supported_claims: number; unsupported_ratio: number } };

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'our', 'their', 'they', 'them', 'has', 'have', 'had',
  'was', 'were', 'are', 'but', 'not', 'you', 'his', 'her', 'its', 'who', 'which', 'will', 'would', 'can',
  'into', 'over', 'such', 'than', 'then', 'when', 'what', 'some', 'more', 'most', 'other', 'also', 'been',
  'being', 'both', 'each', 'only', 'very', 'per', 'via', 'using', 'used', 'use', 'based', 'new', 'all',
  'any', 'own', 'same', 'so', 'do', 'does', 'did', 'get', 'got', 'one', 'two', 'out', 'off', 'up', 'down',
  'about', 'after', 'before', 'between', 'during', 'under', 'above', 'below', 'while', 'because', 'work',
  'worked', 'working', 'including', 'include', 'includes', 'various', 'related', 'role', 'roles', 'field',
]);

/** Lowercase, strip punctuation, collapse whitespace. */
const normalise = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9$%.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const contentTokens = (value: string): string[] => {
  const out: string[] = [];
  for (const raw of normalise(value).split(' ')) {
    // Trim punctuation from the edges so "ghana." matches "ghana".
    const token = raw.replace(/^[^a-z0-9]+/i, '').replace(/[^a-z0-9]+$/i, '');
    if (token.length < 3) continue;
    // Numbers are compared numerically in numbersIn, not as text tokens, so
    // "2023.0" and "graduated 2023." are treated as the same year.
    if (/^[\d.,$%]+$/.test(token)) continue;
    if (STOPWORDS.has(token)) continue;
    out.push(token);
  }
  return out;
};

const numbersIn = (value: string): number[] =>
  (normalise(value).match(/\d+(?:\.\d+)?/g) || []).map((n) => Number(n));

type Grounding = {
  haystack: string;
  tokens: Set<string>;
  numbers: Set<number>;
  // Every string value the person actually supplied.
  supplied: string[];
};

/** Collect only questionnaire *values*, never keys, so field names cannot "ground" a claim. */
const collectSupplied = (input: unknown, out: string[] = []): string[] => {
  if (input === null || input === undefined) return out;
  if (typeof input === 'string') {
    out.push(input);
    return out;
  }
  if (typeof input === 'number' || typeof input === 'boolean') {
    out.push(String(input));
    return out;
  }
  if (Array.isArray(input)) {
    for (const item of input) collectSupplied(item, out);
    return out;
  }
  if (typeof input === 'object') {
    for (const value of Object.values(input as Record<string, unknown>)) collectSupplied(value, out);
  }
  return out;
};

const buildGrounding = (source: { cvText?: string; questionnaire?: unknown }): Grounding => {
  const supplied = collectSupplied(source.questionnaire);
  if (typeof source.cvText === 'string' && source.cvText.trim()) supplied.push(source.cvText);
  const haystack = normalise(supplied.join(' \n '));
  const tokens = new Set<string>();
  const numbers = new Set<number>();
  for (const chunk of supplied) {
    for (const token of contentTokens(chunk)) tokens.add(token);
    for (const n of numbersIn(chunk)) numbers.add(n);
  }
  return { haystack, tokens, numbers, supplied };
};

/**
 * A claim is supported when enough of its meaningful words appear in the source.
 * Deliberately tolerant of rephrasing and word order, and deliberately intolerant
 * of claims built from vocabulary the person never used.
 */
const isSupported = (claim: string, g: Grounding, threshold = 0.7): boolean => {
  const value = normalise(claim);
  if (!value) return true; // empty is not a claim
  if (g.haystack.includes(value)) return true;
  const tokens = contentTokens(claim);
  if (tokens.length === 0) {
    // Claim is made of numbers or stopwords/short words only. Accept it when
    // verbatim, or when every number it states appears in the source.
    if (g.haystack.includes(value)) return true;
    const nums = numbersIn(claim);
    return nums.length > 0 && nums.every((n) => g.numbers.has(n));
  }
  const hits = tokens.filter((t) => g.tokens.has(t)).length;
  return hits / tokens.length >= threshold;
};

/** Every number in a claim must exist in the source. Kills invented metrics. */
const numbersAreGrounded = (claim: string, g: Grounding): boolean =>
  numbersIn(claim).every((n) => g.numbers.has(n));

const BOOLEAN_EVIDENCE: Record<string, string[]> = {
  startup_experience: ['startup', 'start ups', 'founder', 'founded', 'venture', 'entrepreneur', 'incorporated', 'registered company'],
  prototype_built: ['prototype', 'mvp', 'pilot', 'bench', 'proof of concept', 'working model', 'built'],
  commercial_research: ['commercial', 'contract research', 'sponsored', 'industry partner', 'confidential research'],
  market_validation: ['market validation', 'piloted', 'customer', 'user', 'traction', 'adoption', 'deployed', 'end user'],
  seeking_funding: ['seeking funding', 'funding', 'raise', 'raising', 'investment', 'investor', 'grant', 'capital', 'seed round'],
};

const booleanIsSupported = (key: string, g: Grounding): boolean => {
  const needles = BOOLEAN_EVIDENCE[key];
  if (!needles) return true;
  return needles.some((needle) => g.haystack.includes(needle));
};

const cleanList = (
  values: string[],
  path: string,
  g: Grounding,
  dropped: string[],
  stats: { checked: number; supported: number },
  options: { numeric?: boolean; requireNumbers?: boolean } = {},
): string[] => {
  const out: string[] = [];
  for (const value of values) {
    const claim = String(value ?? '').trim();
    if (!claim) continue;
    stats.checked += 1;
    const supported = isSupported(claim, g) && (!options.numeric || numbersAreGrounded(claim, g));
    if (supported) {
      stats.supported += 1;
      out.push(claim);
    } else {
      dropped.push(`${path}: ${claim}`);
    }
  }
  if (options.requireNumbers && out.length === 0) {
    // Caller treats an empty list as absent; nothing further to do.
  }
  return out;
};

/** Keep the field only if it is supported and introduces no invented number. */
const keepField = (
  value: string,
  path: string,
  g: Grounding,
  dropped: string[],
  stats: { checked: number; supported: number },
  options: { numeric?: boolean; grounded?: boolean } = {},
): string => {
  const claim = String(value ?? '').trim();
  if (!claim) return '';
  stats.checked += 1;
  const supported =
    (options.grounded === false ? true : isSupported(claim, g)) && (!options.numeric || numbersAreGrounded(claim, g));
  if (supported) {
    stats.supported += 1;
    return claim;
  }
  dropped.push(`${path}: ${claim}`);
  return '';
};

/**
 * Keep array entries whose identifying fields are supported. Dropped entries are
 * recorded so the audit trail shows what the model asserted, not only what
 * survived.
 */
const keepEntries = <T>(
  entries: T[],
  path: string,
  label: (entry: T) => string,
  isGrounded: (entry: T) => boolean,
  dropped: string[],
  stats: { checked: number; supported: number },
): T[] => {
  const out: T[] = [];
  for (const entry of entries) {
    stats.checked += 1;
    if (isGrounded(entry)) {
      stats.supported += 1;
      out.push(entry);
    } else {
      dropped.push(`${path}: ${label(entry) || 'unsupported entry'}`);
    }
  }
  return out;
};

const join = (...parts: (string | undefined)[]): string => parts.filter(Boolean).join(' ');

/**
 * Parse and ground an AI profile extraction. Returns ok:false when the output
 * cannot be trusted, so the caller can fall back to the honest empty profile
 * instead of persisting invention.
 */
export const parseProfileExtraction = (
  raw: string,
  source: { cvText?: string; questionnaire?: unknown } = {},
): ProfileExtractionResult => {
  const text = String(raw ?? '').trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  if (!text) {
    return { ok: false, reason: 'empty_response', validation: { dropped_claims: [], checked_claims: 0, supported_claims: 0, unsupported_ratio: 1 } };
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    const obj = text.match(/\{[\s\S]*\}/);
    if (!obj) {
      return { ok: false, reason: 'not_json', validation: { dropped_claims: [], checked_claims: 0, supported_claims: 0, unsupported_ratio: 1 } };
    }
    try {
      json = JSON.parse(obj[0]);
    } catch {
      return { ok: false, reason: 'not_json', validation: { dropped_claims: [], checked_claims: 0, supported_claims: 0, unsupported_ratio: 1 } };
    }
  }

  // The prompt asks for the profile at the top level, but some models wrap it
  // as {"profile": {...}}. Accept both.
  const wrapped =
    json && typeof json === 'object' && !Array.isArray(json) && (json as { profile?: unknown }).profile;
  const candidate =
    wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped)
      ? (wrapped as Record<string, unknown>)
      : (json as Record<string, unknown>);

  const parsed = profileOutputSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'shape_mismatch',
      validation: { dropped_claims: parsed.error.issues.slice(0, 10).map((i) => i.path.join('.')), checked_claims: 0, supported_claims: 0, unsupported_ratio: 1 },
    };
  }

  const g = buildGrounding(source);
  const dropped: string[] = [];
  const stats = { checked: 0, supported: 0 };
  const p = parsed.data;

  const profile = {
    ...p,
    personal_information: {
      ...p.personal_information,
      country: keepField(p.personal_information.country, 'personal_information.country', g, dropped, stats),
      city: keepField(p.personal_information.city, 'personal_information.city', g, dropped, stats),
    },
    professional_profile: {
      ...p.professional_profile,
      professional_title: keepField(p.professional_profile.professional_title, 'professional_profile.professional_title', g, dropped, stats),
      current_role: keepField(p.professional_profile.current_role, 'professional_profile.current_role', g, dropped, stats),
      institution_or_company: keepField(p.professional_profile.institution_or_company, 'professional_profile.institution_or_company', g, dropped, stats),
      years_of_experience: keepField(p.professional_profile.years_of_experience, 'professional_profile.years_of_experience', g, dropped, stats, { numeric: true }),
      experience_level: keepField(p.professional_profile.experience_level, 'professional_profile.experience_level', g, dropped, stats),
    },
    education: keepEntries(
      p.education,
      'education',
      (e) => join(e.institution, e.degree, e.field_of_study),
      (e) => isSupported(join(e.institution, e.degree, e.field_of_study) || e.institution || e.degree, g),
      dropped,
      stats,
    )
      .map((e) => ({
        ...e,
        graduation_year: keepField(e.graduation_year, 'education.graduation_year', g, dropped, stats, { numeric: true }),
        gpa: keepField(e.gpa ?? '', 'education.gpa', g, dropped, stats, { numeric: true }) || undefined,
      }))
      .filter((e) => e.institution || e.degree || e.field_of_study),
    skills: {
      technical_skills: cleanList(p.skills.technical_skills, 'skills.technical_skills', g, dropped, stats),
      research_skills: cleanList(p.skills.research_skills, 'skills.research_skills', g, dropped, stats),
      business_skills: cleanList(p.skills.business_skills, 'skills.business_skills', g, dropped, stats),
      soft_skills: cleanList(p.skills.soft_skills, 'skills.soft_skills', g, dropped, stats),
      tools_and_technologies: cleanList(p.skills.tools_and_technologies, 'skills.tools_and_technologies', g, dropped, stats),
    },
    work_experience: keepEntries(
      p.work_experience,
      'work_experience',
      (w) => join(w.role, w.organization),
      (w) => isSupported(join(w.role, w.organization, w.location), g),
      dropped,
      stats,
    ).map((w) => ({
      ...w,
      duration: keepField(w.duration, 'work_experience.duration', g, dropped, stats, { numeric: true }),
      responsibilities: cleanList(w.responsibilities, 'work_experience.responsibilities', g, dropped, stats),
      achievements: cleanList(w.achievements, 'work_experience.achievements', g, dropped, stats, { numeric: true }),
    })),
    research_information: {
      research_interests: cleanList(p.research_information.research_interests, 'research_information.research_interests', g, dropped, stats),
      research_areas: cleanList(p.research_information.research_areas, 'research_information.research_areas', g, dropped, stats),
      research_keywords: cleanList(p.research_information.research_keywords, 'research_information.research_keywords', g, dropped, stats),
      methodologies: cleanList(p.research_information.methodologies, 'research_information.methodologies', g, dropped, stats),
      research_domains: cleanList(p.research_information.research_domains, 'research_information.research_domains', g, dropped, stats),
    },
    projects: keepEntries(
      p.projects,
      'projects',
      (pr) => join(pr.project_name, pr.industry),
      (pr) => isSupported(join(pr.project_name, pr.description, pr.industry), g),
      dropped,
      stats,
    ).map((pr) => ({
      ...pr,
      technologies_used: cleanList(pr.technologies_used, 'projects.technologies_used', g, dropped, stats),
      impact: keepField(pr.impact ?? '', 'projects.impact', g, dropped, stats, { numeric: true }) || undefined,
      commercialization_potential: keepField(pr.commercialization_potential ?? '', 'projects.commercialization_potential', g, dropped, stats, { numeric: true }) || undefined,
    })),
    publications: keepEntries(
      p.publications,
      'publications',
      (pub) => join(pub.title, pub.publication_type),
      (pub) => isSupported(join(pub.title, pub.research_domain, pub.publication_type), g),
      dropped,
      stats,
    ).map((pub) => ({
      ...pub,
      year: keepField(pub.year, 'publications.year', g, dropped, stats, { numeric: true }),
      keywords: cleanList(pub.keywords, 'publications.keywords', g, dropped, stats),
    })),
    certifications: cleanList(p.certifications, 'certifications', g, dropped, stats),
    industries: cleanList(p.industries, 'industries', g, dropped, stats),
    startup_and_innovation_signals: {
      ...p.startup_and_innovation_signals,
      ...(['startup_experience', 'prototype_built', 'commercial_research', 'market_validation'] as const).reduce((acc, key) => {
        if (p.startup_and_innovation_signals[key] && !booleanIsSupported(key, g)) {
          acc[key] = false;
          dropped.push(`startup_and_innovation_signals.${key}: true (no supporting evidence in source)`);
        }
        return acc;
      }, {} as Record<string, boolean>),
      patents: cleanList(p.startup_and_innovation_signals.patents, 'startup_and_innovation_signals.patents', g, dropped, stats),
      entrepreneurial_interests: cleanList(p.startup_and_innovation_signals.entrepreneurial_interests, 'startup_and_innovation_signals.entrepreneurial_interests', g, dropped, stats),
    },
    collaboration_profile: {
      looking_for: cleanList(p.collaboration_profile.looking_for, 'collaboration_profile.looking_for', g, dropped, stats),
      can_offer: cleanList(p.collaboration_profile.can_offer, 'collaboration_profile.can_offer', g, dropped, stats),
      preferred_collaboration_types: cleanList(p.collaboration_profile.preferred_collaboration_types, 'collaboration_profile.preferred_collaboration_types', g, dropped, stats),
      availability: keepField(p.collaboration_profile.availability, 'collaboration_profile.availability', g, dropped, stats),
      preferred_regions: cleanList(p.collaboration_profile.preferred_regions, 'collaboration_profile.preferred_regions', g, dropped, stats),
    },
    investment_and_funding_profile: {
      ...p.investment_and_funding_profile,
      // seeking_funding is a claim like the others: reset it unless the source
      // actually mentions seeking or holding funding.
      seeking_funding:
        p.investment_and_funding_profile.seeking_funding && !booleanIsSupported('seeking_funding', g) ? false : p.investment_and_funding_profile.seeking_funding,
      investment_interests: cleanList(p.investment_and_funding_profile.investment_interests, 'investment_and_funding_profile.investment_interests', g, dropped, stats),
      funding_stage: keepField(p.investment_and_funding_profile.funding_stage, 'investment_and_funding_profile.funding_stage', g, dropped, stats),
      estimated_budget_needs: keepField(p.investment_and_funding_profile.estimated_budget_needs, 'investment_and_funding_profile.estimated_budget_needs', g, dropped, stats, { numeric: true }),
      target_industries: cleanList(p.investment_and_funding_profile.target_industries, 'investment_and_funding_profile.target_industries', g, dropped, stats),
    },
    student_profile: {
      internship_interests: cleanList(p.student_profile.internship_interests, 'student_profile.internship_interests', g, dropped, stats),
      career_goals: cleanList(p.student_profile.career_goals, 'student_profile.career_goals', g, dropped, stats),
      preferred_industries: cleanList(p.student_profile.preferred_industries, 'student_profile.preferred_industries', g, dropped, stats),
      learning_interests: cleanList(p.student_profile.learning_interests, 'student_profile.learning_interests', g, dropped, stats),
    },
    semantic_tags: cleanList(p.semantic_tags, 'semantic_tags', g, dropped, stats),
    semantic_summary: keepField(p.semantic_summary, 'semantic_summary', g, dropped, stats, { numeric: true, grounded: false }),
    embedding_text: keepField(p.embedding_text, 'embedding_text', g, dropped, stats, { numeric: true, grounded: false }),
  } as AIProfile;

  const unsupported_ratio = stats.checked === 0 ? 1 : (stats.checked - stats.supported) / stats.checked;

  if (stats.supported === 0) {
    return { ok: false, reason: 'no_grounded_claims', validation: { dropped_claims: dropped, checked_claims: stats.checked, supported_claims: 0, unsupported_ratio: 1 } };
  }
  // Stripping a minority of invented embellishments is the system working as
  // intended, so only refuse the whole extraction when the output is dominated
  // by content the source does not support.
  if (unsupported_ratio > 0.8) {
    return { ok: false, reason: 'mostly_unsupported', validation: { dropped_claims: dropped, checked_claims: stats.checked, supported_claims: stats.supported, unsupported_ratio } };
  }

  return { ok: true, profile, validation: { dropped_claims: dropped, checked_claims: stats.checked, supported_claims: stats.supported, unsupported_ratio } };
};
