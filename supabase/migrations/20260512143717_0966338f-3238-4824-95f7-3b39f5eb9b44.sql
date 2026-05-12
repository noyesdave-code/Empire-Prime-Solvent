CREATE TABLE IF NOT EXISTS public.ide_github_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  redirect_to text NOT NULL DEFAULT '/ide',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ide_github_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct OAuth state access" ON public.ide_github_oauth_states;

CREATE INDEX IF NOT EXISTS idx_ide_github_oauth_states_user ON public.ide_github_oauth_states(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS private.ide_github_tokens (
  connection_id uuid PRIMARY KEY REFERENCES public.ide_github_connections(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  token_type text NOT NULL DEFAULT 'bearer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_private_ide_github_tokens_updated ON private.ide_github_tokens;
CREATE TRIGGER trg_private_ide_github_tokens_updated
BEFORE UPDATE ON private.ide_github_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.service_store_ide_github_token(_connection_id uuid, _access_token text, _token_type text DEFAULT 'bearer')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  INSERT INTO private.ide_github_tokens (connection_id, access_token, token_type)
  VALUES (_connection_id, _access_token, COALESCE(NULLIF(_token_type, ''), 'bearer'))
  ON CONFLICT (connection_id) DO UPDATE
  SET access_token = EXCLUDED.access_token,
      token_type = EXCLUDED.token_type,
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.service_get_ide_github_token(_connection_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = private, public
AS $$
  SELECT access_token FROM private.ide_github_tokens WHERE connection_id = _connection_id
$$;

CREATE OR REPLACE FUNCTION public.service_delete_ide_github_token(_connection_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, public
AS $$
  DELETE FROM private.ide_github_tokens WHERE connection_id = _connection_id
$$;

REVOKE ALL ON FUNCTION public.service_store_ide_github_token(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.service_get_ide_github_token(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.service_delete_ide_github_token(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_store_ide_github_token(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.service_get_ide_github_token(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.service_delete_ide_github_token(uuid) TO service_role;