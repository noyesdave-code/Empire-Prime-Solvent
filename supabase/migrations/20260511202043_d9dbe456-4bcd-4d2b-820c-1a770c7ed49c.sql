-- 1. Explicit service-role INSERT policy on blueprints so rate-limit rows
-- always persist (service role bypasses RLS, but explicit policy makes
-- intent auditable and silences scanner warning).
CREATE POLICY "Service role inserts blueprints"
ON public.blueprints
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

-- 2. Remove orphan rows in memory_vectors that have no owner (unreadable
-- via RLS) and prevent future NULL user_id inserts at the column level.
DELETE FROM public.memory_vectors WHERE user_id IS NULL;
ALTER TABLE public.memory_vectors ALTER COLUMN user_id SET NOT NULL;