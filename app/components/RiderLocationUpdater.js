'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../Supabase/supabaseClient';

export default function RiderLocationUpdater({ riderId, autoUpdate = false }) {
  const [location, setLocation] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [watchId, setWatchId] = useState(null);

  // Get current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // Update location in database
  const updateLocationInDB = async (lat, lng) => {
    setUpdating(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          latitude: lat,
          longitude: lng,
          location_updated_at: new Date().toISOString(),
        })
        .eq('id', riderId);

      if (updateError) throw updateError;

      setLocation({ latitude: lat, longitude: lng });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('Error updating location:', err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Manual location update
  const handleUpdateLocation = async () => {
    try {
      const loc = await getCurrentLocation();
      await updateLocationInDB(loc.latitude, loc.longitude);
    } catch (err) {
      setError(err.message || 'Failed to get location');
    }
  };

  // Auto-update location
  useEffect(() => {
    if (!autoUpdate || !riderId) return;

    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    // Watch position for continuous updates
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateLocationInDB(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Failed to get location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // Update every 30 seconds
      }
    );

    setWatchId(id);

    return () => {
      if (id) {
        navigator.geolocation.clearWatch(id);
      }
    };
  }, [autoUpdate, riderId]);

  if (!riderId) return null;

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">📍 Location Tracking</h3>
        {autoUpdate && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />
            Auto-updating
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-3">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-3 flex items-center gap-2">
          <span>✓</span>
          <span>Location updated successfully</span>
        </div>
      )}

      {location && (
        <div className="bg-gray-50 p-3 rounded-lg text-xs mb-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Latitude:</span>
            <span className="font-mono font-semibold">{location.latitude.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Longitude:</span>
            <span className="font-mono font-semibold">{location.longitude.toFixed(6)}</span>
          </div>
        </div>
      )}

      {!autoUpdate && (
        <button
          onClick={handleUpdateLocation}
          disabled={updating}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {updating ? 'Updating...' : '📍 Update My Location'}
        </button>
      )}

      <p className="text-xs text-gray-500 mt-3 text-center">
        {autoUpdate 
          ? 'Your location is being tracked automatically while you have active deliveries'
          : 'Click to share your current location with customers'
        }
      </p>
    </div>
  );
}
