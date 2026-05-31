GRANT SELECT ON public.empire_brain TO anon;
GRANT SELECT ON public.empire_brain TO authenticated;
GRANT ALL ON public.empire_brain TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empire_learnings TO authenticated;
GRANT ALL ON public.empire_learnings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_research TO authenticated;
GRANT ALL ON public.web_research TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ide_build_usage TO authenticated;
GRANT ALL ON public.ide_build_usage TO service_role;

CREATE OR REPLACE FUNCTION public.service_consume_ide_build_attempt(
  _user_id uuid,
  _environment text DEFAULT 'live',
  _free_limit integer DEFAULT 100
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

UPDATE public.ani_learning_stack
SET enabled = true,
    scope = 'legal public knowledge only: FOIA/open-government material, public medical research, cutting-edge science, technology, education, art, history, commerce, safety, and humanity-positive ideas; research and summarize with source links; do not bypass paywalls, logins, private systems, access controls, or copyright protections',
    research_every_minutes = 15,
    reflect_every_hours = 6,
    updated_at = now()
WHERE id = 1;

DO $mig$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ani-learning-research') THEN
    PERFORM cron.unschedule('ani-learning-research');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ani-learning-reflect') THEN
    PERFORM cron.unschedule('ani-learning-reflect');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ani-learning-converse') THEN
    PERFORM cron.unschedule('ani-learning-converse');
  END IF;
END
$mig$;

SELECT cron.schedule(
  'ani-learning-research',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://lkzxpvleikvvbuhmsgaa.supabase.co/functions/v1/unicorn-research',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('source','cron','mode','auto_promote')
  );
  $cron$
);

SELECT cron.schedule(
  'ani-learning-reflect',
  '0 */6 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://lkzxpvleikvvbuhmsgaa.supabase.co/functions/v1/ani-reflect',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('source','cron','mode','auto_promote')
  );
  $cron$
);

SELECT cron.schedule(
  'ani-learning-converse',
  '7 */2 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://lkzxpvleikvvbuhmsgaa.supabase.co/functions/v1/ani-converse',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'source','cron',
      'topic','Legal public knowledge expansion: FOIA/open-government documents, public medical research, cutting-edge science, education, history, and technology ideas that help humanity.',
      'turns',8,
      'peer_model','openai/gpt-5-mini'
    )
  );
  $cron$
);