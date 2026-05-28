# ✅ Map Setup Checklist

Use this checklist to ensure everything is set up correctly.

## 🗄️ Database Setup

- [ ] **Run the SQL migration**
  - Open Supabase SQL Editor
  - Copy content from `supabase/add_location_tracking.sql`
  - Paste and run in SQL Editor
  - Verify success message appears

- [ ] **Verify columns were added**
  ```sql
  -- Run this to check:
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'profiles' 
  AND column_name IN ('latitude', 'longitude', 'location_updated_at');
  ```
  - Should return 3 rows

- [ ] **Check RLS policies** (Optional but recommended)
  ```sql
  -- Allow riders to update their own location
  CREATE POLICY "Riders can update own location"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
  ```

## 📦 Dependencies

- [x] **Packages installed** (Already done)
  - leaflet
  - react-leaflet

## 🧪 Testing

- [ ] **Test the demo page**
  - Visit: `http://localhost:3000/map-demo`
  - Should see interactive map with markers
  - Try clicking "Move Rider Towards Customer"
  - Try toggling route display

- [ ] **Test rider location update**
  - Login as a delivery rider
  - Accept an order
  - Go to order detail page
  - Click "Update My Location" button
  - Allow browser location permissions
  - Should see success message

- [ ] **Test live tracking**
  - Have an active order with rider assigned
  - Update rider location
  - Check if map updates in real-time
  - Verify marker animates smoothly

## 📍 Location Data

- [ ] **Add location data to orders**
  - When creating orders, include:
    - `restaurant_latitude`
    - `restaurant_longitude`
    - `customer_latitude`
    - `customer_longitude`

Example:
```javascript
const { data, error } = await supabase
  .from('orders')
  .insert({
    // ... other fields
    restaurant_latitude: 27.7172,
    restaurant_longitude: 85.3240,
    customer_latitude: 27.7050,
    customer_longitude: 85.3400,
  });
```

## 🔐 Permissions

- [ ] **Browser location permissions**
  - Allow location access when prompted
  - Check browser settings if blocked

- [ ] **Supabase Realtime enabled**
  - Go to Supabase Dashboard → Database → Replication
  - Ensure `profiles` table has realtime enabled

## 🎯 Integration Points

- [x] **Delivery rider page** (Already integrated)
  - Map shows for active orders
  - Location updater component added
  - Auto-update when "out for delivery"

- [ ] **Customer orders page** (Optional)
  - Add `CustomerOrderTracking` component if desired
  ```javascript
  import CustomerOrderTracking from '../components/CustomerOrderTracking';
  <CustomerOrderTracking orderId={orderId} />
  ```

## 🐛 Troubleshooting

If something doesn't work, check:

- [ ] Browser console for errors (F12 → Console)
- [ ] Network tab for failed API calls
- [ ] Supabase logs for database errors
- [ ] Location permissions in browser settings
- [ ] Coordinates are in correct format: `[longitude, latitude]`

## 📚 Documentation

Files to reference:

- [ ] `RUN_THIS_MIGRATION.md` - Migration instructions
- [ ] `MIGRATION_STEPS.txt` - Step-by-step guide
- [ ] `QUICK_START_MAP.md` - Quick reference
- [ ] `DELIVERY_MAP_README.md` - Full documentation
- [ ] `MAP_IMPLEMENTATION_SUMMARY.md` - Technical details

## ✨ Success Criteria

You'll know everything is working when:

✅ No errors in browser console  
✅ Map displays with markers  
✅ Route line shows between locations  
✅ "Update My Location" button works  
✅ Map updates in real-time when location changes  
✅ Markers animate smoothly  
✅ Auto-fit bounds shows all locations  

---

## 🎉 All Done?

If all checkboxes are checked, your live delivery map tracking is fully operational!

Test it end-to-end:
1. Create an order with location data
2. Assign a rider
3. Rider updates location
4. Watch the map update in real-time
5. Celebrate! 🎊
