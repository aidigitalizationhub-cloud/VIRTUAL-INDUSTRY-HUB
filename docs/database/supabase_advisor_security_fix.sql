-- Supabase Advisor security fixes
-- Run in the Supabase SQL Editor with a database-owner/admin role.
-- Safe to run more than once.

BEGIN;

-- The Better Auth identity map is server-only migration data. Do not expose it
-- through PostgREST to anonymous or authenticated browser users.
DO $$
BEGIN
  IF to_regclass('public._better_auth_user_id_map') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public._better_auth_user_id_map ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public._better_auth_user_id_map FROM anon, authenticated';
  END IF;
END
$$;

-- Views must evaluate permissions and RLS as the querying user.
DO $$
DECLARE
  view_name text;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'project_analytics',
    'projects_with_owners',
    'public_directory'
  ] LOOP
    IF to_regclass('public.' || view_name) IS NOT NULL THEN
      EXECUTE format(
        'ALTER VIEW public.%I SET (security_invoker = true)',
        view_name
      );
    END IF;
  END LOOP;
END
$$;

-- Keep the directory projection explicitly limited to non-sensitive fields.
-- This does not expose email, AI profile data, embeddings, or internal notes.
CREATE OR REPLACE VIEW public.public_directory
  WITH (security_invoker = true)
AS
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

REVOKE ALL ON public.public_directory FROM anon;
GRANT SELECT ON public.public_directory TO authenticated;

COMMENT ON VIEW public.public_directory IS
  'Safe directory projection. Uses invoker permissions and excludes private profile data.';

COMMIT;

-- Verification 1: all target views should use security_invoker=true.
SELECT
  n.nspname AS schema_name,
  c.relname AS view_name,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND c.relname IN ('project_analytics', 'projects_with_owners', 'public_directory');

-- Verification 2: the mapping table should have RLS enabled.
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = '_better_auth_user_id_map';

-- Verification 3: browser roles should have no privileges on the mapping table.
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = '_better_auth_user_id_map'
  AND grantee IN ('anon', 'authenticated');
