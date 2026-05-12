CREATE TABLE IF NOT EXISTS public.ide_github_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  github_login text NOT NULL,
  display_name text,
  token_secret_ref text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  CONSTRAINT ide_github_connections_status_check CHECK (status IN ('active', 'revoked', 'error')),
  CONSTRAINT ide_github_connections_user_login_unique UNIQUE (user_id, github_login)
);

ALTER TABLE public.ide_github_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own GitHub connections" ON public.ide_github_connections;
CREATE POLICY "Users manage own GitHub connections"
ON public.ide_github_connections
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view GitHub connections" ON public.ide_github_connections;
CREATE POLICY "Admins view GitHub connections"
ON public.ide_github_connections
FOR SELECT
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_ide_github_connections_updated ON public.ide_github_connections;
CREATE TRIGGER trg_ide_github_connections_updated
BEFORE UPDATE ON public.ide_github_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ide_github_connections_user ON public.ide_github_connections(user_id, status);

CREATE TABLE IF NOT EXISTS public.ide_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ide_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  target text NOT NULL DEFAULT 'github_pages',
  connection_id uuid REFERENCES public.ide_github_connections(id) ON DELETE SET NULL,
  repo_owner text,
  repo_name text,
  repo_url text,
  live_url text,
  workflow_url text,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  pushed_files integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ide_deployments_target_check CHECK (target IN ('github_pages', 'vercel', 'netlify', 'empire_pr')),
  CONSTRAINT ide_deployments_status_check CHECK (status IN ('queued', 'running', 'success', 'failed'))
);

ALTER TABLE public.ide_deployments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own deployments" ON public.ide_deployments;
CREATE POLICY "Users view own deployments"
ON public.ide_deployments
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own deployments" ON public.ide_deployments;
CREATE POLICY "Users create own deployments"
ON public.ide_deployments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.ide_projects p
    WHERE p.id = project_id AND p.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins view deployments" ON public.ide_deployments;
CREATE POLICY "Admins view deployments"
ON public.ide_deployments
FOR SELECT
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_ide_deployments_updated ON public.ide_deployments;
CREATE TRIGGER trg_ide_deployments_updated
BEFORE UPDATE ON public.ide_deployments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ide_deployments_user ON public.ide_deployments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ide_deployments_project ON public.ide_deployments(project_id, created_at DESC);