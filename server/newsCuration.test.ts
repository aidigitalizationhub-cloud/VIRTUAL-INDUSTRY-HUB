import { describe, expect, it } from 'vitest';
import { canManageNews, mergeScoutNews, newsContentHash, normalizeNewsUrl, validateNewsPublication } from './newsCuration';

describe('news curation', () => {
  it('normalizes tracking URL variants and hashes normalized content', () => {
    expect(normalizeNewsUrl('HTTPS://Example.com/story/?utm_source=x#top')).toBe('https://example.com/story');
    expect(newsContentHash({ title: 'A  title', summary: 'A summary' })).toBe(newsContentHash({ title: ' a title ', summary: 'a   summary' }));
  });

  it('requires verified source evidence for every publication', () => {
    expect(validateNewsPublication({ status: 'Published', title: 'T', summary: 'S', image_url: 'img', is_ai_generated: true })).toMatchObject({ ok: false });
    expect(validateNewsPublication({ status: 'Published', title: 'T', summary: 'S', image_url: 'img', is_ai_generated: true, external_url: 'https://example.com/source' })).toEqual({ ok: true });
    expect(validateNewsPublication({ status: 'Published', title: 'T', summary: 'S', image_url: 'img', is_ai_generated: false })).toMatchObject({ ok: false });
    expect(validateNewsPublication({ status: 'Published', title: 'T', summary: 'S', image_url: 'img', external_url: 'https://example.com/source' })).toEqual({ ok: true });
    expect(validateNewsPublication({ status: 'Draft' })).toEqual({ ok: true });
  });

  it('rejects publication without an image and preserves human edits during Scout merge', () => {
    expect(validateNewsPublication({ status: 'Published', title: 'T', summary: 'S' })).toMatchObject({ ok: false });
    expect(mergeScoutNews({ title: 'Human title', summary: 'Human summary', image_url: 'human' }, { title: 'AI title', summary: 'AI summary', image_url: '' })).toMatchObject({ title: 'Human title', summary: 'Human summary', image_url: 'human' });
  });

  it('authorizes only Admin news operations', () => {
    expect(canManageNews('Admin')).toBe(true);
    expect(canManageNews('Researcher')).toBe(false);
    expect(canManageNews(undefined)).toBe(false);
  });
});
