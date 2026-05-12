CREATE TABLE public.funnel_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'funnel_page',
  stage TEXT,
  product_interest TEXT,
  ab_cta_variant TEXT,
  user_agent TEXT,
  referrer TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a funnel lead"
  ON public.funnel_leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view funnel leads"
  ON public.funnel_leads FOR SELECT
  USING (public.is_site_editor(auth.uid()));

CREATE INDEX funnel_leads_created_at_idx ON public.funnel_leads (created_at DESC);
CREATE INDEX funnel_leads_email_idx ON public.funnel_leads (email);
CREATE INDEX funnel_leads_variant_idx ON public.funnel_leads (ab_cta_variant);