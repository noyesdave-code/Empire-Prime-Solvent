
-- Editable cloned pages
CREATE TABLE public.boardroom_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  content_md TEXT NOT NULL DEFAULT '',
  source_url TEXT,
  category TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.boardroom_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read pages" ON public.boardroom_pages FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin write pages" ON public.boardroom_pages FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_boardroom_pages_updated
BEFORE UPDATE ON public.boardroom_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Asset registry (PDFs etc)
CREATE TABLE public.boardroom_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT,
  category TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.boardroom_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read assets" ON public.boardroom_assets FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin write assets" ON public.boardroom_assets FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_boardroom_assets_updated
BEFORE UPDATE ON public.boardroom_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Private bucket for empire files
INSERT INTO storage.buckets (id, name, public) VALUES ('empire-vault', 'empire-vault', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin read empire-vault" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'empire-vault' AND private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin write empire-vault" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'empire-vault' AND private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin update empire-vault" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'empire-vault' AND private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin delete empire-vault" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'empire-vault' AND private.has_role(auth.uid(), 'admin'::public.app_role));
