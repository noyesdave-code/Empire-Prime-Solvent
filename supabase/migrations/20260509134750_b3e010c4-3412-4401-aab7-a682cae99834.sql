
-- 1) Tighten memory_vectors: prevent anonymous read of NULL-user rows and stop new anon shared writes
DROP POLICY IF EXISTS "users see own memory" ON public.memory_vectors;
CREATE POLICY "users see own memory"
ON public.memory_vectors
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "anon insert demo memory only" ON public.memory_vectors;

-- 2) Remove site_edit_audit from realtime publication so non-admins can't subscribe to it.
-- Admin UI already supports manual refresh.
ALTER PUBLICATION supabase_realtime DROP TABLE public.site_edit_audit;
