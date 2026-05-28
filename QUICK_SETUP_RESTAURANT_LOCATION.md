# Quick Setup: Restaurant Location for Two-Point Delivery

## ✅ Setup Checklist

### Step 1: Database Migration (One-time)
```bash
# Run this SQL in Supabase SQL Editor:
# File: supabase/add_restaurant_location.sql
```

Or run this SQL directly:
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS restaurant_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS restaurant_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS restaurant_address TEXT DEFAULT '';
```

### Step 2: Seller Setup (Each Seller)
1. Login as **Seller**
2. Go to **Profile** page
3. Find **"🏪 Restaurant Location"** section
4. Click **"📍 Get Current Location"** OR enter coordinates manually
5. Enter your **Restaurant Address**
6. Click **"Save Restaurant Location"**

### Step 3: Test the Feature
1. **As Customer**: Place an order from a restaurant
2. **As Delivery Rider**: Accept the order
3. **Verify**: Map shows 3 points:
   - 🍽️ Restaurant (pickup)
   - 🛵 Rider (live tracking)
   - 🏠 Customer (delivery)

## 🎯 What You Get

### Before (Old System)
- ❌ Only customer delivery location
- ❌ Rider doesn't know pickup point
- ❌ Single-point tracking

### After (New System)
- ✅ Restaurant pickup location
- ✅ Customer delivery location
- ✅ Rider live location
- ✅ Two-point delivery tracking
- ✅ Complete route visualization

## 📍 Quick Test Coordinates (Kathmandu)

Use these for testing:
- **Thamel**: Lat: `27.7172`, Lng: `85.3240`
- **Durbar Square**: Lat: `27.7045`, Lng: `85.3077`
- **Boudhanath**: Lat: `27.7215`, Lng: `85.3618`

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "Location data not available" | Seller must set restaurant location in Profile |
| GPS not working | Allow browser location access or enter manually |
| Map not showing | Run the SQL migration first |
| Coordinates rejected | Check format: Lat (-90 to 90), Lng (-180 to 180) |

## 📱 User Roles

### Seller
- Sets restaurant location once in Profile
- Location auto-added to all orders

### Customer
- Enters delivery address at checkout
- Sees live tracking on orders page

### Delivery Rider
- Sees both pickup and delivery locations
- Gets real-time navigation
- Updates own location automatically

## 🔗 Related Files

- Migration: `supabase/add_restaurant_location.sql`
- Profile Page: `app/profile/page.js`
- Checkout: `app/checkout/page.js`
- Rider Dashboard: `app/delivery-rider/page.js`
- Map Component: `app/components/LiveDeliveryTracker.js`

## ✨ Done!

Your system now supports two-point delivery tracking with pickup and drop-off locations!
