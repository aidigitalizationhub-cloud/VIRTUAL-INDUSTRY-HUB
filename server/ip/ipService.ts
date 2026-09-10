import { transitionIpWorkflow, type IpWorkflowAction, type IpWorkflowStatus } from '../../lib/ipWorkflow';

// Scalable domain service: all IP state changes go through here.
// Takes a Supabase client; no Express dependency so it is unit-testable.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export const missingTables = (err: any): boolean => String(err?.code) === '42P01';

export async function applyTransition(params: {
  db: any;
  disclosureId: string;
  actorId: string;
  actorRole: string;
  action: IpWorkflowAction;
  patch?: Record<string, unknown>;
  eventAction: string;
  eventDetails?: Record<string, unknown>;
}): Promise<{ disclosure: any }> {
  const currentRow = await params.db
    .from('ip_disclosures')
    .select('id, status, version, route')
    .eq('id', params.disclosureId)
    .maybeSingle();
  if (currentRow.error) throw currentRow.error;
  if (!currentRow.data) {
    const e: any = new Error('IP disclosure not found.');
    e.status = 404;
    throw e;
  }
  const from = currentRow.data.status as IpWorkflowStatus;
  let next: { status: IpWorkflowStatus; route?: 'tto_review' | 'tto_opt_out' };
  try {
    next = transitionIpWorkflow(from, params.action);
  } catch {
    const e: any = new Error(`Cannot apply ${params.action} while status is ${from}.`);
    e.status = 409;
    throw e;
  }
  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status: next.status,
    updated_at: now,
    version: (currentRow.data.version ?? 0) + 1,
    ...(next.route ? { route: next.route, tto_opt_out: next.route === 'tto_opt_out' } : {}),
    ...(params.patch ?? {}),
  };
  const updated = await params.db
    .from('ip_disclosures')
    .update(updatePayload)
    .eq('id', params.disclosureId)
    .eq('version', currentRow.data.version)
    .select('*')
    .maybeSingle();
  if (updated.error) throw updated.error;
  if (!updated.data) {
    const e: any = new Error('Disclosure changed while updating. Reload and try again.');
    e.status = 409;
    throw e;
  }
  const ev = await params.db.from('ip_disclosure_events').insert({
    disclosure_id: params.disclosureId,
    actor_id: params.actorId,
    actor_role: params.actorRole,
    action: params.eventAction,
    from_status: from,
    to_status: next.status,
    details: params.eventDetails ?? {},
  });
  if (ev.error) throw ev.error;
  return { disclosure: updated.data };
}
