-- 1. Profile avatar
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Community messages
CREATE TABLE IF NOT EXISTS public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_messages_nonempty CHECK (
    length(btrim(content)) > 0 OR image_url IS NOT NULL
  ),
  CONSTRAINT community_messages_content_len CHECK (length(content) <= 2000)
);

CREATE INDEX IF NOT EXISTS community_messages_created_idx
  ON public.community_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS community_messages_user_idx
  ON public.community_messages (user_id, created_at DESC);

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logged in members read community"
  ON public.community_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "members post own messages"
  ON public.community_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "members edit own messages"
  ON public.community_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "members delete own messages"
  ON public.community_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. One-pic-then-wait rule
CREATE OR REPLACE FUNCTION public.enforce_one_pic_then_wait()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_img_at timestamptz;
BEGIN
  IF NEW.image_url IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT MAX(created_at) INTO last_img_at
  FROM public.community_messages
  WHERE user_id = NEW.user_id AND image_url IS NOT NULL;

  IF last_img_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.community_messages
    WHERE created_at > last_img_at AND user_id <> NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Wait for someone else to reply before sharing another image.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_one_pic_then_wait ON public.community_messages;
CREATE TRIGGER trg_one_pic_then_wait
  BEFORE INSERT ON public.community_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_one_pic_then_wait();

-- 4. Realtime
ALTER TABLE public.community_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- 5. Storage buckets (public read; gated by app UI which requires login)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- avatars: public read, owner-only write under their uid folder
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars owner write" ON storage.objects;
CREATE POLICY "avatars owner write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars owner update" ON storage.objects;
CREATE POLICY "avatars owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars owner delete" ON storage.objects;
CREATE POLICY "avatars owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- chat-images: public read, owner-only write under their uid folder
DROP POLICY IF EXISTS "chat-images public read" ON storage.objects;
CREATE POLICY "chat-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "chat-images owner write" ON storage.objects;
CREATE POLICY "chat-images owner write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "chat-images owner delete" ON storage.objects;
CREATE POLICY "chat-images owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);