
begin;

create or replace function public.business_fulfill_order(p_order_id uuid,p_warehouse_id uuid)
returns boolean language plpgsql set search_path=public,pg_temp as $$
declare
 org_id uuid:=public.current_organization_id();
 o public.business_orders;
 item record;
 available numeric(18,3);
begin
 if auth.uid() is null or org_id is null
   or not public.has_org_permission(org_id,'business.order.manage')
   or not public.has_org_permission(org_id,'business.inventory.manage') then
  raise exception 'Permission denied' using errcode='42501';
 end if;
 select * into o from public.business_orders
  where id=p_order_id and organization_id=org_id and deleted_at is null for update;
 if o.id is null then raise exception 'Order not found' using errcode='P0002'; end if;
 if o.status<>'confirmed' then raise exception 'Only confirmed orders can be fulfilled' using errcode='22023'; end if;
 if exists(select 1 from public.business_invoices where order_id=o.id and organization_id=org_id and status='void') then
  raise exception 'Order has a void invoice; review billing before fulfilment' using errcode='22023';
 end if;
 perform 1 from public.business_warehouses where id=p_warehouse_id and organization_id=org_id and status='active' and deleted_at is null;
 if not found then raise exception 'Active warehouse not found' using errcode='P0002'; end if;
 for item in
  select oi.product_id,sum(oi.quantity)::numeric(18,3) as quantity
  from public.business_order_items oi
  join public.business_products p on p.id=oi.product_id and p.organization_id=oi.organization_id
  where oi.order_id=o.id and oi.organization_id=org_id and p.product_type='product' and p.deleted_at is null
  group by oi.product_id order by oi.product_id
 loop
  perform 1 from public.business_products where id=item.product_id and organization_id=org_id for update;
  select coalesce(sum(case when movement_type in ('opening','receipt','adjustment_in') then quantity else -quantity end),0)
   into available from public.business_inventory_movements
   where organization_id=org_id and product_id=item.product_id and warehouse_id=p_warehouse_id;
  if available<item.quantity then
   raise exception 'Insufficient stock for product %. Available %, required %',item.product_id,available,item.quantity using errcode='22023';
  end if;
  insert into public.business_inventory_movements(organization_id,product_id,warehouse_id,movement_type,quantity,reference,notes,created_by)
  values(org_id,item.product_id,p_warehouse_id,'issue',item.quantity,o.order_number,'Order fulfilment',auth.uid());
 end loop;
 update public.business_orders set status='fulfilled',updated_at=now() where id=o.id and organization_id=org_id;
 return true;
end; $$;
revoke all on function public.business_fulfill_order(uuid,uuid) from public,anon;
grant execute on function public.business_fulfill_order(uuid,uuid) to authenticated;

create or replace function public.business_cancel_order(p_order_id uuid)
returns boolean language plpgsql set search_path=public,pg_temp as $$
declare org_id uuid:=public.current_organization_id(); o public.business_orders;
begin
 if auth.uid() is null or org_id is null or not public.has_org_permission(org_id,'business.order.manage') then
  raise exception 'Permission denied' using errcode='42501';
 end if;
 select * into o from public.business_orders where id=p_order_id and organization_id=org_id and deleted_at is null for update;
 if o.id is null then raise exception 'Order not found' using errcode='P0002'; end if;
 if o.status='fulfilled' then raise exception 'Fulfilled orders require a return workflow and cannot be cancelled' using errcode='22023'; end if;
 if exists(select 1 from public.business_invoices where order_id=o.id and organization_id=org_id and status<>'void') then
  raise exception 'Void the active invoice before cancelling this order' using errcode='22023';
 end if;
 update public.business_orders set status='cancelled',updated_at=now() where id=o.id and organization_id=org_id;
 return true;
end; $$;
revoke all on function public.business_cancel_order(uuid) from public,anon;
grant execute on function public.business_cancel_order(uuid) to authenticated;

create or replace function public.business_void_invoice(p_invoice_id uuid)
returns boolean language plpgsql set search_path=public,pg_temp as $$
declare org_id uuid:=public.current_organization_id(); inv public.business_invoices;
begin
 if auth.uid() is null or org_id is null or not public.has_org_permission(org_id,'business.invoice.manage') then
  raise exception 'Permission denied' using errcode='42501';
 end if;
 select * into inv from public.business_invoices where id=p_invoice_id and organization_id=org_id and deleted_at is null for update;
 if inv.id is null then raise exception 'Invoice not found' using errcode='P0002'; end if;
 if inv.amount_paid>0 or inv.status in ('paid','partially_paid','void') then
  raise exception 'An invoice with payments cannot be voided here; issue a credit note workflow' using errcode='22023';
 end if;
 update public.business_invoices set status='void',updated_at=now() where id=inv.id and organization_id=org_id;
 return true;
end; $$;
revoke all on function public.business_void_invoice(uuid) from public,anon;
grant execute on function public.business_void_invoice(uuid) to authenticated;

commit;
