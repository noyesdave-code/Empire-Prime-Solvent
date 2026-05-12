CREATE OR REPLACE FUNCTION public.suggest_price_cents(_cost_cents integer)
RETURNS TABLE(price_cents integer, margin_pct numeric)
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  c numeric := _cost_cents;
  pct numeric;
  p numeric;
BEGIN
  IF c IS NULL OR c <= 0 THEN
    RETURN QUERY SELECT NULL::integer, NULL::numeric; RETURN;
  END IF;
  pct := CASE
    WHEN c < 2500 THEN 0.20
    WHEN c < 10000 THEN 0.15
    WHEN c < 50000 THEN 0.10
    ELSE 0.05
  END;
  p := c * (1 + pct);
  IF p - c < 500 THEN p := c + 500; END IF;
  RETURN QUERY SELECT ceil(p)::integer, round(pct*100,2);
END;
$$;