// Shared claim-grounding helpers.
//
// Used by the profile extraction validator and the match-ranking validator so
// the two cannot drift apart in how they decide whether a claim is supported by
// the text a model was actually given.
//
// Design intent: be tolerant of rephrasing and word order, and intolerant of
// claims built from vocabulary the source never used. Numbers are compared
// numerically, not as text, so "graduated 2023." and "2023.0" agree.

export const SUPPORT_THRESHOLD = 0.7;

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
export const normalise = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9$%.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const contentTokens = (value: string): string[] => {
  const out: string[] = [];
  for (const raw of normalise(value).split(' ')) {
    // Trim punctuation from the edges so "ghana." matches "ghana".
    const token = raw.replace(/^[^a-z0-9]+/i, '').replace(/[^a-z0-9]+$/i, '');
    if (token.length < 3) continue;
    // Numbers are compared numerically in numbersIn, not as text tokens.
    if (/^[\d.,$%]+$/.test(token)) continue;
    if (STOPWORDS.has(token)) continue;
    out.push(token);
  }
  return out;
};

export const numbersIn = (value: string): number[] =>
  (normalise(value).match(/\d+(?:\.\d+)?/g) || []).map((n) => Number(n));

export type Grounding = {
  haystack: string;
  tokens: Set<string>;
  numbers: Set<number>;
};

export const createGrounding = (texts: string[]): Grounding => {
  const haystack = normalise(texts.join(' \n '));
  const tokens = new Set<string>();
  const numbers = new Set<number>();
  for (const chunk of texts) {
    for (const token of contentTokens(chunk)) tokens.add(token);
    for (const n of numbersIn(chunk)) numbers.add(n);
  }
  return { haystack, tokens, numbers };
};

/**
 * True when enough of the claim's meaningful words appear in the source. An
 * empty claim is not a claim, so it is trivially supported.
 */
export const isSupported = (claim: string, g: Grounding, threshold: number = SUPPORT_THRESHOLD): boolean => {
  const value = normalise(claim);
  if (!value) return true;
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

/** Every number in a claim must exist in the source. */
export const numbersAreGrounded = (claim: string, g: Grounding): boolean =>
  numbersIn(claim).every((n) => g.numbers.has(n));

/**
 * Collect only the *values* of a nested structure, never its keys, so a field
 * name such as "gpa" can never itself count as evidence for a GPA claim.
 */
export const collectStringValues = (input: unknown, out: string[] = []): string[] => {
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
    for (const item of input) collectStringValues(item, out);
    return out;
  }
  if (typeof input === 'object') {
    for (const value of Object.values(input as Record<string, unknown>)) collectStringValues(value, out);
  }
  return out;
};
