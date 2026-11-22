-- Live tenant-isolation regression test.
-- Safe for a production database: creates only a temporary table and rolls back no business data.
-- Requires two active organizations with at least one active member each.
begin;

create temporary table monk_tenant_test_actors on commit drop as
with chosen as (
  select distinct on (om.organization_id)
    om.organization_id, om.user_id
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  where om.status = 'active' and o.deleted_at is null
  order by om.organization_id, om.created_at
),
pair as (
  select
    array_agg(organization_id order by organization_id) as orgs,
    array_agg(user_id order by organization_id) as users
  from chosen
)
select users[1] as actor_user, orgs[1] as own_org, orgs[2] as other_org
from pair
where cardinality(orgs) >= 2
union all
select users[2], orgs[2], orgs[1]
from pair
where cardinality(orgs) >= 2;

do $preflight$
begin
  if (select count(*) from pg_temp.monk_tenant_test_actors) <> 2 then
    raise exception 'Tenant isolation test requires two distinct active organizations with active users';
  end if;
end
$preflight$;

grant select on table pg_temp.monk_tenant_test_actors to authenticated;
set local role authenticated;

do $tenant_test$
declare
  actor record;
  actual_org uuid;
  cross_org_owner boolean;
  cross_org_member boolean;
  visible_orgs bigint;
  visible_members bigint;
  denied boolean;
begin
  for actor in select * from pg_temp.monk_tenant_test_actors loop
    perform set_config('request.jwt.claim.sub', actor.actor_user::text, true);

    select public.current_organization_id() into actual_org;
    if actual_org is distinct from actor.own_org then
      raise exception 'Active organization mismatch for test actor %', actor.actor_user;
    end if;

    select public.has_org_role(actor.other_org, array['owner']::text[]) into cross_org_owner;
    select public.is_org_member(actor.other_org) into cross_org_member;
    if coalesce(cross_org_owner, false) or coalesce(cross_org_member, false) then
      raise exception 'Cross-organization membership leaked for test actor %', actor.actor_user;
    end if;

    select count(*) into visible_orgs from public.organizations;
    select count(*) into visible_members from public.organization_members;
    if visible_orgs <> 1 or visible_members <> 1 then
      raise exception 'RLS returned cross-tenant rows for test actor % (organizations %, members %)',
        actor.actor_user, visible_orgs, visible_members;
    end if;

    denied := false;
    begin
      perform public.switch_organization(actor.other_org);
    exception
      when insufficient_privilege then denied := true;
      when no_data_found then denied := true;
    end;
    if not denied then
      raise exception 'Cross-tenant organization switch was unexpectedly allowed for actor %', actor.actor_user;
    end if;
  end loop;
end
$tenant_test$;

reset role;
drop table pg_temp.monk_tenant_test_actors;
commit;
