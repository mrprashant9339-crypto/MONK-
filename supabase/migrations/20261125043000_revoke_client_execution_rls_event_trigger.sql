-- Event-trigger functions are invoked by PostgreSQL's DDL event system, not by API clients.
-- Do not expose this SECURITY DEFINER function through PostgREST RPC.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
