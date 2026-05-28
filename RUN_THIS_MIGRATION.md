# 🚨 IMPORTANT: Run This Migration First!

## Error You're Seeing:
```
Could not find the 'latitude' column of 'profiles' in the schema cache
```

## Solution: Run the Database Migration

### Step 1: Open Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar (or go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql)

### Step 2: Run the Migration

Copy and paste the **ENTIRE** content from the file:
```
supabase/add_location_tracking.sql
```

Or copy this SQL directly:

```sql
-- Add location columns to orders table for restaurant and customer locations
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS restaurant_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS restaurant_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS customer_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS customer_longitude DECIMAL(11, 8);

-- Add location columns to profiles table for rider real-time tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Create index for faster location queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_locations ON orders(restaurant_latitude, restaurant_longitude, customer_latitude, customer_longitude);

-- Add comment for documentation
COMMENT ON COLUMN orders.restaurant_latitude IS 'Latitude of restaurant/pickup location';
COMMENT ON COLUMN orders.restaurant_longitude IS 'Longitude of restaurant/pickup location';
COMMENT ON COLUMN orders.customer_latitude IS 'Latitude of customer delivery location';
COMMENT ON COLUMN orders.customer_longitude IS 'Longitude of customer delivery location';
COMMENT ON COLUMN profiles.latitude IS 'Current latitude of user (primarily for delivery riders)';
COMMENT ON COLUMN profiles.longitude IS 'Current longitude of user (primarily for delivery riders)';
COMMENT ON COLUMN profiles.location_updated_at IS 'Timestamp of last location update';
```

### Step 3: Execute

1. Click the **RUN** button (or press Ctrl+Enter / Cmd+Enter)
2. Wait for "Success. No rows returned" message
3. Done! ✅

### Step 4: Verify

Run this query to verify the columns were added:

```sql
-- Check profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('latitude', 'longitude', 'location_updated_at');

-- Check orders table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('restaurant_latitude', 'restaurant_longitude', 'customer_latitude', 'customer_longitude');
```

You should see all the columns listed.

### Step 5: Test Again

Now go back to your delivery rider page and click "Update My Location" - it should work! 🎉

---

## What This Migration Does:

### Adds to `profiles` table:
- `latitude` - Current latitude of user (for riders)
- `longitude` - Current longitude of user (for riders)
- `location_updated_at` - Timestamp of last location update

### Adds to `orders` table:
- `restaurant_latitude` - Restaurant pickup location
- `restaurant_longitude` - Restaurant pickup location
- `customer_latitude` - Customer delivery location
- `customer_longitude` - Customer delivery location

### Creates indexes:
- Faster location queries
- Optimized for map rendering

---

## Still Having Issues?

### Check Supabase Connection:
1. Verify your `.env.local` file has correct Supabase credentials
2. Check that Supabase project is running
3. Verify you have database permissions

### Check Browser Console:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any error messages
4. Share the error if you need help

### Check RLS Policies:
Make sure riders can update their own profile:

```sql
-- Allow riders to update their own location
CREATE POLICY "Riders can update own location"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

---

## Quick Test After Migration:

Visit: `http://localhost:3000/map-demo`

This demo page doesn't require any database data and will show you if the map is working correctly.
