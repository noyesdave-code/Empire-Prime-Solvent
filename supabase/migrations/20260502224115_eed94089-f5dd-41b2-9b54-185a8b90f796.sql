
REVOKE EXECUTE ON FUNCTION public.is_site_editor(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_site_editor(uuid) TO service_role;
