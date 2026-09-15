-- News status strictness: eliminate NULL exposure, enforce Draft/Published.
-- Run in the Supabase SQL Editor with a database-owner role after taking a backup.
-- Safe to run more than once.

BEGIN;

-- Backfill legacy/malformed rows to Draft so nothing implicitly public.
UPDATE public.news SET status = 'Draft' WHERE status IS NULL;

-- Public reads only explicit Published rows.
DROP POLICY IF EXISTS "Anyone can view published news" ON public.news;
CREATE POLICY "Anyone can view published news" ON public.news
FOR SELECT TO public USING (
  status = 'Published'
);

-- Enforce non-null strict status.
ALTER TABLE public.news ALTER COLUMN status SET DEFAULT 'Draft';
UPDATE public.news SET status = 'Draft' WHERE status IS NULL;
ALTER TABLE public.news ALTER COLUMN status SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'news_status_check' AND conrelid = 'public.news'::regclass
  ) THEN
    ALTER TABLE public.news ADD CONSTRAINT news_status_check CHECK (status IN ('Draft', 'Published'));
  END IF;
END
$$;

COMMIT;

-- Verification
SELECT status, count(*) FROM public.news GROUP BY status;
SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'news';
