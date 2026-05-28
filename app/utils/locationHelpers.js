/**
 * Location utility functions for delivery tracking
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Estimate delivery time based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} avgSpeedKmh - Average speed in km/h (default: 25)
 * @returns {number} Estimated time in minutes
 */
export function estimateDeliveryTime(distanceKm, avgSpeedKmh = 25) {
  const timeHours = distanceKm / avgSpeedKmh;
  const timeMinutes = timeHours * 60;
  // Add 5 minutes buffer for pickup/dropoff
  return Math.ceil(timeMinutes + 5);
}

/**
 * Check if coordinates are valid
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if valid
 */
export function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
}

/**
 * Get current position using browser geolocation
 * @param {Object} options - Geolocation options
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let message = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        reject(new Error(message));
      },
      defaultOptions
    );
  });
}

/**
 * Watch position changes
 * @param {Function} callback - Called with position updates
 * @param {Function} errorCallback - Called on errors
 * @param {Object} options - Geolocation options
 * @returns {number} Watch ID (use with clearWatch)
 */
export function watchPosition(callback, errorCallback, options = {}) {
  if (!navigator.geolocation) {
    errorCallback?.(new Error('Geolocation is not supported'));
    return null;
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000, // Update every 30 seconds
    ...options,
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      errorCallback?.(error);
    },
    defaultOptions
  );
}

/**
 * Clear position watch
 * @param {number} watchId - Watch ID from watchPosition
 */
export function clearPositionWatch(watchId) {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Geocode address to coordinates (requires external API)
 * Using Nominatim (OpenStreetMap) - free but rate-limited
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lon: number}>}
 */
export async function geocodeAddress(address) {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FoodDeliveryApp/1.0', // Required by Nominatim
      },
    });
    
    if (!response.ok) throw new Error('Geocoding failed');
    
    const data = await response.json();
    
    if (data.length === 0) {
      throw new Error('Address not found');
    }
    
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to address
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<string>} Address string
 */
export async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FoodDeliveryApp/1.0',
      },
    });
    
    if (!response.ok) throw new Error('Reverse geocoding failed');
    
    const data = await response.json();
    return data.display_name || 'Unknown location';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
}

/**
 * Check if location is within delivery radius
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} targetLat - Target latitude
 * @param {number} targetLon - Target longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} True if within radius
 */
export function isWithinRadius(centerLat, centerLon, targetLat, targetLon, radiusKm) {
  const distance = calculateDistance(centerLat, centerLon, targetLat, targetLon);
  return distance <= radiusKm;
}

/**
 * Get map bounds for multiple locations
 * @param {Array<[number, number]>} locations - Array of [lat, lng] pairs
 * @returns {Object} Bounds object with north, south, east, west
 */
export function getMapBounds(locations) {
  if (!locations || locations.length === 0) {
    return null;
  }

  const lats = locations.map(loc => loc[0]);
  const lngs = locations.map(loc => loc[1]);

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

/**
 * Format coordinates for display
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} precision - Decimal places (default: 6)
 * @returns {string} Formatted coordinates
 */
export function formatCoordinates(lat, lng, precision = 6) {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Debounce location updates to reduce API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounceLocationUpdate(func, wait = 1000) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Calculate bearing between two points
 * @param {number} lat1 - Start latitude
 * @param {number} lon1 - Start longitude
 * @param {number} lat2 - End latitude
 * @param {number} lon2 - End longitude
 * @returns {number} Bearing in degrees (0-360)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
            Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);
  return (bearing * 180 / Math.PI + 360) % 360;
}

/**
 * Get compass direction from bearing
 * @param {number} bearing - Bearing in degrees
 * @returns {string} Compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export function getCompassDirection(bearing) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}
