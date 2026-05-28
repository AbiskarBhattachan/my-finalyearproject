# Two-Point Delivery System Flow

## 🎯 System Overview

The delivery system now tracks **THREE locations**:
1. 🍽️ **Restaurant** (Pickup Point) - Seller's location
2. 🛵 **Rider** (Live Tracking) - Real-time position
3. 🏠 **Customer** (Drop-off Point) - Delivery address

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         SELLER SETUP                             │
│  1. Seller logs in → Profile page                               │
│  2. Sets restaurant location (GPS or manual)                    │
│  3. Location saved in profiles table                            │
│     - restaurant_latitude                                        │
│     - restaurant_longitude                                       │
│     - restaurant_address                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CUSTOMER ORDERS                             │
│  1. Customer browses menu from restaurant                       │
│  2. Adds items to cart                                          │
│  3. Goes to checkout                                            │
│  4. Enters delivery details:                                    │
│     - Delivery address                                          │
│     - Phone number                                              │
│     - City & postal code                                        │
│  5. Selects payment method (COD or Online)                      │
│  6. Places order                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      ORDER CREATION                              │
│  System automatically captures:                                 │
│  ✓ Restaurant location (from seller profile)                    │
│  ✓ Customer delivery address                                    │
│  ✓ Order stored in orders table with:                           │
│    - restaurant_latitude (from seller)                          │
│    - restaurant_longitude (from seller)                         │
│    - customer_latitude (to be added)                            │
│    - customer_longitude (to be added)                           │
│    - delivery_address                                           │
│    - phone                                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   DELIVERY RIDER ACCEPTS                         │
│  1. Rider sees available orders                                 │
│  2. Accepts order → assigned as delivery_rider_id               │
│  3. Order detail page loads with:                               │
│     - Restaurant location (pickup)                              │
│     - Customer location (delivery)                              │
│     - Rider location (live tracking)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    LIVE TRACKING MAP                             │
│  Map displays three markers:                                    │
│  🍽️ Restaurant (Orange) - Pickup point                          │
│  🛵 Rider (Blue) - Updates every few seconds                    │
│  🏠 Customer (Green) - Delivery destination                      │
│                                                                  │
│  Features:                                                       │
│  ✓ Route line connecting all points                            │
│  ✓ Real-time rider position updates                            │
│  ✓ Distance calculations                                        │
│  ✓ ETA estimates                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DELIVERY PROCESS                              │
│  Status Flow:                                                    │
│  1. Confirmed → Rider accepts order                             │
│  2. Preparing → Restaurant prepares food                        │
│  3. Out for Delivery → Rider picks up & heads to customer       │
│     (Rider location tracked in real-time)                       │
│  4. Delivered → Order complete                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Map Visualization

```
        🍽️ Restaurant
         │ (Pickup Point)
         │
         │ ← Rider travels here first
         │
        🛵 Rider
         │ (Live Location)
         │ Updates every 5 seconds
         │
         │ ← Then delivers to customer
         │
        🏠 Customer
           (Drop-off Point)
```

---

## 💾 Database Schema

### profiles table
```sql
-- Existing columns
id, email, full_name, phone, role, restaurant_name...

-- NEW columns for restaurant location
restaurant_latitude    DECIMAL(10,8)  -- e.g., 27.7172
restaurant_longitude   DECIMAL(11,8)  -- e.g., 85.3240
restaurant_address     TEXT           -- Full address

-- Existing columns for rider tracking
latitude              DECIMAL(10,8)   -- Rider's current lat
longitude             DECIMAL(11,8)   -- Rider's current lng
location_updated_at   TIMESTAMPTZ     -- Last update time
```

### orders table
```sql
-- Existing columns
id, customer_id, seller_id, status, total_amount...

-- Location columns (from add_location_tracking.sql)
restaurant_latitude    DECIMAL(10,8)  -- Pickup location
restaurant_longitude   DECIMAL(11,8)  -- Pickup location
customer_latitude      DECIMAL(10,8)  -- Delivery location
customer_longitude     DECIMAL(11,8)  -- Delivery location

-- Other columns
delivery_address       TEXT           -- Full delivery address
phone                 TEXT           -- Customer phone
delivery_rider_id     UUID           -- Assigned rider
```

---

## 🔄 Real-time Updates

### Rider Location Updates
```javascript
// RiderLocationUpdater component
// Updates rider's location in profiles table every 5 seconds
// When status = 'out_for_delivery'

UPDATE profiles 
SET latitude = ?, 
    longitude = ?, 
    location_updated_at = NOW()
WHERE id = rider_id
```

### Live Tracking Subscription
```javascript
// LiveDeliveryTracker component
// Subscribes to rider location changes via Supabase Realtime

supabase
  .channel('rider-location-{rider_id}')
  .on('postgres_changes', {
    event: 'UPDATE',
    table: 'profiles',
    filter: `id=eq.${rider_id}`
  }, (payload) => {
    // Update map with new rider position
  })
```

---

## 🎨 UI Components

### 1. Profile Page (Sellers)
```
┌─────────────────────────────────────┐
│  🏪 Restaurant Location             │
├─────────────────────────────────────┤
│  Restaurant Address:                │
│  [________________________]         │
│                                     │
│  Latitude:        Longitude:        │
│  [_________]      [_________]       │
│                                     │
│  [📍 Get Current Location]          │
│  [Save Restaurant Location]         │
└─────────────────────────────────────┘
```

### 2. Delivery Rider Dashboard
```
┌─────────────────────────────────────┐
│  Order #ABC123                      │
├─────────────────────────────────────┤
│  🗺️ Live Delivery Tracking          │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │    🍽️ Restaurant              │  │
│  │         │                     │  │
│  │         │                     │  │
│  │        🛵 Rider               │  │
│  │         │                     │  │
│  │         │                     │  │
│  │        🏠 Customer             │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  🍽️ Restaurant  🛵 Rider  🏠 Customer│
│     Located      Tracking   Located │
└─────────────────────────────────────┘
```

---

## 🚀 Key Features

### ✅ Implemented
- [x] Seller can set restaurant location
- [x] GPS auto-capture for location
- [x] Manual coordinate entry
- [x] Restaurant location saved to profile
- [x] Order captures restaurant location
- [x] Delivery rider sees pickup location
- [x] Delivery rider sees delivery location
- [x] Live map with 3 points
- [x] Real-time rider tracking
- [x] Route visualization

### 🎯 Benefits
- **For Riders**: Clear pickup and delivery points
- **For Customers**: Full delivery visibility
- **For Sellers**: Professional tracking system
- **For Business**: Better logistics management

---

## 📝 Usage Example

### Scenario: Pizza Delivery

1. **Seller (Pizza Shop)**
   - Sets location: Thamel, Kathmandu (27.7172, 85.3240)
   - Location saved once, used for all orders

2. **Customer**
   - Orders pizza
   - Enters delivery address: Boudhanath (27.7215, 85.3618)
   - Places order

3. **System**
   - Creates order with:
     - Pickup: 27.7172, 85.3240 (Pizza Shop)
     - Delivery: 27.7215, 85.3618 (Customer)

4. **Delivery Rider**
   - Accepts order
   - Sees map with:
     - 🍽️ Pizza Shop (pickup)
     - 🏠 Customer home (delivery)
   - Starts delivery
   - Location tracked: 27.7180, 85.3300 (moving)
   - Customer sees rider approaching in real-time

5. **Delivery Complete**
   - Rider marks delivered
   - Customer receives order
   - Tracking ends

---

## 🔧 Technical Stack

- **Frontend**: Next.js, React
- **Backend**: Supabase (PostgreSQL)
- **Maps**: Leaflet.js
- **Real-time**: Supabase Realtime
- **Geolocation**: Browser Geolocation API

---

## 📚 Related Documentation

- [RESTAURANT_LOCATION_SETUP.md](./RESTAURANT_LOCATION_SETUP.md) - Detailed setup guide
- [QUICK_SETUP_RESTAURANT_LOCATION.md](./QUICK_SETUP_RESTAURANT_LOCATION.md) - Quick start
- [MAP_IMPLEMENTATION_SUMMARY.md](./MAP_IMPLEMENTATION_SUMMARY.md) - Map technical details
- [DELIVERY_MAP_README.md](./DELIVERY_MAP_README.md) - Map component docs

---

## 🎉 Result

A complete two-point delivery tracking system where:
- Riders know exactly where to pick up (restaurant)
- Riders know exactly where to deliver (customer)
- Everyone can track the delivery in real-time
- Professional, transparent delivery experience
