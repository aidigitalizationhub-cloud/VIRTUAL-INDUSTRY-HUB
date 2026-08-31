import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const setupSql = readFileSync(resolve(process.cwd(), 'docs/database/supabase_setup.sql'), 'utf8');

describe('supabase_setup.sql RLS invariants', () => {
  it('uses the is_admin() helper for privileged policies', () => {
    expect(setupSql).toMatch(/public\.is_admin\(\)/);
    expect(setupSql).toContain('CREATE POLICY');
  });

  it('declares the ai_decisions provenance ledger with RLS and an admin-read policy', () => {
    expect(setupSql).toMatch(/CREATE TABLE IF NOT EXISTS ai_decisions/);
    expect(setupSql).toMatch(/ALTER TABLE public\.ai_decisions ENABLE ROW LEVEL SECURITY/);
    expect(setupSql).toMatch(/"Admins can read ai_decisions"/);
  });

  it('enables RLS on every core table that holds user data', () => {
    for (const table of ['profiles', 'projects', 'bookmarks', 'news', 'industry_challenges', 'challenge_matches']) {
      expect(setupSql).toMatch(new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
    }
  });

  it('has a "Users can update their own profile" policy (ROW-level owner check)', () => {
    expect(setupSql).toMatch(/"Users can update their own profile"/);
  });
});
