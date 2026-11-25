-- Business document metadata is accessed only by authenticated members through tenant RLS.
-- Storage objects remain in the private business-private bucket with matching organization policies.
revoke all on table public.business_documents from public, anon, authenticated;
grant select, insert, update, delete on table public.business_documents to authenticated;
grant all on table public.business_documents to service_role;
