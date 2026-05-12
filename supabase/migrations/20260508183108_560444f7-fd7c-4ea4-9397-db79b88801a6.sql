
-- Swarm runs ledger
CREATE TABLE public.swarm_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swarm_name text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
ALTER TABLE public.swarm_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read swarm_runs" ON public.swarm_runs FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service role writes swarm_runs" ON public.swarm_runs FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX idx_swarm_runs_name_started ON public.swarm_runs(swarm_name, started_at DESC);

-- Outreach targets
CREATE TABLE public.outreach_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text,
  product_interest text,
  status text NOT NULL DEFAULT 'queued',
  last_sent_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage outreach" ON public.outreach_targets FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service role writes outreach" ON public.outreach_targets FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE UNIQUE INDEX idx_outreach_email ON public.outreach_targets(lower(email));

-- Brand alerts
CREATE TABLE public.brand_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  source_url text,
  snippet text,
  severity text NOT NULL DEFAULT 'low',
  reviewed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage brand_alerts" ON public.brand_alerts FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service role writes brand_alerts" ON public.brand_alerts FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX idx_brand_alerts_created ON public.brand_alerts(created_at DESC);

-- Pricing snapshots
CREATE TABLE public.pricing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  competitor text NOT NULL,
  price_cents integer,
  currency text DEFAULT 'USD',
  url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read pricing" ON public.pricing_snapshots FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service role writes pricing" ON public.pricing_snapshots FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX idx_pricing_product_captured ON public.pricing_snapshots(product_id, captured_at DESC);

-- Abandoned carts recovery log
CREATE TABLE public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  product text,
  tier text,
  session_id text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  recovery_sent_at timestamptz,
  recovered_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage abandoned_carts" ON public.abandoned_carts FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service role writes abandoned_carts" ON public.abandoned_carts FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX idx_abandoned_email_session ON public.abandoned_carts(lower(email), session_id);

-- SEO drafts
CREATE TABLE public.seo_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text,
  title text NOT NULL,
  body_md text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage seo_drafts" ON public.seo_drafts FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service role writes seo_drafts" ON public.seo_drafts FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX idx_seo_drafts_created ON public.seo_drafts(created_at DESC);
