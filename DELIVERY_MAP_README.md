# 🗺️ Live Delivery Map Tracking

A complete implementation of real-time delivery tracking with interactive maps for your Next.js food delivery application.

## ✨ Features

- **Real-time Location Tracking** - Live rider location updates via Supabase Realtime
- **Interactive Map** - Built with React-Leaflet and OpenStreetMap
- **Route Visualization** - Driving routes powered by OSRM (Open Source Routing Machine)
- **Custom Markers** - Beautiful emoji-based markers for restaurant (🍽️), rider (🛵), and customer (🏠)
- **Smooth Animations** - Animated rider marker transitions
- **Auto-fit Bounds** - Map automatically adjusts to show all locations
- **Next.js Compatible** - Properly handles SSR with dynamic imports
- **Mobile Responsive** - Works great on all screen sizes

## 📦 Installed Packages

```bash
npm install leaflet react-leaflet
```

## 🗂️ File Structure

```
app/
├── components/
│   ├── DeliveryMap.js              # Core map component
│   ├── LiveDeliveryTracker.js      # Wrapper with Supabase integration
│   ├── RiderLocationUpdater.js     # Location update component for riders
│   └── leaflet-fix.css             # Fixes for Leaflet in Next.js
├── delivery-rider/
│   └── page.js                     # Updated with map integration
└── map-demo/
    └── page.js                     # Interactive demo page

supabase/
└── add_location_tracking.sql       # Database migration
```

## 🚀 Setup Instructions

### 1. Database Setup

Run the SQL migration in your Supabase SQL editor:

```sql
-- File: supabase/add_location_tracking.sql
-- This adds location columns to orders and profiles tables
```

The migration adds:
- `restaurant_latitude`, `restaurant_longitude` to `orders` table
- `customer_latitude`, `customer_longitude` to `orders` table  
- `latitude`, `longitude`, `location_updated_at` to `profiles` table

### 2. Set Location Data

When creating orders, include location data:

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

### 3. Update Rider Location

Riders can update their location using the `RiderLocationUpdater` component:

```javascript
import RiderLocationUpdater from '../components/RiderLocationUpdater';

<RiderLocationUpdater 
  riderId={userId} 
  autoUpdate={true}  // Auto-update when true
/>
```

Or manually via API:

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

### 4. Display the Map

Use the `LiveDeliveryTracker` component:

```javascript
import dynamic from 'next/dynamic';

const LiveDeliveryTracker = dynamic(
  () => import('../components/LiveDeliveryTracker'),
  { ssr: false }
);

// In your component
<LiveDeliveryTracker orderId={orderId} initialOrder={order} />
```

## 🎮 Demo Page

Visit `/map-demo` to see an interactive demo with:
- Live map visualization
- Simulated rider movement
- Adjustable marker positions
- Route toggle
- Feature showcase

## 🔧 Component API

### DeliveryMap

Core map component with markers and routes.

```javascript
<DeliveryMap
  restaurantLocation={[lng, lat]}  // [longitude, latitude]
  riderLocation={[lng, lat]}
  customerLocation={[lng, lat]}
  showRoute={true}                 // Show/hide route line
  height="400px"                   // Map height
  className=""                     // Additional CSS classes
/>
```

### LiveDeliveryTracker

Wrapper that handles Supabase Realtime updates.

```javascript
<LiveDeliveryTracker
  orderId="order-uuid"             // Order ID to track
  initialOrder={orderObject}       // Optional: initial order data
/>
```

### RiderLocationUpdater

Component for riders to update their location.

```javascript
<RiderLocationUpdater
  riderId="user-uuid"              // Rider's user ID
  autoUpdate={false}               // Auto-update location (uses watchPosition)
/>
```

## 🌍 Location Format

**Important:** Different formats are used:

- **Database & Props:** `[longitude, latitude]` (GeoJSON standard)
- **Leaflet Display:** `[latitude, longitude]` (Leaflet standard)

The components handle conversion automatically.

## 🔐 Supabase Realtime

The map automatically subscribes to rider location updates:

```javascript
supabase
  .channel(`rider-location-${riderId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles',
    filter: `id=eq.${riderId}`,
  }, (payload) => {
    // Update rider marker position
  })
  .subscribe();
```

## 🎨 Customization

### Custom Marker Icons

Edit the `createCustomIcon` function in `DeliveryMap.js`:

```javascript
const createCustomIcon = (emoji, color = '#FF6B35') => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; ...">
      <span>${emoji}</span>
    </div>`,
    // ... other options
  });
};
```

### Map Styling

Modify the TileLayer URL for different map styles:

```javascript
// Default OpenStreetMap
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

// Dark mode (CartoDB Dark Matter)
url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"

// Satellite (requires API key)
url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
```

### Route Styling

Modify the Polyline component:

```javascript
<Polyline
  positions={route}
  color="#4A90E2"      // Line color
  weight={4}           // Line width
  opacity={0.7}        // Transparency
  dashArray="10, 10"   // Dashed line pattern
/>
```

## 🐛 Troubleshooting

### Markers not showing

Make sure you've imported the Leaflet CSS and the fix:

```javascript
import 'leaflet/dist/leaflet.css';
import './leaflet-fix.css';
```

### Map not rendering

Use dynamic import with `ssr: false`:

```javascript
const DeliveryMap = dynamic(() => import('./DeliveryMap'), {
  ssr: false
});
```

### Route not displaying

Check that:
1. Both restaurant and customer locations are provided
2. Locations are valid coordinates
3. OSRM API is accessible (check browser console)

### Location not updating

Verify:
1. Supabase Realtime is enabled for the `profiles` table
2. RLS policies allow reading location data
3. Browser has geolocation permissions

## 📱 Mobile Considerations

### Geolocation Permissions

Request permissions properly:

```javascript
navigator.permissions.query({ name: 'geolocation' }).then((result) => {
  if (result.state === 'granted') {
    // Get location
  } else if (result.state === 'prompt') {
    // Will prompt user
  }
});
```

### Battery Optimization

For auto-update mode, consider:

```javascript
const options = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 30000,  // Cache for 30 seconds to save battery
};
```

## 🔒 Security & Privacy

### RLS Policies

Ensure proper Row Level Security:

```sql
-- Allow riders to update their own location
CREATE POLICY "Riders can update own location"
ON profiles FOR UPDATE
USING (auth.uid() = id AND role = 'delivery_rider');

-- Allow customers to view rider location for their orders
CREATE POLICY "View rider location for own orders"
ON profiles FOR SELECT
USING (
  id IN (
    SELECT delivery_rider_id FROM orders 
    WHERE customer_id = auth.uid()
  )
);
```

### Data Privacy

- Only share rider location for active deliveries
- Clear location data after delivery completion
- Implement location history retention policies

## 🚀 Performance Tips

1. **Debounce location updates** - Don't update on every GPS change
2. **Use indexes** - The migration includes location indexes
3. **Limit realtime subscriptions** - Unsubscribe when component unmounts
4. **Cache routes** - Store calculated routes to reduce API calls

## 📚 Resources

- [Leaflet Documentation](https://leafletjs.com/)
- [React-Leaflet Documentation](https://react-leaflet.js.org/)
- [OSRM API Documentation](http://project-osrm.org/docs/v5.24.0/api/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

## 🎯 Next Steps

- [ ] Add estimated time of arrival (ETA) calculation
- [ ] Implement geofencing for delivery zones
- [ ] Add turn-by-turn navigation instructions
- [ ] Create delivery history heatmap
- [ ] Add multiple waypoint support
- [ ] Implement offline map caching

## 💡 Tips

- Test with the `/map-demo` page first
- Use real GPS coordinates for production
- Consider rate limiting location updates
- Add error boundaries for map components
- Implement fallback UI for unsupported browsers

---

Built with ❤️ using React-Leaflet, OpenStreetMap, and Supabase
