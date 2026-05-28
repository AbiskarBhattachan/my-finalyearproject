-- Fix: allow delivery riders to read order_items for orders assigned to them
-- Run this in Supabase SQL Editor

drop policy if exists "order_items_select_via_order" on public.order_items;

create policy "order_items_select_via_order"
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (
        o.customer_id = auth.uid()
        or o.seller_id = auth.uid()
        or o.delivery_rider_id = auth.uid()
      )
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);
