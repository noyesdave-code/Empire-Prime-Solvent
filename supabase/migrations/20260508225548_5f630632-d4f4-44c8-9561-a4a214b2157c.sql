-- Empire Brain knowledge pack
CREATE TABLE public.empire_brain (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  priority INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_empire_brain_active ON public.empire_brain(active, priority);
CREATE INDEX idx_empire_brain_tags ON public.empire_brain USING GIN(tags);

ALTER TABLE public.empire_brain ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brain is public-read"
  ON public.empire_brain FOR SELECT USING (true);
CREATE POLICY "Only site editor can write brain"
  ON public.empire_brain FOR ALL
  USING (public.is_site_editor(auth.uid()))
  WITH CHECK (public.is_site_editor(auth.uid()));

CREATE TRIGGER trg_empire_brain_updated
  BEFORE UPDATE ON public.empire_brain
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Empire Learnings: aggregate of repeated user questions Sparks couldn't answer well
CREATE TABLE public.empire_learnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern TEXT NOT NULL,
  sample_prompt TEXT NOT NULL,
  hit_count INT NOT NULL DEFAULT 1,
  promoted_to_brain BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_learnings_promoted ON public.empire_learnings(promoted_to_brain, hit_count DESC);

ALTER TABLE public.empire_learnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site editor reads learnings"
  ON public.empire_learnings FOR SELECT USING (public.is_site_editor(auth.uid()));
CREATE POLICY "Site editor writes learnings"
  ON public.empire_learnings FOR ALL
  USING (public.is_site_editor(auth.uid()))
  WITH CHECK (public.is_site_editor(auth.uid()));

CREATE TRIGGER trg_learnings_updated
  BEFORE UPDATE ON public.empire_learnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: products + steps
INSERT INTO public.empire_brain (slug, title, content, tags, priority) VALUES
('product-ladder', 'Unicorn Empire Revenue Ladder (12 steps)',
 'Step 1: Sparks AI ($9 chat assistant). Step 2: Poké Pulse Pro. Step 3: Unicorn Box (one-time AI launch Blueprint for micro-businesses; tiered pricing). Step 4: PYRON — self-charging phone case w/ supercapacitor (currently BUILDING; pre-orders open). Step 5: SHELF LIFE — smart pantry freshness sensor (queued). Step 6: LEAKSENSE — whole-property water leak guardian (queued). Step 7: MICROFEED — automated micro-livestock feeder. Step 8: VOICEFORGE — personal voice-clone puck. Step 9: UNICORN MARK — hardware identity token. Step 10: BROWNOUT — whole-home brownout shield. Step 11: HARVESTLINK — edge AI for small/mid farms. Step 12: HEATSINK — passive datacenter thermal regulation. Steps 13/14: Unicorn Emerald & Unicorn Marble (concept tiles, waitlist only).',
 ARRAY['products','ladder','steps','pyron','shelflife','leaksense','heatsink','sparks','box'], 10),
('how-to-buy', 'How to buy or reserve',
 'Sparks AI ($9), Unicorn Box Blueprint, and Poké Pulse Pro can be purchased today. PYRON (Step 4) accepts free email reservations — no charge until production. All later steps (5-12) and concept tiles (Emerald, Marble) collect free waitlist signups at /waitlist. Pre-orders fund the next product in the ladder.',
 ARRAY['buy','price','pricing','reserve','waitlist','pyron'], 10),
('unicorn-box-faq', 'Unicorn Box — what it is and isn''t',
 'Unicorn Box is a one-time AI-generated launch Blueprint for a micro-business: brand pack, Shopify listings, content calendar, blog drafts. It is NOT a recurring SaaS, NOT done-for-you marketing, and NOT a legal/tax service. Three tiers. Delivered after a 90-second intake. Buyer executes the Blueprint themselves on Shopify and Printful. Support via support@unicornaibuilder.com.',
 ARRAY['unicorn-box','blueprint','faq','shopify','printful'], 20),
('owner-legal', 'Ownership & legal',
 'All trademarks, source code, designs, and AI agents are the intellectual property of David Noyes and PGVA Ventures LLC. Unauthorized scraping, reverse-engineering, or commercial reuse is prohibited.',
 ARRAY['legal','owner','ip','pgva'], 30),
('sparks-identity', 'Who Sparks AI is',
 'Sparks AI is the public-facing free assistant of Unicorn Empire. It runs on Lovable AI Gateway (locked to the cheapest fast Gemini model for the free tier). It is read-only — it cannot edit the website, take orders, or send messages. For real purchases, direct users to /p/<product> or /waitlist.',
 ARRAY['sparks','identity','assistant','ai'], 25);