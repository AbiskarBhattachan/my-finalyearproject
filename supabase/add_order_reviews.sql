-- Run this in Supabase SQL Editor to add the order_reviews table.
-- Customers can leave a star rating + comment after an order is delivered.
-- Reviews are visible to the seller and super_admin.

-- -------------------------------------------------------------------
-- ORDER REVIEWS
-- -------------------------------------------------------------------
create table if not exists public.order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- one review per order per customer
  unique (order_id, customer_id)
);

create index if not exists idx_order_reviews_order_id    on public.order_reviews(order_id);
create index if not exists idx_order_reviews_customer_id on public.order_reviews(customer_id);
create index if not exists idx_order_reviews_seller_id   on public.order_reviews(seller_id);
create index if not exists idx_order_reviews_created_at  on public.order_reviews(created_at desc);

drop trigger if exists trg_order_reviews_set_updated_at on public.order_reviews;
create trigger trg_order_reviews_set_updated_at
before update on public.order_reviews
for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------
alter table public.order_reviews enable row level security;

-- Customers can insert a review only for their own delivered orders
drop policy if exists "reviews_customer_insert" on public.order_reviews;
create policy "reviews_customer_insert"
on public.order_reviews for insert to authenticated
with check (
  customer_id = auth.uid()
  and exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.customer_id = auth.uid()
      and o.status = 'delivered'
  )
);

-- Customers can update their own review
drop policy if exists "reviews_customer_update" on public.order_reviews;
create policy "reviews_customer_update"
on public.order_reviews for update to authenticated
using (customer_id = auth.uid())
with check (customer_id = auth.uid());

-- Customers can read their own reviews
drop policy if exists "reviews_customer_select_own" on public.order_reviews;
create policy "reviews_customer_select_own"
on public.order_reviews for select to authenticated
using (customer_id = auth.uid());

-- Sellers can read reviews for their restaurant
drop policy if exists "reviews_seller_select" on public.order_reviews;
create policy "reviews_seller_select"
on public.order_reviews for select to authenticated
using (seller_id = auth.uid());

-- Super admin / admin can read all reviews
drop policy if exists "reviews_admin_select_all" on public.order_reviews;
create policy "reviews_admin_select_all"
on public.order_reviews for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

-- -------------------------------------------------------------------
-- REALTIME: enable for order_reviews
-- -------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_reviews'
  ) then
    alter publication supabase_realtime add table public.order_reviews;
  end if;
end $$;
