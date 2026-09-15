import { createHash } from 'node:crypto';

export type NewsCurationFields = {
  title?: unknown;
  summary?: unknown;
  external_url?: unknown;
  reference_links?: unknown;
  source_name?: unknown;
  source_verification_notes?: unknown;
  image_url?: unknown;
  status?: unknown;
  is_ai_generated?: unknown;
};

const asText = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export const normalizeNewsUrl = (value: unknown): string => {
  const raw = asText(value);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString().replace(/\/$/, '');
  } catch {
    return raw.toLowerCase().replace(/\s+/g, ' ');
  }
};

export const newsContentHash = (fields: Pick<NewsCurationFields, 'title' | 'summary'>): string => {
  const content = [asText(fields.title), asText(fields.summary)]
    .map(value => value.toLowerCase().replace(/\s+/g, ' ').trim())
    .join('\n');
  return createHash('sha256').update(content).digest('hex');
};

export const sourceEvidenceUrls = (fields: NewsCurationFields): string[] => {
  const links = Array.isArray(fields.reference_links) ? fields.reference_links : [];
  return [fields.external_url, ...links]
    .map(normalizeNewsUrl)
    .filter(value => /^https?:\/\//i.test(value));
};

export const validateNewsPublication = (fields: NewsCurationFields): { ok: true } | { ok: false; errors: string[] } => {
  if (fields.status !== 'Published') return { ok: true };
  const errors: string[] = [];
  if (!asText(fields.title)) errors.push('A title is required before publication.');
  if (!asText(fields.summary)) errors.push('A summary is required before publication.');
  if (!asText(fields.image_url)) errors.push('An image is required before publication.');
  if (sourceEvidenceUrls(fields).length === 0) {
    errors.push('Publication requires at least one verified HTTP source evidence URL.');
  }
  return errors.length ? { ok: false, errors } : { ok: true };
};

export const newsDedupeKey = (fields: NewsCurationFields): { url: string; content: string } => ({
  url: normalizeNewsUrl(fields.external_url),
  content: newsContentHash(fields),
});

export const canManageNews = (role: unknown): boolean => role === 'Admin';

export const mergeScoutNews = (existing: NewsCurationFields, incoming: NewsCurationFields): NewsCurationFields => ({
  ...incoming,
  // Scout refreshes only its own draft data. Existing editorial fields win.
  ...existing,
  title: existing.title || incoming.title,
  summary: existing.summary || incoming.summary,
});
