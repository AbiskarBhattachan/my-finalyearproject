# Customer Location Tracking & Route Visualization

## 🎯 Overview

Enhanced delivery tracking system with:
1. **Customer GPS Location** - Captured at checkout
2. **Auto-updating Locations** - Real-time updates for both rider and customer
3. **Route Lines** - Visual routes connecting all three points
4. **Three-Point Tracking** - Restaurant → Rider → Customer

---

## ✨ New Features

### 1. Customer Location Capture
- **Where**: Checkout page
- **How**: GPS auto-capture button
- **When**: During order placement
- **Optional**: But highly recommended

### 2. Route Visualization
- **Main Route**: Blue solid line (OSRM routing)
- **Connection Lines**: Dashed lines between points
  - Orange: Restaurant → Rider
  - Green: Rider → Customer
  - Gray: Restaurant → Customer (when no rider)

### 3. Auto-Updates
- **Rider Location**: Every 5 seconds (when out for delivery)
- **Customer Location**: Every 30 seconds (optional, on tracking page)
- **Route**: Recalculates when locations change

---

## 🚀 Setup Instructions

### No Additional Setup Required!

The system is ready to use. Just ensure:
1. ✅ Restaurant location SQL migration is run
2. ✅ Sellers have set their restaurant location
3. ✅ Customers allow browser location access

---

## 📱 User Experience

### For Customers

#### At Checkout:
```
1. Fill delivery address
2. Click "📍 Get My Location"
3. Allow browser location access
4. See "✓ Location Captured"
5. Place order
```

**Benefits**:
- Riders can navigate directly to your GPS coordinates
- More accurate than address alone
- Faster delivery
- Less confusion

#### During Tracking:
```
1. Go to Orders page
2. Click on active order
3. See live map with:
   - 🍽️ Restaurant (where food is prepared)
   - 🛵 Rider (moving in real-time)
   - 🏠 Your location (auto-updating)
4. Watch rider approach in real-time
```

### For Delivery Riders

#### On Order Detail Page:
```
1. Accept order
2. See map with all three points
3. Follow route lines:
   - First: Go to restaurant (orange line)
   - Then: Go to customer (green line)
4. Your location updates automatically
5. Customer sees you approaching
```

**Benefits**:
- Clear pickup location
- Clear delivery location
- Optimal route shown
- No confusion about where to go

### For Sellers

**No changes needed!**
- Restaurant location already set in profile
- Automatically included in all orders

---

## 🗺️ Map Features

### Three Markers

| Marker | Icon | Color | Description |
|--------|------|-------|-------------|
| Restaurant | 🍽️ | Orange | Pickup point (static) |
| Rider | 🛵 | Blue | Live tracking (updates every 5s) |
| Customer | 🏠 | Green | Delivery point (updates every 30s) |

### Route Lines

| Line Type | Color | Style | Purpose |
|-----------|-------|-------|---------|
| Main Route | Blue | Solid | OSRM calculated route |
| Restaurant→Rider | Orange | Dashed | Connection to pickup |
| Rider→Customer | Green | Dashed | Connection to delivery |
| Restaurant→Customer | Gray | Dashed | Direct line (no rider) |

### Auto-Fit Bounds
- Map automatically zooms to show all points
- Adjusts when locations update
- Maintains optimal view

---

## 🔄 Auto-Update System

### Rider Location (RiderLocationUpdater)
```javascript
Update Frequency: Every 5 seconds
Triggers When: Order status = 'out_for_delivery'
Updates: profiles.latitude, profiles.longitude
Visible To: Customer, Seller, Admin
```

### Customer Location (CustomerLocationUpdater)
```javascript
Update Frequency: Every 30 seconds
Triggers When: Customer enables tracking
Updates: orders.customer_latitude, orders.customer_longitude
Visible To: Rider, Seller, Admin
Optional: Customer can disable
```

### Route Recalculation
```javascript
Triggers When: Any location changes
Service: OSRM (Open Source Routing Machine)
Fallback: Direct lines if routing fails
```

---

## 💾 Database Schema

### orders table
```sql
-- Location columns (already exist from add_location_tracking.sql)
restaurant_latitude    DECIMAL(10,8)  -- From seller profile
restaurant_longitude   DECIMAL(11,8)  -- From seller profile
customer_latitude      DECIMAL(10,8)  -- From checkout GPS
customer_longitude     DECIMAL(11,8)  -- From checkout GPS
```

### profiles table
```sql
-- Rider location (already exists)
latitude              DECIMAL(10,8)   -- Rider current position
longitude             DECIMAL(11,8)   -- Rider current position
location_updated_at   TIMESTAMPTZ     -- Last update time

-- Restaurant location (new from add_restaurant_location.sql)
restaurant_latitude    DECIMAL(10,8)  -- Seller's restaurant
restaurant_longitude   DECIMAL(11,8)  -- Seller's restaurant
restaurant_address     TEXT           -- Full address
```

---

## 🎨 UI Components

### 1. Checkout Page - Customer Location Capture
```
┌─────────────────────────────────────────┐
│ 📍 Your Location (Optional)             │
│ Help delivery riders find you faster    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ Location Captured                 │ │
│ │ Lat: 27.7172                        │ │
│ │ Lng: 85.3240                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [📍 Get My Location]                    │
└─────────────────────────────────────────┘
```

### 2. Orders Page - Live Tracking Map
```
┌─────────────────────────────────────────┐
│ 🗺️ Live Delivery Tracking               │
│ ● Rider location updating live          │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │    🍽️ Restaurant                    │ │
│ │      ╲ (orange dashed)              │ │
│ │       ╲                             │ │
│ │        🛵 Rider ═══════════════     │ │
│ │                  (blue solid)       │ │
│ │                           ╲         │ │
│ │                    (green dashed)   │ │
│ │                             ╲       │ │
│ │                              🏠     │ │
│ │                          Customer   │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 🍽️ Restaurant  🛵 Rider  🏠 Customer   │
│    Located      Tracking   Located     │
└─────────────────────────────────────────┘
```

### 3. Customer Location Auto-Updater
```
┌─────────────────────────────────────────┐
│ 📍 Your Location Tracking               │
│ Sharing your location helps the rider   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ● Location Active    [Update Now]   │ │
│ │ Last updated: 2:45 PM               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 🔄 Auto-updating every 30 seconds       │
└─────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### Files Modified/Created

1. **app/checkout/page.js** ✏️ MODIFIED
   - Added customer location capture
   - GPS button and state management
   - Saves coordinates to order

2. **app/components/DeliveryMap.js** ✏️ MODIFIED
   - Enhanced route calculation (3 points)
   - Multiple route lines
   - Better visualization

3. **app/components/CustomerLocationUpdater.js** ✨ NEW
   - Auto-updates customer location
   - Optional tracking component
   - Manual update button

### Route Calculation Logic

```javascript
// Build waypoints based on available locations
const waypoints = [];

if (restaurantLocation) waypoints.push(restaurant);
if (riderLocation) waypoints.push(rider);
if (customerLocation) waypoints.push(customer);

// Fetch route from OSRM
const route = await fetch(
  `https://router.project-osrm.org/route/v1/driving/${waypoints.join(';')}`
);

// Draw route on map
<Polyline positions={route} color="blue" />
```

### Connection Lines Logic

```javascript
// Restaurant to Rider (orange dashed)
if (restaurant && rider) {
  <Polyline 
    positions={[restaurant, rider]} 
    color="#FF6B35" 
    dashArray="5, 10" 
  />
}

// Rider to Customer (green dashed)
if (rider && customer) {
  <Polyline 
    positions={[rider, customer]} 
    color="#50C878" 
    dashArray="5, 10" 
  />
}

// Restaurant to Customer (gray dashed, fallback)
if (restaurant && customer && !rider) {
  <Polyline 
    positions={[restaurant, customer]} 
    color="#9CA3AF" 
    dashArray="10, 10" 
  />
}
```

---

## 🎯 Use Cases

### Scenario 1: Customer Orders Pizza

1. **Checkout**:
   - Customer enters address: "Boudhanath, Kathmandu"
   - Clicks "Get My Location"
   - GPS captures: 27.7215, 85.3618
   - Order created with coordinates

2. **Rider Accepts**:
   - Sees restaurant at: 27.7172, 85.3240 (Thamel)
   - Sees customer at: 27.7215, 85.3618 (Boudhanath)
   - Route shown: 3.8 km, 12 minutes

3. **Delivery**:
   - Rider goes to restaurant (orange line)
   - Picks up order
   - Follows route to customer (green line)
   - Customer watches rider approach in real-time

### Scenario 2: Customer Tracking

1. **Order Placed**:
   - Customer goes to Orders page
   - Clicks on active order
   - Sees map with 3 points

2. **Live Updates**:
   - Rider location updates every 5 seconds
   - Customer location updates every 30 seconds
   - Route recalculates automatically

3. **Delivery**:
   - Customer sees rider getting closer
   - Knows exactly when to expect delivery
   - Can prepare to receive order

---

## 🐛 Troubleshooting

### Customer Location Not Captured

**Issue**: "Get My Location" doesn't work

**Solutions**:
1. Allow browser location permission
2. Use HTTPS (required for geolocation)
3. Check browser compatibility
4. Try manual coordinate entry (future feature)

### Route Not Showing

**Issue**: Map shows markers but no route lines

**Solutions**:
1. Check internet connection (OSRM requires network)
2. Verify all coordinates are valid
3. Check browser console for errors
4. Fallback: Direct lines will show instead

### Location Not Updating

**Issue**: Rider/customer location stuck

**Solutions**:
1. Check auto-update is enabled
2. Verify browser tab is active
3. Check location permissions
4. Refresh the page

---

## 📊 Performance

### Update Frequencies
- **Rider**: 5 seconds (high frequency for accuracy)
- **Customer**: 30 seconds (lower frequency to save battery)
- **Route**: On-demand (when locations change)

### Battery Impact
- **Rider**: Moderate (frequent updates during delivery)
- **Customer**: Low (infrequent updates, optional)

### Network Usage
- **GPS**: No network (uses device GPS)
- **Route Calculation**: ~5KB per request
- **Map Tiles**: Cached by browser

---

## ✅ Testing Checklist

- [ ] Customer can capture location at checkout
- [ ] Location shows "✓ Location Captured"
- [ ] Order includes customer coordinates
- [ ] Map shows all three markers
- [ ] Route lines connect the points
- [ ] Rider location updates automatically
- [ ] Customer location updates (if enabled)
- [ ] Route recalculates on location change
- [ ] Map auto-fits to show all points
- [ ] Works on mobile devices

---

## 🎉 Benefits Summary

### For Customers
✅ Faster delivery (accurate GPS)  
✅ Real-time tracking  
✅ Know when rider is near  
✅ Less confusion  

### For Riders
✅ Clear pickup location  
✅ Clear delivery location  
✅ Optimal route shown  
✅ No wrong addresses  

### For Business
✅ Professional tracking  
✅ Better customer satisfaction  
✅ Reduced delivery time  
✅ Fewer support calls  

---

## 🔗 Related Documentation

- [RESTAURANT_LOCATION_SETUP.md](./RESTAURANT_LOCATION_SETUP.md) - Restaurant setup
- [TWO_POINT_DELIVERY_FLOW.md](./TWO_POINT_DELIVERY_FLOW.md) - System flow
- [MAP_IMPLEMENTATION_SUMMARY.md](./MAP_IMPLEMENTATION_SUMMARY.md) - Map details

---

## 🚀 What's Next?

Your delivery system now has:
- ✅ Three-point tracking (Restaurant, Rider, Customer)
- ✅ Auto-updating locations
- ✅ Visual route lines
- ✅ Real-time updates
- ✅ Professional delivery experience

**Ready to use!** 🎉
