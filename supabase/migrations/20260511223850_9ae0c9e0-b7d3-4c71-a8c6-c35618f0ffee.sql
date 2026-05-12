
-- Provider config (single row)
CREATE TABLE public.ani_provider_config (
  id integer PRIMARY KEY DEFAULT 1,
  independent_only boolean NOT NULL DEFAULT true,
  allow_lovable_fallback boolean NOT NULL DEFAULT false,
  default_model text NOT NULL DEFAULT 'sonar',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT only_one_row CHECK (id = 1)
);
INSERT INTO public.ani_provider_config (id) VALUES (1);
ALTER TABLE public.ani_provider_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage provider config" ON public.ani_provider_config
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "anyone read provider config" ON public.ani_provider_config
  FOR SELECT TO anon, authenticated USING (true);

-- Per-user memory settings
CREATE TABLE public.ani_memory_settings (
  user_id uuid PRIMARY KEY,
  memory_enabled boolean NOT NULL DEFAULT true,
  history_turns integer NOT NULL DEFAULT 8 CHECK (history_turns BETWEEN 0 AND 50),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ani_memory_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own memory settings" ON public.ani_memory_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service writes memory settings" ON public.ani_memory_settings
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Usage ledger
CREATE TABLE public.ani_usage_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  provider text NOT NULL,
  model text NOT NULL,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  est_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  latency_ms integer,
  success boolean NOT NULL DEFAULT true,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ani_usage_ledger_user_idx ON public.ani_usage_ledger(user_id, created_at DESC);
CREATE INDEX ani_usage_ledger_created_idx ON public.ani_usage_ledger(created_at DESC);
ALTER TABLE public.ani_usage_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own usage" ON public.ani_usage_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin sees all usage" ON public.ani_usage_ledger
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service writes usage" ON public.ani_usage_ledger
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Growth metrics
CREATE TABLE public.ani_growth_metrics (
  day date PRIMARY KEY,
  total_calls integer NOT NULL DEFAULT 0,
  unique_users integer NOT NULL DEFAULT 0,
  avg_latency_ms integer NOT NULL DEFAULT 0,
  success_rate numeric(5,2) NOT NULL DEFAULT 0,
  memory_size integer NOT NULL DEFAULT 0,
  distinct_skills integer NOT NULL DEFAULT 0,
  growth_score numeric(5,2) NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ani_growth_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads growth" ON public.ani_growth_metrics
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service writes growth" ON public.ani_growth_metrics
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
