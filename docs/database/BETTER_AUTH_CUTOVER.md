# Better Auth Cutover

This project uses Better Auth as its only application authentication provider.
Supabase remains the database and storage provider.

## Forced Reset Procedure

1. Back up the Supabase database.
2. Run `supabase_better_auth_tables_manual.sql` in the Supabase SQL editor, or
   use the equivalent Better Auth CLI migration. Do not run both.
3. Configure `DATABASE_URL` with the Supabase transaction pooler URI.
4. Configure `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, Google OAuth variables,
   and the Gmail SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
   `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`) in the deployment environment.
5. Run `supabase_better_auth_forced_reset.sql`. It imports existing users with
   their UUIDs but intentionally does not copy Supabase password hashes.
6. Send each existing user through Better Auth password recovery.
7. Verify Better Auth login, reset, logout, and Google OAuth before disabling
   Supabase Auth access.
8. Run the hardened Better Auth RLS migration only after the server-side
   authorization path is deployed and tested.
9. Run `supabase_security_hardening.sql` after the cutover migration. Review
   legacy values before validating its `NOT VALID` constraints.

For Gmail, `SMTP_USER` is the Gmail address and `SMTP_PASSWORD` is a Google App
Password, not the normal account password. `SMTP_FROM` should normally match
`SMTP_USER`. Port 465 uses implicit TLS; port 587 requires
`SMTP_SECURE=false` and STARTTLS.

The application must not use `supabase.auth.*`. Supabase Auth users and tables
may remain temporarily for rollback, but they are not an application login
source after the cutover.
