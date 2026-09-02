import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const setupSql = readFileSync(resolve(process.cwd(), 'docs/database/supabase_setup.sql'), 'utf8');
const betterAuthSql = readFileSync(resolve(process.cwd(), 'docs/database/supabase_better_auth_migration.sql'), 'utf8');
const hardeningSql = readFileSync(resolve(process.cwd(), 'docs/database/supabase_security_hardening.sql'), 'utf8');

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

describe('Better Auth hardening invariants', () => {
  it('uses Better Auth claims instead of Supabase auth.uid for migrated policies', () => {
    expect(betterAuthSql).toContain('current_user_id()');
    expect(betterAuthSql).toContain('current_is_admin()');
    expect(betterAuthSql).not.toMatch(/CREATE POLICY[\s\S]{0,500}auth\.uid\(\)/);
  });

  it('keeps challenge match participant updates separate from insert/delete privileges', () => {
    expect(hardeningSql).toContain('FOR UPDATE TO authenticated');
    expect(hardeningSql).not.toContain('FOR ALL TO authenticated');
    expect(hardeningSql).toContain('REVOKE ALL ON FUNCTION public.match_profiles');
    expect(hardeningSql).toContain('NOT VALID');
  });

  it('adds indexes for ownership and private-thread authorization paths', () => {
    expect(hardeningSql).toContain('projects_owner_id_idx');
    expect(hardeningSql).toContain('eois_sender_project_status_idx');
    expect(hardeningSql).toContain('eois_recipient_project_status_idx');
  });
});
