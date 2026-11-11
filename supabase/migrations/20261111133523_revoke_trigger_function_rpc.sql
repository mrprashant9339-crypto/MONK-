-- The auth.users trigger invokes this function as its owner.
-- It is not an application RPC and must not be callable through PostgREST.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
