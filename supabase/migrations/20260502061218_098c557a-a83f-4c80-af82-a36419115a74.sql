
-- 1) Fix profiles: prevent self-elevation of tier/quota
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND tier = (SELECT tier FROM public.profiles WHERE user_id = auth.uid())
    AND prompt_count_month = (SELECT prompt_count_month FROM public.profiles WHERE user_id = auth.uid())
    AND quota_reset_at = (SELECT quota_reset_at FROM public.profiles WHERE user_id = auth.uid())
  );

-- 2) skills_registry: hide system_prompt from anonymous visitors (authenticated only)
DROP POLICY IF EXISTS "skills registry public read" ON public.skills_registry;
CREATE POLICY "skills registry authenticated read"
  ON public.skills_registry FOR SELECT
  TO authenticated
  USING (true);

-- 3) routing_log: owner-scoped reads only
DROP POLICY IF EXISTS "routing log readable" ON public.routing_log;
CREATE POLICY "users see own routing log"
  ON public.routing_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prompts p
      WHERE p.id = routing_log.prompt_id
        AND p.user_id = auth.uid()
    )
  );

-- 4) prompts: drop cross-user visibility of anonymous demo rows
DROP POLICY IF EXISTS "users see own prompts" ON public.prompts;
CREATE POLICY "users see own prompts"
  ON public.prompts FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 5) memory_vectors: same — no cross-user reads of anonymous rows
DROP POLICY IF EXISTS "users see own memory" ON public.memory_vectors;
CREATE POLICY "users see own memory"
  ON public.memory_vectors FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 6) Lock down SECURITY DEFINER helper from direct client execution
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO service_role;
