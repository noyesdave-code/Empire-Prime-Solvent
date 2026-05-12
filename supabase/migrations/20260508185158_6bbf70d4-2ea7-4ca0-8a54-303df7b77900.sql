
-- product_sourcing: COGS + auto-pricing per SKU
CREATE TABLE public.product_sourcing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  ai_estimated_cost_cents integer,
  verified_cost_cents integer,
  supplier text,
  supplier_url text,
  printful_variant_id text,
  is_pod boolean NOT NULL DEFAULT false,
  suggested_price_cents integer,
  margin_pct numeric(5,2),
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_sourcing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage product_sourcing" ON public.product_sourcing FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "service role writes product_sourcing" ON public.product_sourcing FOR ALL
  USING (auth.role()='service_role') WITH CHECK (auth.role()='service_role');
CREATE TRIGGER trg_product_sourcing_updated BEFORE UPDATE ON public.product_sourcing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- orders: every paid Paddle order
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paddle_order_id text UNIQUE,
  user_id uuid,
  email text NOT NULL,
  product_id text NOT NULL,
  sku text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  shipping_address jsonb,
  fulfillment_status text NOT NULL DEFAULT 'pending',
  environment text NOT NULL DEFAULT 'sandbox',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read all orders" ON public.orders FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "users read own orders" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "service role writes orders" ON public.orders FOR ALL
  USING (auth.role()='service_role') WITH CHECK (auth.role()='service_role');
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- fulfillment_queue
CREATE TABLE public.fulfillment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  route text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  printful_order_id text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fulfillment_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage fulfillment" ON public.fulfillment_queue FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "service role writes fulfillment" ON public.fulfillment_queue FOR ALL
  USING (auth.role()='service_role') WITH CHECK (auth.role()='service_role');
CREATE TRIGGER trg_fulfillment_queue_updated BEFORE UPDATE ON public.fulfillment_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tiered margin: 20% <$25, 15% $25-$100, 10% $100-$500, 5% >$500
-- Always at least $5 profit on top of cost
CREATE OR REPLACE FUNCTION public.suggest_price_cents(_cost_cents integer)
RETURNS TABLE(price_cents integer, margin_pct numeric)
LANGUAGE plpgsql IMMUTABLE
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
