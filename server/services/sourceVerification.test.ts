import { describe, expect, it, vi } from 'vitest';
import { fetchSourceVerification, verifyNewsSourceEvidence, verifyNewsSourceEvidenceLive, verifySourceEvidenceUrl } from './sourceVerification';

describe('verifySourceEvidenceUrl', () => {
  it('rejects missing values', () => {
    expect(verifySourceEvidenceUrl('').ok).toBe(false);
  });

  it('rejects non-http schemes', () => {
    const result = verifySourceEvidenceUrl('ftp://example.com/file');
    expect(result.ok).toBe(false);
  });

  it('accepts https urls and flags trusted hosts', () => {
    const result = verifySourceEvidenceUrl('https://www.noguchimedres.org/');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.trustedHost).toBe(true);
  });

  it('accepts unlisted https hosts as evidence but not trusted', () => {
    const result = verifySourceEvidenceUrl('https://example.com/article');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.trustedHost).toBe(false);
  });
});

describe('verifyNewsSourceEvidence', () => {
  it('requires at least one evidence url', () => {
    expect(verifyNewsSourceEvidence({}).ok).toBe(false);
  });

  it('accepts external_url evidence', () => {
    const result = verifyNewsSourceEvidence({ external_url: 'https://who.int/news' });
    expect(result.ok).toBe(true);
  });
});

describe('fetchSourceVerification', () => {
  const okFetch = async (url: string) => ({
    status: 200,
    url,
    arrayBuffer: async () => new TextEncoder().encode('<html>verified article</html>').buffer,
  });

  it('verifies a reachable trusted source with content hash', async () => {
    const result = await fetchSourceVerification('https://who.int/news', okFetch as any);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.httpStatus).toBe(200);
      expect(result.trustedHost).toBe(true);
      expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('rejects unreachable sources', async () => {
    const failing = async () => ({ status: 404, url: 'https://who.int/missing', arrayBuffer: async () => new ArrayBuffer(0) });
    const result = await fetchSourceVerification('https://who.int/missing', failing as any);
    expect(result.ok).toBe(false);
  });

  it('rejects fetch failures without throwing', async () => {
    const result = await fetchSourceVerification('https://who.int/news', (async () => { throw new Error('down'); }) as any);
    expect(result.ok).toBe(false);
  });

  it('verifies news evidence end to end', async () => {
    const result = await verifyNewsSourceEvidenceLive({ external_url: 'https://nature.com/article' }, okFetch as any);
    expect(result.ok).toBe(true);
  });

  it('blocks publication when evidence is unreachable', async () => {
    const failing = async () => { throw new Error('down'); };
    const result = await verifyNewsSourceEvidenceLive({ external_url: 'https://nature.com/article' }, failing as any);
    expect(result.ok).toBe(false);
  });

  it('uses injected fetch instead of network', async () => {
    const spy = vi.fn(okFetch as any) as any;
    await fetchSourceVerification('https://example.com/article', spy);
    expect(spy).toHaveBeenCalledOnce();
  });
});
