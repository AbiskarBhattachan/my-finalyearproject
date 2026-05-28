# Route Visualization Guide

## 🗺️ Map Route Lines Explained

### Visual Overview

```
        🍽️ Restaurant
         │ (Pickup Point)
         │
         ╲ Orange Dashed Line
          ╲ (Restaurant → Rider)
           ╲
            🛵 Rider ═══════════════════════════════
             (Current Position)    Blue Solid Line
                                   (Full Route via OSRM)
                                              ╲
                                       Green Dashed Line
                                        (Rider → Customer)
                                                ╲
                                                 🏠 Customer
                                                  (Delivery Point)
```

---

## 📊 Route Line Types

### 1. Main Route (Blue Solid Line)
```
Color: #4A90E2 (Blue)
Style: Solid line
Weight: 5px
Opacity: 80%
Source: OSRM (Open Source Routing Machine)
```

**What it shows**:
- Actual driving route
- Follows roads and streets
- Calculated by routing engine
- Most accurate path

**When visible**:
- When at least 2 points are available
- Internet connection active
- OSRM service reachable

**Example**:
```
Restaurant (Thamel) ═══════════════════> Customer (Boudhanath)
                    (via roads: 3.8 km, 12 min)
```

---

### 2. Restaurant → Rider (Orange Dashed Line)
```
Color: #FF6B35 (Orange)
Style: Dashed (5px dash, 10px gap)
Weight: 3px
Opacity: 50%
```

**What it shows**:
- Direct connection from restaurant to rider
- Shows rider's progress from pickup point
- Updates as rider moves

**When visible**:
- When both restaurant and rider locations exist
- During "preparing" and "out_for_delivery" status

**Example**:
```
🍽️ Restaurant - - - - - - - > 🛵 Rider
   (Thamel)                    (Moving)
```

---

### 3. Rider → Customer (Green Dashed Line)
```
Color: #50C878 (Green)
Style: Dashed (5px dash, 10px gap)
Weight: 3px
Opacity: 50%
```

**What it shows**:
- Direct connection from rider to customer
- Shows remaining distance to delivery
- Updates as rider approaches

**When visible**:
- When both rider and customer locations exist
- During "out_for_delivery" status

**Example**:
```
🛵 Rider - - - - - - - > 🏠 Customer
  (Moving)              (Boudhanath)
```

---

### 4. Restaurant → Customer (Gray Dashed Line)
```
Color: #9CA3AF (Gray)
Style: Dashed (10px dash, 10px gap)
Weight: 3px
Opacity: 40%
Fallback: Shows when no rider assigned
```

**What it shows**:
- Direct line from restaurant to customer
- Estimated delivery path
- Placeholder before rider accepts

**When visible**:
- When restaurant and customer exist
- But NO rider assigned yet
- During "pending" and "confirmed" status

**Example**:
```
🍽️ Restaurant - - - - - - - - - - - > 🏠 Customer
   (Thamel)                           (Boudhanath)
   (Waiting for rider to accept...)
```

---

## 🎨 Color Coding System

| Color | Meaning | Use Case |
|-------|---------|----------|
| 🔵 Blue | Main route | Actual driving path |
| 🟠 Orange | To pickup | Restaurant → Rider |
| 🟢 Green | To delivery | Rider → Customer |
| ⚪ Gray | Planned | Restaurant → Customer (no rider) |

---

## 📍 Three-Point Tracking Stages

### Stage 1: Order Placed (No Rider)
```
🍽️ Restaurant
 │
 │ Gray dashed line
 │ (planned route)
 │
 🏠 Customer

Status: "pending" or "confirmed"
Visible: Restaurant, Customer
Route: Gray dashed line (direct)
```

### Stage 2: Rider Assigned (Preparing)
```
🍽️ Restaurant
 │╲
 │ ╲ Orange dashed
 │  ╲ (rider approaching)
 │   🛵 Rider
 │
 │ Gray dashed
 │ (to customer)
 │
 🏠 Customer

Status: "preparing"
Visible: Restaurant, Rider, Customer
Routes: Orange (Restaurant→Rider), Gray (Restaurant→Customer)
```

### Stage 3: Out for Delivery
```
🍽️ Restaurant
 │
 │ (rider picked up)
 │
 │        🛵 Rider
 │         │╲
 │         │ ╲ Green dashed
 │         │  ╲ (delivering)
 │         │   ╲
 │         │    🏠 Customer
 │         │
 │         Blue solid line
 │         (full route)

Status: "out_for_delivery"
Visible: All three points
Routes: 
  - Blue solid (full route)
  - Orange dashed (Restaurant→Rider)
  - Green dashed (Rider→Customer)
```

### Stage 4: Delivered
```
🍽️ Restaurant
 │
 │
 │
 │        🛵 Rider
 │         │
 │         │ (at customer)
 │         │
 │         🏠 Customer ✓

Status: "delivered"
Visible: All three points (static)
Routes: Completed (no active lines)
```

---

## 🔄 Dynamic Updates

### Route Recalculation Triggers

1. **Rider Location Changes**
   - Every 5 seconds during delivery
   - Route recalculates automatically
   - Lines update smoothly

2. **Customer Location Changes**
   - Every 30 seconds (if enabled)
   - Route adjusts to new position
   - Delivery point updates

3. **Status Changes**
   - Order status updates
   - Different lines show/hide
   - Visual feedback changes

---

## 🎯 Real-World Example

### Pizza Delivery from Thamel to Boudhanath

**Initial State** (Order Placed):
```
🍽️ Pizza Shop (Thamel)
   27.7172, 85.3240
   │
   │ - - - - - - - - (Gray dashed: 3.8 km)
   │
   🏠 Customer (Boudhanath)
      27.7215, 85.3618
```

**Rider Accepts** (Preparing):
```
🍽️ Pizza Shop
   │╲
   │ ╲ - - - (Orange: 0.5 km)
   │  ╲
   │   🛵 Rider (Nearby)
   │      27.7180, 85.3250
   │
   │ - - - - - - - - (Gray: 3.8 km)
   │
   🏠 Customer
```

**Out for Delivery**:
```
🍽️ Pizza Shop
   │
   │ ═══════════════════════════════
   │  (Blue solid: Full route 3.8 km)
   │
   │        🛵 Rider (Moving)
   │           27.7195, 85.3400
   │            │╲
   │            │ ╲ - - - (Green: 1.2 km remaining)
   │            │  ╲
   │            │   🏠 Customer
```

**Near Delivery**:
```
🍽️ Pizza Shop
   │
   │
   │
   │                    🛵 Rider
   │                       27.7210, 85.3600
   │                        │╲
   │                        │ ╲ - - (Green: 0.2 km)
   │                        │  ╲
   │                        │   🏠 Customer
```

**Delivered**:
```
🍽️ Pizza Shop
   │
   │
   │
   │                    🛵🏠 Rider at Customer
   │                       ✓ Delivered!
```

---

## 💡 Visual Indicators

### Line Styles Meaning

| Style | Meaning |
|-------|---------|
| ═══ Solid | Actual route (follows roads) |
| - - - Dashed | Direct connection (straight line) |
| Thick line | Main route |
| Thin line | Helper/connection line |

### Animation Effects

1. **Rider Marker**
   - Smooth movement between updates
   - 1-second animation
   - Linear interpolation

2. **Route Lines**
   - Fade in/out when appearing/disappearing
   - Color transitions
   - Smooth redraw

3. **Map Bounds**
   - Auto-zoom to fit all points
   - Smooth pan and zoom
   - Maintains padding

---

## 🎨 Customization Options

### Current Settings
```javascript
// Main Route
color: '#4A90E2'  // Blue
weight: 5
opacity: 0.8

// Restaurant → Rider
color: '#FF6B35'  // Orange
weight: 3
opacity: 0.5
dashArray: '5, 10'

// Rider → Customer
color: '#50C878'  // Green
weight: 3
opacity: 0.5
dashArray: '5, 10'

// Restaurant → Customer (fallback)
color: '#9CA3AF'  // Gray
weight: 3
opacity: 0.4
dashArray: '10, 10'
```

---

## 🔧 Technical Details

### OSRM Route Calculation
```javascript
// Build waypoints
const waypoints = [
  `${restaurantLng},${restaurantLat}`,
  `${riderLng},${riderLat}`,
  `${customerLng},${customerLat}`
].join(';');

// Fetch route
const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;

// Draw on map
<Polyline positions={routeCoords} color="#4A90E2" />
```

### Direct Line Calculation
```javascript
// Simple straight line between two points
<Polyline
  positions={[
    [point1Lat, point1Lng],
    [point2Lat, point2Lng]
  ]}
  color="#FF6B35"
  dashArray="5, 10"
/>
```

---

## 📱 Mobile View

Routes display the same on mobile:
- Touch-friendly map controls
- Pinch to zoom
- Swipe to pan
- All lines visible
- Markers tappable for info

---

## ✅ Benefits

### For Riders
✅ Clear visual path to follow  
✅ See pickup and delivery points  
✅ Understand route at a glance  
✅ No confusion about direction  

### For Customers
✅ See rider's progress  
✅ Know when rider picks up  
✅ Watch approach in real-time  
✅ Prepare for delivery  

### For Business
✅ Professional appearance  
✅ Transparent tracking  
✅ Better customer experience  
✅ Reduced support calls  

---

## 🎉 Summary

Your map now shows:
- 🔵 **Blue solid line** - Main route (OSRM)
- 🟠 **Orange dashed** - Restaurant to Rider
- 🟢 **Green dashed** - Rider to Customer
- ⚪ **Gray dashed** - Planned route (no rider)

All updating automatically in real-time! 🚀
