try {
  // Node 20+ native .env loader — safe no-op if already loaded
  // @ts-ignore
  process.loadEnvFile?.(".env");
} catch {}

import { betterAuth } from "better-auth";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

// Reuse Supabase pooler string — must be transaction pooler 6543?pgbouncer=true
// Fallback to SUPABASE_DATABASE_URL for backwards compat
const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  "";

const isPlaceholderUrl =
  !connectionString ||
  connectionString.includes("[YOUR-PASSWORD]") ||
  connectionString.includes("password@localhost") ||
  connectionString.trim() === "";

// Supabase retired the direct db.*.supabase.co host — it no longer DNS-resolves.
// Detect it early with an actionable message instead of a cryptic ENOTFOUND at sign-in time.
const usesDeadDirectHost = /@db\.[a-z0-9]+\.supabase\.co/i.test(connectionString);

if (usesDeadDirectHost) {
  console.error(
    "[better-auth] DATABASE_URL uses the retired direct host 'db.<ref>.supabase.co' (ENOTFOUND). " +
    "Replace it with the Transaction Pooler URI: Supabase Dashboard → Project Settings → Database → " +
    "Connection string → URI → Transaction pooler → " +
    "postgresql://postgres.<ref>:[PASSWORD]@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
  );
}

if (isPlaceholderUrl) {
  console.warn(
    "[better-auth] DATABASE_URL is placeholder or not set — Better Auth will run in no-DB mode. Set DATABASE_URL to your Supabase pooler URI before running migrate."
  );
}

// Isolate Better Auth tables to `better_auth` schema so they coexist with public.*
let pool: Pool | undefined;
if (!isPlaceholderUrl) {
  try {
    new URL(connectionString);
    pool = new Pool({
      connectionString,
      options: "-c search_path=better_auth,public",
      ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    });
  } catch (e: any) {
    console.warn("[better-auth] Invalid DATABASE_URL, skipping Pool creation:", e.message);
    pool = undefined;
  }
} else {
  // Dummy pool so betterAuth can initialize and server can start without real DB
  // Real migrate must use manual SQL file docs/database/supabase_better_auth_tables_manual.sql
  pool = new Pool({
    connectionString: "postgresql://postgres:password@localhost:5432/better_auth_dummy",
  });
  // Prevent actual connection attempts from crashing dev — pool will ECONNREFUSED only on query, not on init
}

// Dual-verifier: Supabase bcrypt ($2a$/$2b$) + Better Auth scrypt
const verifyPassword = async (data: { hash: string; password: string }) => {
  const { hash, password } = data;
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    return bcrypt.compare(password, hash);
  }
  // For scrypt hashes, let Better Auth handle it internally — return false here
  // and Better Auth will try its native verifier
  return false;
};

const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 10);
};

const betterAuthBaseURL =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const betterAuthTrustedOrigins = Array.from(new Set([
  betterAuthBaseURL,
  ...(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]));

export const auth = betterAuth({
  database: pool as any,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: betterAuthBaseURL,
  trustedOrigins: betterAuthTrustedOrigins,
  advanced: {
    database: {
      // Must emit UUIDs to satisfy FKs profiles.id uuid, projects.owner_id uuid
      generateId: "uuid" as const,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user: any) => {
          // Ensure public.profiles exists for OAuth users (Google etc.)
          // Use service-role bypass via direct pg query would be ideal,
          // but for now rely on Supabase anon + RLS fallback via email link.
          // The actual profile row is created lazily on first App load or
          // via Supabase dual-write in AuthModal. This hook is kept for
          // future direct pg upsert when DATABASE_URL is live.
          try {
            // No-op: profile creation is handled by client StorageService.updateProfile
          } catch {}
        },
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      allowDifferentEmails: false,
      updateUserInfoOnLink: false,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      scope: ["openid", "email", "profile"],
      prompt: "select_account" as const,
    },
  },
});
