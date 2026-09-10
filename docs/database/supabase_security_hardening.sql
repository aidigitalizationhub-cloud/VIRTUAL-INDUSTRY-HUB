-- ============================================================
-- SECURITY HARDENING - Better Auth / Supabase follow-up
-- Run after supabase_better_auth_migration.sql.
-- Idempotent. No existing rows are rewritten.
-- ============================================================

-- Keep the Better Auth identity relation authoritative where the tables exist.
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND to_regclass('better_auth.user') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'profiles_better_auth_fk'
         AND conrelid = 'public.profiles'::regclass
     ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_better_auth_fk
      FOREIGN KEY (id) REFERENCES better_auth."user"(id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF to_regclass('public.projects') IS NOT NULL
     AND to_regclass('better_auth.user') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'projects_better_auth_owner_fk'
         AND conrelid = 'public.projects'::regclass
     ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_better_auth_owner_fk
      FOREIGN KEY (owner_id) REFERENCES better_auth."user"(id)
      ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

-- New writes must use known workflow values. Legacy values remain readable until
-- the constraints are explicitly validated after data cleanup.
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_visibility_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_visibility_check
  CHECK (visibility IS NULL OR visibility IN ('Public', 'Internal')) NOT VALID;

-- Do not add CHECK constraints to disclosure/status here: deployments may use
-- enum types with different labels. Those values are validated by the API
-- schemas and existing workflow policies without risking enum cast failures.

ALTER TABLE public.challenge_matches
  DROP CONSTRAINT IF EXISTS challenge_matches_score_range_check;
ALTER TABLE public.challenge_matches
  ADD CONSTRAINT challenge_matches_score_range_check
  CHECK (
    total_score BETWEEN 0 AND 100
    AND (domain_score IS NULL OR domain_score BETWEEN 0 AND 100)
    AND (skill_score IS NULL OR skill_score BETWEEN 0 AND 100)
    AND (experience_score IS NULL OR experience_score BETWEEN 0 AND 100)
    AND (interest_score IS NULL OR interest_score BETWEEN 0 AND 100)
    AND (role_suitability_score IS NULL OR role_suitability_score BETWEEN 0 AND 100)
    AND (location_score IS NULL OR location_score BETWEEN 0 AND 100)
    AND (availability_score IS NULL OR availability_score BETWEEN 0 AND 100)
    AND (verification_score IS NULL OR verification_score BETWEEN 0 AND 100)
  ) NOT VALID;

-- Index the ownership and authorization paths used by the API and RLS helpers.
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON public.projects (owner_id);
CREATE INDEX IF NOT EXISTS projects_visibility_status_idx ON public.projects (visibility, disclosure_status);
CREATE INDEX IF NOT EXISTS eois_sender_project_status_idx ON public.eois (sender_id, project_id, status);
CREATE INDEX IF NOT EXISTS eois_recipient_project_status_idx ON public.eois (recipient_id, project_id, status);
CREATE INDEX IF NOT EXISTS interaction_logs_user_created_idx ON public.interaction_logs (user_id, created_at DESC);

-- Participants may update a match's workflow fields, but cannot insert, delete,
-- or change generated score/identity fields. Platform/admin writes use service role.
DROP POLICY IF EXISTS "Involved users or admins can update challenge matches" ON public.challenge_matches;
CREATE POLICY "Involved users or admins can update challenge matches" ON public.challenge_matches
FOR UPDATE TO authenticated
USING (
  public.current_user_id() = candidate_user_id
  OR public.current_user_id() = partner_user_id
  OR public.current_is_admin()
)
WITH CHECK (
  public.current_user_id() = candidate_user_id
  OR public.current_user_id() = partner_user_id
  OR public.current_is_admin()
);

-- Prevent anonymous execution of security-sensitive matching RPCs.
REVOKE ALL ON FUNCTION public.match_profiles(vector, float, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_projects(vector, float, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_profiles(vector, float, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_projects(vector, float, integer) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'Security hardening installed. Validate NOT VALID constraints after legacy cleanup.';
END $$;
