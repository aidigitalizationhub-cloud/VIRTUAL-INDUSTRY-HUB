-- SUPABASE STORAGE & VECTOR SETUP
-- Run this in your Supabase SQL Editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles table schema enhancements
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_profile JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS semantic_summary TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url_2 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url_3 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url_4 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS needs_students BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS open_grants BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grant_details TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS open_fellowships BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fellowship_details TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS open_scholarships BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scholarship_details TEXT;

-- Projects table schema enhancements
ALTER TABLE projects ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Ensure all workflow, tracking, and metric columns exist on public.projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS funding_amount_usd TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS open_to_collaboration BOOLEAN DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS technical_details_url TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS expressions_of_interest INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS requests INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS disclosure_status TEXT DEFAULT 'Submitted';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS requested_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS disclosure_timeline JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ai_verification JSONB DEFAULT '{}'::jsonb;

-- Data classification & IP governance fields
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS data_classification TEXT DEFAULT 'CONFIDENTIAL';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ip_status TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS nda_required BOOLEAN DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS embargo_until DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS reviewer_assignment UUID;

-- Helper function to query the user's role securely without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with database owner privileges to bypass RLS checks
SET search_path = public
STABLE -- Mark as stable to allow caching per query execution
AS $$
DECLARE
  v_role text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  RETURN v_role;
END;
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Essential: runs with database owner privileges, bypassing RLS checks
SET search_path = public
STABLE -- Mark as stable to allow caching per query execution, avoiding O(N) database subqueries
AS $$
BEGIN
  RETURN public.get_user_role(auth.uid()) = 'Admin';
END;
$$;

-- Helper function to check if a user has active approved 1-hour secure reveal request
CREATE OR REPLACE FUNCTION public.is_reveal_approved(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_approved_at BIGINT;
  v_one_hour_ms BIGINT := 3600000;
  v_now BIGINT;
BEGIN
  IF p_user_id IS NULL OR p_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get current timestamp in milliseconds
  v_now := EXTRACT(EPOCH FROM NOW()) * 1000;
  
  -- Check the status of EOI reveal requests
  FOR v_status IN 
    SELECT status FROM public.eois 
    WHERE sender_id = p_user_id AND project_id = p_project_id
  LOOP
    IF v_status = 'released' THEN
      RETURN TRUE;
    END IF;
    IF v_status LIKE 'released:%' THEN
      BEGIN
        v_approved_at := CAST(SUBSTRING(v_status FROM 10) AS BIGINT);
        IF (v_now - v_approved_at) < v_one_hour_ms THEN
          RETURN TRUE;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL; -- safety check if bad format
      END;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$$;

-- Helper function to check if a user can access a specific project storage file (retaining cover image public access)
CREATE OR REPLACE FUNCTION public.can_access_project_file(p_user_id UUID, p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_owner_id UUID;
BEGIN
  -- 1. If the file is referenced in image_url, it is a public cover image and viewable by any user
  IF EXISTS (
    SELECT 1 FROM public.projects
    WHERE image_url LIKE '%' || p_object_name || '%'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 1b. If the file is referenced in news image_url, it is a public news cover image and viewable by any user
  IF EXISTS (
    SELECT 1 FROM public.news
    WHERE image_url LIKE '%' || p_object_name || '%'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. If user is null, they definitely cannot access secure briefs or docs
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 3. Find if there is a matching project and verify access (owner or active approved reveal)
  FOR v_project_id, v_owner_id IN 
    SELECT id, owner_id FROM public.projects
    WHERE technical_details_url LIKE '%' || p_object_name || '%'
       OR requested_documents::TEXT LIKE '%' || p_object_name || '%'
  LOOP
    -- Allow PI access
    IF p_user_id = v_owner_id THEN
      RETURN TRUE;
    END IF;
    
    -- Allow if reveal request has been approved and is active
    IF public.is_reveal_approved(p_user_id, v_project_id) THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$$;

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('projects', 'projects', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. storage.objects RLS is already enabled by Supabase (table is owned by
--    supabase_storage_admin, so ALTER TABLE on it fails for non-owners).
--    The storage policies below apply to the existing storage.objects table.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Storage Policies for 'projects' bucket
DROP POLICY IF EXISTS "Public Project Access" ON storage.objects;
DROP POLICY IF EXISTS "Secured Project Access" ON storage.objects;
CREATE POLICY "Secured Project Access" ON storage.objects FOR SELECT USING (
  bucket_id = 'projects' AND (
    public.is_admin()
    OR auth.uid() = owner
    OR public.can_access_project_file(auth.uid(), name)
  )
);

DROP POLICY IF EXISTS "Authenticated Project Upload" ON storage.objects;
CREATE POLICY "Authenticated Project Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'projects' AND owner = auth.uid()
);

DROP POLICY IF EXISTS "Owner Project Update" ON storage.objects;
CREATE POLICY "Owner Project Update" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'projects' AND auth.uid() = owner
);

DROP POLICY IF EXISTS "Owner Project Delete" ON storage.objects;
CREATE POLICY "Owner Project Delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'projects' AND auth.uid() = owner
);

-- 4. Storage Policies for 'avatars' bucket
DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
CREATE POLICY "Public Avatar Access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated Avatar Upload" ON storage.objects;
CREATE POLICY "Authenticated Avatar Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'avatars' AND owner = auth.uid()
);

DROP POLICY IF EXISTS "Owner Avatar Update" ON storage.objects;
CREATE POLICY "Owner Avatar Update" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'avatars' AND auth.uid() = owner
);

DROP POLICY IF EXISTS "Owner Avatar Delete" ON storage.objects;
CREATE POLICY "Owner Avatar Delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'avatars' AND auth.uid() = owner
);

-- MATCHING FUNCTIONS
-- Search profiles by similarity
DROP FUNCTION IF EXISTS match_profiles(vector, double precision, integer, uuid);
DROP FUNCTION IF EXISTS match_profiles(vector, float, int, uuid);
DROP FUNCTION IF EXISTS match_profiles(vector(768), float, int, uuid);
DROP FUNCTION IF EXISTS match_profiles(vector(768), double precision, integer, uuid);
DROP FUNCTION IF EXISTS match_profiles;

CREATE OR REPLACE FUNCTION match_profiles (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 20,
  excluded_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  role text,
  ai_profile jsonb,
  semantic_summary text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.role,
    p.ai_profile,
    p.semantic_summary,
    (1 - (p.embedding <=> query_embedding))::float AS similarity
  FROM public.profiles p
  WHERE p.embedding IS NOT NULL
    AND (excluded_id IS NULL OR p.id != excluded_id)
    AND (1 - (p.embedding <=> query_embedding)) >= match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Search projects by similarity
DROP FUNCTION IF EXISTS match_projects(vector, double precision, integer);
DROP FUNCTION IF EXISTS match_projects(vector, float, int);
DROP FUNCTION IF EXISTS match_projects(vector(768), float, int);
DROP FUNCTION IF EXISTS match_projects(vector(768), double precision, integer);
DROP FUNCTION IF EXISTS match_projects;

CREATE OR REPLACE FUNCTION match_projects (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  image_url text,
  research_area text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.description,
    p.image_url,
    p.research_area::text,
    (1 - (p.embedding <=> query_embedding))::float AS similarity
  FROM public.projects p
  WHERE p.embedding IS NOT NULL
    AND (1 - (p.embedding <=> query_embedding)) >= match_threshold
    AND (
      p.owner_id = auth.uid()
      OR public.is_admin()
      OR (
        (p.disclosure_status = 'Approved' OR p.disclosure_status = 'Published')
        AND (
          p.visibility = 'Public'
          OR (auth.uid() IS NOT NULL AND p.visibility = 'Internal')
        )
      )
    )
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. ROLE-SPECIFIC TABLES (Plan Implementation)
-- Student profiles
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  education_level text,
  availability text,
  looking_for text,
  program text
);

-- Researcher profiles
CREATE TABLE IF NOT EXISTS researcher_profiles (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  research_stage text,
  funding_needed boolean DEFAULT false,
  needs_students boolean DEFAULT false,
  open_grants boolean DEFAULT false,
  grant_details text,
  open_fellowships boolean DEFAULT false,
  fellowship_details text,
  open_scholarships boolean DEFAULT false,
  scholarship_details text
);

-- Investor profiles
CREATE TABLE IF NOT EXISTS investor_profiles (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  funding_range text,
  investment_focus text
);

-- Industry profiles
CREATE TABLE IF NOT EXISTS industry_profiles (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  sector text,
  collaboration_type text
);

-- Row Level Security for role-specific profile tables
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.researcher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_profiles ENABLE ROW LEVEL SECURITY;

-- student_profiles: authenticated read, self-write
DROP POLICY IF EXISTS "Authenticated can read student profiles" ON public.student_profiles;
CREATE POLICY "Authenticated can read student profiles" ON public.student_profiles
FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own student profile" ON public.student_profiles;
CREATE POLICY "Users manage own student profile" ON public.student_profiles
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- researcher_profiles: authenticated read, self-write
DROP POLICY IF EXISTS "Authenticated can read researcher profiles" ON public.researcher_profiles;
CREATE POLICY "Authenticated can read researcher profiles" ON public.researcher_profiles
FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own researcher profile" ON public.researcher_profiles;
CREATE POLICY "Users manage own researcher profile" ON public.researcher_profiles
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- investor_profiles: authenticated read, self-write
DROP POLICY IF EXISTS "Authenticated can read investor profiles" ON public.investor_profiles;
CREATE POLICY "Authenticated can read investor profiles" ON public.investor_profiles
FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own investor profile" ON public.investor_profiles;
CREATE POLICY "Users manage own investor profile" ON public.investor_profiles
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- industry_profiles: authenticated read, self-write
DROP POLICY IF EXISTS "Authenticated can read industry profiles" ON public.industry_profiles;
CREATE POLICY "Authenticated can read industry profiles" ON public.industry_profiles
FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own industry profile" ON public.industry_profiles;
CREATE POLICY "Users manage own industry profile" ON public.industry_profiles
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Append-only AI decision provenance ledger
CREATE TABLE IF NOT EXISTS ai_decisions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_type text NOT NULL,
  subject_id text,
  provider text,
  model text,
  prompt_version text,
  input_hash text,
  output_hash text,
  result jsonb,
  review_status text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Only admins can read the ledger. Writes happen via the service-role client (bypasses RLS).
ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read ai_decisions" ON public.ai_decisions;
CREATE POLICY "Admins can read ai_decisions" ON public.ai_decisions
FOR SELECT TO authenticated USING (public.is_admin());

-- Behavioral Learning Table (Phase 10)
CREATE TABLE IF NOT EXISTS interaction_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  target_id uuid, -- Profile or Project ID
  interaction_type text, -- 'click', 'accept', 'ignore', 'message'
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security on projects so per-row ownership checks take effect
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Allow Admin users to view, insert, update, or delete all projects
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.projects;
CREATE POLICY "Admins can manage all projects" ON public.projects
FOR ALL TO authenticated USING (
  public.is_admin()
) WITH CHECK (
  public.is_admin()
);

-- Allow research creators/owners to view, insert, update, and manage their own projects
DROP POLICY IF EXISTS "Researchers can manage their own projects" ON public.projects;
CREATE POLICY "Researchers can manage their own projects" ON public.projects
FOR ALL TO authenticated USING (
  auth.uid() = owner_id
) WITH CHECK (
  auth.uid() = owner_id
);

-- Allow everyone (including public anonymous reads and registered/authenticated users) to select projects
DROP POLICY IF EXISTS "Everyone can view public projects" ON public.projects;
CREATE POLICY "Everyone can view public projects" ON public.projects
FOR SELECT USING (
  (visibility = 'Public' OR disclosure_status = 'Published')
  AND disclosure_status IS DISTINCT FROM 'Draft'
);

-- Allow Admin users to view and update other profiles (such as role elevations) without causing infinite recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL TO authenticated USING (
  public.is_admin()
) WITH CHECK (
  public.is_admin()
);

-- Enable Row Level Security on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view profile records (required for search & matching)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
FOR SELECT TO authenticated USING (true);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = id
);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (
  auth.uid() = id
) WITH CHECK (
  auth.uid() = id
);

-- Bookmarks table to support saving research projects
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_project_bookmark UNIQUE (user_id, project_id)
);

-- Enable Row Level Security on public.bookmarks
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own bookmarks
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks
FOR SELECT TO authenticated USING (
  auth.uid() = user_id
);

-- Allow users to create their own bookmarks
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert their own bookmarks" ON public.bookmarks
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
);

-- Allow users to delete their own bookmarks
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks
FOR DELETE TO authenticated USING (
  auth.uid() = user_id
);

-- --- NEWS TABLE SCHEMA UPGRADE ---
CREATE TABLE IF NOT EXISTS public.news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  published_at DATE DEFAULT CURRENT_DATE NOT NULL,
  summary TEXT,
  image_url TEXT,
  external_url TEXT DEFAULT '',
  is_ai_generated BOOLEAN DEFAULT false,
  source_name TEXT DEFAULT 'UG ORID Directorates',
  status TEXT DEFAULT 'Published', -- 'Draft' or 'Published'
  reference_links TEXT[] DEFAULT '{}', -- Up to 4 reference links
  tags TEXT[] DEFAULT '{}',
  relevance_score INTEGER DEFAULT 0,
  source_verification_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist if the table was created previously without them:
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS reference_links TEXT[] DEFAULT '{}';
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS external_url TEXT DEFAULT '';
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS source_name TEXT DEFAULT 'UG ORID Directorates';
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS relevance_score INTEGER DEFAULT 0;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS source_verification_notes TEXT DEFAULT '';

-- Ensure title is unique to support clean upserts
ALTER TABLE public.news DROP CONSTRAINT IF EXISTS news_title_unique;
ALTER TABLE public.news ADD CONSTRAINT news_title_unique UNIQUE (title);

-- Enable Row Level Security on public.news
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous visitors) to view published news
DROP POLICY IF EXISTS "Anyone can view published news" ON public.news;
CREATE POLICY "Anyone can view published news" ON public.news
FOR SELECT TO public USING (
  status = 'Published' OR status IS NULL
);

-- Allow admins to fully manage all news items
DROP POLICY IF EXISTS "Admins can manage all news" ON public.news;
CREATE POLICY "Admins can manage all news" ON public.news
FOR ALL TO authenticated USING (
  public.is_admin()
) WITH CHECK (
  public.is_admin()
);

-- Performance Optimization Indexes
CREATE INDEX IF NOT EXISTS news_published_at_idx ON public.news (published_at DESC);
CREATE INDEX IF NOT EXISTS news_status_idx ON public.news (status);
CREATE INDEX IF NOT EXISTS news_category_idx ON public.news (category);
CREATE INDEX IF NOT EXISTS news_created_at_idx ON public.news (created_at DESC);
CREATE INDEX IF NOT EXISTS news_status_published_at_idx ON public.news (status, published_at DESC);

-- Generated Column for full-text search optimization
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS fts_doc tsvector GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
) STORED;

-- GIN index for rapid full-text search without expensive ILIKE text scans
CREATE INDEX IF NOT EXISTS news_fts_doc_idx ON public.news USING gin (fts_doc);


-- --- INDUSTRY CHALLENGES & CHALLENGE MATCHING ---

CREATE TABLE IF NOT EXISTS public.industry_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  category TEXT, -- 'Diagnostics', 'Pharmaceutical', 'Vaccines', etc.
  required_skills TEXT[] DEFAULT '{}',
  collaboration_type TEXT,
  budget_range TEXT,
  deadline DATE,
  location TEXT,
  status TEXT DEFAULT 'Open', -- 'Open', 'Closed', 'Draft', 'Completed'
  partner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on industry_challenges
ALTER TABLE public.industry_challenges ENABLE ROW LEVEL SECURITY;

-- Allow anyone to select active/open industry challenges
DROP POLICY IF EXISTS "Anyone can view open industry challenges" ON public.industry_challenges;
CREATE POLICY "Anyone can view open industry challenges" ON public.industry_challenges
FOR SELECT USING (
  status = 'Open' OR status = 'Completed' OR status = 'Closed' OR auth.uid() = partner_id OR public.is_admin()
);

-- Allow partners to fully manage their own challenges
DROP POLICY IF EXISTS "Partners can manage their own challenges" ON public.industry_challenges;
CREATE POLICY "Partners can manage their own challenges" ON public.industry_challenges
FOR ALL TO authenticated USING (
  auth.uid() = partner_id OR public.is_admin()
) WITH CHECK (
  auth.uid() = partner_id OR public.is_admin()
);

-- Create challenge_matches table
CREATE TABLE IF NOT EXISTS public.challenge_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES public.industry_challenges(id) ON DELETE CASCADE NOT NULL,
  candidate_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  partner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  candidate_role TEXT NOT NULL, -- 'student' | 'researcher' | 'partner'
  total_score INTEGER NOT NULL,
  domain_score INTEGER,
  skill_score INTEGER,
  experience_score INTEGER,
  interest_score INTEGER,
  role_suitability_score INTEGER,
  location_score INTEGER,
  availability_score INTEGER,
  verification_score INTEGER,
  matched_skills TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  match_reasons TEXT[] DEFAULT '{}',
  recommended_role TEXT,
  status TEXT DEFAULT 'recommended', -- 'recommended' | 'viewed' | 'saved' | 'invited' | 'interested' | 'shortlisted' | 'dismissed' | 'accepted'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_challenge_candidate UNIQUE (challenge_id, candidate_user_id)
);

-- Enable RLS on challenge_matches
ALTER TABLE public.challenge_matches ENABLE ROW LEVEL SECURITY;

-- Allow users involved (candidate, partner) or admin to view matches
DROP POLICY IF EXISTS "Involved users or admins can view challenge matches" ON public.challenge_matches;
CREATE POLICY "Involved users or admins can view challenge matches" ON public.challenge_matches
FOR SELECT TO authenticated USING (
  auth.uid() = candidate_user_id OR auth.uid() = partner_user_id OR public.is_admin()
);

-- Allow users involved to update matches
DROP POLICY IF EXISTS "Involved users or admins can update challenge matches" ON public.challenge_matches;
CREATE POLICY "Involved users or admins can update challenge matches" ON public.challenge_matches
FOR ALL TO authenticated USING (
  auth.uid() = candidate_user_id OR auth.uid() = partner_user_id OR public.is_admin()
) WITH CHECK (
  auth.uid() = candidate_user_id OR auth.uid() = partner_user_id OR public.is_admin()
);

-- Prevent non-admin, non-service-role actors from mutating score/identity columns on challenge matches.
-- Participants may only update workflow status and reasons; scores are generated by the platform only.
CREATE OR REPLACE FUNCTION public.guard_challenge_match_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF (NEW.total_score IS DISTINCT FROM OLD.total_score)
     OR (NEW.domain_score IS DISTINCT FROM OLD.domain_score)
     OR (NEW.skill_score IS DISTINCT FROM OLD.skill_score)
     OR (NEW.experience_score IS DISTINCT FROM OLD.experience_score)
     OR (NEW.interest_score IS DISTINCT FROM OLD.interest_score)
     OR (NEW.role_suitability_score IS DISTINCT FROM OLD.role_suitability_score)
     OR (NEW.location_score IS DISTINCT FROM OLD.location_score)
     OR (NEW.availability_score IS DISTINCT FROM OLD.availability_score)
     OR (NEW.verification_score IS DISTINCT FROM OLD.verification_score)
     OR (NEW.candidate_user_id IS DISTINCT FROM OLD.candidate_user_id)
     OR (NEW.partner_user_id IS DISTINCT FROM OLD.partner_user_id)
     OR (NEW.challenge_id IS DISTINCT FROM OLD.challenge_id)
     OR (NEW.candidate_role IS DISTINCT FROM OLD.candidate_role)
  THEN
    RAISE EXCEPTION 'challenge match scores and identity fields are immutable for non-admins';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS challenge_matches_score_guard ON public.challenge_matches;
CREATE TRIGGER challenge_matches_score_guard
BEFORE UPDATE ON public.challenge_matches
FOR EACH ROW EXECUTE FUNCTION public.guard_challenge_match_scores();

-- Optimization indexes
CREATE INDEX IF NOT EXISTS industry_challenges_partner_id_idx ON public.industry_challenges (partner_id);
CREATE INDEX IF NOT EXISTS industry_challenges_status_idx ON public.industry_challenges (status);
CREATE INDEX IF NOT EXISTS challenge_matches_challenge_id_idx ON public.challenge_matches (challenge_id);
CREATE INDEX IF NOT EXISTS challenge_matches_candidate_user_id_idx ON public.challenge_matches (candidate_user_id);
CREATE INDEX IF NOT EXISTS challenge_matches_partner_user_id_idx ON public.challenge_matches (partner_user_id);




