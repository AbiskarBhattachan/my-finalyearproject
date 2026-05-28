'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const DeliveryMap = dynamic(() => import('../components/DeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-100 rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-2 animate-bounce">🗺️</div>
        <p className="text-gray-500 font-medium">Loading map...</p>
      </div>
    </div>
  ),
});

export default function MapDemoPage() {
  const router = useRouter();

  // Default locations in Kathmandu, Nepal
  const [restaurantLocation, setRestaurantLocation] = useState([85.3240, 27.7172]); // [lng, lat]
  const [riderLocation, setRiderLocation] = useState([85.3300, 27.7100]);
  const [customerLocation, setCustomerLocation] = useState([85.3400, 27.7050]);
  const [showRoute, setShowRoute] = useState(true);

  // Simulate rider movement
  const simulateRiderMovement = () => {
    setRiderLocation(prev => {
      const [lng, lat] = prev;
      // Move rider slightly towards customer
      const targetLng = customerLocation[0];
      const targetLat = customerLocation[1];
      const newLng = lng + (targetLng - lng) * 0.1;
      const newLat = lat + (targetLat - lat) * 0.1;
      return [newLng, newLat];
    });
  };

  // Reset to default positions
  const resetPositions = () => {
    setRestaurantLocation([85.3240, 27.7172]);
    setRiderLocation([85.3300, 27.7100]);
    setCustomerLocation([85.3400, 27.7050]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow p-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🗺️ Delivery Map Demo</h1>
            <p className="text-sm text-gray-500 mt-1">Interactive map with live tracking simulation</p>
          </div>
          <button
            onClick={() => router.push('/home')}
            className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-sm font-medium"
          >
            ← Back
          </button>
        </div>

        {/* Map */}
        <div className="bg-white rounded-2xl shadow p-5">
          <DeliveryMap
            restaurantLocation={restaurantLocation}
            riderLocation={riderLocation}
            customerLocation={customerLocation}
            showRoute={showRoute}
            height="500px"
          />
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-bold mb-4">🎮 Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <button
              onClick={simulateRiderMovement}
              className="py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              🛵 Move Rider Towards Customer
            </button>
            
            <button
              onClick={resetPositions}
              className="py-3 px-4 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition"
            >
              🔄 Reset Positions
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRoute}
                onChange={(e) => setShowRoute(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium">Show Route Line</span>
            </label>
          </div>

          <div className="space-y-3">
            <div className="bg-orange-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🍽️</span>
                <span className="font-semibold">Restaurant Location</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label className="text-gray-500 text-xs">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={restaurantLocation[0]}
                    onChange={(e) => setRestaurantLocation([parseFloat(e.target.value), restaurantLocation[1]])}
                    className="w-full px-2 py-1 border rounded mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={restaurantLocation[1]}
                    onChange={(e) => setRestaurantLocation([restaurantLocation[0], parseFloat(e.target.value)])}
                    className="w-full px-2 py-1 border rounded mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🛵</span>
                <span className="font-semibold">Rider Location</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label className="text-gray-500 text-xs">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={riderLocation[0]}
                    onChange={(e) => setRiderLocation([parseFloat(e.target.value), riderLocation[1]])}
                    className="w-full px-2 py-1 border rounded mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={riderLocation[1]}
                    onChange={(e) => setRiderLocation([riderLocation[0], parseFloat(e.target.value)])}
                    className="w-full px-2 py-1 border rounded mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🏠</span>
                <span className="font-semibold">Customer Location</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label className="text-gray-500 text-xs">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customerLocation[0]}
                    onChange={(e) => setCustomerLocation([parseFloat(e.target.value), customerLocation[1]])}
                    className="w-full px-2 py-1 border rounded mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customerLocation[1]}
                    onChange={(e) => setCustomerLocation([customerLocation[0], parseFloat(e.target.value)])}
                    className="w-full px-2 py-1 border rounded mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-bold mb-3">ℹ️ Features</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>OpenStreetMap</strong> - Free, open-source map tiles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>OSRM Routing</strong> - Real driving routes between locations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>Custom Markers</strong> - Restaurant (🍽️), Rider (🛵), Customer (🏠)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>Smooth Animation</strong> - Rider marker animates when position updates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>Supabase Realtime</strong> - Live location updates from database</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>Auto-fit Bounds</strong> - Map automatically adjusts to show all markers</span>
            </li>
          </ul>
        </div>

        {/* Usage Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl shadow p-5">
          <h2 className="font-bold mb-3">📖 How to Use in Your App</h2>
          <div className="space-y-3 text-sm">
            <div className="bg-white p-3 rounded-lg">
              <p className="font-semibold mb-1">1. Run the SQL migration</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                supabase/add_location_tracking.sql
              </code>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="font-semibold mb-1">2. Set location data in orders</p>
              <p className="text-gray-600">Add restaurant_latitude, restaurant_longitude, customer_latitude, customer_longitude to orders</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="font-semibold mb-1">3. Rider updates location</p>
              <p className="text-gray-600">Use RiderLocationUpdater component or browser geolocation API</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="font-semibold mb-1">4. Display map</p>
              <p className="text-gray-600">Use LiveDeliveryTracker component in your order tracking page</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
