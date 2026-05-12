
CREATE TABLE public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('impression','click_checkout','click_blueprint','lead','blueprint_sent')),
  stage text,
  product text,
  ab_cta_variant text,
  session_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_funnel_events_created ON public.funnel_events (created_at DESC);
CREATE INDEX idx_funnel_events_type ON public.funnel_events (event_type, ab_cta_variant);
CREATE INDEX idx_funnel_events_stage ON public.funnel_events (stage, product);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log funnel events"
ON public.funnel_events
FOR INSERT
TO public
WITH CHECK (
  event_type IN ('impression','click_checkout','click_blueprint','lead','blueprint_sent')
  AND length(coalesce(stage,'')) <= 64
  AND length(coalesce(product,'')) <= 128
  AND length(coalesce(ab_cta_variant,'')) <= 32
  AND length(coalesce(session_id,'')) <= 64
);

CREATE POLICY "Admins read funnel events"
ON public.funnel_events
FOR SELECT
TO authenticated
USING (public.is_site_editor(auth.uid()));
