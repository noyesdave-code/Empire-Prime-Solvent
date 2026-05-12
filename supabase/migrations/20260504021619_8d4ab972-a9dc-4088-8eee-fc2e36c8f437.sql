-- Sandbox state: admin-only persistence for Unicorn AI sandbox (chat + canvas drafts)
CREATE TABLE IF NOT EXISTS public.sandbox_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('chat','canvas')),
  content text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sandbox_state_user_kind ON public.sandbox_state(user_id, kind, created_at);

ALTER TABLE public.sandbox_state ENABLE ROW LEVEL SECURITY;

-- Admin-only, scoped to own rows. Mirrors boardroom_chat_messages policy shape.
CREATE POLICY "Admins manage own sandbox state"
ON public.sandbox_state
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id)
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE TRIGGER trg_sandbox_state_updated
BEFORE UPDATE ON public.sandbox_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();