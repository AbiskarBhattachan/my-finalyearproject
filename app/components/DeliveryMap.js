'use client';
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './leaflet-fix.css';

// Fix Leaflet default marker icon issue in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (emoji, color = '#FF6B35') => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 20px;
        ">${emoji}</span>
      </div>
    `,
    className: 'custom-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const restaurantIcon = createCustomIcon('🍽️', '#FF6B35');
const riderIcon = createCustomIcon('🛵', '#4A90E2');
const customerIcon = createCustomIcon('🏠', '#50C878');

// Component to auto-fit map bounds
function MapBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions && positions.length > 0) {
      const validPositions = positions.filter(pos => pos && pos[0] && pos[1]);
      if (validPositions.length > 0) {
        const bounds = L.latLngBounds(validPositions);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [positions, map]);

  return null;
}

// Component to animate rider marker
function AnimatedRiderMarker({ position, previousPosition }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current && previousPosition && position) {
      const marker = markerRef.current;
      const startLatLng = L.latLng(previousPosition);
      const endLatLng = L.latLng(position);
      
      const duration = 1000; // 1 second animation
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Linear interpolation
        const lat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * progress;
        const lng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * progress;
        
        marker.setLatLng([lat, lng]);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }
  }, [position, previousPosition]);

  if (!position) return null;

  return (
    <Marker 
      position={position} 
      icon={riderIcon}
      ref={markerRef}
    >
      <Popup>
        <div className="text-center">
          <div className="text-2xl mb-1">🛵</div>
          <div className="font-bold">Delivery Rider</div>
          <div className="text-xs text-gray-500">Live Location</div>
        </div>
      </Popup>
    </Marker>
  );
}

export default function DeliveryMap({
  restaurantLocation,
  riderLocation,
  customerLocation,
  showRoute = true,
  height = '400px',
  className = '',
}) {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previousRiderLocation, setPreviousRiderLocation] = useState(null);

  // Fetch route from OSRM - now supports 3-point route
  useEffect(() => {
    if (!showRoute) {
      setRoute(null);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build waypoints array based on available locations
        const waypoints = [];
        
        if (restaurantLocation) {
          waypoints.push(`${restaurantLocation[0]},${restaurantLocation[1]}`);
        }
        
        if (riderLocation) {
          waypoints.push(`${riderLocation[0]},${riderLocation[1]}`);
        }
        
        if (customerLocation) {
          waypoints.push(`${customerLocation[0]},${customerLocation[1]}`);
        }

        // Need at least 2 points for a route
        if (waypoints.length < 2) {
          setRoute(null);
          setLoading(false);
          return;
        }

        const waypointsStr = waypoints.join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch route');
        
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates;
          // Convert [lng, lat] to [lat, lng] for Leaflet
          const routeCoords = coordinates.map(coord => [coord[1], coord[0]]);
          setRoute(routeCoords);
        } else {
          throw new Error('No route found');
        }
      } catch (err) {
        console.error('Route fetch error:', err);
        setError(err.message);
        setRoute(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [restaurantLocation, riderLocation, customerLocation, showRoute]);

  // Track rider location changes for animation
  useEffect(() => {
    if (riderLocation) {
      setPreviousRiderLocation(prev => {
        // Only update if location actually changed
        if (!prev || prev[0] !== riderLocation[0] || prev[1] !== riderLocation[1]) {
          return prev;
        }
        return prev;
      });
    }
  }, [riderLocation]);

  // Prepare positions for map bounds
  const positions = [
    restaurantLocation && [restaurantLocation[1], restaurantLocation[0]],
    riderLocation && [riderLocation[1], riderLocation[0]],
    customerLocation && [customerLocation[1], customerLocation[0]],
  ].filter(Boolean);

  // Default center (Kathmandu, Nepal)
  const defaultCenter = [27.7172, 85.3240];
  const center = positions.length > 0 ? positions[0] : defaultCenter;

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute top-2 right-2 z-[1000] bg-white px-3 py-1 rounded-full shadow text-xs font-medium text-gray-600">
          Loading route...
        </div>
      )}
      {error && (
        <div className="absolute top-2 right-2 z-[1000] bg-red-50 text-red-600 px-3 py-1 rounded-full shadow text-xs font-medium">
          Route unavailable
        </div>
      )}
      
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit bounds */}
        <MapBounds positions={positions} />

        {/* Restaurant Marker */}
        {restaurantLocation && (
          <Marker 
            position={[restaurantLocation[1], restaurantLocation[0]]} 
            icon={restaurantIcon}
          >
            <Popup>
              <div className="text-center">
                <div className="text-2xl mb-1">🍽️</div>
                <div className="font-bold">Restaurant</div>
                <div className="text-xs text-gray-500">Pickup Location</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Rider Marker (Animated) */}
        {riderLocation && (
          <AnimatedRiderMarker 
            position={[riderLocation[1], riderLocation[0]]}
            previousPosition={previousRiderLocation && [previousRiderLocation[1], previousRiderLocation[0]]}
          />
        )}

        {/* Customer Marker */}
        {customerLocation && (
          <Marker 
            position={[customerLocation[1], customerLocation[0]]} 
            icon={customerIcon}
          >
            <Popup>
              <div className="text-center">
                <div className="text-2xl mb-1">🏠</div>
                <div className="font-bold">Delivery Address</div>
                <div className="text-xs text-gray-500">Customer Location</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline - Main route */}
        {route && (
          <Polyline
            positions={route}
            color="#4A90E2"
            weight={5}
            opacity={0.8}
          />
        )}

        {/* Direct connection lines (fallback if no route or for visual clarity) */}
        {restaurantLocation && riderLocation && (
          <Polyline
            positions={[
              [restaurantLocation[1], restaurantLocation[0]],
              [riderLocation[1], riderLocation[0]]
            ]}
            color="#FF6B35"
            weight={3}
            opacity={0.5}
            dashArray="5, 10"
          />
        )}
        
        {riderLocation && customerLocation && (
          <Polyline
            positions={[
              [riderLocation[1], riderLocation[0]],
              [customerLocation[1], customerLocation[0]]
            ]}
            color="#50C878"
            weight={3}
            opacity={0.5}
            dashArray="5, 10"
          />
        )}

        {/* Direct line from restaurant to customer (if no rider yet) */}
        {restaurantLocation && customerLocation && !riderLocation && (
          <Polyline
            positions={[
              [restaurantLocation[1], restaurantLocation[0]],
              [customerLocation[1], customerLocation[0]]
            ]}
            color="#9CA3AF"
            weight={3}
            opacity={0.4}
            dashArray="10, 10"
          />
        )}
      </MapContainer>
    </div>
  );
}
