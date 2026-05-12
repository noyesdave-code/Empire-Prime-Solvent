CREATE TABLE IF NOT EXISTS public.ide_build_usage (
  user_id uuid PRIMARY KEY,
  free_attempts_used integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ide_build_usage_nonnegative CHECK (free_attempts_used >= 0)
);

ALTER TABLE public.ide_build_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own build usage" ON public.ide_build_usage;
CREATE POLICY "Users view own build usage"
ON public.ide_build_usage
FOR SELECT
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_ide_build_usage_updated ON public.ide_build_usage;
CREATE TRIGGER trg_ide_build_usage_updated
BEFORE UPDATE ON public.ide_build_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.service_consume_ide_build_attempt(
  _user_id uuid,
  _environment text DEFAULT 'live',
  _free_limit integer DEFAULT 10
)
RETURNS TABLE(allowed boolean, free_attempts_used integer, free_attempts_limit integer, requires_payment boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_used integer;
  is_owner_admin boolean;
  has_paid boolean;
BEGIN
  IF _user_id IS NULL THEN
    RETURN QUERY SELECT false, 0, _free_limit, true, 'not authenticated';
    RETURN;
  END IF;

  SELECT public.is_site_editor(_user_id) INTO is_owner_admin;
  IF COALESCE(is_owner_admin, false) THEN
    SELECT COALESCE(free_attempts_used, 0) INTO current_used
    FROM public.ide_build_usage
    WHERE user_id = _user_id;
    RETURN QUERY SELECT true, COALESCE(current_used, 0), _free_limit, false, 'admin unlimited';
    RETURN;
  END IF;

  SELECT public.has_active_subscription(_user_id, _environment) INTO has_paid;
  IF COALESCE(has_paid, false) THEN
    SELECT COALESCE(free_attempts_used, 0) INTO current_used
    FROM public.ide_build_usage
    WHERE user_id = _user_id;
    RETURN QUERY SELECT true, COALESCE(current_used, 0), _free_limit, false, 'paid unlimited';
    RETURN;
  END IF;

  INSERT INTO public.ide_build_usage (user_id, free_attempts_used, last_attempt_at)
  VALUES (_user_id, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT public.ide_build_usage.free_attempts_used INTO current_used
  FROM public.ide_build_usage
  WHERE user_id = _user_id
  FOR UPDATE;

  IF current_used >= _free_limit THEN
    RETURN QUERY SELECT false, current_used, _free_limit, true, 'free attempts exhausted';
    RETURN;
  END IF;

  UPDATE public.ide_build_usage
  SET free_attempts_used = free_attempts_used + 1,
      last_attempt_at = now()
  WHERE user_id = _user_id
  RETURNING public.ide_build_usage.free_attempts_used INTO current_used;

  RETURN QUERY SELECT true, current_used, _free_limit, false, 'free attempt consumed';
END;
$$;

REVOKE ALL ON FUNCTION public.service_consume_ide_build_attempt(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_consume_ide_build_attempt(uuid, text, integer) TO service_role;