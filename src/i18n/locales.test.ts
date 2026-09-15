import { describe, expect, it } from 'vitest';
import en from './locales/en/common.json';
import fr from './locales/fr/common.json';
import ak from './locales/ak/common.json';
import sw from './locales/sw/common.json';

const leafKeys = (value: unknown, prefix = ''): string[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key));
};

describe('translation locale parity', () => {
  it('keeps every locale aligned with English', () => {
    const expected = leafKeys(en).sort();
    for (const [code, locale] of Object.entries({ fr, ak, sw })) {
      expect(leafKeys(locale).sort(), `${code} locale`).toEqual(expected);
    }
  });
});
