'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../Supabase/supabaseClient';
import dynamic from 'next/dynamic';

// Dynamically import DeliveryMap to avoid SSR issues with Leaflet
const DeliveryMap = dynamic(() => import('./DeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-2 animate-bounce">🗺️</div>
        <p className="text-gray-500 font-medium">Loading map...</p>
      </div>
    </div>
  ),
});

export default function LiveDeliveryTracker({ orderId, initialOrder = null }) {
  const [order, setOrder] = useState(initialOrder);
  const [riderLocation, setRiderLocation] = useState(null);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  // Load order data
  useEffect(() => {
    if (initialOrder) {
      setOrder(initialOrder);
      setLoading(false);
      return;
    }

    const loadOrder = async () => {
      try {
        const { data, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderError) throw orderError;
        setOrder(data);
      } catch (err) {
        console.error('Error loading order:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId, initialOrder]);

  // Subscribe to rider location updates
  useEffect(() => {
    if (!order?.delivery_rider_id) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Load initial rider location
    const loadRiderLocation = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', order.delivery_rider_id)
        .single();

      if (data?.latitude && data?.longitude) {
        setRiderLocation([data.longitude, data.latitude]);
      }
    };

    loadRiderLocation();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`rider-location-${order.delivery_rider_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${order.delivery_rider_id}`,
        },
        (payload) => {
          const { latitude, longitude } = payload.new;
          if (latitude && longitude) {
            setRiderLocation([longitude, latitude]);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [order?.delivery_rider_id]);

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-gray-100 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-bounce">📦</div>
          <p className="text-gray-500 font-medium">Loading delivery info...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-red-50 rounded-2xl text-center">
        <div className="text-4xl mb-2">⚠️</div>
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w-full p-6 bg-gray-50 rounded-2xl text-center">
        <div className="text-4xl mb-2">📦</div>
        <p className="text-gray-500 font-medium">Order not found</p>
      </div>
    );
  }

  // Parse locations from order data
  // Assuming order has: restaurant_latitude, restaurant_longitude, customer_latitude, customer_longitude
  const restaurantLocation = order.restaurant_longitude && order.restaurant_latitude
    ? [order.restaurant_longitude, order.restaurant_latitude]
    : null;

  const customerLocation = order.customer_longitude && order.customer_latitude
    ? [order.customer_longitude, order.customer_latitude]
    : null;

  // Debug: Log location data
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

  // Show message if locations are not available
  if (!restaurantLocation && !customerLocation && !riderLocation) {
    return (
      <div className="w-full p-6 bg-yellow-50 rounded-2xl">
        <div className="text-4xl mb-2 text-center">📍</div>
        <p className="text-yellow-700 font-medium text-center">Location data not available</p>
        <p className="text-sm text-yellow-600 mt-1 text-center">
          Make sure restaurant and customer locations are set
        </p>
        <div className="mt-3 p-3 bg-white rounded-lg text-xs text-gray-600">
          <p className="font-semibold mb-1">Debug Info:</p>
          <p>Restaurant: {order.restaurant_latitude ? `${order.restaurant_latitude}, ${order.restaurant_longitude}` : 'Not set'}</p>
          <p>Customer: {order.customer_latitude ? `${order.customer_latitude}, ${order.customer_longitude}` : 'Not set'}</p>
          <p>Rider: {riderLocation ? 'Tracking' : 'Not assigned'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">🗺️ Live Delivery Tracking</h3>
        {riderLocation && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />
            Rider location updating live
          </span>
        )}
      </div>

      <DeliveryMap
        restaurantLocation={restaurantLocation}
        riderLocation={riderLocation}
        customerLocation={customerLocation}
        showRoute={true}
        height="400px"
        className="shadow-lg"
      />

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-orange-50 p-3 rounded-lg text-center">
          <div className="text-xl mb-1">🍽️</div>
          <div className="font-semibold text-gray-700">Restaurant</div>
          <div className="text-gray-500 text-[10px]">
            {restaurantLocation ? 'Located' : 'Not set'}
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-xl mb-1">🛵</div>
          <div className="font-semibold text-gray-700">Rider</div>
          <div className="text-gray-500 text-[10px]">
            {riderLocation ? 'Tracking' : 'Not assigned'}
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-xl mb-1">🏠</div>
          <div className="font-semibold text-gray-700">Customer</div>
          <div className="text-gray-500 text-[10px]">
            {customerLocation ? 'Located' : 'Not set'}
          </div>
        </div>
      </div>
    </div>
  );
}
