CREATE TABLE public.uptime_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.uptime_checks (
  id bigserial PRIMARY KEY,
  target_id uuid NOT NULL REFERENCES public.uptime_targets(id) ON DELETE CASCADE,
  status_code int,
  latency_ms int,
  ok boolean NOT NULL,
  error text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_uptime_checks_target_time ON public.uptime_checks(target_id, checked_at DESC);

ALTER TABLE public.uptime_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uptime_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read uptime_targets" ON public.uptime_targets FOR SELECT TO authenticated USING (public.is_site_editor(auth.uid()));
CREATE POLICY "admin write uptime_targets" ON public.uptime_targets FOR ALL TO authenticated USING (public.is_site_editor(auth.uid())) WITH CHECK (public.is_site_editor(auth.uid()));
CREATE POLICY "admin read uptime_checks" ON public.uptime_checks FOR SELECT TO authenticated USING (public.is_site_editor(auth.uid()));

INSERT INTO public.uptime_targets (label, url) VALUES
  ('Empire Pages (health.json)', 'https://noyesdave-code.github.io/Empire-Prime-Solvent/health.json'),
  ('Edge health function', 'https://lkzxpvleikvvbuhmsgaa.supabase.co/functions/v1/health')
ON CONFLICT (url) DO NOTHING;