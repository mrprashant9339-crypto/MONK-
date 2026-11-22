-- Published policy content and consent evidence are append-only.
create or replace function public.monk_guard_published_policy_document()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.publication_state = 'published' then
      raise exception 'Published policy versions cannot be deleted; publish a superseding version';
    end if;
    return old;
  end if;

  if old.publication_state = 'published' then
    if new.policy_key is distinct from old.policy_key
      or new.version is distinct from old.version
      or new.title is distinct from old.title
      or new.jurisdiction is distinct from old.jurisdiction
      or new.entity_conditions is distinct from old.entity_conditions
      or new.effective_at is distinct from old.effective_at
      or new.content_markdown is distinct from old.content_markdown
      or new.content_sha256 is distinct from old.content_sha256 then
      raise exception 'Published policy content is immutable; publish a new version';
    end if;
    if new.publication_state not in ('published','retired') then
      raise exception 'Published policy can only remain published or be retired';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists monk_policy_document_immutable on public.monk_policy_documents;
create trigger monk_policy_document_immutable
before update or delete on public.monk_policy_documents
for each row execute function public.monk_guard_published_policy_document();

create or replace function public.monk_reject_audit_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Audit evidence is append-only';
end;
$$;

drop trigger if exists monk_policy_acceptance_append_only on public.monk_policy_acceptances;
create trigger monk_policy_acceptance_append_only
before update or delete on public.monk_policy_acceptances
for each row execute function public.monk_reject_audit_mutation();

drop trigger if exists monk_verification_event_append_only on public.monk_directory_verification_events;
create trigger monk_verification_event_append_only
before update or delete on public.monk_directory_verification_events
for each row execute function public.monk_reject_audit_mutation();
