# Quick Fix: Customer Can't See Routes

## 🚨 Problem
Customer goes to Orders page but sees no map or routes.

## ✅ Solution (5 Steps)

### Step 1: Verify SQL Migrations (30 seconds)
```sql
-- Run in Supabase SQL Editor
-- Check if columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('restaurant_latitude', 'customer_latitude');

-- Should return 2 rows
-- If not, run the migrations:
-- 1. supabase/add_location_tracking.sql
-- 2. supabase/add_restaurant_location.sql
```

### Step 2: Seller Sets Restaurant Location (1 minute)
1. Login as **Seller**
2. Go to **Profile** page
3. Scroll to **"🏪 Restaurant Location"**
4. Click **"📍 Get Current Location"**
5. Enter address
6. Click **"Save"**

### Step 3: Place New Order with Location (1 minute)
1. Login as **Customer**
2. Add items to cart
3. Go to **Checkout**
4. Look for **"📍 Your Location"** section
5. Click **"Get My Location"**
6. Allow browser permission
7. See **"✓ Location Captured"**
8. Place order

### Step 4: Check Browser Console (30 seconds)
1. Press **F12** (open DevTools)
2. Go to **Console** tab
3. Look for: `LiveDeliveryTracker - Order data:`
4. Check if coordinates are present:
   ```
   restaurantLat: 27.7172
   restaurantLng: 85.3240
   customerLat: 27.7215
   customerLng: 85.3618
   ```

### Step 5: Refresh Orders Page (10 seconds)
1. Go to **Orders** page
2. Click on the order
3. Should see map with markers and routes

---

## 🔍 Quick Checks

### Check 1: Do Columns Exist?
```sql
SELECT restaurant_latitude, customer_latitude 
FROM orders 
LIMIT 1;

-- If error "column does not exist", run migrations
```

### Check 2: Does Seller Have Location?
```sql
SELECT restaurant_latitude, restaurant_longitude 
FROM profiles 
WHERE role = 'seller' 
LIMIT 1;

-- Should return numbers, not NULL
```

### Check 3: Does Order Have Location?
```sql
SELECT restaurant_latitude, customer_latitude 
FROM orders 
WHERE id = 'YOUR_ORDER_ID';

-- Should return numbers, not NULL
```

---

## 🐛 Common Issues

### Issue: "Location data not available"
**Fix**: 
- Seller must set restaurant location in Profile
- Customer must click "Get My Location" at checkout
- For old orders, they won't have location data

### Issue: Map doesn't show at all
**Fix**:
- Check browser console for errors
- Verify internet connection (map needs to load tiles)
- Try different browser

### Issue: Markers show but no route lines
**Fix**:
- Check internet connection (OSRM routing needs network)
- Fallback: Direct dashed lines should still show
- Check browser console for "Route fetch error"

---

## 🔧 Emergency Fix for Existing Orders

If you have existing orders without location data:

```sql
-- Backfill restaurant location from seller profile
UPDATE orders o
SET 
  restaurant_latitude = p.restaurant_latitude,
  restaurant_longitude = p.restaurant_longitude
FROM profiles p
WHERE o.seller_id = p.id
  AND p.restaurant_latitude IS NOT NULL
  AND o.restaurant_latitude IS NULL;

-- Check results
SELECT 
  id, 
  restaurant_latitude, 
  customer_latitude,
  CASE 
    WHEN restaurant_latitude IS NOT NULL AND customer_latitude IS NOT NULL THEN '✓ Both'
    WHEN restaurant_latitude IS NOT NULL THEN '⚠ Only restaurant'
    WHEN customer_latitude IS NOT NULL THEN '⚠ Only customer'
    ELSE '✗ None'
  END as location_status
FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ Success Checklist

After following the steps, you should see:

- [ ] Map loads on Orders page
- [ ] Restaurant marker (🍽️) visible
- [ ] Customer marker (🏠) visible
- [ ] Route lines connecting points
- [ ] Map auto-fits to show all markers
- [ ] Debug info in console shows coordinates

---

## 📱 Test Coordinates (Kathmandu)

For testing, use these coordinates:

**Restaurant (Thamel)**:
- Latitude: `27.7172`
- Longitude: `85.3240`

**Customer (Boudhanath)**:
- Latitude: `27.7215`
- Longitude: `85.3618`

---

## 🎯 Expected Result

When working correctly, customer should see:

```
🗺️ Live Delivery Tracking
● Rider location updating live

[MAP WITH:]
🍽️ Restaurant (orange marker)
   ╲ Orange dashed line
    ╲
     🛵 Rider (blue marker)
        ═══ Blue solid line (route)
              ╲
       Green dashed line
                ╲
                 🏠 Customer (green marker)

🍽️ Restaurant  🛵 Rider  🏠 Customer
   Located      Tracking   Located
```

---

## 📚 More Help

- **TROUBLESHOOTING_MAP.md** - Detailed troubleshooting
- **COMPLETE_TRACKING_SYSTEM.md** - Full system guide
- **CUSTOMER_LOCATION_TRACKING.md** - Customer features

---

**Still stuck? Check browser console for errors!** 🔍
