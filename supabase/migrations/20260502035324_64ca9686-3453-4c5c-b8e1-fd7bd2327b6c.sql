
-- Enable pgvector for semantic memory
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. PROMPTS: every interaction with the brain
CREATE TABLE public.prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  skill TEXT,
  prompt TEXT NOT NULL,
  response TEXT,
  model_used TEXT,
  latency_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  source TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prompts_user ON public.prompts(user_id);
CREATE INDEX idx_prompts_skill ON public.prompts(skill);
CREATE INDEX idx_prompts_created ON public.prompts(created_at DESC);

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert prompts"
  ON public.prompts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "users see own prompts"
  ON public.prompts FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- 2. MEMORY VECTORS: pgvector retrieval layer
CREATE TABLE public.memory_vectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  skill TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_user ON public.memory_vectors(user_id);
CREATE INDEX idx_memory_skill ON public.memory_vectors(skill);

ALTER TABLE public.memory_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert memory"
  ON public.memory_vectors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "users see own memory"
  ON public.memory_vectors FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- 3. ROUTING LOG: how the brain chose its model
CREATE TABLE public.routing_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE,
  task_type TEXT,
  chosen_model TEXT NOT NULL,
  reason TEXT,
  candidates JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.routing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert routing log"
  ON public.routing_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "routing log readable"
  ON public.routing_log FOR SELECT
  USING (true);

-- 4. SKILLS REGISTRY: catalog of brain capabilities
CREATE TABLE public.skills_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  preferred_model TEXT,
  system_prompt TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skills_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skills registry public read"
  ON public.skills_registry FOR SELECT
  USING (true);

-- Seed the first skills
INSERT INTO public.skills_registry (slug, name, description, preferred_model, system_prompt) VALUES
  ('business-builder', 'Business Builder', 'Turns a one-line idea into a launch-ready niche business plan with revenue model, first 3 offers, and a 7-day execution checklist.', 'google/gemini-3-flash-preview',
   'You are Unicorn AI Builder — the Empire''s flagship business-builder. Take any idea and return: (1) one-line positioning, (2) target ICP, (3) 3 revenue streams ranked by speed-to-cash, (4) a 7-day execution checklist with daily tasks. Be specific, no fluff. End with one bold next-step CTA.'),
  ('trend-scout', 'Trend Scout', 'Surfaces rising niches and product opportunities before they peak. Pulls patterns from prior prompts to spot signal early.', 'google/gemini-3-flash-preview',
   'You are Trend Scout — Unicorn Empire''s trend prediction agent. Given a niche or keyword, return: (1) 3 rising sub-niches with momentum signals, (2) why now (the catalyst), (3) the first product to ship, (4) where the early audience lives online. Concrete, actionable, no generic advice.'),
  ('revenue-coach', 'Revenue Coach', 'Diagnoses why an offer isn''t converting and prescribes the next 3 changes to try.', 'openai/gpt-5-mini',
   'You are Revenue Coach. The user describes an offer or funnel that isn''t converting. Diagnose the top 3 friction points, prescribe the exact next 3 changes (in priority order), and give a 48-hour test plan. Reference real conversion-optimization patterns.'),
  ('content-engine', 'Content Engine', 'Generates a week of on-brand content (hooks, posts, captions) from a single brand prompt.', 'google/gemini-3-flash-preview',
   'You are the Content Engine. Given a brand and audience, output a 7-day content calendar: 7 hook-driven posts, each with platform (X/LinkedIn/TikTok), the hook, the body, and the CTA. Match the brand voice exactly.');
