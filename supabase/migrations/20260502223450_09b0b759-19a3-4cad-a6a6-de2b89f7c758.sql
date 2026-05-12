
CREATE TABLE public.brand_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  mark text NOT NULL CHECK (mark IN ('™','©','®')),
  category text NOT NULL CHECK (category IN ('corporation','flagship','product','developing')),
  notes text,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands are viewable by everyone"
  ON public.brand_registry FOR SELECT USING (true);

CREATE POLICY "Admins manage brands insert"
  ON public.brand_registry FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage brands update"
  ON public.brand_registry FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage brands delete"
  ON public.brand_registry FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE TRIGGER trg_brand_registry_updated
  BEFORE UPDATE ON public.brand_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.brand_registry (key, name, mark, category, notes, sort_order) VALUES
  ('pgva',  'PGVA Ventures',     '©', 'corporation', 'Founder/holding entity.', 10),
  ('uab',   'Unicorn AI Builder','™', 'flagship',    'Top-level platform brand.', 20),
  ('ubox',  'Unicorn Box',       '™', 'product',     '$97/mo solo-founder business builder.', 30),
  ('pod',   'Personal Pod',      '™', 'product',     'Steel-supply living pod product line.', 40),
  ('pulse', 'Pulse',             '™', 'product',     'Pulse health/ops signal feature.', 50),
  ('pyron', 'PYRON',             '™', 'developing',  'Investor-tier unit-economics brand.', 60);
