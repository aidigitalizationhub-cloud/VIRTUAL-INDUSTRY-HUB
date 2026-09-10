-- Better Auth forced-password-reset migration
--
-- Run after supabase_better_auth_tables_manual.sql (or the equivalent Better
-- Auth CLI migration) and before switching the application to Better Auth.
-- Existing Supabase password hashes are deliberately NOT copied.
-- Existing Supabase UUIDs remain the legacy profile identity. If a Better Auth
-- user already exists for an email, that Better Auth UUID is preserved instead
-- of causing a duplicate-email failure.

CREATE SCHEMA IF NOT EXISTS better_auth;

ALTER TABLE IF EXISTS better_auth.account
  ADD COLUMN IF NOT EXISTS issuer text;

-- Record the relationship between the old Supabase identity and the Better
-- Auth identity. This also makes the script safe to re-run.
CREATE TABLE IF NOT EXISTS public.better_auth_migration_status (
  user_id uuid PRIMARY KEY,
  better_auth_user_id uuid,
  email text NOT NULL UNIQUE,
  password_reset_required boolean NOT NULL DEFAULT true,
  reset_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.better_auth_migration_status
  ADD COLUMN IF NOT EXISTS better_auth_user_id uuid;

-- Import users that do not conflict by either UUID or email. Existing Better
-- Auth rows are intentionally left untouched and resolved below by email.
INSERT INTO better_auth."user" (
  id, name, email, "emailVerified", image, "createdAt", "updatedAt"
)
SELECT
  u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1)
  ),
  lower(trim(u.email)),
  u.email_confirmed_at IS NOT NULL,
  NULLIF(u.raw_user_meta_data->>'avatar_url', ''),
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM better_auth."user" bu WHERE bu.id = u.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM better_auth."user" bu
    WHERE lower(trim(bu.email)) = lower(trim(u.email))
  );

-- Save the actual Better Auth UUID. For duplicate-email cases this points to
-- the existing Better Auth row rather than the old Supabase UUID.
INSERT INTO public.better_auth_migration_status (
  user_id, better_auth_user_id, email
)
SELECT
  au.id,
  bu.id,
  lower(trim(au.email))
FROM auth.users au
JOIN better_auth."user" bu
  ON lower(trim(bu.email)) = lower(trim(au.email))
WHERE au.email IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  better_auth_user_id = EXCLUDED.better_auth_user_id,
  email = EXCLUDED.email,
  updated_at = now();

-- Add a Better Auth credential account where one is missing. NULL password is
-- intentional: users must establish a new password using reset email.
INSERT INTO better_auth.account (
  id, "userId", "accountId", "providerId", issuer, password, "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  s.better_auth_user_id,
  s.better_auth_user_id::text,
  'credential',
  'local:credential',
  NULL,
  now(),
  now()
FROM public.better_auth_migration_status s
WHERE s.better_auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM better_auth.account ba
    WHERE ba."userId" = s.better_auth_user_id
      AND ba."providerId" = 'credential'
  );

-- Force reset for credential accounts already created during testing or a
-- partial migration. OAuth account credentials are not modified.
UPDATE better_auth.account ba
SET password = NULL,
    "accountId" = ba."userId"::text,
    "providerId" = 'credential',
    issuer = 'local:credential',
    "updatedAt" = now()
FROM public.better_auth_migration_status s
WHERE ba."userId" = s.better_auth_user_id
  AND ba."providerId" = 'credential';

-- Invalidate sessions so imported users cannot continue using an old test
-- session without completing the password-reset flow.
DELETE FROM better_auth.session bs
USING public.better_auth_migration_status s
WHERE bs."userId" = s.better_auth_user_id;

ALTER TABLE public.better_auth_migration_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.better_auth_migration_status FROM anon, authenticated;

COMMENT ON TABLE public.better_auth_migration_status IS
  'Supabase Auth to Better Auth forced-reset mapping; passwords are never copied.';

DO $$
DECLARE
  imported_count integer;
  conflict_count integer;
BEGIN
  SELECT count(*) INTO imported_count
  FROM public.better_auth_migration_status;

  SELECT count(*) INTO conflict_count
  FROM public.better_auth_migration_status
  WHERE user_id <> better_auth_user_id;

  RAISE NOTICE 'Better Auth forced reset prepared for % users; % existing email identities reused.',
    imported_count, conflict_count;
END $$;
