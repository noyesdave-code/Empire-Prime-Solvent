revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.has_active_subscription(uuid, text) from anon, public;
-- keep authenticated execute on has_active_subscription so client can call it
grant execute on function public.has_active_subscription(uuid, text) to authenticated;