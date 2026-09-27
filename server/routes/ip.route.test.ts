import type { Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { canDecidePublication } from '../ip/ipAuthz';

// Route-level tests for the IP disclosure write path.
//
// The IP module carries the strictest rule in the codebase: publication is a
// human decision and never an automated one. canDecidePublication is a pure
// function with unit tests, but nothing checked that the route actually calls
// it, nor that the workflow state gate is enforced before a decision is
// recorded. Those are the two guarantees worth locking down at this layer.
//
// The Supabase client is faked with a chainable stub. The chain is thenable
// because several call sites await it directly (applyTransition awaits its event
// insert) while others terminate it with maybeSingle() or single().

const mocks = vi.hoisted(() => ({
  sessionUser: null as null | { id: string; email: string },
  profileRole: 'Researcher' as string,
  disclosure: null as any,
  updated: null as any,
  tables: {} as Record<string, any>,
  ops: [] as any[],
  recordAiDecision: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  auth: {
    api: {
      getSession: async () =>
        mocks.sessionUser ? { user: mocks.sessionUser, session: { id: 's1' } } : { user: null },
    },
  },
  markPasswordResetComplete: async () => {},
}));

const makeDb = () => {
  const makeChain = (table: string) => {
    const state: any = { table, mode: 'select', payload: undefined as any, filters: [] as any[] };
    const resolve = () => {
      mocks.ops.push({ table, mode: state.mode, payload: state.payload, filters: [...state.filters] });
      if (state.mode === 'insert') return { data: state.payload, error: null };
      if (state.mode === 'update') return { data: mocks.updated, error: null };
      if (table === 'ip_disclosures') return { data: mocks.disclosure, error: null };
      // The role is read live so tests can change mocks.profileRole mid-test.
      if (table === 'profiles') return { data: { id: 'user-1', role: mocks.profileRole }, error: null };
      return { data: mocks.tables[table] ?? [], error: null };
    };
    const chain: any = {
      select: () => {
        // Supabase's insert().select() / update().select() keep the write mode
        // and return the written row; only a bare select() is a read.
        if (state.mode === 'select') state.mode = 'select';
        return chain;
      },
      insert: (payload: any) => {
        state.mode = 'insert';
        state.payload = payload;
        return chain;
      },
      update: (payload: any) => {
        state.mode = 'update';
        state.payload = payload;
        return chain;
      },
      eq: (column: string, value: any) => {
        state.filters.push([column, value]);
        return chain;
      },
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => resolve(),
      single: async () => resolve(),
      then: (onFulfilled: any, onRejected: any) => Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    return chain;
  };
  return { from: (table: string) => makeChain(table) };
};

vi.mock('../db/supabase', () => ({
  getServiceClient: () => makeDb(),
  getSupabaseClient: () => makeDb(),
  serviceClientConfigError: () => 'Supabase is not configured.',
}));

vi.mock('../services/aiGateway', () => ({
  generateWithProviders: vi.fn(),
  generateWithFallback: vi.fn(),
  getGeminiClient: vi.fn(() => null),
  getGroqClient: vi.fn(() => null),
  recordAiDecision: mocks.recordAiDecision,
  GEMINI_FALLBACK_MODELS: ['gemini-2.5-flash'],
  AiProvenancePersistenceError: class AiProvenancePersistenceError extends Error {},
}));

vi.mock('../middleware/rateLimit', () => ({
  throttleLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const UUID = '3f1a7c66-9b2e-4f8a-9a1c-0d5e6f7a8b9c';

let server: Server;
let baseUrl: string;

const post = async (path: string, body: unknown) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed };
};

// authenticateUser always reads the profiles row to resolve the role, so that
// one op is expected on every authenticated request.
const ipOps = () => mocks.ops.filter((o) => o.table !== 'profiles');

beforeAll(async () => {
  const { registerIpRoutes } = await import('./ip');
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  registerIpRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  mocks.sessionUser = { id: 'user-1', email: 'researcher@ug.edu.gh' };
  mocks.profileRole = 'Super Admin';
  mocks.disclosure = {
    id: UUID,
    project_id: 'project-1',
    researcher_id: 'user-1',
    status: 'super_admin_review',
    version: 3,
    route: 'standard',
    answers: {},
  };
  mocks.updated = { ...mocks.disclosure, status: 'published', version: 4 };
  mocks.tables = { profiles: { id: 'user-1', role: mocks.profileRole } };
  mocks.ops = [];
  mocks.recordAiDecision.mockReset();
  mocks.recordAiDecision.mockResolvedValue(undefined);
});

describe('POST /api/ip/disclosures/:id/publication-decision', () => {
  const decide = (id = UUID, body: Record<string, unknown> = { decision: 'publish', reason: 'Committee decision.' }) =>
    post(`/api/ip/disclosures/${id}/publication-decision`, body);

  it('rejects an unauthenticated request', async () => {
    mocks.sessionUser = null;
    const res = await decide();
    expect(res.status).toBe(401);
    expect(ipOps()).toHaveLength(0);
  });

  it('refuses a researcher', async () => {
    mocks.profileRole = 'Researcher';
    const res = await decide();
    expect(res.status).toBe(403);
    expect(ipOps()).toHaveLength(0);
  });

  it('refuses the TTO', async () => {
    mocks.profileRole = 'TTO';
    const res = await decide();
    expect(res.status).toBe(403);
    expect(ipOps()).toHaveLength(0);
  });

  it('currently lets an ordinary Admin decide publication, not only a Super Admin', () => {
    // DOCUMENTING ACTUAL BEHAVIOUR, not endorsing it. canDecidePublication is
    // isSuperAdminRole, and that returns true for 'Admin' as well as
    // 'Super Admin' (server/ip/ipAuthz.ts). The route's own error text says
    // "Super Admin role required" and the workflow has a distinct
    // super_admin_review state, so the intended separation of duties is not
    // actually enforced. This test is here so the behaviour is visible and any
    // change to it is a deliberate diff.
    expect(canDecidePublication('Admin')).toBe(true);
    expect(canDecidePublication('Super Admin')).toBe(true);
    expect(canDecidePublication('TTO')).toBe(false);
    expect(canDecidePublication('Researcher')).toBe(false);
  });

  it('rejects a malformed disclosure id before touching storage', async () => {
    const res = await decide('not-a-uuid');
    expect(res.status).toBe(400);
    expect(ipOps()).toHaveLength(0);
  });

  it('rejects an unknown decision', async () => {
    const res = await decide(UUID, { decision: 'auto_publish', reason: 'Because the model said so.' });
    expect(res.status).toBe(400);
  });

  it('requires a reason on every publication decision', async () => {
    const res = await decide(UUID, { decision: 'publish' });
    expect(res.status).toBe(400);
    expect(ipOps().some((o) => o.mode === 'insert')).toBe(false);
  });

  it('refuses a decision outside the final review state', async () => {
    mocks.disclosure = { ...mocks.disclosure, status: 'tto_review' };
    const res = await decide();
    expect(res.status).toBe(409);
    // Nothing may be recorded when the state gate rejects the transition.
    expect(ipOps().some((o) => o.mode === 'insert')).toBe(false);
  });

  it('records a publication and projects the linked project', async () => {
    const res = await decide(UUID, { decision: 'publish', reason: 'Cleared by the committee.' });
    expect(res.status).toBe(200);
    expect(res.body.decision.decision).toBe('publish');
    expect(res.body.decision.decided_by).toBe('user-1');

    const decisionInsert = ipOps().find((o) => o.table === 'ip_disclosure_decisions' && o.mode === 'insert');
    expect(decisionInsert).toBeDefined();
    expect(decisionInsert.payload.reason).toBe('Cleared by the committee.');

    const projectUpdate = ipOps().find((o) => o.table === 'projects' && o.mode === 'update');
    expect(projectUpdate.payload.disclosure_status).toBe('Published');
    expect(projectUpdate.payload.visibility).toBe('Public');
  });

  it('does not publish the linked project on a restrict decision', async () => {
    const res = await decide(UUID, { decision: 'restrict', reason: 'Partial disclosure only.' });
    expect(res.status).toBe(200);
    const projectUpdate = ipOps().find((o) => o.table === 'projects' && o.mode === 'update');
    expect(projectUpdate.payload.disclosure_status).toBe('Approved');
    expect(projectUpdate.payload.visibility).toBe('Internal');
  });

  it('writes an audit event for the decision', async () => {
    await decide();
    const event = ipOps().find((o) => o.table === 'ip_disclosure_events' && o.mode === 'insert');
    expect(event).toBeDefined();
    expect(event.payload.action).toBe('publication_decision');
  });
});

describe('POST /api/ip/disclosures/:id/findings', () => {
  const addFinding = (id: string, body: Record<string, unknown>) => post(`/api/ip/disclosures/${id}/findings`, body);

  it('rejects an unauthenticated request', async () => {
    mocks.sessionUser = null;
    const res = await addFinding(UUID, { category: 'admin', title: 't', body: 'b', severity: 'info', visibility: 'internal' });
    expect(res.status).toBe(401);
  });

  it('refuses a researcher writing a reviewer finding', async () => {
    mocks.profileRole = 'Researcher';
    const res = await addFinding(UUID, { category: 'admin', title: 't', body: 'b', severity: 'info', visibility: 'internal' });
    expect(res.status).toBe(403);
    expect(mocks.ops.some((o) => o.mode === 'insert')).toBe(false);
  });

  it('returns 404 for a disclosure that does not exist', async () => {
    mocks.disclosure = null;
    const res = await addFinding(UUID, { category: 'admin', title: 't', body: 'b', severity: 'info', visibility: 'internal' });
    expect(res.status).toBe(404);
  });

  it('stores an admin finding with reviewer provenance', async () => {
    mocks.profileRole = 'Admin';
    const res = await addFinding(UUID, {
      category: 'admin',
      title: 'Prior public disclosure identified',
      body: 'A conference abstract appears to disclose the same method.',
      severity: 'high',
      visibility: 'internal',
    });
    expect(res.status).toBe(201);
    const insert = ipOps().find((o) => o.table === 'ip_disclosure_findings' && o.mode === 'insert');
    expect(insert.payload.source_type).toBe('reviewer');
    expect(insert.payload.author_role).toBe('Admin');
    // The schema defaults new findings to preliminary; the reviewer must
    // explicitly mark a finding as final.
    expect(insert.payload.is_preliminary).toBe(true);
  });

  it('honours an explicit final (non-preliminary) finding', async () => {
    mocks.profileRole = 'Admin';
    const res = await addFinding(UUID, {
      category: 'admin',
      title: 'Final finding',
      body: 'Confirmed by the committee.',
      severity: 'critical',
      visibility: 'internal',
      isPreliminary: false,
    });
    expect(res.status).toBe(201);
    const insert = ipOps().find((o) => o.table === 'ip_disclosure_findings' && o.mode === 'insert');
    expect(insert.payload.is_preliminary).toBe(false);
  });

  it('rejects a malformed finding body', async () => {
    mocks.profileRole = 'Admin';
    const res = await addFinding(UUID, { category: 'admin' });
    expect(res.status).toBe(400);
  });
});
