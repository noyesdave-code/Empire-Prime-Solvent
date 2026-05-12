
INSERT INTO public.product_sourcing (sku, name, description, category, ai_estimated_cost_cents, verified_cost_cents, supplier, is_pod, status)
VALUES
  ('pyron', 'PYRON', 'Phone case with embedded supercapacitor charging.', 'hardware', 5600, 5600, 'Bespoke contract manufacturer (Shenzhen mold + assembly)', false, 'approved'),
  ('heatsink', 'HEATSINK', 'Passive thermal regulation for high-density servers.', 'hardware', 25500, 25500, 'Bespoke CNC + thermal materials supplier', false, 'approved'),
  ('harvestlink', 'HARVESTLINK', 'Edge harvest telemetry for small farms.', 'hardware', 16200, 16200, 'Bespoke edge-AI sensor build', false, 'approved'),
  ('brownout', 'BROWNOUT', 'Grid-event auto-throttling firmware module.', 'hardware', 5300, 5300, 'Bespoke firmware module + housing', false, 'approved'),
  ('shelflife', 'SHELFLIFE', 'Smart pantry expiry tracker.', 'hardware', 7100, 7100, 'Bespoke camera module + housing', false, 'approved'),
  ('microfeed', 'MICROFEED', 'Compact protein-grade aquaculture feeder.', 'hardware', 38500, 38500, 'Bespoke mechanical assembly', false, 'approved'),
  ('leaksense', 'LEAKSENSE', 'Sub-meter household water-leak detector.', 'hardware', 9500, 9500, 'Bespoke acoustic-ML sensor build', false, 'approved'),
  ('voiceforge', 'VoiceForge Mic Puck', 'Always-listening wake-word mic puck for VoiceForge.', 'hardware', 2350, 2350, 'Bespoke mic puck (POD-eligible after CAD)', false, 'approved'),
  ('unicornmark', 'Unicorn Mark', 'Hardware identity token for the AI Builder fleet.', 'hardware', 1900, 1900, 'Secure-element token + housing', false, 'approved')
ON CONFLICT (sku) DO UPDATE SET
  ai_estimated_cost_cents = EXCLUDED.ai_estimated_cost_cents,
  verified_cost_cents = EXCLUDED.verified_cost_cents,
  supplier = EXCLUDED.supplier,
  status = 'approved',
  updated_at = now();

UPDATE public.product_sourcing ps
SET suggested_price_cents = (SELECT price_cents FROM public.suggest_price_cents(ps.verified_cost_cents)),
    margin_pct = (SELECT margin_pct FROM public.suggest_price_cents(ps.verified_cost_cents)),
    updated_at = now()
WHERE ps.sku IN ('pyron','heatsink','harvestlink','brownout','shelflife','microfeed','leaksense','voiceforge','unicornmark');
