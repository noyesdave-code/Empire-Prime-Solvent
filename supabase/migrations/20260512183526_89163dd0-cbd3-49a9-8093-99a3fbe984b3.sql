-- Restrict bucket reads to signed-in members
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars members read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "chat-images public read" ON storage.objects;
CREATE POLICY "chat-images members read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-images');

-- Mark buckets as private so getPublicUrl callers know to use signed URLs
UPDATE storage.buckets SET public = false WHERE id IN ('avatars', 'chat-images');

-- Switch trigger function to SECURITY INVOKER (it only reads; RLS is fine)
CREATE OR REPLACE FUNCTION public.enforce_one_pic_then_wait()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
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