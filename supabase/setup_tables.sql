-- Run this in Supabase SQL Editor.
-- It creates all tables currently required by the app code:
-- profiles, food_items, seller_kyc_applications, cart_items

-- Useful extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- PROFILES
-- -------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  restaurant_name text default '',
  role text not null default 'user'
    check (role in ('user', 'seller', 'delivery_rider', 'admin', 'super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep schema compatible if table already existed
alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists restaurant_name text default '',
  add column if not exists restaurant_image_url text default '',
  add column if not exists payment_qr_url text default '',
  add column if not exists payment_phone text default '',
  add column if not exists role text not null default 'user'
    check (role in ('user', 'seller', 'delivery_rider', 'admin', 'super_admin')),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Ensure unique email even on pre-existing table
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'profiles_email_key'
  ) then
    create unique index profiles_email_key on public.profiles(email);
  end if;
end $$;

create index if not exists idx_profiles_role on public.profiles(role);

-- -------------------------------------------------------------------
-- FOOD ITEMS
-- -------------------------------------------------------------------
create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id) on delete set null,
  name text not null,
  description text default '',
  price numeric(10,2) not null check (price >= 0),
  image_url text default '',
  category text default '',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.food_items
  add column if not exists seller_id uuid references public.profiles(id) on delete set null,
  add column if not exists name text,
  add column if not exists description text default '',
  add column if not exists price numeric(10,2),
  add column if not exists image_url text default '',
  add column if not exists category text default '',
  add column if not exists is_available boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Strengthen constraints for existing tables too
alter table public.food_items
  alter column name set not null,
  alter column price set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_items_price_check'
      and conrelid = 'public.food_items'::regclass
  ) then
    alter table public.food_items
      add constraint food_items_price_check check (price >= 0);
  end if;
end $$;

create index if not exists idx_food_items_seller_id on public.food_items(seller_id);
create index if not exists idx_food_items_category on public.food_items(category);
create index if not exists idx_food_items_created_at on public.food_items(created_at desc);

-- -------------------------------------------------------------------
-- CART ITEMS
-- -------------------------------------------------------------------
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, food_item_id)
);

alter table public.cart_items
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists food_item_id uuid references public.food_items(id) on delete cascade,
  add column if not exists quantity integer not null default 1 check (quantity > 0),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.cart_items
  alter column user_id set not null,
  alter column food_item_id set not null,
  alter column quantity set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cart_items_quantity_check'
      and conrelid = 'public.cart_items'::regclass
  ) then
    alter table public.cart_items
      add constraint cart_items_quantity_check check (quantity > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cart_items_user_id_food_item_id_key'
      and conrelid = 'public.cart_items'::regclass
  ) then
    alter table public.cart_items
      add constraint cart_items_user_id_food_item_id_key unique (user_id, food_item_id);
  end if;
end $$;

create index if not exists idx_cart_items_user_id on public.cart_items(user_id);
create index if not exists idx_cart_items_food_item_id on public.cart_items(food_item_id);

-- -------------------------------------------------------------------
-- ONLINE PAYMENT REQUESTS (manual QR flow)
-- -------------------------------------------------------------------
create table if not exists public.online_payment_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  customer_note text default '',
  seller_note text default '',
  confirmed_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.online_payment_requests
  add column if not exists customer_id uuid references public.profiles(id) on delete cascade,
  add column if not exists seller_id uuid references public.profiles(id) on delete cascade,
  add column if not exists amount numeric(10,2),
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  add column if not exists customer_note text default '',
  add column if not exists seller_note text default '',
  add column if not exists confirmed_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.online_payment_requests
  alter column customer_id set not null,
  alter column seller_id set not null,
  alter column amount set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'online_payment_requests_amount_check'
      and conrelid = 'public.online_payment_requests'::regclass
  ) then
    alter table public.online_payment_requests
      add constraint online_payment_requests_amount_check check (amount > 0);
  end if;
end $$;

create index if not exists idx_online_payment_requests_customer
  on public.online_payment_requests(customer_id);
create index if not exists idx_online_payment_requests_seller
  on public.online_payment_requests(seller_id);
create index if not exists idx_online_payment_requests_status
  on public.online_payment_requests(status);

-- -------------------------------------------------------------------
-- SELLER KYC APPLICATIONS
-- -------------------------------------------------------------------
create table if not exists public.seller_kyc_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_name text not null default '',
  restaurant_image_url text default '',
  legal_name text not null,
  phone text not null,
  document_type text not null,
  document_number text not null,
  document_url text default '',
  address text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_note text default '',
  rejection_reason text default '',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_kyc_applications
  add column if not exists restaurant_name text not null default '',
  add column if not exists restaurant_image_url text default '',
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists legal_name text,
  add column if not exists phone text,
  add column if not exists document_type text,
  add column if not exists document_number text,
  add column if not exists document_url text default '',
  add column if not exists address text,
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists admin_note text default '',
  add column if not exists rejection_reason text default '',
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.seller_kyc_applications
  alter column user_id set not null,
  alter column legal_name set not null,
  alter column phone set not null,
  alter column document_type set not null,
  alter column document_number set not null,
  alter column address set not null;

create index if not exists idx_kyc_user_id on public.seller_kyc_applications(user_id);
create index if not exists idx_kyc_status on public.seller_kyc_applications(status);
create index if not exists idx_kyc_created_at on public.seller_kyc_applications(created_at desc);

-- -------------------------------------------------------------------
-- UPDATED_AT TRIGGER (shared)
-- -------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_food_items_set_updated_at on public.food_items;
create trigger trg_food_items_set_updated_at
before update on public.food_items
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_seller_kyc_set_updated_at on public.seller_kyc_applications;
create trigger trg_seller_kyc_set_updated_at
before update on public.seller_kyc_applications
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_cart_items_set_updated_at on public.cart_items;
create trigger trg_cart_items_set_updated_at
before update on public.cart_items
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_online_payment_requests_set_updated_at on public.online_payment_requests;
create trigger trg_online_payment_requests_set_updated_at
before update on public.online_payment_requests
for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------------------
-- AUTO-CREATE PROFILE ON AUTH SIGNUP
-- -------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'user'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        phone = coalesce(nullif(excluded.phone, ''), public.profiles.phone);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill for existing auth users not in profiles
insert into public.profiles (id, email, full_name, phone, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', ''),
  coalesce(u.raw_user_meta_data->>'phone', ''),
  'user'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- -------------------------------------------------------------------
-- RLS + POLICIES (minimum required for current app behavior)
-- -------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.food_items enable row level security;
alter table public.seller_kyc_applications enable row level security;
alter table public.cart_items enable row level security;
alter table public.online_payment_requests enable row level security;

-- profiles: users can read/update themselves.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- profiles: all authenticated users can read seller profiles (for restaurant listing)
drop policy if exists "profiles_select_sellers" on public.profiles;
create policy "profiles_select_sellers"
on public.profiles
for select
to authenticated
using (role = 'seller');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Helper function: returns the role of the current user.
-- SECURITY DEFINER bypasses RLS so it can read profiles without
-- causing infinite recursion in the policies below.
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- profiles: super_admin can read ALL rows (uses helper to avoid recursion)
drop policy if exists "profiles_super_admin_select_all" on public.profiles;
create policy "profiles_super_admin_select_all"
on public.profiles
for select
to authenticated
using (public.get_my_role() = 'super_admin');

-- profiles: super_admin can update ALL rows (uses helper to avoid recursion)
drop policy if exists "profiles_super_admin_update_all" on public.profiles;
create policy "profiles_super_admin_update_all"
on public.profiles
for update
to authenticated
using (public.get_my_role() = 'super_admin')
with check (public.get_my_role() = 'super_admin');

-- food_items: everyone authenticated can read
drop policy if exists "food_items_select_authenticated" on public.food_items;
create policy "food_items_select_authenticated"
on public.food_items
for select
to authenticated
using (true);

-- Remove previous broad food policies to avoid conflicts
drop policy if exists "food_items_admin_all" on public.food_items;
drop policy if exists "food_items_seller_own" on public.food_items;
drop policy if exists "food_items_insert_seller_or_admin" on public.food_items;
drop policy if exists "food_items_update_seller_or_admin" on public.food_items;
drop policy if exists "food_items_delete_seller_or_admin" on public.food_items;

-- food_items: seller can insert only own items, admin/super_admin can insert any
create policy "food_items_insert_seller_or_admin"
on public.food_items
for insert
to authenticated
with check (
  (
    seller_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role in ('seller', 'admin', 'super_admin')
    )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

-- food_items: seller can update own items, admin/super_admin can update any
create policy "food_items_update_seller_or_admin"
on public.food_items
for update
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
)
with check (
  seller_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

-- food_items: seller can delete own items, admin/super_admin can delete any
create policy "food_items_delete_seller_or_admin"
on public.food_items
for delete
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

-- seller_kyc_applications: seller can view/insert own applications
drop policy if exists "kyc_select_own" on public.seller_kyc_applications;
create policy "kyc_select_own"
on public.seller_kyc_applications
for select
to authenticated
using (user_id = auth.uid());

-- seller_kyc_applications: any authenticated user can read approved applications (for restaurant listing)
drop policy if exists "kyc_select_approved" on public.seller_kyc_applications;
create policy "kyc_select_approved"
on public.seller_kyc_applications
for select
to authenticated
using (status = 'approved');

drop policy if exists "kyc_insert_own" on public.seller_kyc_applications;
create policy "kyc_insert_own"
on public.seller_kyc_applications
for insert
to authenticated
with check (user_id = auth.uid());

-- seller_kyc_applications: admin/super_admin can read/update all
drop policy if exists "kyc_admin_read_all" on public.seller_kyc_applications;
create policy "kyc_admin_read_all"
on public.seller_kyc_applications
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists "kyc_admin_update_all" on public.seller_kyc_applications;
create policy "kyc_admin_update_all"
on public.seller_kyc_applications
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

-- cart_items: users can manage only their own cart
drop policy if exists "cart_items_select_own" on public.cart_items;
create policy "cart_items_select_own"
on public.cart_items
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "cart_items_insert_own" on public.cart_items;
create policy "cart_items_insert_own"
on public.cart_items
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "cart_items_update_own" on public.cart_items;
create policy "cart_items_update_own"
on public.cart_items
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "cart_items_delete_own" on public.cart_items;
create policy "cart_items_delete_own"
on public.cart_items
for delete
to authenticated
using (user_id = auth.uid());

-- online_payment_requests: customer can create/select own requests
drop policy if exists "online_payments_customer_select_own" on public.online_payment_requests;
create policy "online_payments_customer_select_own"
on public.online_payment_requests
for select
to authenticated
using (customer_id = auth.uid());

drop policy if exists "online_payments_customer_insert_own" on public.online_payment_requests;
create policy "online_payments_customer_insert_own"
on public.online_payment_requests
for insert
to authenticated
with check (customer_id = auth.uid());

-- online_payment_requests: seller can view assigned requests
drop policy if exists "online_payments_seller_select_assigned" on public.online_payment_requests;
create policy "online_payments_seller_select_assigned"
on public.online_payment_requests
for select
to authenticated
using (seller_id = auth.uid());

-- online_payment_requests: seller can confirm/reject assigned requests
drop policy if exists "online_payments_seller_update_assigned" on public.online_payment_requests;
create policy "online_payments_seller_update_assigned"
on public.online_payment_requests
for update
to authenticated
using (seller_id = auth.uid())
with check (seller_id = auth.uid());


-- -------------------------------------------------------------------
-- ORDERS
-- -------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete set null,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  payment_method text not null default 'cod'
    check (payment_method in ('cod', 'online')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_address text default '',
  phone text default '',
  note text default '',
  delivery_rider_id uuid references public.profiles(id) on delete set null,
  estimated_delivery_at timestamptz,
  seller_received_at timestamptz,
  customer_received_at timestamptz,
  payment_reference_id uuid references public.online_payment_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete set null,
  food_name text not null,
  food_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_seller_id on public.orders(seller_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

-- RLS for orders
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "orders_customer_select_own" on public.orders;
create policy "orders_customer_select_own"
on public.orders for select to authenticated
using (customer_id = auth.uid());

drop policy if exists "orders_customer_insert_own" on public.orders;
create policy "orders_customer_insert_own"
on public.orders for insert to authenticated
with check (customer_id = auth.uid());

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

drop policy if exists "order_items_select_via_order" on public.order_items;
create policy "order_items_select_via_order"
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or o.seller_id = auth.uid())
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
on public.order_items for insert to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id and o.customer_id = auth.uid()
  )
);


-- -------------------------------------------------------------------
-- ORDERS: extra columns for delivery tracking
-- -------------------------------------------------------------------
alter table public.orders
  add column if not exists delivery_rider_id uuid references public.profiles(id) on delete set null,
  add column if not exists estimated_delivery_at timestamptz,
  add column if not exists seller_received_at timestamptz,
  add column if not exists customer_received_at timestamptz,
  add column if not exists payment_reference_id uuid references public.online_payment_requests(id) on delete set null;

create index if not exists idx_orders_rider_id on public.orders(delivery_rider_id);

-- delivery_rider can view orders assigned to them OR unassigned orders
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



-- -------------------------------------------------------------------
-- REALTIME: enable for QR payment notifications
-- Run this so sellers receive instant notifications when a customer
-- submits a payment request.
-- -------------------------------------------------------------------
-- Enable realtime publication for online_payment_requests
-- (Supabase enables this via the Dashboard > Database > Replication,
--  or run the statement below in the SQL editor)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'online_payment_requests'
  ) then
    alter publication supabase_realtime add table public.online_payment_requests;
  end if;
end $$;

