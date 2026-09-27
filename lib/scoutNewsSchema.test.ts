import { describe, expect, it } from 'vitest';
import { parseScoutedNews, SCOUT_UNVERIFIED_NOTICE } from './scoutNewsSchema';

const goodItem = {
  title: 'Noguchi Institute reports a malaria vaccine trial result',
  summary: 'The Noguchi Memorial Institute reported trial results for a malaria vaccine candidate in Accra.',
  category: 'Research Release',
  tags: ['malaria', 'vaccine', 'trial'],
  relevance_score: 78,
  source_verification_notes: 'Published by the institute.',
  source_name: 'Noguchi Memorial Institute',
  external_url: 'https://www.noguchimedres.org/news/trial',
};

const list = (items: unknown[]) => JSON.stringify(items);

describe('parseScoutedNews', () => {
  it('accepts a well-formed item', () => {
    const result = parseScoutedNews(list([goodItem]));
    expect(result.validation.kept).toBe(1);
    expect(result.items[0].title).toBe(goodItem.title);
    expect(result.items[0].category).toBe('Research Release');
    expect(result.items[0].relevance_score).toBe(78);
    expect(result.items[0].external_url).toBe(goodItem.external_url);
  });

  it('always marks the item as unverified, whatever the model claimed', () => {
    const result = parseScoutedNews(
      list([{ ...goodItem, source_verification_notes: 'Peer reviewed and confirmed by WHO.' }]),
    );
    expect(result.items[0].source_verification_notes.startsWith(SCOUT_UNVERIFIED_NOTICE)).toBe(true);
    // The model's claim is retained but demoted, never presented as a check.
    expect(result.items[0].source_verification_notes).toContain('unconfirmed');
    expect(result.items[0].source_verification_notes.indexOf('UNVERIFIED')).toBeLessThan(
      result.items[0].source_verification_notes.indexOf('Peer reviewed'),
    );
  });

  it('keeps a high but in-range relevance score', () => {
    // The >80 badge in News.tsx is a display threshold, not a validity bound.
    // A genuinely highly relevant item should not be suppressed by the
    // validator, so an in-range integer stands.
    const result = parseScoutedNews(list([{ ...goodItem, relevance_score: 99 }]));
    expect(result.items[0].relevance_score).toBe(99);
  });

  it.each([0, -5, 1000, 3.7, 'high', null, undefined])(
    'rejects a non-integer or out-of-range score %s',
    (score) => {
      const result = parseScoutedNews(list([{ ...goodItem, relevance_score: score }]));
      // The item survives, but the unusable score is discarded.
      expect(result.items).toHaveLength(1);
      expect(result.items[0].relevance_score).toBe(0);
    },
  );

  it('degrades one badly typed field without discarding the whole item', () => {
    const result = parseScoutedNews(
      list([{ ...goodItem, tags: 'not-an-array', source_name: { nested: true }, relevance_score: 'ninety' }]),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe(goodItem.title);
    expect(result.items[0].tags).toEqual([]);
    expect(result.items[0].relevance_score).toBe(0);
  });

  it('constrains the category to the documented set', () => {
    const result = parseScoutedNews(list([{ ...goodItem, category: 'Sponsored Content' }]));
    expect(result.items[0].category).toBe('');
    expect(result.validation.dropped_details.join(' ')).toContain('unsupported category');
  });

  it('drops an item with no usable external_url', () => {
    for (const url of ['', 'not a url', 'javascript:alert(1)', 'ftp://x.com/a', 'www.example.com/x']) {
      const result = parseScoutedNews(list([{ ...goodItem, external_url: url }]));
      expect(result.items).toHaveLength(0);
      expect(result.validation.dropped).toBe(1);
    }
  });

  it('drops an item with no title or summary', () => {
    expect(parseScoutedNews(list([{ ...goodItem, title: '' }])).items).toHaveLength(0);
    expect(parseScoutedNews(list([{ ...goodItem, summary: '   ' }])).items).toHaveLength(0);
  });

  it('caps the tag list and de-duplicates', () => {
    const result = parseScoutedNews(
      list([{ ...goodItem, tags: ['a', 'b', 'c', 'd', 'e', 'f', 'a'] }]),
    );
    expect(result.items[0].tags).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('truncates a runaway title or summary', () => {
    const result = parseScoutedNews(list([{ ...goodItem, title: 'x'.repeat(500), summary: 'y'.repeat(3000) }]));
    expect(result.items[0].title.length).toBe(200);
    expect(result.items[0].summary.length).toBe(1500);
  });

  it('parses a markdown-fenced array and a prose-wrapped one', () => {
    expect(parseScoutedNews('```json\n' + list([goodItem]) + '\n```').items).toHaveLength(1);
    expect(parseScoutedNews('Here are the items:\n' + list([goodItem]) + '\nDone.').items).toHaveLength(1);
  });

  it('returns nothing for unparseable output instead of inventing items', () => {
    for (const raw of ['', 'no json here', '{"items":[]}', 'null']) {
      const result = parseScoutedNews(raw);
      expect(result.items).toHaveLength(0);
    }
  });

  it('keeps only the usable entries from a mixed batch', () => {
    const result = parseScoutedNews(
      list([goodItem, { ...goodItem, title: '' }, { ...goodItem, external_url: 'nope' }, goodItem]),
    );
    expect(result.validation.checked).toBe(4);
    expect(result.validation.kept).toBe(2);
    expect(result.validation.dropped).toBe(2);
  });
});
