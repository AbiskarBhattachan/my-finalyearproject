# Troubleshooting: Map Not Showing Routes

## 🔍 Quick Diagnosis

### Check 1: SQL Migration
**Issue**: Location columns don't exist in database

**Solution**:
```sql
-- Run in Supabase SQL Editor
-- File: supabase/add_restaurant_location.sql

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS restaurant_latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS restaurant_longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS restaurant_address TEXT DEFAULT '';

-- Also ensure add_location_tracking.sql was run
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS restaurant_latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS restaurant_longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS customer_latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS customer_longitude DECIMAL(11,8);
```

### Check 2: Seller Has Set Location
**Issue**: Restaurant location not set

**Steps**:
1. Login as seller
2. Go to Profile page
3. Look for "🏪 Restaurant Location" section
4. If empty, click "Get Current Location"
5. Enter address
6. Click "Save Restaurant Location"

### Check 3: Customer Captured Location
**Issue**: Customer location not captured at checkout

**Steps**:
1. At checkout, look for "📍 Your Location" section
2. Click "Get My Location" button
3. Allow browser location access
4. Should see "✓ Location Captured"
5. Place order

### Check 4: Browser Console
**Issue**: JavaScript errors

**Steps**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors (red text)
4. Look for debug log: "LiveDeliveryTracker - Order data:"
5. Check if coordinates are present

---

## 🐛 Common Issues

### Issue 1: "Location data not available"

**Symptoms**:
- Yellow box with "Location data not available"
- Map doesn't show

**Causes**:
1. Restaurant location not set by seller
2. Customer didn't capture location at checkout
3. Order was placed before migration

**Solutions**:

**A. Check Database**:
```sql
-- Check if columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('restaurant_latitude', 'restaurant_longitude', 'customer_latitude', 'customer_longitude');

-- Check if seller has location
SELECT id, restaurant_name, restaurant_latitude, restaurant_longitude 
FROM profiles 
WHERE role = 'seller';

-- Check specific order
SELECT id, restaurant_latitude, restaurant_longitude, customer_latitude, customer_longitude 
FROM orders 
WHERE id = 'YOUR_ORDER_ID';
```

**B. Set Restaurant Location**:
1. Login as seller
2. Profile → Restaurant Location
3. Get Current Location
4. Save

**C. For Existing Orders** (Manual Fix):
```sql
-- Update existing order with restaurant location
UPDATE orders 
SET restaurant_latitude = (SELECT restaurant_latitude FROM profiles WHERE id = orders.seller_id),
    restaurant_longitude = (SELECT restaurant_longitude FROM profiles WHERE id = orders.seller_id)
WHERE seller_id IS NOT NULL 
AND restaurant_latitude IS NULL;
```

---

### Issue 2: Map Shows But No Routes

**Symptoms**:
- Markers show (🍽️ 🛵 🏠)
- No lines connecting them

**Causes**:
1. OSRM service unreachable
2. Internet connection issue
3. Invalid coordinates

**Solutions**:

**A. Check Browser Console**:
```
Look for: "Route fetch error"
```

**B. Test OSRM Manually**:
```
Open in browser:
https://router.project-osrm.org/route/v1/driving/85.3240,27.7172;85.3618,27.7215?overview=full

Should return JSON with route data
```

**C. Fallback**:
- Direct dashed lines should still show
- Orange: Restaurant → Rider
- Green: Rider → Customer

---

### Issue 3: Only Gray Dashed Line Shows

**Symptoms**:
- Gray dashed line between restaurant and customer
- No rider marker

**Cause**:
- No rider assigned yet

**Solution**:
- This is normal for orders in "pending" or "confirmed" status
- Once rider accepts, you'll see:
  - Blue rider marker
  - Orange line (Restaurant → Rider)
  - Green line (Rider → Customer)

---

### Issue 4: Rider Location Not Updating

**Symptoms**:
- Rider marker stuck at one position
- "Rider location updating live" badge not showing

**Causes**:
1. Rider hasn't started delivery
2. Order status not "out_for_delivery"
3. RiderLocationUpdater not running

**Solutions**:

**A. Check Order Status**:
- Must be "out_for_delivery" for auto-updates
- Rider must click "Out for Delivery" button

**B. Check Rider Page**:
- Rider should see RiderLocationUpdater component
- Should show "Location tracking active"

**C. Manual Test**:
```sql
-- Check rider's current location
SELECT id, full_name, latitude, longitude, location_updated_at 
FROM profiles 
WHERE id = 'RIDER_ID';
```

---

### Issue 5: Customer Location Not Captured

**Symptoms**:
- "Get My Location" button doesn't work
- No "✓ Location Captured" message

**Causes**:
1. Browser location permission denied
2. Not using HTTPS
3. Browser doesn't support geolocation

**Solutions**:

**A. Check Browser Permission**:
1. Click lock icon in address bar
2. Check "Location" permission
3. Set to "Allow"
4. Refresh page

**B. Use HTTPS**:
- Geolocation API requires secure connection
- Use `https://` not `http://`

**C. Try Different Browser**:
- Chrome, Firefox, Safari support geolocation
- Some browsers block in incognito mode

**D. Manual Entry** (Future Feature):
- For now, customer location is optional
- Order will still work without it
- Rider will use delivery address

---

## 🔧 Debug Mode

### Enable Debug Logging

The LiveDeliveryTracker component now logs debug info to console:

```javascript
console.log('LiveDeliveryTracker - Order data:', {
  orderId: order.id,
  restaurantLat: order.restaurant_latitude,
  restaurantLng: order.restaurant_longitude,
  customerLat: order.customer_latitude,
  customerLng: order.customer_longitude,
  restaurantLocation,
  customerLocation,
  riderLocation
});
```

**To view**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for "LiveDeliveryTracker - Order data:"
4. Check if all coordinates are present

### Debug Info Display

If no locations are available, the component shows debug info:

```
📍 Location data not available

Debug Info:
Restaurant: 27.7172, 85.3240 (or "Not set")
Customer: 27.7215, 85.3618 (or "Not set")
Rider: Tracking (or "Not assigned")
```

---

## ✅ Verification Checklist

### Database Setup
- [ ] `add_location_tracking.sql` executed
- [ ] `add_restaurant_location.sql` executed
- [ ] Columns exist in `orders` table
- [ ] Columns exist in `profiles` table

### Seller Setup
- [ ] Seller logged in
- [ ] Restaurant location form visible
- [ ] Location captured (GPS or manual)
- [ ] Location saved successfully
- [ ] Can see coordinates in profile

### Customer Flow
- [ ] Checkout page loads
- [ ] "Get My Location" button visible
- [ ] Browser permission granted
- [ ] "✓ Location Captured" shows
- [ ] Order placed successfully

### Order Verification
- [ ] Order created in database
- [ ] `restaurant_latitude` has value
- [ ] `restaurant_longitude` has value
- [ ] `customer_latitude` has value (if captured)
- [ ] `customer_longitude` has value (if captured)

### Map Display
- [ ] Orders page loads
- [ ] LiveDeliveryTracker component shows
- [ ] Restaurant marker (🍽️) visible
- [ ] Customer marker (🏠) visible (if location captured)
- [ ] Rider marker (🛵) visible (if assigned)
- [ ] Route lines visible
- [ ] Map auto-fits to show all points

---

## 🔍 SQL Queries for Debugging

### Check Order Location Data
```sql
SELECT 
  id,
  status,
  restaurant_latitude,
  restaurant_longitude,
  customer_latitude,
  customer_longitude,
  delivery_rider_id,
  created_at
FROM orders
WHERE id = 'YOUR_ORDER_ID';
```

### Check Seller Location Data
```sql
SELECT 
  id,
  full_name,
  restaurant_name,
  restaurant_latitude,
  restaurant_longitude,
  restaurant_address
FROM profiles
WHERE role = 'seller';
```

### Check Rider Location Data
```sql
SELECT 
  id,
  full_name,
  latitude,
  longitude,
  location_updated_at
FROM profiles
WHERE role = 'delivery_rider';
```

### Find Orders Without Location Data
```sql
SELECT 
  id,
  status,
  created_at,
  CASE 
    WHEN restaurant_latitude IS NULL THEN 'Missing restaurant location'
    WHEN customer_latitude IS NULL THEN 'Missing customer location'
    ELSE 'Has locations'
  END as location_status
FROM orders
WHERE restaurant_latitude IS NULL 
   OR customer_latitude IS NULL
ORDER BY created_at DESC;
```

---

## 🚑 Emergency Fixes

### Fix 1: Backfill Restaurant Locations
```sql
-- Copy restaurant location from seller profile to all their orders
UPDATE orders o
SET 
  restaurant_latitude = p.restaurant_latitude,
  restaurant_longitude = p.restaurant_longitude
FROM profiles p
WHERE o.seller_id = p.id
  AND p.restaurant_latitude IS NOT NULL
  AND o.restaurant_latitude IS NULL;
```

### Fix 2: Test Order with Known Coordinates
```sql
-- Create test order with known good coordinates
INSERT INTO orders (
  customer_id,
  seller_id,
  total_amount,
  payment_method,
  status,
  delivery_address,
  phone,
  restaurant_latitude,
  restaurant_longitude,
  customer_latitude,
  customer_longitude
) VALUES (
  'YOUR_CUSTOMER_ID',
  'YOUR_SELLER_ID',
  500.00,
  'cod',
  'confirmed',
  'Test Address, Kathmandu',
  '9841234567',
  27.7172,  -- Thamel
  85.3240,
  27.7215,  -- Boudhanath
  85.3618
);
```

### Fix 3: Reset and Retry
```sql
-- Delete test orders
DELETE FROM orders WHERE delivery_address LIKE 'Test%';

-- Clear rider location
UPDATE profiles 
SET latitude = NULL, longitude = NULL, location_updated_at = NULL
WHERE role = 'delivery_rider';
```

---

## 📞 Still Not Working?

### Steps to Get Help

1. **Collect Information**:
   - Browser console errors
   - SQL query results
   - Screenshots of issue
   - Order ID

2. **Check Documentation**:
   - COMPLETE_TRACKING_SYSTEM.md
   - CUSTOMER_LOCATION_TRACKING.md
   - ROUTE_VISUALIZATION_GUIDE.md

3. **Verify Setup**:
   - All SQL migrations run
   - Seller has set location
   - Customer captured location
   - Browser permissions granted

4. **Test with Fresh Order**:
   - Create new order
   - Capture all locations
   - Check if map shows

---

## 🎯 Expected Behavior

### When Everything Works

**Customer View (Orders Page)**:
```
┌─────────────────────────────────────┐
│ 🗺️ Live Delivery Tracking          │
│ ● Rider location updating live     │
├─────────────────────────────────────┤
│                                     │
│    🍽️ Restaurant (Thamel)          │
│      ╲ Orange dashed                │
│       ╲                             │
│        🛵 Rider ═══════════════     │
│           (Blue solid route)        │
│                          ╲          │
│                   Green dashed      │
│                            ╲        │
│                             🏠      │
│                          Customer   │
│                                     │
├─────────────────────────────────────┤
│ 🍽️ Restaurant  🛵 Rider  🏠 Customer│
│    Located      Tracking   Located │
└─────────────────────────────────────┘
```

**What You Should See**:
- ✅ Three markers on map
- ✅ Blue solid line (main route)
- ✅ Orange dashed line (Restaurant → Rider)
- ✅ Green dashed line (Rider → Customer)
- ✅ Map auto-fits to show all points
- ✅ Rider marker moves in real-time
- ✅ "Rider location updating live" badge

---

**Good luck! 🚀**
