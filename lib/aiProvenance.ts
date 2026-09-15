export class AiProvenancePersistenceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AiProvenancePersistenceError';
  }
}

export const persistAiDecision = async (service: any, entry: Record<string, unknown>): Promise<void> => {
  if (!service) {
    throw new AiProvenancePersistenceError('AI provenance ledger is unavailable: service client is not configured.');
  }

  try {
    const { error } = await service.from('ai_decisions').insert([{ ...entry, review_status: 'pending' }]);
    if (error) throw error;
  } catch (error) {
    throw new AiProvenancePersistenceError(
      `AI provenance ledger write failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
};
