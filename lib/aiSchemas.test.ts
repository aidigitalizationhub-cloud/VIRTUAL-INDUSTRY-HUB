import { describe, it, expect } from 'vitest';
import { extractJson, parseAIJson, newsDraftSchema, newsItemsSchema, matchRankingsSchema, stringArraySchema } from './aiSchemas';

describe('extractJson', () => {
  it('parses plain JSON objects', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips markdown code fences', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('extracts a JSON object wrapped in prose', () => {
    expect(extractJson('Here is the result: {"a": 1} thank you')).toEqual({ a: 1 });
  });

  it('parses arrays', () => {
    expect(extractJson('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('throws on non-JSON input', () => {
    expect(() => extractJson('this is not json')).toThrow();
  });

  it('throws on empty input', () => {
    expect(() => extractJson('')).toThrow();
  });
});

describe('parseAIJson', () => {
  it('validates a news draft', () => {
    const parsed = parseAIJson(newsDraftSchema, '{"title":"T","summary":"S","tags":["a"]}');
    expect(parsed.title).toBe('T');
  });

  it('rejects a news draft missing the required title', () => {
    expect(() => parseAIJson(newsDraftSchema, '{"summary":"S"}')).toThrow();
  });

  it('validates news items with relevance_score', () => {
    const parsed = parseAIJson(newsItemsSchema, '[{"title":"T","relevance_score":88}]');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].relevance_score).toBe(88);
  });

  it('validates match rankings', () => {
    const parsed = parseAIJson(matchRankingsSchema, '{"rankings":[{"id":"1","index":0,"score":80}]}');
    expect(parsed.rankings[0].score).toBe(80);
  });

  it('validates a string array', () => {
    expect(parseAIJson(stringArraySchema, '["a","b"]')).toEqual(['a', 'b']);
  });
});
