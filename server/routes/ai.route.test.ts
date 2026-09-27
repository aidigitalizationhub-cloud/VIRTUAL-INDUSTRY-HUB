import type { Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Route-level tests for the two AI write paths whose guarantees matter most.
//
// The unit tests for parseProfileExtraction and parseNewsDraft prove those
// validators work. They cannot prove the routes actually call them, or that the
// routes honour what the validators return. These tests close that gap: if a
// future edit drops the parseProfileExtraction call, or resets needs_review to
// false, the suite fails here.
//
// Deliberately NOT mocked: express body parsing, validateBody, authenticateUser
// and requireRole. Those are part of what is being tested -- an unauthenticated
// or non-admin request must still be rejected -- so mocking them would hollow
// out the assertions.

const mocks = vi.hoisted(() => ({
  generateWithProviders: vi.fn(),
  generateWithFallback: vi.fn(),
  getGeminiClient: vi.fn(),
  getGroqClient: vi.fn(),
  recordAiDecision: vi.fn(),
  sessionUser: null as null | { id: string; email: string },
  profileRole: 'Researcher' as string,
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
        eq: () => ({
          maybeSingle: async () => ({
            data: mocks.sessionUser ? { id: mocks.sessionUser.id, role: mocks.profileRole } : null,
            error: null,
          }),
        }),
      }),
    }),
  }),
  getSupabaseClient: () => ({}),
  serviceClientConfigError: () => 'Supabase is not configured.',
}));

vi.mock('../services/aiGateway', () => ({
  generateWithProviders: mocks.generateWithProviders,
  generateWithFallback: mocks.generateWithFallback,
  getGeminiClient: mocks.getGeminiClient,
  getGroqClient: mocks.getGroqClient,
  recordAiDecision: mocks.recordAiDecision,
  GEMINI_FALLBACK_MODELS: ['gemini-2.5-flash'],
  AiProvenancePersistenceError: class AiProvenancePersistenceError extends Error {},
}));

// Real throttling would make these tests order-dependent and eventually fail on
// the 10-per-minute profile limit, which says nothing about correctness.
vi.mock('../middleware/rateLimit', () => ({
  throttleLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const AUTHED = { id: 'user-1', email: 'researcher@ug.edu.gh' };

let server: Server;
let baseUrl: string;

const post = async (path: string, body: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text, body: safeJson(text) };
};

const safeJson = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const asAdmin = (mimes: string[], name = 'release.txt') => ({
  fileBase64: Buffer.from(mimes.join('\n')).toString('base64'),
  fileName: name,
  mimeType: 'text/plain',
});

beforeAll(async () => {
  const { registerAiRoutes } = await import('./ai');
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  registerAiRoutes(app);
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
  mocks.sessionUser = { ...AUTHED };
  mocks.profileRole = 'Researcher';
  mocks.generateWithProviders.mockReset();
  mocks.generateWithFallback.mockReset();
  mocks.getGeminiClient.mockReset();
  mocks.recordAiDecision.mockReset();
  mocks.recordAiDecision.mockResolvedValue(undefined);
  mocks.getGeminiClient.mockReturnValue({ name: 'gemini' });
});

describe('POST /api/ai-profile', () => {
  const CV = 'Dr Ama Mensah is a malaria researcher at the Noguchi Memorial Institute.';

  it('rejects an unauthenticated request', async () => {
    mocks.sessionUser = null;
    const res = await post('/api/ai-profile', { cvText: CV });
    expect(res.status).toBe(401);
  });

  it('returns only researcher-supplied values when no provider answers', async () => {
    mocks.generateWithProviders.mockResolvedValue(null);
    const res = await post('/api/ai-profile', {
      cvText: CV,
      questionnaire: { full_name: 'Ama Mensah', research_areas: ['malaria'] },
      userType: 'researcher',
    });
    expect(res.status).toBe(200);
    expect(res.body.profile.partial).toBe(true);
    expect(res.body.profile.extraction_status).toBe('unavailable');
    expect(res.body.profile.extraction_notice).toBeTruthy();
    // The regression this guards: the old fallback invented these.
    expect(res.body.profile.education).toEqual([]);
    expect(res.body.profile.work_experience).toEqual([]);
    expect(res.body.profile.startup_and_innovation_signals).toEqual({
      startup_experience: false,
      prototype_built: false,
      patents: [],
      commercial_research: false,
      market_validation: false,
      entrepreneurial_interests: [],
    });
    expect(mocks.recordAiDecision).toHaveBeenCalledWith(
      expect.objectContaining({ decision_type: 'profile_extraction_unavailable' }),
    );
  });

  it('does not fabricate a profile when the provider throws', async () => {
    mocks.generateWithProviders.mockRejectedValue(new Error('provider exploded'));
    const res = await post('/api/ai-profile', { cvText: CV });
    expect(res.status).toBe(200);
    expect(res.body.profile.education).toEqual([]);
    expect(res.body.profile.extraction_status).toBe('unavailable');
  });

  it('persists a grounded profile and records the claim counts', async () => {
    mocks.generateWithProviders.mockResolvedValue({
      text: JSON.stringify({
        profile: {
          personal_info: { full_name: 'Ama Mensah' },
          professional_profile: { professional_title: 'malaria researcher' },
          semantic_summary: 'Ama Mensah is a malaria researcher.',
        },
      }),
      provider: 'groq',
      model: 'llama',
    });
    const res = await post('/api/ai-profile', { cvText: CV, questionnaire: { full_name: 'Ama Mensah' } });
    expect(res.status).toBe(200);
    expect(res.body.profile.professional_profile.professional_title).toBe('malaria researcher');
    const call = mocks.recordAiDecision.mock.calls.find((c) => c[0].decision_type === 'profile_extraction');
    expect(call).toBeDefined();
    expect(call![0].result.dropped_claims).toEqual([]);
  });

  it('strips invented education when the model fabricates it', async () => {
    mocks.generateWithProviders.mockResolvedValue({
      text: JSON.stringify({
        profile: {
          personal_info: { full_name: 'Ama Mensah' },
          education: [
            { institution: 'University of Oxford', degree: 'PhD', field_of_study: 'Physics', graduation_year: '2011', gpa: '4.0' },
          ],
          semantic_summary: 'Ama Mensah is a malaria researcher.',
        },
      }),
      provider: 'groq',
      model: 'llama',
    });
    const res = await post('/api/ai-profile', { cvText: CV, questionnaire: { full_name: 'Ama Mensah' } });
    expect(res.status).toBe(200);
    // Nothing in the source supports Oxford, Physics or a 4.0 GPA.
    const { education, work_experience, startup_and_innovation_signals } = res.body.profile;
    const serialised = JSON.stringify({ education, work_experience, startup_and_innovation_signals });
    expect(serialised).not.toMatch(/Oxford|Physics|4\.0|2011/);
  });

  it('refuses an output that is mostly unsupported and falls back honestly', async () => {
    mocks.generateWithProviders.mockResolvedValue({
      text: JSON.stringify({
        profile: {
          personal_info: { full_name: 'Someone Else Entirely' },
          professional_profile: { professional_title: 'rocket surgeon', years_of_experience: '25' },
          skills: { technical_skills: ['terraform', 'kubernetes', 'rust'] },
          semantic_summary: 'A decorated veteran of several fields.',
        },
      }),
      provider: 'groq',
      model: 'llama',
    });
    const res = await post('/api/ai-profile', { cvText: CV });
    expect(res.status).toBe(200);
    expect(res.body.profile.extraction_status).toBe('unavailable');
    expect(JSON.stringify(res.body.profile)).not.toMatch(/rocket surgeon|terraform|25/);
    expect(mocks.recordAiDecision).toHaveBeenCalledWith(
      expect.objectContaining({ decision_type: 'profile_extraction_ungrounded' }),
    );
  });

  it('rejects a body that violates the request schema', async () => {
    const res = await post('/api/ai-profile', { cvText: 42 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/extract-document', () => {
  const DOC_LINES = [
    'University of Ghana Announces GHS 2.5 Million Grant for Malaria Research',
    'The Noguchi Memorial Institute has secured a grant of GHS 2.5 million to develop rapid diagnostics.',
  ];

  it('rejects an unauthenticated request', async () => {
    mocks.sessionUser = null;
    const res = await post('/api/admin/extract-document', asAdmin(DOC_LINES));
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin', async () => {
    mocks.profileRole = 'Researcher';
    const res = await post('/api/admin/extract-document', asAdmin(DOC_LINES));
    expect(res.status).toBe(403);
  });

  it('returns needs_review false for a fully grounded draft', async () => {
    mocks.profileRole = 'Admin';
    mocks.generateWithFallback.mockResolvedValue({
      text: JSON.stringify({
        title: 'University of Ghana Announces GHS 2.5 Million Grant for Malaria Research',
        summary: 'The Noguchi Memorial Institute has secured a grant of GHS 2.5 million to develop rapid diagnostics.',
        category: 'Grant Opportunity',
        tags: ['malaria'],
        source_verification_notes: 'Taken from the uploaded announcement.',
      }),
    });
    const res = await post('/api/admin/extract-document', asAdmin(DOC_LINES));
    expect(res.status).toBe(200);
    expect(res.body.needs_review).toBe(false);
    expect(res.body.data.category).toBe('Grant Opportunity');
    expect(mocks.recordAiDecision).toHaveBeenCalledWith(
      expect.objectContaining({ decision_type: 'news_draft_extraction' }),
    );
  });

  it('flags review when the model invents a figure, and never returns it', async () => {
    mocks.profileRole = 'Admin';
    mocks.generateWithFallback.mockResolvedValue({
      text: JSON.stringify({
        title: 'University of Ghana Announces GHS 12 Million Grant for Malaria Research',
        summary: 'The institute has secured GHS 12 million to develop rapid diagnostics.',
        category: 'Grant Opportunity',
      }),
    });
    const res = await post('/api/admin/extract-document', asAdmin(DOC_LINES));
    expect(res.status).toBe(200);
    expect(res.body.needs_review).toBe(true);
    const serialised = JSON.stringify(res.body.data);
    expect(serialised).not.toMatch(/12 million/i);
    const call = mocks.recordAiDecision.mock.calls.find((c) => c[0].decision_type === 'news_draft_extraction');
    expect(call![0].result.dropped_fields).toBeGreaterThan(0);
  });

  it('flags review when the draft is mostly right but one field is not', async () => {
    // The case a constant needs_review: false silently loses. Title and summary
    // are grounded, so the draft is usable, but a tag and the category were
    // dropped. The admin must still be warned.
    mocks.profileRole = 'Admin';
    mocks.generateWithFallback.mockResolvedValue({
      text: JSON.stringify({
        title: 'University of Ghana Announces GHS 2.5 Million Grant for Malaria Research',
        summary: 'The Noguchi Memorial Institute has secured a grant of GHS 2.5 million to develop rapid diagnostics.',
        category: 'Sponsored Content',
        tags: ['malaria', 'cryptocurrency'],
      }),
    });
    const res = await post('/api/admin/extract-document', asAdmin(DOC_LINES));
    expect(res.status).toBe(200);
    // The grounded parts survive...
    expect(res.body.data.title).toContain('GHS 2.5 Million');
    expect(res.body.data.summary).toContain('Noguchi Memorial Institute');
    // ...the ungrounded ones do not...
    expect(res.body.data.category).toBe('');
    expect(res.body.data.tags).toEqual(['malaria']);
    // ...and the admin is still told to check it.
    expect(res.body.needs_review).toBe(true);
    const call = mocks.recordAiDecision.mock.calls.find((c) => c[0].decision_type === 'news_draft_extraction');
    expect(call![0].result.usable).toBe(true);
    expect(call![0].result.needs_review).toBe(true);
    expect(call![0].result.dropped_fields).toBe(2);
  });

  it('falls back to a raw excerpt when no grounded field survives', async () => {
    mocks.profileRole = 'Admin';
    mocks.generateWithFallback.mockResolvedValue({
      text: JSON.stringify({
        title: 'Noguchi Institute Wins International Nobel Prize for Quantum Computing',
        summary: 'The institute was awarded a global prize for a discovery in quantum computing.',
        category: 'Research Release',
      }),
    });
    const res = await post('/api/admin/extract-document', asAdmin(DOC_LINES));
    expect(res.status).toBe(200);
    expect(res.body.needs_review).toBe(true);
    // The raw excerpt comes from the uploaded document, not from the model.
    expect(res.body.data.summary).toContain('Noguchi Memorial Institute');
    expect(JSON.stringify(res.body.data)).not.toMatch(/Nobel|quantum/i);
  });

  it('falls back honestly when the model returns prose instead of JSON', async () => {
    mocks.profileRole = 'Admin';
    mocks.generateWithFallback.mockResolvedValue({ text: 'I am sorry, I cannot help with that request.' });
    const res = await post('/api/admin/extract-document', asAdmin(DOC_LINES));
    expect(res.status).toBe(200);
    expect(res.body.needs_review).toBe(true);
    expect(res.body.data.summary).toContain('Noguchi Memorial Institute');
  });

  it('falls back honestly when Gemini is not configured', async () => {
    mocks.profileRole = 'Admin';
    mocks.getGeminiClient.mockReturnValue(null);
    const res = await post('/api/admin/extract-document', asAdmin(DOC_LINES));
    expect(res.status).toBe(200);
    expect(res.body.needs_review).toBe(true);
    expect(res.body.data.summary).toContain('Noguchi Memorial Institute');
    expect(mocks.generateWithFallback).not.toHaveBeenCalled();
  });

  it('rejects an upload with no file data', async () => {
    mocks.profileRole = 'Admin';
    const res = await post('/api/admin/extract-document', { fileName: 'x.txt' });
    expect(res.status).toBe(400);
  });
});
