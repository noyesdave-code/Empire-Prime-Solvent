DROP POLICY IF EXISTS "OAuth states are backend only" ON public.ide_github_oauth_states;
CREATE POLICY "OAuth states are backend only"
ON public.ide_github_oauth_states
FOR ALL
USING (false)
WITH CHECK (false);