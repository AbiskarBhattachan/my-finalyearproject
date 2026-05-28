-- Migration script to add missing columns to orders table
-- Run this in Supabase SQL Editor

-- Remove NOT NULL constraints from columns that should be nullable
do $$
begin
  -- Remove NOT NULL constraint from delivery_address if it exists
  alter table public.orders alter column delivery_address drop not null;
exception
  when undefined_column then
    null;
  when others then
    null;
end $$;

do $$
begin
  -- Remove NOT NULL constraint from phone if it exists
  alter table public.orders alter column phone drop not null;
exception
  when undefined_column then
    null;
  when others then
    null;
end $$;

-- Add all missing columns to orders table
alter table public.orders
  add column if not exists seller_id uuid references public.profiles(id) on delete set null,
  add column if not exists delivery_address text default '',
  add column if not exists phone text default '',
  add column if not exists note text default '',
  add column if not exists delivery_rider_id uuid references public.profiles(id) on delete set null,
  add column if not exists estimated_delivery_at timestamptz,
  add column if not exists seller_received_at timestamptz,
  add column if not exists customer_received_at timestamptz,
  add column if not exists payment_reference_id uuid references public.online_payment_requests(id) on delete set null;

-- Create indexes for better query performance
create index if not exists idx_orders_seller_id on public.orders(seller_id);
create index if not exists idx_orders_rider_id on public.orders(delivery_rider_id);
create index if not exists idx_orders_payment_reference_id on public.orders(payment_reference_id);

-- Add RLS policies for seller access
drop policy if exists "orders_seller_select_own" on public.orders;
create policy "orders_seller_select_own"
on public.orders for select to authenticated
using (seller_id = auth.uid());

drop policy if exists "orders_seller_update_status" on public.orders;
create policy "orders_seller_update_status"
on public.orders for update to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
)
with check (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

-- Add RLS policies for delivery rider access
drop policy if exists "orders_rider_select_assigned" on public.orders;
create policy "orders_rider_select_assigned"
on public.orders for select to authenticated
using (
  delivery_rider_id = auth.uid()
  or (
    delivery_rider_id is null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'delivery_rider'
    )
  )
);

drop policy if exists "orders_rider_update_assigned" on public.orders;
create policy "orders_rider_update_assigned"
on public.orders for update to authenticated
using (
  delivery_rider_id = auth.uid()
  or (
    delivery_rider_id is null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'delivery_rider'
    )
  )
)
with check (
  delivery_rider_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'delivery_rider'
  )
);

-- Success message
select 'Orders table migration completed successfully!' as message;
