
-- Audit log
CREATE TABLE IF NOT EXISTS public.site_edit_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  intent text NOT NULL,
  endpoint text,
  outcome text NOT NULL CHECK (outcome IN ('allowed','denied','error')),
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_edit_audit_created_at ON public.site_edit_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_edit_audit_user_id ON public.site_edit_audit(user_id);

ALTER TABLE public.site_edit_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read site edit audit" ON public.site_edit_audit;
CREATE POLICY "Admins read site edit audit"
ON public.site_edit_audit
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role inserts audit" ON public.site_edit_audit;
CREATE POLICY "Service role inserts audit"
ON public.site_edit_audit
FOR INSERT TO public
WITH CHECK (auth.role() = 'service_role');

-- IP denylist
CREATE TABLE IF NOT EXISTS public.site_edit_ip_denylist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_edit_ip_denylist_ip ON public.site_edit_ip_denylist(ip_address);

ALTER TABLE public.site_edit_ip_denylist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read denylist"
ON public.site_edit_ip_denylist
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert denylist"
ON public.site_edit_ip_denylist
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete denylist"
ON public.site_edit_ip_denylist
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Realtime
ALTER TABLE public.site_edit_audit REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_edit_audit;
