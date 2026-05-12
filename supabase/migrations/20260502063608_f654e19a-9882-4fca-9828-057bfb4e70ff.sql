-- 1. prompt_usage: add DELETE policy scoped to owner
CREATE POLICY "Users delete own usage"
ON public.prompt_usage
FOR DELETE
USING (auth.uid() = user_id);

-- 2. routing_log: explicit service_role-only writes
CREATE POLICY "Service role inserts routing log"
ON public.routing_log
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates routing log"
ON public.routing_log
FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "Service role deletes routing log"
ON public.routing_log
FOR DELETE
USING (auth.role() = 'service_role');

-- 3. prompts: tighten authed insert to require own user_id
DROP POLICY IF EXISTS "authed insert own prompts" ON public.prompts;
CREATE POLICY "authed insert own prompts"
ON public.prompts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. memory_vectors: same treatment for consistency
DROP POLICY IF EXISTS "authed insert own memory" ON public.memory_vectors;
CREATE POLICY "authed insert own memory"
ON public.memory_vectors
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());