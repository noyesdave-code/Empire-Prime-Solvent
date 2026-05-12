
-- Move pgvector to a dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Replace permissive INSERT policies on prompts
DROP POLICY IF EXISTS "anyone can insert prompts" ON public.prompts;
CREATE POLICY "anon insert demo prompts only"
  ON public.prompts FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND source = 'web');
CREATE POLICY "authed insert own prompts"
  ON public.prompts FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Replace permissive INSERT policies on memory_vectors
DROP POLICY IF EXISTS "anyone can insert memory" ON public.memory_vectors;
CREATE POLICY "anon insert demo memory only"
  ON public.memory_vectors FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
CREATE POLICY "authed insert own memory"
  ON public.memory_vectors FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Routing log: only authenticated clients (edge functions use service role and bypass RLS anyway)
DROP POLICY IF EXISTS "anyone can insert routing log" ON public.routing_log;
CREATE POLICY "authed insert routing log"
  ON public.routing_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
