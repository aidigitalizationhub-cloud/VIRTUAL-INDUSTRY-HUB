-- ============================================================
-- MIGRATION: Supabase Auth → Better Auth (full cutover)
-- Run AFTER supabase_setup.sql + supabase_security_patch.sql
-- and AFTER npx @better-auth/cli migrate has created
-- better_auth.* tables in the same Postgres (DATABASE_URL).
--
-- What it does:
--  1. Creates helpers current_user_id() / current_is_admin() reading
--     Better Auth session injected via SET LOCAL request.jwt.claims
--     (server.ts sets: {"sub": better_auth_user_id, "role":"authenticated"} )
--  2. Drops FKs profiles.id→auth.users / projects.owner_id→auth.users
--  3. Rewrites every RLS policy that used auth.uid() / is_admin()
--  4. Rewrites storage.objects policies + match_* functions
-- Idempotent: safe to re-run. Keep Supabase Postgres as DB,
-- only the auth issuer changes.
-- ============================================================

-- 0. Ensure better_auth schema exists (Better Auth migrate creates it, but safe here)
CREATE SCHEMA IF NOT EXISTS better_auth;

-- 1. Helpers reading Better Auth session (injected per-request by server.ts)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid
$$;

CREATE OR REPLACE FUNCTION public.current_is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_user_role(public.current_user_id()) = 'Admin';
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.current_user_id() IS 'Returns Better Auth user.id (uuid) from request.jwt.claims.sub set by server.ts authenticateUser';
COMMENT ON FUNCTION public.current_is_admin() IS 'Role check via Better Auth user id, not auth.uid()';

-- 2. Drop FKs to auth.users (Supabase Auth) — Better Auth user.id lives in better_auth.user
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='profiles_id_fkey' AND table_name='profiles') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
  -- projects.owner_id FK name varies by Supabase version; try both
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='projects' AND constraint_type='FOREIGN KEY') THEN
    -- generic drop if name is projects_owner_id_fkey or projects_owner_id_fkey1
    BEGIN
      ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;
      ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- Optionally re-point profiles.id FK to better_auth.user(id) for referential integrity
-- Keep as NOT VALID initially so existing rows are not validated immediately:
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_better_auth_fk
--   FOREIGN KEY (id) REFERENCES better_auth.user(id) ON DELETE CASCADE NOT VALID;

-- 3. RPCs: match_profiles / match_projects must read current_user_id() not auth.uid()
CREATE OR REPLACE FUNCTION match_profiles (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 20,
  excluded_id uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, name text, role text, ai_profile jsonb, semantic_summary text, similarity float)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.current_user_id() IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id, p.name, p.role, p.ai_profile, p.semantic_summary,
         (1 - (p.embedding <=> query_embedding))::float AS similarity
  FROM public.profiles p
  WHERE p.embedding IS NOT NULL
    AND (excluded_id IS NULL OR p.id != excluded_id)
    AND (1 - (p.embedding <=> query_embedding)) >= match_threshold
  ORDER BY p.embedding <=> query_embedding LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_projects (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 20
)
RETURNS TABLE (id uuid, title text, description text, image_url text, research_area text, similarity float)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.title, p.description, p.image_url, p.research_area::text,
         (1 - (p.embedding <=> query_embedding))::float AS similarity
  FROM public.projects p
  WHERE p.embedding IS NOT NULL
    AND (1 - (p.embedding <=> query_embedding)) >= match_threshold
    AND (
      p.owner_id = public.current_user_id()
      OR public.current_is_admin()
      OR ((p.disclosure_status='Approved' OR p.disclosure_status='Published')
          AND (p.visibility='Public' OR (public.current_user_id() IS NOT NULL AND p.visibility='Internal')))
    )
  ORDER BY p.embedding <=> query_embedding LIMIT match_count;
END;
$$;

-- 4. Triggers: guard_profile_role / guard_challenge_match_scores — service bypass via GUC role
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claims', true) IS NULL
     OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.current_user_id() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' AND NEW.role='Admin' AND NOT public.current_is_admin() THEN
    RAISE EXCEPTION 'Permission denied: the Admin role cannot be self-assigned';
  END IF;
  IF TG_OP='UPDATE' AND NEW.role IS DISTINCT FROM OLD.role AND NOT public.current_is_admin() THEN
    RAISE EXCEPTION 'Permission denied: role changes require an administrator';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_challenge_match_scores()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN RETURN NEW; END IF;
  IF public.current_is_admin() THEN RETURN NEW; END IF;
  IF (NEW.total_score IS DISTINCT FROM OLD.total_score) OR (NEW.candidate_user_id IS DISTINCT FROM OLD.candidate_user_id) THEN
    RAISE EXCEPTION 'challenge match scores and identity fields are immutable for non-admins';
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Rewrite every RLS policy that used auth.uid() / is_admin()

-- profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.current_user_id() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (public.current_user_id() = id) WITH CHECK (public.current_user_id() = id);
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE TO authenticated USING (public.current_user_id() = id);
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.current_is_admin()) WITH CHECK (public.current_is_admin());

-- projects
DROP POLICY IF EXISTS "Researchers can manage their own projects" ON public.projects;
CREATE POLICY "Researchers can manage their own projects" ON public.projects FOR ALL TO authenticated USING (public.current_user_id() = owner_id) WITH CHECK (public.current_user_id() = owner_id);
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.projects;
CREATE POLICY "Admins can manage all projects" ON public.projects FOR ALL TO authenticated USING (public.current_is_admin()) WITH CHECK (public.current_is_admin());

-- role-specific
DROP POLICY IF EXISTS "Users manage own student profile" ON public.student_profiles;
CREATE POLICY "Users manage own student profile" ON public.student_profiles FOR ALL TO authenticated USING (public.current_user_id() = user_id) WITH CHECK (public.current_user_id() = user_id);
DROP POLICY IF EXISTS "Users manage own researcher profile" ON public.researcher_profiles;
CREATE POLICY "Users manage own researcher profile" ON public.researcher_profiles FOR ALL TO authenticated USING (public.current_user_id() = user_id) WITH CHECK (public.current_user_id() = user_id);
DROP POLICY IF EXISTS "Users manage own investor profile" ON public.investor_profiles;
CREATE POLICY "Users manage own investor profile" ON public.investor_profiles FOR ALL TO authenticated USING (public.current_user_id() = user_id) WITH CHECK (public.current_user_id() = user_id);
DROP POLICY IF EXISTS "Users manage own industry profile" ON public.industry_profiles;
CREATE POLICY "Users manage own industry profile" ON public.industry_profiles FOR ALL TO authenticated USING (public.current_user_id() = user_id) WITH CHECK (public.current_user_id() = user_id);

-- eois
DROP POLICY IF EXISTS "Participants can view eois" ON public.eois;
CREATE POLICY "Participants can view eois" ON public.eois FOR SELECT TO authenticated USING (public.current_user_id() = sender_id OR public.current_user_id() = recipient_id OR public.current_is_admin());
DROP POLICY IF EXISTS "Users can send eois" ON public.eois;
CREATE POLICY "Users can send eois" ON public.eois FOR INSERT TO authenticated WITH CHECK (public.current_user_id() = sender_id);
DROP POLICY IF EXISTS "Recipients can manage received eois" ON public.eois;
CREATE POLICY "Recipients can manage received eois" ON public.eois FOR UPDATE TO authenticated USING (public.current_user_id() = recipient_id OR public.current_is_admin()) WITH CHECK (public.current_user_id() = recipient_id OR public.current_is_admin());
DROP POLICY IF EXISTS "Admins can delete eois" ON public.eois;
CREATE POLICY "Admins can delete eois" ON public.eois FOR DELETE TO authenticated USING (public.current_is_admin());

-- bookmarks
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks FOR SELECT TO authenticated USING (public.current_user_id() = user_id);
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert their own bookmarks" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (public.current_user_id() = user_id);
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks FOR DELETE TO authenticated USING (public.current_user_id() = user_id);

-- industry_challenges
DROP POLICY IF EXISTS "Anyone can view open industry challenges" ON public.industry_challenges;
CREATE POLICY "Anyone can view open industry challenges" ON public.industry_challenges FOR SELECT USING (status IN ('Open','Closed','Completed') OR public.current_user_id() = partner_id OR public.current_is_admin());
DROP POLICY IF EXISTS "Partners can manage their own challenges" ON public.industry_challenges;
CREATE POLICY "Partners can manage their own challenges" ON public.industry_challenges FOR ALL TO authenticated USING (public.current_user_id() = partner_id OR public.current_is_admin()) WITH CHECK (public.current_user_id() = partner_id OR public.current_is_admin());

-- challenge_matches
DROP POLICY IF EXISTS "Involved users or admins can view challenge matches" ON public.challenge_matches;
CREATE POLICY "Involved users or admins can view challenge matches" ON public.challenge_matches FOR SELECT TO authenticated USING (public.current_user_id() = candidate_user_id OR public.current_user_id() = partner_user_id OR public.current_is_admin());
DROP POLICY IF EXISTS "Involved users or admins can update challenge matches" ON public.challenge_matches;
CREATE POLICY "Involved users or admins can update challenge matches" ON public.challenge_matches FOR ALL TO authenticated USING (public.current_user_id() = candidate_user_id OR public.current_user_id() = partner_user_id OR public.current_is_admin()) WITH CHECK (public.current_user_id() = candidate_user_id OR public.current_user_id() = partner_user_id OR public.current_is_admin());

-- security_patch extras
DROP POLICY IF EXISTS "Users can log own interactions" ON public.interaction_logs;
CREATE POLICY "Users can log own interactions" ON public.interaction_logs FOR INSERT TO authenticated WITH CHECK (public.current_user_id() = user_id);
DROP POLICY IF EXISTS "Users can read own interactions" ON public.interaction_logs;
CREATE POLICY "Users can read own interactions" ON public.interaction_logs FOR SELECT TO authenticated USING (public.current_user_id() = user_id OR public.current_is_admin());
DROP POLICY IF EXISTS "Users can file own deletion record" ON public.account_deletions;
CREATE POLICY "Users can file own deletion record" ON public.account_deletions FOR INSERT TO authenticated WITH CHECK (public.current_user_id() = user_id);
DROP POLICY IF EXISTS "Admins can audit deletion records" ON public.account_deletions;
CREATE POLICY "Admins can audit deletion records" ON public.account_deletions FOR SELECT TO authenticated USING (public.current_is_admin());

-- storage.objects (projects private, avatars public)
DROP POLICY IF EXISTS "Secured Project Access" ON storage.objects;
CREATE POLICY "Secured Project Access" ON storage.objects FOR SELECT USING (bucket_id='projects' AND (public.current_is_admin() OR public.current_user_id() = owner::uuid OR public.can_access_project_file(public.current_user_id(), name)));
DROP POLICY IF EXISTS "Authenticated Project Upload" ON storage.objects;
CREATE POLICY "Authenticated Project Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='projects' AND owner::uuid = public.current_user_id());
DROP POLICY IF EXISTS "Owner Project Update" ON storage.objects;
CREATE POLICY "Owner Project Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='projects' AND public.current_user_id() = owner::uuid);
DROP POLICY IF EXISTS "Owner Project Delete" ON storage.objects;
CREATE POLICY "Owner Project Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='projects' AND public.current_user_id() = owner::uuid);
DROP POLICY IF EXISTS "Authenticated Avatar Upload" ON storage.objects;
CREATE POLICY "Authenticated Avatar Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='avatars' AND owner::uuid = public.current_user_id());
DROP POLICY IF EXISTS "Owner Avatar Update" ON storage.objects;
CREATE POLICY "Owner Avatar Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='avatars' AND public.current_user_id() = owner::uuid);
DROP POLICY IF EXISTS "Owner Avatar Delete" ON storage.objects;
CREATE POLICY "Owner Avatar Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='avatars' AND public.current_user_id() = owner::uuid);

-- Verify
DO $$ BEGIN RAISE NOTICE 'Better Auth migration: RLS now reads Better Auth session via current_user_id() / current_is_admin()'; END $$;
