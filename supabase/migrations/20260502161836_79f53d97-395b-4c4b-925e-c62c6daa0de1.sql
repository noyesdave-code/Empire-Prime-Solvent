
-- Block non-service-role writes to user_roles (prevents privilege escalation)
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Service role manages user_roles"
ON public.user_roles
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Restrictive policy: deny any write that isn't from service_role
CREATE POLICY "Only service_role can write user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Pin search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
