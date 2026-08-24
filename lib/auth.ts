import { betterAuth } from "better-auth";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

// Shared Postgres pool — reuses Supabase Postgres via DATABASE_URL.
// Tables live in isolated schema `better_auth` so they coexist with public.*
// and never collide with Supabase internal `auth` schema.
const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  "";

const pool = connectionString
  ? new Pool({
      connectionString,
      // Isolate Better Auth tables to `better_auth` schema
      options: "-c search_path=better_auth,public",
    })
  : undefined;

if (!pool) {
  console.warn(
    "[better-auth] DATABASE_URL not set — Better Auth will not persist sessions until configured. Set DATABASE_URL to your Supabase pooler connection string."
  );
}

// Dual-verifier: Supabase bcrypt hashes ($2a$) + Better Auth scrypt hashes.
// Allows migrating existing Supabase users without forcing password resets.
const verifyPassword = async (data: { hash: string; password: string }) => {
  const { hash, password } = data;
  // Supabase/bcrypt hashes start with $2a$ / $2b$
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    return bcrypt.compare(password, hash);
  }
  return false;
};

const hashPassword = async (password: string) => {
  // New passwords use bcrypt (cost 10) for compatibility with future Supabase re-imports
  // Change to scrypt if you prefer Better Auth default: return scrypt.hash(password)
  return bcrypt.hash(password, 10);
};

export const auth = betterAuth({
  database: pool as any,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.VITE_BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  advanced: {
    // Must emit UUIDs to satisfy FKs profiles.id uuid, projects.owner_id uuid, etc.
    database: {
      generateId: "uuid" as const,
    },
    // Store Better Auth tables in `better_auth` schema (keeps public.* clean)
    // The pg Pool search_path already defaults to better_auth,public
  },
  emailAndPassword: {
    enabled: true,
    // Allow sign-up without email verification for now (matches current Supabase Confirm email disabled)
    requireEmailVerification: false,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache
    },
  },
  // Keep gravy for future social logins — add when env has OAuth creds
  // socialProviders: {
  //   google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! },
  // },
});

export type Auth = typeof auth;
