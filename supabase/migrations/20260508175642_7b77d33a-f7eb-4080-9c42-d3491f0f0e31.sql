DROP POLICY "Anyone can log funnel events" ON public.funnel_events;

CREATE POLICY "Anyone can log funnel events"
ON public.funnel_events
FOR INSERT
TO public
WITH CHECK (
  event_type = ANY (ARRAY[
    'impression'::text,
    'click_checkout'::text,
    'click_blueprint'::text,
    'lead'::text,
    'blueprint_sent'::text,
    'email_entered'::text,
    'checkout_opened'::text,
    'checkout_paid'::text
  ])
  AND length(COALESCE(stage, ''::text)) <= 64
  AND length(COALESCE(product, ''::text)) <= 128
  AND length(COALESCE(ab_cta_variant, ''::text)) <= 32
  AND length(COALESCE(session_id, ''::text)) <= 64
);