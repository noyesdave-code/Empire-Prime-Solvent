-- Public answer archive: anonymous Q&A turned into indexable pages
CREATE TABLE public.public_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid,
  slug text NOT NULL UNIQUE,
  question text NOT NULL,
  answer text NOT NULL,
  ai_title text,
  ai_summary text,
  tags text[] NOT NULL DEFAULT '{}',
  indexed boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_public_answers_indexed_created ON public.public_answers (indexed, created_at DESC);
CREATE INDEX idx_public_answers_slug ON public.public_answers (slug);

ALTER TABLE public.public_answers ENABLE ROW LEVEL SECURITY;

-- Public can read only indexed answers
CREATE POLICY "Public reads indexed answers"
ON public.public_answers FOR SELECT
USING (indexed = true);

-- Admin reads all
CREATE POLICY "Admin reads all answers"
ON public.public_answers FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Admin manages
CREATE POLICY "Admin manages answers"
ON public.public_answers FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Service role writes
CREATE POLICY "Service role writes answers"
ON public.public_answers FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_public_answers_updated_at
BEFORE UPDATE ON public.public_answers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();