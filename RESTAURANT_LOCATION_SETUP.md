# Restaurant Location Setup Guide

This guide explains how to set up restaurant locations for delivery tracking with pickup and drop-off points.

## Overview

The system now supports **two-point delivery tracking**:
1. **Pickup Location** (Restaurant) - Where the delivery rider picks up the order
2. **Drop-off Location** (Customer) - Where the order is delivered

## Setup Steps

### 1. Run the Database Migration

Execute the SQL migration to add restaurant location columns to the profiles table:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/add_restaurant_location.sql
```

Or copy and paste this SQL:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS restaurant_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS restaurant_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS restaurant_address TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_profiles_restaurant_location 
ON profiles(restaurant_latitude, restaurant_longitude) 
WHERE restaurant_latitude IS NOT NULL AND restaurant_longitude IS NOT NULL;
```

### 2. Sellers Set Their Restaurant Location

**For Sellers:**
1. Log in to your seller account
2. Go to **Profile** page
3. Scroll down to the **"🏪 Restaurant Location"** section
4. Fill in your restaurant details:
   - **Restaurant Address**: Full address of your restaurant
   - **Latitude & Longitude**: You can either:
     - Click **"📍 Get Current Location"** to auto-capture your current GPS coordinates
     - Or manually enter coordinates (e.g., from Google Maps)
5. Click **"Save Restaurant Location"**

**Getting Coordinates from Google Maps:**
- Open Google Maps
- Right-click on your restaurant location
- Click on the coordinates to copy them
- Paste into the Latitude and Longitude fields

### 3. How It Works

#### When Customer Places Order:
1. Customer adds items to cart from a restaurant
2. During checkout, the system automatically captures:
   - Restaurant location (from seller's profile)
   - Customer delivery address
3. Order is created with both pickup and delivery locations

#### For Delivery Riders:
1. Rider accepts an order from the dashboard
2. The order detail page shows:
   - **Live map** with three points:
     - 🍽️ **Restaurant** (pickup point)
     - 🛵 **Rider** (current location, updates in real-time)
     - 🏠 **Customer** (delivery point)
   - Route between all three points
3. Rider can see:
   - Restaurant address and coordinates
   - Customer delivery address
   - Real-time navigation

## Features

### For Sellers
- ✅ Set permanent restaurant location once
- ✅ Auto-capture GPS coordinates
- ✅ Manual coordinate entry option
- ✅ Full address storage

### For Delivery Riders
- ✅ See pickup location (restaurant)
- ✅ See drop-off location (customer)
- ✅ Live map with all three points
- ✅ Real-time rider location tracking
- ✅ Route visualization

### For Customers
- ✅ Track delivery in real-time
- ✅ See rider's current location
- ✅ Know when rider picks up from restaurant
- ✅ Estimated delivery time

## Technical Details

### Database Schema

**profiles table** (new columns):
- `restaurant_latitude` - Decimal(10,8) - Restaurant latitude
- `restaurant_longitude` - Decimal(11,8) - Restaurant longitude
- `restaurant_address` - Text - Full restaurant address

**orders table** (existing columns from add_location_tracking.sql):
- `restaurant_latitude` - Pickup location latitude
- `restaurant_longitude` - Pickup location longitude
- `customer_latitude` - Delivery location latitude
- `customer_longitude` - Delivery location longitude

### Components

1. **Profile Page** (`app/profile/page.js`)
   - Restaurant location form for sellers
   - GPS capture functionality
   - Manual coordinate entry

2. **Checkout Page** (`app/checkout/page.js`)
   - Captures restaurant location from seller profile
   - Stores in order when created

3. **Delivery Rider Page** (`app/delivery-rider/page.js`)
   - Shows order details with locations
   - Integrates LiveDeliveryTracker component

4. **LiveDeliveryTracker** (`app/components/LiveDeliveryTracker.js`)
   - Displays map with all three points
   - Real-time rider location updates
   - Route visualization

## Troubleshooting

### Restaurant Location Not Showing
- **Issue**: Map shows "Location data not available"
- **Solution**: 
  1. Seller must set restaurant location in Profile page
  2. Run the migration SQL if not already done
  3. Refresh the page

### GPS Not Working
- **Issue**: "Get Current Location" button doesn't work
- **Solution**:
  1. Allow location access in browser
  2. Use HTTPS (required for geolocation API)
  3. Manually enter coordinates as fallback

### Coordinates Invalid
- **Issue**: Error when saving location
- **Solution**:
  - Latitude must be between -90 and 90
  - Longitude must be between -180 and 180
  - Use decimal format (e.g., 27.7172, not 27°43'02")

## Example Coordinates (Nepal)

For testing purposes, here are some example coordinates in Kathmandu:

- **Thamel**: 27.7172, 85.3240
- **Durbar Square**: 27.7045, 85.3077
- **Boudhanath**: 27.7215, 85.3618
- **Patan**: 27.6734, 85.3250

## Next Steps

After setting up restaurant locations:
1. Test by placing an order
2. Accept order as delivery rider
3. Verify map shows all three points
4. Test real-time location updates

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify SQL migration was run successfully
3. Ensure seller has set restaurant location
4. Check that orders table has location columns
