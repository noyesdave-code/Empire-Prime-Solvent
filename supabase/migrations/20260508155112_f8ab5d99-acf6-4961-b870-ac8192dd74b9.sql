DROP POLICY "Anyone can submit a funnel lead" ON public.funnel_leads;

CREATE POLICY "Anyone can submit a valid funnel lead"
  ON public.funnel_leads FOR INSERT
  WITH CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(email) <= 255
    AND length(coalesce(source, '')) <= 64
    AND length(coalesce(stage, '')) <= 64
    AND length(coalesce(product_interest, '')) <= 128
    AND length(coalesce(ab_cta_variant, '')) <= 32
    AND length(coalesce(user_agent, '')) <= 512
    AND length(coalesce(referrer, '')) <= 512
  );