import { createHash } from 'node:crypto';
import { normalizeNewsUrl, sourceEvidenceUrls } from '../newsCuration';

const TRUSTED_NEWS_HOSTS = [
  'ug.edu.gh',
  'noguchimedres.org',
  'waccbip.ug.edu.gh',
  'who.int',
  'fda.gov',
  'nature.com',
  'thelancet.com',
  'gavi.org',
];

export type SourceVerificationResult =
  | { ok: true; normalizedUrl: string; trustedHost: boolean }
  | { ok: false; reason: string };

export const verifySourceEvidenceUrl = (value: unknown): SourceVerificationResult => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return { ok: false, reason: 'A source evidence URL is required.' };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: 'Source evidence URL is not a valid URL.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'Source evidence URL must use HTTP or HTTPS.' };
  }
  const host = parsed.hostname.toLowerCase();
  const trustedHost = TRUSTED_NEWS_HOSTS.some((trusted) => host === trusted || host.endsWith(`.${trusted}`));
  return { ok: true, normalizedUrl: normalizeNewsUrl(raw), trustedHost };
};

export const verifyNewsSourceEvidence = (fields: {
  external_url?: unknown;
  reference_links?: unknown;
}): { ok: true; urls: string[] } | { ok: false; reason: string } => {
  const urls = sourceEvidenceUrls(fields as any);
  if (!urls.length) return { ok: false, reason: 'At least one HTTP source evidence URL is required.' };
  for (const url of urls) {
    const result = verifySourceEvidenceUrl(url);
    if (!result.ok) return result;
  }
  return { ok: true, urls };
};

export type LiveSourceVerification =
  | {
      ok: true;
      normalizedUrl: string;
      finalUrl: string;
      trustedHost: boolean;
      httpStatus: number;
      contentHash: string;
      retrievedAt: string;
    }
  | { ok: false; reason: string };

type FetchLike = (url: string, init?: any) => Promise<any>;

const MAX_SOURCE_BYTES = 1024 * 1024;
const SOURCE_FETCH_TIMEOUT_MS = 8000;

export const fetchSourceVerification = async (
  value: unknown,
  fetchFn: FetchLike = fetch,
): Promise<LiveSourceVerification> => {
  const syntactic = verifySourceEvidenceUrl(value);
  if (!syntactic.ok) return syntactic;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetchFn(syntactic.normalizedUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'UG-Virtual-Industry-Hub/1.0 (+source-verification)', Accept: 'text/html,application/pdf,text/plain,*/*' },
    });
    if (!response || typeof response.status !== 'number' || response.status < 200 || response.status >= 300) {
      return { ok: false, reason: `Source evidence URL is unreachable (HTTP ${response?.status ?? 'unknown'}).` };
    }
    const finalUrl = typeof response.url === 'string' && response.url ? response.url : syntactic.normalizedUrl;
    const finalCheck = verifySourceEvidenceUrl(finalUrl);
    if (!finalCheck.ok) return finalCheck;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) return { ok: false, reason: 'Source evidence URL returned an empty response.' };
    if (buffer.length > MAX_SOURCE_BYTES * 4) return { ok: false, reason: 'Source evidence response exceeds the verification size limit.' };
    const contentHash = createHash('sha256').update(buffer.subarray(0, MAX_SOURCE_BYTES)).digest('hex');
    return {
      ok: true,
      normalizedUrl: syntactic.normalizedUrl,
      finalUrl: finalCheck.normalizedUrl,
      trustedHost: finalCheck.trustedHost,
      httpStatus: response.status,
      contentHash,
      retrievedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') return { ok: false, reason: 'Source evidence verification timed out.' };
    return { ok: false, reason: `Source evidence URL could not be retrieved: ${error?.message || 'fetch failed'}.` };
  } finally {
    clearTimeout(timer);
  }
};

export type VerifiedSource = Extract<LiveSourceVerification, { ok: true }>;

export const verifyNewsSourceEvidenceLive = async (
  fields: { external_url?: unknown; reference_links?: unknown },
  fetchFn: FetchLike = fetch,
): Promise<{ ok: true; verified: VerifiedSource[] } | { ok: false; reason: string }> => {
  const urls = sourceEvidenceUrls(fields as any);
  if (!urls.length) return { ok: false, reason: 'At least one HTTP source evidence URL is required.' };
  const verified: VerifiedSource[] = [];
  for (const url of urls) {
    const result = await fetchSourceVerification(url, fetchFn);
    if (!result.ok) return result;
    verified.push(result);
  }
  return { ok: true, verified };
};
