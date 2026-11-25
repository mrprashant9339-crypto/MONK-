
-- MONK Phase 6: secure business operations, commerce and accounting foundation.
-- Additive only. No existing CRM or education rows are rewritten.
begin;

insert into public.permissions(id,description) values
 ('business.branch.read','Read organization branches'),
 ('business.branch.manage','Create and update organization branches'),
 ('business.department.read','Read organization departments'),
 ('business.department.manage','Create and update organization departments'),
 ('business.deal.read','Read sales deals'),
 ('business.deal.manage','Create and update sales deals'),
 ('business.activity.read','Read business activities'),
 ('business.activity.manage','Create and update business activities'),
 ('business.product.read','Read product and service catalog'),
 ('business.product.manage','Create and update products and services'),
 ('business.inventory.read','Read warehouse and inventory balances'),
 ('business.inventory.manage','Manage warehouses and stock movements'),
 ('business.order.read','Read sales orders'),
 ('business.order.manage','Create and update sales orders'),
 ('business.invoice.read','Read invoices and payments'),
 ('business.invoice.manage','Create invoices and record payments'),
 ('business.finance.read','Read chart of accounts and financial reports'),
 ('business.finance.manage','Create and post balanced journal entries'),
 ('business.report.read','Read business reports')
on conflict(id) do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id
from public.roles r cross join public.permissions p
where
 (r.id in ('owner','admin') and p.id like 'business.%')
 or (r.id='manager' and p.id in (
  'business.branch.read','business.branch.manage','business.department.read','business.department.manage',
  'business.deal.read','business.deal.manage','business.activity.read','business.activity.manage',
  'business.product.read','business.product.manage','business.inventory.read','business.inventory.manage',
  'business.order.read','business.order.manage','business.invoice.read','business.invoice.manage',
  'business.finance.read','business.report.read'))
 or (r.id='sales' and p.id in (
  'business.deal.read','business.deal.manage','business.activity.read','business.activity.manage',
  'business.product.read','business.order.read','business.invoice.read','business.report.read'))
 or (r.id='auditor' and p.id in (
  'business.branch.read','business.department.read','business.deal.read','business.activity.read',
  'business.product.read','business.inventory.read','business.order.read','business.invoice.read',
  'business.finance.read','business.report.read'))
on conflict(role_id,permission_id) do nothing;

create table if not exists public.business_branches(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 code text not null, name text not null, address text, city text, state text, country text not null default 'IN',
 status text not null default 'active' check(status in ('active','inactive')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(organization_id,id), unique(organization_id,code),
 check(length(trim(name)) between 2 and 120), check(code ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$')
);

create table if not exists public.business_departments(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 branch_id uuid, code text not null, name text not null, description text,
 manager_member_id uuid, status text not null default 'active' check(status in ('active','inactive')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(organization_id,id), unique(organization_id,code),
 foreign key(branch_id,organization_id) references public.business_branches(id,organization_id),
 foreign key(manager_member_id,organization_id) references public.organization_members(id,organization_id),
 check(length(trim(name)) between 2 and 120), check(code ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$')
);

create table if not exists public.business_deals(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null, description text, lead_id uuid, company_id uuid, contact_id uuid, owner_member_id uuid,
 stage text not null default 'qualification' check(stage in ('qualification','discovery','proposal','negotiation','closed_won','closed_lost')),
 status text not null default 'open' check(status in ('open','won','lost')),
 amount numeric(18,2) not null default 0 check(amount>=0), currency text not null default 'INR' check(currency ~ '^[A-Z]{3}$'),
 probability smallint not null default 10 check(probability between 0 and 100),
 expected_close_date date, lost_reason text, created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(organization_id,id),
 foreign key(lead_id,organization_id) references public.leads(id,organization_id),
 foreign key(company_id,organization_id) references public.companies(id,organization_id),
 foreign key(contact_id,organization_id) references public.contacts(id,organization_id),
 foreign key(owner_member_id,organization_id) references public.organization_members(id,organization_id),
 check(length(trim(title)) between 2 and 180),
 check((status<>'won' or stage='closed_won') and (status<>'lost' or stage='closed_lost'))
);

create table if not exists public.business_activities(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 deal_id uuid, lead_id uuid, contact_id uuid, company_id uuid, owner_member_id uuid,
 kind text not null check(kind in ('call','email','meeting','task','note','follow_up')),
 subject text not null, body text, due_at timestamptz, completed_at timestamptz,
 status text not null default 'open' check(status in ('open','completed','cancelled')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
 foreign key(deal_id,organization_id) references public.business_deals(id,organization_id),
 foreign key(lead_id,organization_id) references public.leads(id,organization_id),
 foreign key(contact_id,organization_id) references public.contacts(id,organization_id),
 foreign key(company_id,organization_id) references public.companies(id,organization_id),
 foreign key(owner_member_id,organization_id) references public.organization_members(id,organization_id),
 check(length(trim(subject)) between 2 and 180)
);

create table if not exists public.business_products(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 sku text not null, name text not null, description text,
 product_type text not null default 'product' check(product_type in ('product','service')),
 unit text not null default 'unit', currency text not null default 'INR' check(currency ~ '^[A-Z]{3}$'),
 unit_price numeric(18,2) not null default 0 check(unit_price>=0),
 unit_cost numeric(18,2) not null default 0 check(unit_cost>=0),
 tax_rate numeric(6,3) not null default 0 check(tax_rate between 0 and 100),
 status text not null default 'active' check(status in ('active','inactive')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(organization_id,id), unique(organization_id,sku),
 check(length(trim(name)) between 2 and 180), check(length(trim(sku)) between 1 and 40)
);

create table if not exists public.business_warehouses(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 code text not null, name text not null, address text, city text, state text,
 status text not null default 'active' check(status in ('active','inactive')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(organization_id,id), unique(organization_id,code),
 check(length(trim(name)) between 2 and 120), check(length(trim(code)) between 2 and 24)
);

create table if not exists public.business_inventory_movements(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 product_id uuid not null, warehouse_id uuid not null,
 movement_type text not null check(movement_type in ('opening','receipt','issue','adjustment_in','adjustment_out')),
 quantity numeric(18,3) not null check(quantity>0),
 unit_cost numeric(18,2) not null default 0 check(unit_cost>=0),
 reference text, notes text, created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 foreign key(product_id,organization_id) references public.business_products(id,organization_id),
 foreign key(warehouse_id,organization_id) references public.business_warehouses(id,organization_id)
);

create table if not exists public.business_orders(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 order_number text not null, company_id uuid, contact_id uuid,
 status text not null default 'draft' check(status in ('draft','confirmed','fulfilled','cancelled')),
 currency text not null default 'INR' check(currency ~ '^[A-Z]{3}$'),
 subtotal numeric(18,2) not null default 0 check(subtotal>=0),
 tax_total numeric(18,2) not null default 0 check(tax_total>=0),
 discount_total numeric(18,2) not null default 0 check(discount_total>=0),
 total numeric(18,2) not null default 0 check(total>=0),
 notes text, order_date date not null default current_date, created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(organization_id,id), unique(organization_id,order_number),
 foreign key(company_id,organization_id) references public.companies(id,organization_id),
 foreign key(contact_id,organization_id) references public.contacts(id,organization_id),
 check(discount_total<=subtotal+tax_total)
);

create table if not exists public.business_order_items(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 order_id uuid not null, product_id uuid,
 description text not null, quantity numeric(18,3) not null check(quantity>0),
 unit_price numeric(18,2) not null check(unit_price>=0),
 tax_rate numeric(6,3) not null default 0 check(tax_rate between 0 and 100),
 line_subtotal numeric(18,2) not null check(line_subtotal>=0),
 tax_amount numeric(18,2) not null check(tax_amount>=0),
 line_total numeric(18,2) not null check(line_total>=0),
 foreign key(order_id,organization_id) references public.business_orders(id,organization_id) on delete cascade,
 foreign key(product_id,organization_id) references public.business_products(id,organization_id)
);

create table if not exists public.business_invoices(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 invoice_number text not null, order_id uuid, company_id uuid, contact_id uuid,
 status text not null default 'draft' check(status in ('draft','issued','partially_paid','paid','overdue','void')),
 currency text not null default 'INR' check(currency ~ '^[A-Z]{3}$'),
 subtotal numeric(18,2) not null default 0 check(subtotal>=0),
 tax_total numeric(18,2) not null default 0 check(tax_total>=0),
 total numeric(18,2) not null default 0 check(total>=0),
 amount_paid numeric(18,2) not null default 0 check(amount_paid>=0 and amount_paid<=total),
 issue_date date, due_date date, notes text, created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(organization_id,id), unique(organization_id,invoice_number),
 foreign key(order_id,organization_id) references public.business_orders(id,organization_id),
 foreign key(company_id,organization_id) references public.companies(id,organization_id),
 foreign key(contact_id,organization_id) references public.contacts(id,organization_id)
);

create table if not exists public.business_invoice_items(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 invoice_id uuid not null, product_id uuid,
 description text not null, quantity numeric(18,3) not null check(quantity>0),
 unit_price numeric(18,2) not null check(unit_price>=0),
 tax_rate numeric(6,3) not null default 0 check(tax_rate between 0 and 100),
 line_subtotal numeric(18,2) not null check(line_subtotal>=0),
 tax_amount numeric(18,2) not null check(tax_amount>=0),
 line_total numeric(18,2) not null check(line_total>=0),
 foreign key(invoice_id,organization_id) references public.business_invoices(id,organization_id) on delete cascade,
 foreign key(product_id,organization_id) references public.business_products(id,organization_id)
);

create table if not exists public.business_payments(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 invoice_id uuid not null, amount numeric(18,2) not null check(amount>0),
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 payment_method text not null check(payment_method in ('bank_transfer','cash','card','upi','cheque','other')),
 reference text, received_at timestamptz not null default now(), created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 foreign key(invoice_id,organization_id) references public.business_invoices(id,organization_id)
);

create table if not exists public.business_finance_accounts(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 code text not null, name text not null,
 account_type text not null check(account_type in ('asset','liability','equity','income','expense')),
 currency text not null default 'INR' check(currency ~ '^[A-Z]{3}$'),
 is_active boolean not null default true,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(organization_id,id), unique(organization_id,code),
 check(length(trim(name)) between 2 and 120), check(length(trim(code)) between 2 and 20)
);

create table if not exists public.business_journal_entries(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 reference text, description text not null, entry_date date not null default current_date,
 status text not null default 'draft' check(status in ('draft','posted')),
 posted_at timestamptz, created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 unique(organization_id,id)
);

create table if not exists public.business_journal_lines(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 journal_entry_id uuid not null, account_id uuid not null,
 description text, debit numeric(18,2) not null default 0 check(debit>=0),
 credit numeric(18,2) not null default 0 check(credit>=0),
 foreign key(journal_entry_id,organization_id) references public.business_journal_entries(id,organization_id) on delete cascade,
 foreign key(account_id,organization_id) references public.business_finance_accounts(id,organization_id),
 check((debit>0 and credit=0) or (credit>0 and debit=0))
);

create index if not exists business_deals_org_stage_idx on public.business_deals(organization_id,stage) where deleted_at is null;
create index if not exists business_activities_org_due_idx on public.business_activities(organization_id,due_at) where status='open';
create index if not exists business_products_org_status_idx on public.business_products(organization_id,status) where deleted_at is null;
create index if not exists business_inventory_product_warehouse_idx on public.business_inventory_movements(organization_id,product_id,warehouse_id,created_at);
create index if not exists business_orders_org_date_idx on public.business_orders(organization_id,order_date desc) where deleted_at is null;
create index if not exists business_invoices_org_due_idx on public.business_invoices(organization_id,due_date) where deleted_at is null;
create index if not exists business_payments_invoice_idx on public.business_payments(organization_id,invoice_id,received_at);
create index if not exists business_journal_entries_org_date_idx on public.business_journal_entries(organization_id,entry_date desc);
create index if not exists business_journal_lines_entry_idx on public.business_journal_lines(organization_id,journal_entry_id);

do $policies$
declare r record;
begin
 for r in select * from (values
  ('business_branches','business.branch.read','business.branch.manage',true),
  ('business_departments','business.department.read','business.department.manage',true),
  ('business_deals','business.deal.read','business.deal.manage',true),
  ('business_activities','business.activity.read','business.activity.manage',true),
  ('business_products','business.product.read','business.product.manage',true),
  ('business_warehouses','business.inventory.read','business.inventory.manage',true),
  ('business_inventory_movements','business.inventory.read','business.inventory.manage',false),
  ('business_orders','business.order.read','business.order.manage',true),
  ('business_order_items','business.order.read','business.order.manage',false),
  ('business_invoices','business.invoice.read','business.invoice.manage',true),
  ('business_invoice_items','business.invoice.read','business.invoice.manage',false),
  ('business_payments','business.invoice.read','business.invoice.manage',false),
  ('business_finance_accounts','business.finance.read','business.finance.manage',true),
  ('business_journal_entries','business.finance.read','business.finance.manage',true),
  ('business_journal_lines','business.finance.read','business.finance.manage',false)
 ) as x(tbl,read_perm,write_perm,can_update)
 loop
  execute format('alter table public.%I enable row level security',r.tbl);
  execute format('grant select, insert, update on public.%I to authenticated',r.tbl);
  execute format('revoke all on public.%I from anon',r.tbl);
  execute format('create policy %I on public.%I for select to authenticated using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,%L))',r.tbl||'_tenant_read',r.tbl,r.read_perm);
  execute format('create policy %I on public.%I for insert to authenticated with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,%L))',r.tbl||'_tenant_insert',r.tbl,r.write_perm);
  if r.can_update then
   execute format('create policy %I on public.%I for update to authenticated using (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,%L)) with check (organization_id=public.current_organization_id() and public.has_org_permission(organization_id,%L))',r.tbl||'_tenant_update',r.tbl,r.write_perm,r.write_perm);
  end if;
 end loop;
end;
$policies$;

create or replace function public.business_set_updated_at()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin new.updated_at=now(); return new; end; $$;
revoke all on function public.business_set_updated_at() from public,anon,authenticated;

do $triggers$
declare t text;
begin
 foreach t in array array['business_branches','business_departments','business_deals','business_activities','business_products','business_warehouses','business_orders','business_invoices','business_finance_accounts'] loop
  execute format('drop trigger if exists %I on public.%I',t||'_updated_at',t);
  execute format('create trigger %I before update on public.%I for each row execute function public.business_set_updated_at()',t||'_updated_at',t);
 end loop;
end;
$triggers$;

create or replace view public.business_inventory_balances with (security_invoker=true) as
select organization_id,product_id,warehouse_id,
 sum(case when movement_type in ('opening','receipt','adjustment_in') then quantity else -quantity end)::numeric(18,3) as on_hand,
 max(created_at) as last_movement_at
from public.business_inventory_movements
group by organization_id,product_id,warehouse_id;
grant select on public.business_inventory_balances to authenticated;
revoke all on public.business_inventory_balances from anon;

create or replace function public.business_adjust_inventory(
 p_product_id uuid,p_warehouse_id uuid,p_movement_type text,p_quantity numeric,
 p_unit_cost numeric default 0,p_reference text default null,p_notes text default null
) returns uuid language plpgsql set search_path=public,pg_temp as $$
declare org_id uuid:=public.current_organization_id(); available numeric(18,3); result_id uuid;
begin
 if auth.uid() is null or org_id is null or not public.has_org_permission(org_id,'business.inventory.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
 if p_quantity is null or p_quantity<=0 or p_quantity>1000000000 then raise exception 'Quantity must be greater than zero' using errcode='22023'; end if;
 if p_movement_type not in ('opening','receipt','issue','adjustment_in','adjustment_out') then raise exception 'Invalid movement type' using errcode='22023'; end if;
 perform 1 from public.business_products where id=p_product_id and organization_id=org_id and deleted_at is null for update;
 if not found then raise exception 'Product not found' using errcode='P0002'; end if;
 perform 1 from public.business_warehouses where id=p_warehouse_id and organization_id=org_id and status='active' and deleted_at is null;
 if not found then raise exception 'Active warehouse not found' using errcode='P0002'; end if;
 select coalesce(sum(case when movement_type in ('opening','receipt','adjustment_in') then quantity else -quantity end),0)
 into available from public.business_inventory_movements where organization_id=org_id and product_id=p_product_id and warehouse_id=p_warehouse_id;
 if p_movement_type in ('issue','adjustment_out') and p_quantity>available then raise exception 'Insufficient stock. Available: %',available using errcode='22023'; end if;
 insert into public.business_inventory_movements(organization_id,product_id,warehouse_id,movement_type,quantity,unit_cost,reference,notes,created_by)
 values(org_id,p_product_id,p_warehouse_id,p_movement_type,p_quantity,coalesce(p_unit_cost,0),nullif(trim(p_reference),''),nullif(trim(p_notes),''),auth.uid())
 returning id into result_id;
 return result_id;
end; $$;
revoke all on function public.business_adjust_inventory(uuid,uuid,text,numeric,numeric,text,text) from public,anon;
grant execute on function public.business_adjust_inventory(uuid,uuid,text,numeric,numeric,text,text) to authenticated;

create or replace function public.business_create_order(
 p_company_id uuid,p_contact_id uuid,p_currency text,p_notes text,p_items jsonb
) returns uuid language plpgsql set search_path=public,pg_temp as $$
declare org_id uuid:=public.current_organization_id(); order_id uuid; order_no text; v_subtotal numeric(18,2):=0; v_taxes numeric(18,2):=0; item jsonb; qty numeric; price numeric; rate numeric; sub numeric; tax numeric; product_row public.business_products;
begin
 if auth.uid() is null or org_id is null or not public.has_org_permission(org_id,'business.order.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
 if coalesce(jsonb_typeof(p_items),'')<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then raise exception 'Provide between 1 and 100 order items' using errcode='22023'; end if;
 if p_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid currency' using errcode='22023'; end if;
 if p_company_id is not null and not exists(select 1 from public.companies where id=p_company_id and organization_id=org_id and deleted_at is null) then raise exception 'Company not found' using errcode='P0002'; end if;
 if p_contact_id is not null and not exists(select 1 from public.contacts where id=p_contact_id and organization_id=org_id and deleted_at is null) then raise exception 'Contact not found' using errcode='P0002'; end if;
 order_no:='SO-'||to_char(current_date,'YYYYMM')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
 insert into public.business_orders(organization_id,order_number,company_id,contact_id,currency,notes,created_by)
 values(org_id,order_no,p_company_id,p_contact_id,p_currency,nullif(trim(p_notes),''),auth.uid()) returning id into order_id;
 for item in select value from jsonb_array_elements(p_items) loop
  qty:=nullif(item->>'quantity','')::numeric; price:=nullif(item->>'unit_price','')::numeric; rate:=coalesce(nullif(item->>'tax_rate','')::numeric,0);
  if qty is null or qty<=0 or qty>1000000000 or price is null or price<0 or rate<0 or rate>100 then raise exception 'Invalid order line values' using errcode='22023'; end if;
  if nullif(item->>'product_id','') is not null then
   select * into product_row from public.business_products where id=(item->>'product_id')::uuid and organization_id=org_id and deleted_at is null;
   if product_row.id is null then raise exception 'Product not found in this organization' using errcode='P0002'; end if;
  end if;
  sub:=round(qty*price,2); tax:=round(sub*rate/100,2); v_subtotal:=v_subtotal+sub; v_taxes:=v_taxes+tax;
  insert into public.business_order_items(organization_id,order_id,product_id,description,quantity,unit_price,tax_rate,line_subtotal,tax_amount,line_total)
  values(org_id,order_id,nullif(item->>'product_id','')::uuid,coalesce(nullif(trim(item->>'description'),''),product_row.name,'Custom item'),qty,price,rate,sub,tax,sub+tax);
  product_row:=null;
 end loop;
 update public.business_orders set subtotal=v_subtotal,tax_total=v_taxes,total=v_subtotal+v_taxes where id=order_id and organization_id=org_id;
 return order_id;
end; $$;
revoke all on function public.business_create_order(uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function public.business_create_order(uuid,uuid,text,text,jsonb) to authenticated;

create or replace function public.business_create_invoice_from_order(p_order_id uuid,p_due_date date default null)
returns uuid language plpgsql set search_path=public,pg_temp as $$
declare org_id uuid:=public.current_organization_id(); o public.business_orders; invoice_id uuid; invoice_no text;
begin
 if auth.uid() is null or org_id is null or not public.has_org_permission(org_id,'business.invoice.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
 select * into o from public.business_orders where id=p_order_id and organization_id=org_id and deleted_at is null for update;
 if o.id is null then raise exception 'Order not found' using errcode='P0002'; end if;
 if o.status='cancelled' then raise exception 'Cannot invoice a cancelled order' using errcode='22023'; end if;
 if exists(select 1 from public.business_invoices where order_id=o.id and organization_id=org_id and status<>'void') then raise exception 'An active invoice already exists for this order' using errcode='23505'; end if;
 invoice_no:='INV-'||to_char(current_date,'YYYYMM')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
 insert into public.business_invoices(organization_id,invoice_number,order_id,company_id,contact_id,status,currency,subtotal,tax_total,total,issue_date,due_date,created_by)
 values(org_id,invoice_no,o.id,o.company_id,o.contact_id,'issued',o.currency,o.subtotal,o.tax_total,o.total,current_date,p_due_date,auth.uid()) returning id into invoice_id;
 insert into public.business_invoice_items(organization_id,invoice_id,product_id,description,quantity,unit_price,tax_rate,line_subtotal,tax_amount,line_total)
 select organization_id,invoice_id,product_id,description,quantity,unit_price,tax_rate,line_subtotal,tax_amount,line_total from public.business_order_items where order_id=o.id and organization_id=org_id;
 if o.status='draft' then update public.business_orders set status='confirmed' where id=o.id and organization_id=org_id; end if;
 return invoice_id;
end; $$;
revoke all on function public.business_create_invoice_from_order(uuid,date) from public,anon;
grant execute on function public.business_create_invoice_from_order(uuid,date) to authenticated;

create or replace function public.business_record_payment(
 p_invoice_id uuid,p_amount numeric,p_currency text,p_method text,p_reference text default null
) returns uuid language plpgsql set search_path=public,pg_temp as $$
declare org_id uuid:=public.current_organization_id(); inv public.business_invoices; payment_id uuid; next_paid numeric(18,2);
begin
 if auth.uid() is null or org_id is null or not public.has_org_permission(org_id,'business.invoice.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
 if p_amount is null or p_amount<=0 or p_amount>1000000000000 then raise exception 'Payment amount must be greater than zero' using errcode='22023'; end if;
 select * into inv from public.business_invoices where id=p_invoice_id and organization_id=org_id and deleted_at is null for update;
 if inv.id is null then raise exception 'Invoice not found' using errcode='P0002'; end if;
 if inv.status in ('draft','void') then raise exception 'Invoice is not payable' using errcode='22023'; end if;
 if p_currency<>inv.currency then raise exception 'Payment currency must match invoice currency' using errcode='22023'; end if;
 if inv.amount_paid+p_amount>inv.total then raise exception 'Payment exceeds outstanding invoice balance' using errcode='22023'; end if;
 insert into public.business_payments(organization_id,invoice_id,amount,currency,payment_method,reference,created_by)
 values(org_id,inv.id,p_amount,p_currency,p_method,nullif(trim(p_reference),''),auth.uid()) returning id into payment_id;
 next_paid:=inv.amount_paid+p_amount;
 update public.business_invoices set amount_paid=next_paid,status=case when next_paid=total then 'paid' else 'partially_paid' end,updated_at=now()
 where id=inv.id and organization_id=org_id;
 return payment_id;
end; $$;
revoke all on function public.business_record_payment(uuid,numeric,text,text,text) from public,anon;
grant execute on function public.business_record_payment(uuid,numeric,text,text,text) to authenticated;

create or replace function public.business_create_journal_entry(
 p_entry_date date,p_description text,p_reference text,p_lines jsonb
) returns uuid language plpgsql set search_path=public,pg_temp as $$
declare org_id uuid:=public.current_organization_id(); entry_id uuid; line jsonb; debit_total numeric(18,2); credit_total numeric(18,2); line_count integer;
begin
 if auth.uid() is null or org_id is null or not public.has_org_permission(org_id,'business.finance.manage') then raise exception 'Permission denied' using errcode='42501'; end if;
 if length(trim(coalesce(p_description,''))) not between 2 and 500 then raise exception 'Description must contain 2–500 characters' using errcode='22023'; end if;
 if coalesce(jsonb_typeof(p_lines),'')<>'array' or jsonb_array_length(p_lines)<2 or jsonb_array_length(p_lines)>100 then raise exception 'A journal requires 2–100 lines' using errcode='22023'; end if;
 insert into public.business_journal_entries(organization_id,reference,description,entry_date,status,created_by)
 values(org_id,nullif(trim(p_reference),''),trim(p_description),coalesce(p_entry_date,current_date),'draft',auth.uid()) returning id into entry_id;
 for line in select value from jsonb_array_elements(p_lines) loop
  if not exists(select 1 from public.business_finance_accounts where id=(line->>'account_id')::uuid and organization_id=org_id and is_active and deleted_at is null) then raise exception 'Journal account not found or inactive' using errcode='P0002'; end if;
  insert into public.business_journal_lines(organization_id,journal_entry_id,account_id,description,debit,credit)
  values(org_id,entry_id,(line->>'account_id')::uuid,nullif(trim(line->>'description'),''),coalesce(nullif(line->>'debit','')::numeric,0),coalesce(nullif(line->>'credit','')::numeric,0));
 end loop;
 select count(*),coalesce(sum(debit),0),coalesce(sum(credit),0) into line_count,debit_total,credit_total from public.business_journal_lines where journal_entry_id=entry_id and organization_id=org_id;
 if line_count<2 or debit_total<=0 or debit_total<>credit_total then raise exception 'Journal entry must balance: total debit must equal total credit' using errcode='22023'; end if;
 update public.business_journal_entries set status='posted',posted_at=now() where id=entry_id and organization_id=org_id;
 return entry_id;
end; $$;
revoke all on function public.business_create_journal_entry(date,text,text,jsonb) from public,anon;
grant execute on function public.business_create_journal_entry(date,text,text,jsonb) to authenticated;

create or replace function public.business_protect_posted_journal()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare entry_status text;
begin
 if tg_table_name='business_journal_entries' then
  if old.status='posted' then raise exception 'Posted journal entries are immutable' using errcode='55000'; end if;
  return new;
 end if;
 select status into entry_status from public.business_journal_entries where id=coalesce(new.journal_entry_id,old.journal_entry_id) and organization_id=coalesce(new.organization_id,old.organization_id);
 if entry_status='posted' then raise exception 'Lines belonging to posted journal entries are immutable' using errcode='55000'; end if;
 return coalesce(new,old);
end; $$;
revoke all on function public.business_protect_posted_journal() from public,anon,authenticated;
drop trigger if exists business_posted_journal_guard on public.business_journal_entries;
create trigger business_posted_journal_guard before update or delete on public.business_journal_entries for each row execute function public.business_protect_posted_journal();
drop trigger if exists business_posted_journal_line_guard on public.business_journal_lines;
create trigger business_posted_journal_line_guard before update or delete on public.business_journal_lines for each row execute function public.business_protect_posted_journal();

create or replace view public.business_finance_trial_balance with (security_invoker=true) as
select a.organization_id,a.id as account_id,a.code,a.name,a.account_type,a.currency,
 coalesce(sum(case when e.status='posted' then l.debit else 0 end),0)::numeric(18,2) as total_debit,
 coalesce(sum(case when e.status='posted' then l.credit else 0 end),0)::numeric(18,2) as total_credit,
 coalesce(sum(case when e.status='posted' then l.debit-l.credit else 0 end),0)::numeric(18,2) as net_movement
from public.business_finance_accounts a
left join public.business_journal_lines l on l.account_id=a.id and l.organization_id=a.organization_id
left join public.business_journal_entries e on e.id=l.journal_entry_id and e.organization_id=l.organization_id and e.status='posted'
where a.deleted_at is null
group by a.organization_id,a.id,a.code,a.name,a.account_type,a.currency;
grant select on public.business_finance_trial_balance to authenticated;
revoke all on public.business_finance_trial_balance from anon;

commit;
