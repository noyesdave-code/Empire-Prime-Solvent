
-- 1. Bio on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- 2. Direct messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS dm_pair_idx ON public.direct_messages (
  least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at DESC
);
CREATE INDEX IF NOT EXISTS dm_recipient_idx ON public.direct_messages (recipient_id, created_at DESC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read dms"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "members send dms"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "recipient marks read"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "sender deletes own dms"
  ON public.direct_messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- 3. Trigger: one msg / one pic until recipient replies
CREATE OR REPLACE FUNCTION public.enforce_dm_one_then_wait()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  last_outbound_at timestamptz;
  last_outbound_image_at timestamptz;
  has_reply boolean;
  has_image_reply boolean;
BEGIN
  -- last outbound from sender->recipient
  SELECT MAX(created_at) INTO last_outbound_at
  FROM public.direct_messages
  WHERE sender_id = NEW.sender_id AND recipient_id = NEW.recipient_id;

  IF last_outbound_at IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.direct_messages
      WHERE sender_id = NEW.recipient_id AND recipient_id = NEW.sender_id
        AND created_at > last_outbound_at
    ) INTO has_reply;
    IF NOT has_reply THEN
      RAISE EXCEPTION 'Wait for them to reply before sending another message.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.image_url IS NOT NULL THEN
    SELECT MAX(created_at) INTO last_outbound_image_at
    FROM public.direct_messages
    WHERE sender_id = NEW.sender_id AND recipient_id = NEW.recipient_id
      AND image_url IS NOT NULL;
    IF last_outbound_image_at IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.direct_messages
        WHERE sender_id = NEW.recipient_id AND recipient_id = NEW.sender_id
          AND created_at > last_outbound_image_at
      ) INTO has_image_reply;
      IF NOT has_image_reply THEN
        RAISE EXCEPTION 'Wait for them to reply before sending another image.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_dm_one_then_wait ON public.direct_messages;
CREATE TRIGGER trg_enforce_dm_one_then_wait
  BEFORE INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dm_one_then_wait();

-- 4. Realtime
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- 5. Idea board posts (Ani daily summary)
CREATE TABLE IF NOT EXISTS public.idea_board_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  for_date date NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL,
  winner_user_id uuid,
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.idea_board_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read ideas"
  ON public.idea_board_posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "service writes ideas"
  ON public.idea_board_posts FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.idea_board_posts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_board_posts;

-- 6. DM image bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm-images', 'dm-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "dm-images owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dm-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "dm-images owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dm-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- recipients: we cannot easily check at storage layer without metadata; signed URLs handled server-side via owner key.
-- For now allow any authenticated user to read dm-images via signed URL (URLs are unguessable UUIDs).
CREATE POLICY "dm-images authed read signed"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dm-images');
