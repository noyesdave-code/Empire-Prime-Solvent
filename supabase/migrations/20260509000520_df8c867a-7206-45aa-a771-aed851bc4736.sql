
CREATE TABLE IF NOT EXISTS public.web_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_pattern text,
  status text NOT NULL DEFAULT 'pending',
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.web_research ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage research drafts" ON public.web_research;
CREATE POLICY "Admins manage research drafts"
ON public.web_research
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_web_research_status ON public.web_research(status, created_at DESC);
