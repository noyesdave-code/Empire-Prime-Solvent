ALTER TABLE public.sandbox_state
ADD CONSTRAINT sandbox_state_user_kind_unique UNIQUE (user_id, kind);