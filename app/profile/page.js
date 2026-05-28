'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../Supabase/supabaseClient';

export default function ProfilePage() {
  const router = useRouter();

  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Name form
  const [fullName, setFullName] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');

  // Restaurant location form (for sellers)
  const [restaurantLocation, setRestaurantLocation] = useState({
    address: '',
    latitude: '',
    longitude: ''
  });
  const [locationSuccess, setLocationSuccess] = useState('');
  const [locationError, setLocationError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  // Password form
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authErr || !user) {
        router.push('/Userlogin');
        return;
      }

      setUserId(user.id);

      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('full_name, role, restaurant_address, restaurant_latitude, restaurant_longitude')
        .eq('id', user.id)
        .single();

      if (!profileErr && profileData) {
        setFullName(profileData.full_name || '');
        setUserRole(profileData.role || 'user');
        setRestaurantLocation({
          address: profileData.restaurant_address || '',
          latitude: profileData.restaurant_latitude || '',
          longitude: profileData.restaurant_longitude || ''
        });
      }

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleNameSave = async (e) => {
    e.preventDefault();
    setNameError('');
    setNameSuccess('');

    if (!fullName.trim()) {
      setNameError('Full name cannot be empty.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', userId);

    setSaving(false);

    if (error) {
      setNameError(error.message || 'Failed to update name.');
    } else {
      setNameSuccess('Full name updated successfully!');
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (!passwords.newPassword || !passwords.confirmPassword) {
      setPwError('Please fill in both password fields.');
      return;
    }

    if (passwords.newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
    setSaving(false);

    if (error) {
      setPwError(error.message || 'Failed to update password.');
    } else {
      setPwSuccess('Password updated successfully!');
      setPasswords({ newPassword: '', confirmPassword: '' });
    }
  };

  const handleLocationSave = async (e) => {
    e.preventDefault();
    setLocationError('');
    setLocationSuccess('');

    if (!restaurantLocation.address.trim()) {
      setLocationError('Restaurant address cannot be empty.');
      return;
    }

    if (!restaurantLocation.latitude || !restaurantLocation.longitude) {
      setLocationError('Please provide valid coordinates or use "Get Current Location".');
      return;
    }

    const lat = parseFloat(restaurantLocation.latitude);
    const lng = parseFloat(restaurantLocation.longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setLocationError('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        restaurant_address: restaurantLocation.address.trim(),
        restaurant_latitude: lat,
        restaurant_longitude: lng
      })
      .eq('id', userId);

    setSaving(false);

    if (error) {
      setLocationError(error.message || 'Failed to update restaurant location.');
    } else {
      setLocationSuccess('Restaurant location updated successfully!');
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setGettingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setRestaurantLocation((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setGettingLocation(false);
        setLocationSuccess('Location captured! Please add your address and save.');
      },
      (error) => {
        setGettingLocation(false);
        setLocationError('Failed to get location: ' + error.message);
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🍛</div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/home" className="text-2xl font-bold text-orange-600">
            Thakali Express
          </Link>
          <Link
            href="/home"
            className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-500">Manage your account details</p>
          </div>
        </div>

        {/* Update Full Name */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Update Full Name</h2>
          <form onSubmit={handleNameSave} className="space-y-4">
            {nameError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {nameError}
              </div>
            )}
            {nameSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {nameSuccess}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setNameError(''); setNameSuccess(''); }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                placeholder="Enter your full name"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Name'}
            </button>
          </form>
        </div>

        {/* Update Password */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h2>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            {pwError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {pwSuccess}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => { setPasswords((p) => ({ ...p, newPassword: e.target.value })); setPwError(''); setPwSuccess(''); }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                placeholder="New password (min. 6 characters)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => { setPasswords((p) => ({ ...p, confirmPassword: e.target.value })); setPwError(''); setPwSuccess(''); }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Restaurant Location (Sellers Only) */}
        {userRole === 'seller' && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🏪 Restaurant Location</h2>
            <p className="text-sm text-gray-600 mb-4">
              Set your restaurant location so delivery riders can find the pickup point easily.
            </p>
            <form onSubmit={handleLocationSave} className="space-y-4">
              {locationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {locationError}
                </div>
              )}
              {locationSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {locationSuccess}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restaurant Address
                </label>
                <textarea
                  value={restaurantLocation.address}
                  onChange={(e) => { 
                    setRestaurantLocation((prev) => ({ ...prev, address: e.target.value })); 
                    setLocationError(''); 
                    setLocationSuccess(''); 
                  }}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors resize-none"
                  placeholder="Enter your restaurant's full address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={restaurantLocation.latitude}
                    onChange={(e) => { 
                      setRestaurantLocation((prev) => ({ ...prev, latitude: e.target.value })); 
                      setLocationError(''); 
                      setLocationSuccess(''); 
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                    placeholder="27.7172"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={restaurantLocation.longitude}
                    onChange={(e) => { 
                      setRestaurantLocation((prev) => ({ ...prev, longitude: e.target.value })); 
                      setLocationError(''); 
                      setLocationSuccess(''); 
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                    placeholder="85.3240"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {gettingLocation ? (
                  <>
                    <span className="animate-spin">⌛</span>
                    Getting Location...
                  </>
                ) : (
                  <>
                    📍 Get Current Location
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Restaurant Location'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
