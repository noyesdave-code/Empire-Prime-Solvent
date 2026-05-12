
DROP POLICY IF EXISTS "authed insert routing log" ON public.routing_log;
-- Routing log is server-only. Edge functions use service role and bypass RLS.
-- No INSERT policy = no client writes possible.
