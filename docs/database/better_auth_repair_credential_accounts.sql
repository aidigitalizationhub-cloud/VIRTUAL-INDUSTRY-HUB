-- Repair Better Auth credential accounts created by an earlier migration.
-- Run this after the Better Auth tables exist and before requesting a new
-- password-reset link. It is safe to re-run and does not delete users.

ALTER TABLE IF EXISTS better_auth.account
  ADD COLUMN IF NOT EXISTS issuer text;

-- Better Auth 1.7.x matches email/password credentials by all of these fields.
UPDATE better_auth.account ba
SET
  "accountId" = ba."userId"::text,
  "providerId" = 'credential',
  issuer = 'local:credential',
  password = NULL,
  "updatedAt" = now()
WHERE EXISTS (
  SELECT 1
  FROM public.better_auth_migration_status s
  WHERE s.better_auth_user_id = ba."userId"
);

-- Ensure every migrated Better Auth user has a credential account.
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
      AND ba.issuer = 'local:credential'
      AND ba."accountId" = s.better_auth_user_id::text
  );

-- Force a fresh reset after repairing the account identity.
UPDATE public.better_auth_migration_status
SET password_reset_required = true,
    reset_completed_at = NULL,
    updated_at = now()
WHERE better_auth_user_id IS NOT NULL;

DELETE FROM better_auth.session bs
USING public.better_auth_migration_status s
WHERE bs."userId" = s.better_auth_user_id;

DO $$
BEGIN
  RAISE NOTICE 'Better Auth credential accounts repaired. Request a new reset link before testing login.';
END $$;
