-- Fix order_items table to add missing columns
-- Run this in Supabase SQL Editor if you get "column food_name does not exist" error

-- Add missing columns to order_items table
alter table public.order_items
  add column if not exists food_name text,
  add column if not exists food_price numeric(10,2),
  add column if not exists quantity integer;

-- Set NOT NULL constraints and defaults for new columns
-- First, populate any NULL values with defaults
update public.order_items
set food_name = 'Unknown Item'
where food_name is null;

update public.order_items
set food_price = 0
where food_price is null;

update public.order_items
set quantity = 1
where quantity is null;

-- Now add NOT NULL constraints
alter table public.order_items
  alter column food_name set not null,
  alter column food_price set not null,
  alter column quantity set not null;

-- Add check constraint for quantity (drop first if exists to avoid errors)
alter table public.order_items
  drop constraint if exists order_items_quantity_check;

alter table public.order_items
  add constraint order_items_quantity_check check (quantity > 0);

-- Success message
select 'order_items table fixed successfully!' as message;
