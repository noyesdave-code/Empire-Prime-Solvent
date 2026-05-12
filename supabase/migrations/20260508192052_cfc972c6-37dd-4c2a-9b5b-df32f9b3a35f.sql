
UPDATE public.product_sourcing ps
SET suggested_price_cents = (SELECT price_cents FROM public.suggest_price_cents(ps.verified_cost_cents)),
    margin_pct = (SELECT margin_pct FROM public.suggest_price_cents(ps.verified_cost_cents)),
    updated_at = now()
WHERE ps.sku IN ('pyron','heatsink','harvestlink','brownout','shelflife','microfeed','leaksense','voiceforge','unicornmark');
