# 🚀 Quick Start Guide - Live Delivery Map

## 1️⃣ Run Database Migration (Required)

Open Supabase SQL Editor and run:

```sql
-- File: supabase/add_location_tracking.sql
-- Copy and paste the entire file content
```

## 2️⃣ Test the Demo

Start your dev server:
```bash
npm run dev
```

Visit: **http://localhost:3000/map-demo**

## 3️⃣ Set Location Data in Orders

When creating orders, include location coordinates:

```javascript
const { data, error } = await supabase
  .from('orders')
  .insert({
    // ... other order fields
    restaurant_latitude: 27.7172,
    restaurant_longitude: 85.3240,
    customer_latitude: 27.7050,
    customer_longitude: 85.3400,
  });
```

**Format:** `[longitude, latitude]` (GeoJSON standard)

## 4️⃣ Update Rider Location

### Option A: Use the Component (Recommended)

Already integrated in `/delivery-rider` page:

```javascript
<RiderLocationUpdater 
  riderId={userId} 
  autoUpdate={true}  // Auto-updates when out for delivery
/>
```

### Option B: Manual Update via API

```javascript
const updateRiderLocation = async (riderId, latitude, longitude) => {
  await supabase
    .from('profiles')
    .update({
      latitude,
      longitude,
      location_updated_at: new Date().toISOString(),
    })
    .eq('id', riderId);
};
```

### Option C: Browser Geolocation

```javascript
navigator.geolocation.getCurrentPosition(async (position) => {
  await updateRiderLocation(
    riderId,
    position.coords.latitude,
    position.coords.longitude
  );
});
```

## 5️⃣ View the Map

### For Delivery Riders:
Visit: `/delivery-rider?order_id=YOUR_ORDER_ID`

The map automatically shows when:
- ✅ Rider is assigned to the order
- ✅ Order status is not "delivered"

### For Customers:
Add to your orders page:

```javascript
import CustomerOrderTracking from '../components/CustomerOrderTracking';

<CustomerOrderTracking orderId={orderId} />
```

## 📍 Example Coordinates (Kathmandu, Nepal)

Use these for testing:

```javascript
// Thamel (Restaurant)
restaurant_latitude: 27.7172
restaurant_longitude: 85.3240

// Durbar Marg (Customer)
customer_latitude: 27.7050
customer_longitude: 85.3400

// Patan (Rider)
rider_latitude: 27.6710
rider_longitude: 85.3250
```

## 🎮 Demo Page Features

Visit `/map-demo` to:
- ✅ See the map in action
- ✅ Simulate rider movement
- ✅ Adjust marker positions
- ✅ Toggle route display
- ✅ Test all features

## 🔧 Common Issues

### Map not showing?
- ✅ Check browser console for errors
- ✅ Verify location data is set in orders
- ✅ Ensure coordinates are valid numbers

### Markers not appearing?
- ✅ Check coordinate format: `[longitude, latitude]`
- ✅ Verify values are within valid ranges:
  - Latitude: -90 to 90
  - Longitude: -180 to 180

### Route not displaying?
- ✅ Ensure both restaurant and customer locations are set
- ✅ Check internet connection (OSRM API requires network)
- ✅ Verify coordinates are valid

### Location not updating?
- ✅ Check Supabase Realtime is enabled
- ✅ Verify RLS policies allow reading location
- ✅ Ensure browser has geolocation permissions

## 📱 Mobile Testing

1. Open on mobile device
2. Allow location permissions
3. Click "Update My Location" button
4. Watch the map update in real-time

## 🎯 What's Already Integrated

✅ **Delivery Rider Page** (`/delivery-rider`)
- Map shows automatically for active orders
- Location updater with auto-update mode
- Smooth marker animations

✅ **Build System**
- All Suspense boundaries fixed
- TypeScript checks passing
- Production build working

✅ **Components**
- DeliveryMap - Core map component
- LiveDeliveryTracker - Realtime wrapper
- RiderLocationUpdater - Location updates
- CustomerOrderTracking - Customer view

## 📚 Full Documentation

For detailed information, see:
- `DELIVERY_MAP_README.md` - Complete documentation
- `MAP_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `app/map-demo/page.js` - Interactive demo

## 🎉 You're Ready!

The live delivery map tracking is fully implemented and ready to use. Just:

1. ✅ Run the SQL migration
2. ✅ Set location data in orders
3. ✅ Update rider locations
4. ✅ View the map!

---

**Need help?** Check the full documentation in `DELIVERY_MAP_README.md`
