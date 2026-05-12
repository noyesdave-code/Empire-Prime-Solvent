
UPDATE public.product_sourcing ps
SET suggested_price_cents = (SELECT price_cents FROM public.suggest_price_cents(ps.ai_estimated_cost_cents)),
    margin_pct = (SELECT margin_pct FROM public.suggest_price_cents(ps.ai_estimated_cost_cents)),
    updated_at = now()
WHERE ps.suggested_price_cents IS NULL
  AND ps.ai_estimated_cost_cents IS NOT NULL;
