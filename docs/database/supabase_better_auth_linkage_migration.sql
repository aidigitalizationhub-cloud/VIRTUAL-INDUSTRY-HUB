-- Remap application ownership from Supabase Auth IDs to Better Auth IDs.
-- Review the collision query first. Run once after the forced-reset mapping.
-- This changes ownership IDs only; project IDs and storage paths are preserved.

-- Use a persistent read-only view so SQL editor statement/session boundaries
-- cannot remove the mapping during this migration.
DROP VIEW IF EXISTS public.better_auth_user_id_map;
CREATE VIEW public.better_auth_user_id_map AS
SELECT user_id AS legacy_id, better_auth_user_id AS better_id
FROM public.better_auth_migration_status
WHERE user_id IS NOT NULL
  AND better_auth_user_id IS NOT NULL
  AND user_id IS DISTINCT FROM better_auth_user_id;

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.better_auth_user_id_map
    GROUP BY better_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration aborted: multiple legacy users map to one Better Auth user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.better_auth_user_id_map m
    JOIN public.profiles legacy ON legacy.id = m.legacy_id
    JOIN public.profiles better ON better.id = m.better_id
  ) THEN
    RAISE EXCEPTION 'Migration aborted: both legacy and Better Auth profiles exist; merge profiles first';
  END IF;
END $$;

-- Drop legacy foreign keys before changing referenced identity values.
ALTER TABLE public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_user_id_fkey;
ALTER TABLE public.researcher_profiles DROP CONSTRAINT IF EXISTS researcher_profiles_user_id_fkey;
ALTER TABLE public.investor_profiles DROP CONSTRAINT IF EXISTS investor_profiles_user_id_fkey;
ALTER TABLE public.industry_profiles DROP CONSTRAINT IF EXISTS industry_profiles_user_id_fkey;
ALTER TABLE public.eois DROP CONSTRAINT IF EXISTS eois_sender_id_fkey;
ALTER TABLE public.eois DROP CONSTRAINT IF EXISTS eois_recipient_id_fkey;
ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;
ALTER TABLE public.industry_challenges DROP CONSTRAINT IF EXISTS industry_challenges_partner_id_fkey;
ALTER TABLE public.challenge_matches DROP CONSTRAINT IF EXISTS challenge_matches_candidate_user_id_fkey;
ALTER TABLE public.challenge_matches DROP CONSTRAINT IF EXISTS challenge_matches_partner_user_id_fkey;
ALTER TABLE public.interaction_logs DROP CONSTRAINT IF EXISTS interaction_logs_user_id_fkey;
ALTER TABLE public.account_deletions DROP CONSTRAINT IF EXISTS account_deletions_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey1;

-- This trigger protects normal application writes, but the identity remap must
-- update challenge participant IDs as part of the migration.
ALTER TABLE public.challenge_matches DISABLE TRIGGER challenge_matches_score_guard;

UPDATE public.student_profiles t SET user_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.user_id = m.legacy_id;
UPDATE public.researcher_profiles t SET user_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.user_id = m.legacy_id;
UPDATE public.investor_profiles t SET user_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.user_id = m.legacy_id;
UPDATE public.industry_profiles t SET user_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.user_id = m.legacy_id;

UPDATE public.eois t SET sender_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.sender_id = m.legacy_id;
UPDATE public.eois t SET recipient_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.recipient_id = m.legacy_id;
UPDATE public.bookmarks t SET user_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.user_id = m.legacy_id;
UPDATE public.industry_challenges t SET partner_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.partner_id = m.legacy_id;
UPDATE public.challenge_matches t SET candidate_user_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.candidate_user_id = m.legacy_id;
UPDATE public.challenge_matches t SET partner_user_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.partner_user_id = m.legacy_id;
UPDATE public.interaction_logs t SET user_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.user_id = m.legacy_id;
UPDATE public.account_deletions t SET user_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.user_id = m.legacy_id;
UPDATE public.ai_decisions t SET reviewed_by = m.better_id
FROM public.better_auth_user_id_map m WHERE t.reviewed_by = m.legacy_id;
UPDATE public.projects t SET reviewer_assignment = m.better_id
FROM public.better_auth_user_id_map m WHERE t.reviewer_assignment = m.legacy_id;
UPDATE public.projects t SET owner_id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.owner_id = m.legacy_id;

UPDATE public.profiles t SET id = m.better_id
FROM public.better_auth_user_id_map m WHERE t.id = m.legacy_id;

-- Storage object ownership is separate from the file path. Keep the path.
UPDATE storage.objects t SET owner = m.better_id
FROM public.better_auth_user_id_map m WHERE t.owner = m.legacy_id;

ALTER TABLE public.challenge_matches ENABLE TRIGGER challenge_matches_score_guard;

-- Recreate the core Better Auth ownership constraints for future writes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_better_auth_fk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_better_auth_fk
      FOREIGN KEY (id) REFERENCES better_auth."user"(id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.projects'::regclass
      AND conname = 'projects_better_auth_owner_fk'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_better_auth_owner_fk
      FOREIGN KEY (owner_id) REFERENCES better_auth."user"(id)
      ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

COMMIT;

-- Verify remaining unresolved project owners and storage owners.
SELECT 'projects.owner_id' AS relation, count(*) AS orphan_count
FROM public.projects p
LEFT JOIN better_auth."user" u ON u.id = p.owner_id
WHERE p.owner_id IS NOT NULL AND u.id IS NULL
UNION ALL
SELECT 'storage.objects.owner', count(*)
FROM storage.objects o
LEFT JOIN better_auth."user" u ON u.id::text = o.owner::text
WHERE o.owner IS NOT NULL AND u.id IS NULL;

DROP VIEW IF EXISTS public.better_auth_user_id_map;
