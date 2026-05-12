
CREATE TABLE public.boardroom_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  tokens_est integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX boardroom_chat_messages_user_created_idx
  ON public.boardroom_chat_messages (user_id, created_at);

ALTER TABLE public.boardroom_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own chat"
  ON public.boardroom_chat_messages
  FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id)
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);
