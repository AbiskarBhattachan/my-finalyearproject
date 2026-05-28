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
