import { describe, expect, it } from 'vitest';
import { AiProvenancePersistenceError, persistAiDecision } from './aiProvenance';

describe('AI provenance persistence', () => {
  it('surfaces Supabase insert errors', async () => {
    const service = { from: () => ({ insert: async () => ({ error: new Error('permission denied') }) }) };
    await expect(persistAiDecision(service, { decision_type: 'test' })).rejects.toMatchObject({
      name: 'AiProvenancePersistenceError',
      message: 'AI provenance ledger write failed: permission denied',
    });
  });

  it('surfaces an unavailable service client', async () => {
    await expect(persistAiDecision(null, { decision_type: 'test' })).rejects.toBeInstanceOf(AiProvenancePersistenceError);
  });
});
