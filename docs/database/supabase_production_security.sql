-- ============================================================
-- PRODUCTION SECURITY PATCH
-- Run this only on an existing database after the IP tables exist and
-- after supabase_better_auth_migration.sql has created current_user_id().
-- Take a backup first. This script does not delete users or application data.
-- ============================================================

BEGIN;

-- 1. Complete the IP status constraint on databases created with Phase 1-3.
DO $$
BEGIN
  IF to_regclass('public.ip_disclosures') IS NOT NULL THEN
    ALTER TABLE public.ip_disclosures DROP CONSTRAINT IF EXISTS ip_disclosures_status_check;
    ALTER TABLE public.ip_disclosures ADD CONSTRAINT ip_disclosures_status_check CHECK (status IN (
      'draft', 'submitted', 'admin_review', 'ai_screening', 'tto_review',
      'tto_completed', 'accepted', 'researcher_action_required',
      'super_admin_review', 'published', 'restricted', 'confidential_hold', 'rejected'
    ));
  END IF;
END $$;

-- 2. Ensure every disclosure table is protected. The API uses the service role
-- for reviewer writes; browser clients receive only the read paths below.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ip_disclosures', 'ip_disclosure_events', 'ip_disclosure_findings',
    'ip_disclosure_links', 'ip_disclosure_decisions', 'ip_disclosure_files',
    'ip_access_requests'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;

-- 3. Remove the broad profile directory policy. Public profile projections are
-- served by the API; raw profile rows contain private CV/AI/embedding fields.
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.current_user_id() = id OR public.current_is_admin());

-- 4. Public projects require both explicit visibility and a completed disclosure.
DROP POLICY IF EXISTS "Everyone can view public projects" ON public.projects;
CREATE POLICY "Everyone can view public projects" ON public.projects
  FOR SELECT
  USING (
    visibility = 'Public'
    AND disclosure_status IN ('Approved', 'Published')
  );

-- A project owner must not be able to publish or approve a project by writing
-- those fields directly. The API/service role performs workflow transitions.
CREATE OR REPLACE FUNCTION public.guard_project_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role'
     OR public.current_is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.disclosure_status IS DISTINCT FROM OLD.disclosure_status
     AND NEW.disclosure_status IN ('Approved', 'Published') THEN
    RAISE EXCEPTION 'Only the review service can approve or publish a project';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_project_publication_trigger ON public.projects;
CREATE TRIGGER guard_project_publication_trigger
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.guard_project_publication();

-- 5. IP disclosure policies. Findings, files, events, and decisions are
-- intentionally server-write-only; this prevents forged reviewer/audit data.
DROP POLICY IF EXISTS "Researchers can view own IP disclosures" ON public.ip_disclosures;
CREATE POLICY "Researchers can view own IP disclosures" ON public.ip_disclosures
  FOR SELECT TO authenticated
  USING (researcher_id = public.current_user_id() OR public.current_is_admin());
DROP POLICY IF EXISTS "Researchers can create own IP disclosures" ON public.ip_disclosures;
CREATE POLICY "Researchers can create own IP disclosures" ON public.ip_disclosures
  FOR INSERT TO authenticated
  WITH CHECK (researcher_id = public.current_user_id());

DROP POLICY IF EXISTS "Researchers can view own IP files" ON public.ip_disclosure_files;
CREATE POLICY "Researchers can view own IP files" ON public.ip_disclosure_files
  FOR SELECT TO authenticated
  USING (
    uploaded_by = public.current_user_id()
    OR public.current_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.ip_disclosures d
      WHERE d.id = disclosure_id AND d.researcher_id = public.current_user_id()
    )
  );
DROP POLICY IF EXISTS "Researchers can view own IP events" ON public.ip_disclosure_events;
CREATE POLICY "Researchers can view own IP events" ON public.ip_disclosure_events
  FOR SELECT TO authenticated
  USING (
    actor_id = public.current_user_id()
    OR public.current_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.ip_disclosures d
      WHERE d.id = disclosure_id AND d.researcher_id = public.current_user_id()
    )
  );
DROP POLICY IF EXISTS "Researchers can view shared IP findings" ON public.ip_disclosure_findings;
CREATE POLICY "Researchers can view shared IP findings" ON public.ip_disclosure_findings
  FOR SELECT TO authenticated
  USING (
    public.current_is_admin()
    OR (visibility = 'shared_researcher' AND EXISTS (
      SELECT 1 FROM public.ip_disclosures d
      WHERE d.id = disclosure_id AND d.researcher_id = public.current_user_id()
    ))
  );
DROP POLICY IF EXISTS "Researchers can view IP links" ON public.ip_disclosure_links;
CREATE POLICY "Researchers can view IP links" ON public.ip_disclosure_links
  FOR SELECT TO authenticated
  USING (public.current_is_admin() OR EXISTS (
    SELECT 1 FROM public.ip_disclosures d
    WHERE d.id = disclosure_id AND d.researcher_id = public.current_user_id()
  ));
DROP POLICY IF EXISTS "Researchers can view IP decisions" ON public.ip_disclosure_decisions;
CREATE POLICY "Researchers can view IP decisions" ON public.ip_disclosure_decisions
  FOR SELECT TO authenticated
  USING (public.current_is_admin() OR EXISTS (
    SELECT 1 FROM public.ip_disclosures d
    WHERE d.id = disclosure_id AND d.researcher_id = public.current_user_id()
  ));

DROP POLICY IF EXISTS "Users view own access requests" ON public.ip_access_requests;
CREATE POLICY "Users view own access requests" ON public.ip_access_requests
  FOR SELECT TO authenticated
  USING (
    requester_id = public.current_user_id()
    OR public.current_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.ip_disclosures d
      WHERE d.id = disclosure_id AND d.researcher_id = public.current_user_id()
    )
  );
DROP POLICY IF EXISTS "Users create access requests" ON public.ip_access_requests;
CREATE POLICY "Users create access requests" ON public.ip_access_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = public.current_user_id());

-- 6. Private project storage. Public image delivery goes through the API,
-- which checks project approval and signs the object URL.
DROP POLICY IF EXISTS "Secured Project Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Project Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Project Update" ON storage.objects;
DROP POLICY IF EXISTS "Owner Project Delete" ON storage.objects;
CREATE POLICY "Secured Project Access" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'projects'
    AND (
      public.current_is_admin()
      OR owner::uuid = public.current_user_id()
      OR public.can_access_project_file(public.current_user_id(), name)
    )
  );
CREATE POLICY "Authenticated Project Upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'projects' AND owner::uuid = public.current_user_id());
CREATE POLICY "Owner Project Update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'projects' AND owner::uuid = public.current_user_id())
  WITH CHECK (bucket_id = 'projects' AND owner::uuid = public.current_user_id());
CREATE POLICY "Owner Project Delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'projects' AND owner::uuid = public.current_user_id());

-- Never expose storage listings or direct public objects for the private bucket.
UPDATE storage.buckets SET public = false WHERE id = 'projects';

COMMIT;

-- Run supabase_rls_verify.sql immediately after this script.
