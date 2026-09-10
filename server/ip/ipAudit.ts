// Append-only audit helper. Never throws fatally; publication callers check result.

export const writeIpEvent = async (
  db: any,
  input: {
    disclosure_id: string;
    actor_id?: string | null;
    actor_role?: string | null;
    action: string;
    from_status?: string | null;
    to_status?: string | null;
    details?: Record<string, unknown>;
  },
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const { error } = await db.from('ip_disclosure_events').insert({
      disclosure_id: input.disclosure_id,
      actor_id: input.actor_id ?? null,
      actor_role: input.actor_role ?? null,
      action: input.action,
      from_status: input.from_status ?? null,
      to_status: input.to_status ?? null,
      details: input.details ?? {},
    });
    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Audit write failed' };
  }
};
