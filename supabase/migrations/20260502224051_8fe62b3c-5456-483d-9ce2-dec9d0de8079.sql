
CREATE OR REPLACE FUNCTION public.is_site_editor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE u.id = _user_id
      AND lower(u.email) = 'noyes.dave@gmail.com'
      AND ur.role = 'admin'::app_role
  );
$$;
