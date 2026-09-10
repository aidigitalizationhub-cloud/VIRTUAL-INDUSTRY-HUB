-- IP disclosure Phase 4: final Admin disposition on the unified Disclosure page.
-- Run after ip_disclosure_phase3.sql.

ALTER TABLE public.ip_disclosures
  DROP CONSTRAINT IF EXISTS ip_disclosures_status_check;

ALTER TABLE public.ip_disclosures
  ADD CONSTRAINT ip_disclosures_status_check CHECK (status IN (
    'draft', 'submitted', 'admin_review', 'ai_screening', 'tto_review', 'tto_completed', 'accepted',
    'researcher_action_required', 'super_admin_review', 'published', 'restricted',
    'confidential_hold', 'rejected'
  ));
