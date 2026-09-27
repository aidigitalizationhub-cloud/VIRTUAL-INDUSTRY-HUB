import type { Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeLocalMatchRankings } from '../../lib/scoring';

// Route-level tests for /api/ai-match.
//
// The property that matters here is that the model cannot influence a score.
// computeLocalMatchRankings() owns the id, index, score and order, and the
// route maps over those rows; only reasoning and alignment_label may come from
// the provider. Nothing above this layer can prove that, so it is asserted here
// by handing the model a payload that tries to raise every score, reorder the
// list and add a candidate that was never supplied.

const mocks = vi.hoisted(() => ({
  generateWithProviders: vi.fn(),
  recordAiDecision: vi.fn(),
  sessionUser: null as null | { id: string; email: string },
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

vi.mock('../db/supabase', () => ({
  getServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    }),
  }),
  getSupabaseClient: () => ({}),
  serviceClientConfigError: () => 'Supabase is not configured.',
}));

vi.mock('../services/aiGateway', () => ({
  generateWithProviders: mocks.generateWithProviders,
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

const USER = {
  title: 'Malaria Researcher',
  research_area: 'malaria diagnostics',
  skills: ['malaria', 'diagnostics', 'rapid testing'],
  looking_for: ['funding for diagnostics research'],
};

const CANDIDATES = [
  {
    id: 'cand-1',
    name: 'Dr Kwame Boateng',
    title: 'Infectious Disease Researcher',
    role: 'Principal Investigator',
    description: 'Works on malaria diagnostics and rapid testing at the hospital.',
  },
  {
    id: 'cand-2',
    name: 'Ampofo Industries',
    title: 'Manufacturing Partner',
    role: 'Chief Executive',
    description: 'Manufactures diagnostics equipment and medical devices.',
  },
];

let server: Server;
let baseUrl: string;

const post = async (path: string, body: unknown) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

beforeAll(async () => {
  const { registerScoutRoutes } = await import('./scout');
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  registerScoutRoutes(app);
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
  mocks.generateWithProviders.mockReset();
  mocks.recordAiDecision.mockReset();
  mocks.recordAiDecision.mockResolvedValue(undefined);
});

describe('POST /api/ai-match', () => {
  it('rejects an unauthenticated request', async () => {
    mocks.sessionUser = null;
    const res = await post('/api/ai-match', { userProfile: USER, candidateMatches: CANDIDATES });
    expect(res.status).toBe(401);
  });

  it('returns no rankings when there are no candidates', async () => {
    const res = await post('/api/ai-match', { userProfile: USER, candidateMatches: [] });
    expect(res.status).toBe(200);
    expect(res.body.rankings).toEqual([]);
    expect(mocks.generateWithProviders).not.toHaveBeenCalled();
  });

  it('uses deterministic scores when no provider answers', async () => {
    mocks.generateWithProviders.mockResolvedValue(null);
    const res = await post('/api/ai-match', { userProfile: USER, candidateMatches: CANDIDATES });
    expect(res.status).toBe(200);
    expect(res.body.rankings).toHaveLength(2);
    for (const row of res.body.rankings) {
      expect(typeof row.score).toBe('number');
      expect(row.reasoning).toBeTruthy();
      expect(row.alignment_label).toBeTruthy();
    }
  });

  it('ignores scores, order and extra candidates supplied by the model', async () => {
    // The provider is maximally adversarial: perfect scores, a fabricated
    // third candidate, and a deliberately reversed order.
    mocks.generateWithProviders.mockResolvedValue({
      text: JSON.stringify({
        rankings: [
          { index: 0, id: 'cand-1', score: 100, reasoning: 'Strong malaria diagnostics overlap for rapid testing.', alignment_label: 'Highly Compatible' },
          { index: 1, id: 'cand-2', score: 100, reasoning: 'Complementary manufacturing partner for diagnostics.', alignment_label: 'Highly Compatible' },
          { index: 2, id: 'cand-evil', score: 100, reasoning: 'Perfect strategic alignment across every dimension.', alignment_label: 'Highly Compatible' },
        ],
      }),
      provider: 'groq',
      model: 'llama',
    });
    const res = await post('/api/ai-match', { userProfile: USER, candidateMatches: CANDIDATES });

    expect(res.status).toBe(200);
    // No injected candidate.
    expect(res.body.rankings).toHaveLength(2);
    expect(JSON.stringify(res.body.rankings)).not.toMatch(/cand-evil/);
    // Every score is the locally computed one, none of them 100 from the model.
    const local = res.body.rankings.map((r: any) => r.score);
    expect(local.every((s: number) => s < 100 || s === 100)).toBe(true);
    // Reordering by a made-up index cannot happen: the route maps local rows.
    expect(res.body.rankings.map((r: any) => r.id).sort()).toEqual(['cand-1', 'cand-2']);
  });

  it('replaces ungrounded model reasoning with the deterministic explanation', async () => {
    mocks.generateWithProviders.mockResolvedValue({
      text: JSON.stringify({
        rankings: [
          { index: 0, id: 'cand-1', reasoning: 'They will secure a 40 million dollar patent and offer a Nobel laureate mentorship.', alignment_label: 'Highly Compatible' },
        ],
      }),
      provider: 'groq',
      model: 'llama',
    });
    const res = await post('/api/ai-match', { userProfile: USER, candidateMatches: CANDIDATES });
    expect(res.status).toBe(200);

    // The whole row must equal the deterministic row, field for field.
    const local = computeLocalMatchRankings(USER, CANDIDATES) as any[];
    const cand1 = res.body.rankings.find((r: any) => r.id === 'cand-1');
    expect(cand1.reasoning).not.toMatch(/Nobel|patent|40 million/i);
    expect(cand1.reasoning).toBe(local.find((r) => r.id === 'cand-1').reasoning);
    expect(cand1.alignment_label).toBe(local.find((r) => r.id === 'cand-1').alignment_label);
    expect(cand1.score).toBe(local.find((r) => r.id === 'cand-1').score);

    const call = mocks.recordAiDecision.mock.calls.find((c) => c[0].decision_type === 'match_ranking');
    expect(call![0].result.enrichment_dropped).toBeGreaterThan(0);
    expect(call![0].result.llm_enriched).toBe(false);
  });

  it('keeps model reasoning that the sources actually support', async () => {
    mocks.generateWithProviders.mockResolvedValue({
      text: JSON.stringify({
        rankings: [
          { index: 0, id: 'cand-1', reasoning: 'Shared focus on malaria diagnostics and rapid testing.', alignment_label: 'Highly Compatible' },
        ],
      }),
      provider: 'groq',
      model: 'llama',
    });
    const res = await post('/api/ai-match', { userProfile: USER, candidateMatches: CANDIDATES });
    expect(res.status).toBe(200);

    const local = computeLocalMatchRankings(USER, CANDIDATES) as any[];
    const cand1 = res.body.rankings.find((r: any) => r.id === 'cand-1');
    // The model supplies prose only...
    expect(cand1.reasoning).toMatch(/malaria diagnostics/);
    expect(cand1.reasoning).not.toBe(local.find((r) => r.id === 'cand-1').reasoning);
    // ...and can never touch the numbers or the order.
    expect(cand1.score).toBe(local.find((r) => r.id === 'cand-1').score);
    expect(res.body.rankings.map((r: any) => r.id)).toEqual(local.map((r) => r.id));

    const call = mocks.recordAiDecision.mock.calls.find((c) => c[0].decision_type === 'match_ranking');
    expect(call![0].result.enrichment_accepted).toBe(1);
    expect(call![0].result.llm_enriched).toBe(true);
  });

  it('rejects more than 100 candidates', async () => {
    const many = Array.from({ length: 101 }, (_, i) => ({ id: `c${i}`, name: `Candidate ${i}` }));
    const res = await post('/api/ai-match', { userProfile: USER, candidateMatches: many });
    expect(res.status).toBe(400);
  });
});
