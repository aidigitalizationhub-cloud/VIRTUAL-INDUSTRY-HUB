-- Supabase Advisor warning remediation
-- Run with a database-owner role after taking a backup.
-- Review the application-impact notes before execution.

BEGIN;

-- 1. Keep extensions out of the exposed public schema.
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'vector' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION vector SET SCHEMA extensions;
  END IF;
END
$$;

-- 2. News ingestion is server-side. Remove public INSERT/UPDATE policies;
--    the server service role bypasses RLS and remains able to ingest news.
DROP POLICY IF EXISTS "Allow scout to insert news" ON public.news;
DROP POLICY IF EXISTS "Allow scout to update news" ON public.news;

-- 3. Public buckets do not need SELECT policies for public object URLs.
--    Removing these policies prevents clients from listing every object.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Project Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access 1u39ia4_0" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Tech Docs" ON storage.objects;
DROP POLICY IF EXISTS " Auth Access 9kdg3v_0" ON storage.objects;

-- Keep technical documents private. Public avatars/project images remain
-- publicly readable through Supabase's public object URL mechanism, but are
-- no longer listable through storage.objects.
UPDATE storage.buckets
SET public = false
WHERE id IN ('technical-docs', 'TECHNICAL-DOCS');

-- 4. These SECURITY DEFINER helpers are server-only. Remove direct RPC
-- execution by browser roles. service_role is retained for backend calls.
REVOKE EXECUTE ON FUNCTION public.can_access_project_file(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_is_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_challenge_match_scores() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_reveal_approved(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_project_file(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_challenge_match_scores() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_profile_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_reveal_approved(uuid, uuid) TO service_role;

-- IMPORTANT: match_profiles and match_projects are also called by legacy
-- browser code in this repository. Revoke their browser execution only after
-- their callers are migrated to authenticated backend endpoints. The server
-- service role can execute them already.
-- REVOKE EXECUTE ON FUNCTION public.match_profiles(vector, float, integer, uuid) FROM anon, authenticated;
-- REVOKE EXECUTE ON FUNCTION public.match_projects(vector, float, integer) FROM anon, authenticated;

COMMIT;

-- Verification queries
SELECT extname, n.nspname AS schema_name
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE extname = 'vector';

SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname = 'public' AND tablename = 'news')
   OR (schemaname = 'storage' AND tablename = 'objects');

SELECT routine_schema, routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'can_access_project_file', 'current_is_admin', 'get_user_role',
    'guard_challenge_match_scores', 'guard_profile_role', 'is_admin',
    'is_reveal_approved', 'match_profiles', 'match_projects'
  )
ORDER BY routine_name, grantee;
