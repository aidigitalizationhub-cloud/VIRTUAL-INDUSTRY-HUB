// Resets a credential password directly in the Better Auth tables.
// Usage: npx tsx scripts/reset-admin-password.mts <email> <new-password>
// Requires DATABASE_URL (Supabase transaction pooler URI) in .env.
// The password is never logged. Rotate it again if it passed through chat/logs.
try { process.loadEnvFile?.(".env"); } catch {}

import pg from "pg";
import * as bcrypt from "bcryptjs";

const [email, newPassword] = process.argv.slice(2);
if (!email || !newPassword) {
  console.error("Usage: npx tsx scripts/reset-admin-password.mts <email> <new-password>");
  process.exit(1);
}
if (newPassword.length < 8) {
  console.error("New password must be at least 8 characters.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
if (!connectionString || connectionString.includes("[YOUR-PASSWORD]")) {
  console.error("DATABASE_URL missing/placeholder. Set it in .env first.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  options: "-c search_path=better_auth,public",
  ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
});

try {
  const user = await pool.query(
    `SELECT id, email FROM better_auth."user" WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
  if (!user.rows.length) {
    console.error(`No Better Auth user found for ${email}.`);
    process.exit(1);
  }
  const userId = user.rows[0].id;
  const hash = await bcrypt.hash(newPassword, 10);
  const upd = await pool.query(
    `UPDATE better_auth.account SET password = $1, "updatedAt" = now()
     WHERE "userId" = $2 AND "providerId" = 'credential'`,
    [hash, userId],
  );
  if (!upd.rowCount) {
    // No credential account (e.g. OAuth/Supabase-created user): create one so
    // email+password sign-in works. This is the most common cause of a 401 on
    // /api/auth/sign-in/email for otherwise valid accounts.
    await pool.query(
      `INSERT INTO better_auth.account
         (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'credential', $1, $2, now(), now())`,
      [userId, hash],
    );
    console.log(`No credential account existed; created one for ${user.rows[0].email}.`);
  }
  await pool.query(
    `UPDATE public.better_auth_migration_status
     SET password_reset_required = false, reset_completed_at = now(), updated_at = now()
     WHERE better_auth_user_id = $1`,
    [userId],
  ).catch(() => {});
  console.log(`Password reset for ${user.rows[0].email}. Sign in at /admin/login with the new password.`);
} finally {
  await pool.end();
}
