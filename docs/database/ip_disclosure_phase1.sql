-- IP disclosure Phase 1: additive, review before running.
-- This migration does not alter public.projects or existing storage buckets.
-- Run only after reviewing it in the Supabase SQL editor and taking a backup.

CREATE TABLE IF NOT EXISTS public.ip_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  researcher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'admin_review', 'ai_screening', 'tto_review',
    'researcher_action_required', 'super_admin_review', 'published',
    'restricted', 'confidential_hold', 'rejected'
  )),
  route TEXT CHECK (route IS NULL OR route IN ('tto_review', 'tto_opt_out')),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy_version TEXT,
  policy_accepted_at TIMESTAMPTZ,
  submission_policy_version TEXT,
  submission_policy_accepted_at TIMESTAMPTZ,
  tto_opt_out BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  CONSTRAINT one_disclosure_per_project UNIQUE (project_id),
  CONSTRAINT tto_route_matches_opt_out CHECK (
    (tto_opt_out = true AND route = 'tto_opt_out') OR
    (tto_opt_out = false AND route IS DISTINCT FROM 'tto_opt_out')
  )
);

CREATE INDEX IF NOT EXISTS ip_disclosures_researcher_idx
  ON public.ip_disclosures (researcher_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS ip_disclosures_status_idx
  ON public.ip_disclosures (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ip_disclosure_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_id UUID NOT NULL REFERENCES public.ip_disclosures(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ip_disclosure_events_case_idx
  ON public.ip_disclosure_events (disclosure_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ip_disclosure_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_id UUID NOT NULL REFERENCES public.ip_disclosures(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  author_role TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('admin', 'ai', 'tto', 'authenticity', 'confidentiality', 'ownership', 'evidence', 'quality')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  source_type TEXT NOT NULL DEFAULT 'reviewer' CHECK (source_type IN ('reviewer', 'ai', 'source_link', 'file')),
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'shared_researcher', 'shared_super_admin')),
  is_preliminary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ip_disclosure_findings_case_idx
  ON public.ip_disclosure_findings (disclosure_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ip_disclosure_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_id UUID NOT NULL REFERENCES public.ip_disclosures(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  url TEXT NOT NULL,
  title TEXT,
  source_type TEXT NOT NULL DEFAULT 'supporting' CHECK (source_type IN ('publication', 'patent', 'technology', 'supporting')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ip_disclosure_links_case_idx
  ON public.ip_disclosure_links (disclosure_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ip_disclosure_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_id UUID NOT NULL REFERENCES public.ip_disclosures(id) ON DELETE CASCADE,
  decided_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('publish', 'restrict', 'confidential_hold', 'request_information', 'reject')),
  reason TEXT NOT NULL,
  public_projection JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ip_disclosure_decisions_case_idx
  ON public.ip_disclosure_decisions (disclosure_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ip_disclosure_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_id UUID NOT NULL REFERENCES public.ip_disclosures(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  object_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  sha256 TEXT,
  classification TEXT NOT NULL DEFAULT 'CONFIDENTIAL',
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ip_disclosure_files_case_idx
  ON public.ip_disclosure_files (disclosure_id, created_at DESC);

ALTER TABLE public.ip_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_disclosure_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_disclosure_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_disclosure_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_disclosure_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_disclosure_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Researchers can view own IP disclosures" ON public.ip_disclosures;
CREATE POLICY "Researchers can view own IP disclosures"
  ON public.ip_disclosures FOR SELECT
  USING (researcher_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Researchers can create own IP disclosures" ON public.ip_disclosures;
CREATE POLICY "Researchers can create own IP disclosures"
  ON public.ip_disclosures FOR INSERT
  WITH CHECK (researcher_id = auth.uid());

DROP POLICY IF EXISTS "Researchers can view own IP files" ON public.ip_disclosure_files;
CREATE POLICY "Researchers can view own IP files"
  ON public.ip_disclosure_files FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.ip_disclosures d
      WHERE d.id = disclosure_id AND d.researcher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Researchers can view own IP events" ON public.ip_disclosure_events;
CREATE POLICY "Researchers can view own IP events"
  ON public.ip_disclosure_events FOR SELECT
  USING (
    actor_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.ip_disclosures d
      WHERE d.id = disclosure_id AND d.researcher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Researchers can view shared IP findings" ON public.ip_disclosure_findings;
CREATE POLICY "Researchers can view shared IP findings"
  ON public.ip_disclosure_findings FOR SELECT
  USING (
    public.is_admin()
    OR (visibility = 'shared_researcher' AND EXISTS (
      SELECT 1 FROM public.ip_disclosures d
      WHERE d.id = disclosure_id AND d.researcher_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Researchers can view IP links" ON public.ip_disclosure_links;
CREATE POLICY "Researchers can view IP links"
  ON public.ip_disclosure_links FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.ip_disclosures d
      WHERE d.id = disclosure_id AND d.researcher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Researchers can view IP decisions" ON public.ip_disclosure_decisions;
CREATE POLICY "Researchers can view IP decisions"
  ON public.ip_disclosure_decisions FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.ip_disclosures d
      WHERE d.id = disclosure_id AND d.researcher_id = auth.uid()
    )
  );

COMMENT ON TABLE public.ip_disclosures IS
  'Phase 1 IP workflow metadata; confidential content remains in existing private Supabase Storage.';
