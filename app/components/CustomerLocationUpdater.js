'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../Supabase/supabaseClient';

/**
 * CustomerLocationUpdater - Auto-updates customer location in real-time
 * Used on the orders tracking page to keep customer location current
 */
export default function CustomerLocationUpdater({ 
  customerId, 
  orderId,
  autoUpdate = false,
  updateInterval = 30000 // 30 seconds (less frequent than rider)
}) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const intervalRef = useRef(null);
  const watchIdRef = useRef(null);

  // Get current location
  const updateLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setIsUpdating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        setLocation({ latitude, longitude });
        setLastUpdate(new Date());

        // Update order with new customer location
        if (orderId) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              customer_latitude: latitude,
              customer_longitude: longitude,
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('Failed to update customer location:', updateError);
            setError('Failed to update location');
          }
        }

        setIsUpdating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(err.message);
        setIsUpdating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Auto-update effect
  useEffect(() => {
    if (!autoUpdate || !orderId) return;

    // Initial update
    updateLocation();

    // Set up interval for periodic updates
    intervalRef.current = setInterval(() => {
      updateLocation();
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [autoUpdate, orderId, updateInterval]);

  // Manual update button
  const handleManualUpdate = () => {
    updateLocation();
  };

  if (!autoUpdate) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📍</span>
            <h3 className="font-semibold text-gray-800 text-sm">Your Location Tracking</h3>
            {isUpdating && (
              <span className="text-xs text-blue-600 animate-pulse">Updating...</span>
            )}
          </div>
          <p className="text-xs text-gray-600">
            Sharing your location helps the rider find you faster
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs mb-2">
          {error}
        </div>
      )}

      {location && (
        <div className="bg-white rounded-lg p-3 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-semibold text-green-700">Location Active</span>
              </div>
              <div className="text-xs text-gray-500">
                {lastUpdate && (
                  <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
                )}
              </div>
            </div>
            <button
              onClick={handleManualUpdate}
              disabled={isUpdating}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isUpdating ? '...' : 'Update Now'}
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 flex items-center gap-1">
        <span>🔄</span>
        <span>Auto-updating every {updateInterval / 1000} seconds</span>
      </div>
    </div>
  );
}
