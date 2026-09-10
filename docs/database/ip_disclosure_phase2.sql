-- IP disclosure Phase 2: additive access-request table. Phase 1 must already be applied.
-- Run in Supabase SQL editor after backup.

CREATE TABLE IF NOT EXISTS public.ip_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_id UUID NOT NULL REFERENCES public.ip_disclosures(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','revoked','expired')),
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ip_access_requests_case_idx
  ON public.ip_access_requests (disclosure_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ip_access_requests_requester_idx
  ON public.ip_access_requests (requester_id, created_at DESC);

ALTER TABLE public.ip_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own access requests" ON public.ip_access_requests;
CREATE POLICY "Users view own access requests"
  ON public.ip_access_requests FOR SELECT
  USING (
    requester_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.ip_disclosures d
      WHERE d.id = disclosure_id AND d.researcher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users create access requests" ON public.ip_access_requests;
CREATE POLICY "Users create access requests"
  ON public.ip_access_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());
