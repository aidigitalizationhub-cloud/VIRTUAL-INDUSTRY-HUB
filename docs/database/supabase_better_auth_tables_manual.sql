-- Manual Better Auth tables — run this in Supabase SQL Editor
-- instead of `npx @better-auth/cli migrate` (which needs DATABASE_URL locally).
-- Creates Better Auth tables in isolated schema `better_auth` so they coexist
-- with your existing public.* tables and Supabase auth schema.

create schema if not exists better_auth;

-- user
create table if not exists better_auth."user" (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

-- session
create table if not exists better_auth.session (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references better_auth."user"(id) on delete cascade,
  token text not null unique,
  "expiresAt" timestamp not null,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now(),
  "ipAddress" text,
  "userAgent" text
);
create index if not exists session_userId_idx on better_auth.session("userId");
create index if not exists session_token_idx on better_auth.session(token);

-- account (for OAuth + email/password credentials)
create table if not exists better_auth.account (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references better_auth."user"(id) on delete cascade,
  "accountId" text not null,
  "providerId" text not null,
  issuer text,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  scope text,
  password text,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);
create index if not exists account_userId_idx on better_auth.account("userId");

-- verification (email OTP / password reset tokens)
create table if not exists better_auth.verification (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  "expiresAt" timestamp not null,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);
create index if not exists verification_identifier_idx on better_auth.verification(identifier);

-- Helpful comment
comment on schema better_auth is 'Better Auth tables — isolated from public and Supabase auth schema';
