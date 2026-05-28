-- Add restaurant location columns to profiles table
-- This allows sellers to set their permanent restaurant location
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS restaurant_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS restaurant_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS restaurant_address TEXT DEFAULT '';

-- Create index for faster location queries
CREATE INDEX IF NOT EXISTS idx_profiles_restaurant_location 
ON profiles(restaurant_latitude, restaurant_longitude) 
WHERE restaurant_latitude IS NOT NULL AND restaurant_longitude IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.restaurant_latitude IS 'Latitude of seller restaurant location';
COMMENT ON COLUMN profiles.restaurant_longitude IS 'Longitude of seller restaurant location';
COMMENT ON COLUMN profiles.restaurant_address IS 'Full address of seller restaurant';
