-- Create a draft disclosure for projects that predate the IP disclosure flow.
-- Run once after ip_disclosure_phase1.sql in the Supabase SQL editor.
-- The NOT EXISTS guard makes this safe to run more than once.

INSERT INTO public.ip_disclosures (project_id, researcher_id, status, answers)
SELECT p.id, p.owner_id, 'draft', '{}'::jsonb
FROM public.projects AS p
WHERE p.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.ip_disclosures AS d
    WHERE d.project_id = p.id
  );
