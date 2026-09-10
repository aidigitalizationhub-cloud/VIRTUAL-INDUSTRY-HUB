import { describe, expect, it } from 'vitest';
import { formatIpAnswer, IP_QUESTIONS, missingIpAnswers } from './ipSchemas';

const fullAnswers = (): Record<string, { value: unknown; text?: unknown }> => {
  const out: Record<string, { value: unknown; text?: unknown }> = {};
  for (const q of IP_QUESTIONS) {
    out[q.key] = 'freeText' in q && q.freeText
      ? { value: 'Some detail', text: 'Some detail' }
      : { value: 'no' };
  }
  return out;
};

describe('IP answer completeness', () => {
  it('accepts a fully answered questionnaire', () => {
    expect(missingIpAnswers(fullAnswers())).toEqual([]);
  });

  it('flags every unanswered question', () => {
    expect(missingIpAnswers({})).toHaveLength(IP_QUESTIONS.length);
  });

  it('flags an unanswered choice and blank free text', () => {
    const answers = fullAnswers();
    delete answers.possible_ip;
    answers.contributors = { value: '   ', text: '' };
    const missing = missingIpAnswers(answers);
    expect(missing).toHaveLength(2);
    expect(missing[0]).toContain('new invention');
  });

  it('rejects invalid choice values', () => {
    const answers = fullAnswers();
    answers.agreements = { value: 'maybe' };
    expect(missingIpAnswers(answers)).toHaveLength(1);
  });

  it('formats repeated value and text only once', () => {
    expect(formatIpAnswer({ value: 'Nora — Researcher', text: 'Nora — Researcher' })).toBe('Nora — Researcher');
    expect(formatIpAnswer('Nora — Researcher\nKojo — Student')).toContain('\n');
  });
});
