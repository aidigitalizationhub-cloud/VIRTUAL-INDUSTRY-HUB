-- ============================================================
-- SECURITY PATCH - Data exposure & GDPR hardening
-- Run once in the Supabase SQL Editor AFTER supabase_setup.sql.
-- Idempotent: safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- A1. Public directory view
-- App-level directory searches (user picker, collaborator discovery)
-- must only ever see professional, non-PII columns. The view omits
-- email and the CV-derived ai_profile entirely.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_directory AS
SELECT
  id,
  name,
  role,
  avatar_url,
  company,
  department,
  needs_students,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_directory TO authenticated;

COMMENT ON VIEW public.public_directory IS
  'Safe directory listing of profiles. Never expose email or ai_profile here.';

-- ------------------------------------------------------------
-- A2. interaction_logs - RLS was enabled but had zero policies,
-- so every client write silently failed. Allow users to log
-- their own interactions and read them back; admins see all.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can log own interactions" ON public.interaction_logs;
CREATE POLICY "Users can log own interactions" ON public.interaction_logs
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can read own interactions" ON public.interaction_logs;
CREATE POLICY "Users can read own interactions" ON public.interaction_logs
FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR public.is_admin()
);

-- ------------------------------------------------------------
-- A3. account_deletions - offboarding records. Users may file a
-- deletion record for themselves; admins can audit all.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  details TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can file own deletion record" ON public.account_deletions;
CREATE POLICY "Users can file own deletion record" ON public.account_deletions
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admins can audit deletion records" ON public.account_deletions;
CREATE POLICY "Admins can audit deletion records" ON public.account_deletions
FOR SELECT TO authenticated USING (
  public.is_admin()
);

-- ------------------------------------------------------------
-- A4. GDPR right-to-erasure: users may delete their OWN profile.
-- (Previously only admins could delete, blocking self-service
-- account removal.)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE TO authenticated USING (
  auth.uid() = id
);

-- ------------------------------------------------------------
-- B. OPTIONAL STRICT MODE (review before enabling!)
-- ------------------------------------------------------------
-- The two statements below close the remaining raw-table exposure:
-- authenticated users currently can SELECT every profiles row
-- (including email + ai_profile) and every public projects row
-- (including internal_notes) directly via the REST API.
--
-- Enable ONLY after verifying these flows still work for your
-- product, because they will start failing otherwise:
--   * Public researcher portfolio pages (reads ai_profile of others)
--   * Partner "Challenge Talent Finder" (embedded profiles join)
-- Recommended approach instead: serve those flows through
-- SECURITY DEFINER functions or the server (service-role) layer.
--
-- CREATE OR REPLACE FUNCTION public.can_read_profile(p_id UUID)
-- RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
--   SELECT auth.uid() = p_id OR public.is_admin();
-- $$;
--
-- DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
-- CREATE POLICY "Authenticated users can view profiles" ON public.profiles
-- FOR SELECT TO authenticated USING (public.can_read_profile(id));
