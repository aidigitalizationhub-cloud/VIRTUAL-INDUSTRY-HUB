-- RLS Policy Verification Suite
-- Run this in the Supabase SQL editor (or `psql`/`supabase db reset`) to verify that
-- every core table has Row Level Security enabled and the expected policies exist.
-- On failure the DO block RAISEs an exception so CI / guided runs fail loudly.

DO $$
DECLARE
  missing TEXT[] := '{}';
  rls_off  TEXT[] := '{}';
  rel      TEXT;
BEGIN
  -- 1. RLS must be ENABLED on every core table.
  FOREACH rel IN ARRAY ARRAY[
    'profiles', 'projects', 'student_profiles', 'researcher_profiles',
    'investor_profiles', 'industry_profiles', 'bookmarks', 'news',
    'industry_challenges', 'challenge_matches', 'interaction_logs',
    'ai_decisions'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = rel AND c.relrowsecurity
    ) THEN
      rls_off := array_append(rls_off, rel);
    END IF;
  END LOOP;

  IF array_length(rls_off, 1) > 0 THEN
    RAISE EXCEPTION 'RLS not enabled on: %', array_to_string(rls_off, ', ');
  END IF;

  -- 2. Required policies must exist on each table.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_decisions' AND policyname='Admins can read ai_decisions') THEN
    missing := array_append(missing, 'ai_decisions:Admins can read ai_decisions');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update their own profile') THEN
    missing := array_append(missing, 'profiles:Users can update their own profile');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='Admins can manage all projects') THEN
    missing := array_append(missing, 'projects:Admins can manage all projects');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='Everyone can view public projects') THEN
    missing := array_append(missing, 'projects:Everyone can view public projects');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='industry_challenges' AND policyname='Anyone can view open industry challenges') THEN
    missing := array_append(missing, 'industry_challenges:Anyone can view open industry challenges');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge_matches' AND policyname='Involved users or admins can view challenge matches') THEN
    missing := array_append(missing, 'challenge_matches:Involved users or admins can view challenge matches');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='news' AND policyname='Anyone can view published news') THEN
    missing := array_append(missing, 'news:Anyone can view published news');
  END IF;

  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'Missing required policies: %', array_to_string(missing, ', ');
  END IF;

  RAISE NOTICE 'RLS verification passed: RLS enabled and required policies present on all core tables.';
END $$;

-- 3. Security-adjacent invariant: ai_decisions must have NO INSERT/UPDATE policy,
--    so only the service-role client (which bypasses RLS) can append to the ledger.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ai_decisions'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'ai_decisions must be append-only via the service role; found user-facing write policies.';
  END IF;
  RAISE NOTICE 'ai_decisions append-only invariant verified.';
END $$;