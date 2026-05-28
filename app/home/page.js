'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../Supabase/supabaseClient';

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [restLoading, setRestLoading] = useState(true);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Load user profile
    const loadProfile = async () => {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authErr || !user) { router.push('/Userlogin'); return; }

      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('email, full_name, role')
        .eq('id', user.id)
        .single();

      if (profileErr) {
        setError(profileErr.message || 'Failed to load profile.');
        setLoading(false);
        return;
      }

      let resolvedName = profileData?.full_name;
      if (!resolvedName) {
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        if (metaName) {
          resolvedName = metaName;
          await supabase.from('profiles').update({ full_name: metaName }).eq('id', user.id);
        }
      }

      setProfile({ ...profileData, full_name: resolvedName });
      setLoading(false);
    };

    // Load restaurants from approved KYC applications — this is the source of truth.
    // Each approved KYC = one verified restaurant. We join to profiles to get the seller id.
    const loadRestaurants = async () => {
      setRestLoading(true);

      // Primary source: approved KYC applications (always up to date)
      const { data: kycData, error: kycErr } = await supabase
        .from('seller_kyc_applications')
        .select('user_id, restaurant_name, restaurant_image_url')
        .eq('status', 'approved')
        .not('restaurant_name', 'is', null)
        .neq('restaurant_name', '')
        .order('restaurant_name', { ascending: true });

      if (!kycErr && kycData && kycData.length > 0) {
        // Deduplicate by user_id (keep latest per seller)
        const seen = new Set();
        const unique = kycData.filter((r) => {
          if (seen.has(r.user_id)) return false;
          seen.add(r.user_id);
          return true;
        });
        setRestaurants(unique.map((r) => ({
          id: r.user_id,           // seller's profile id — used for /restaurant/[id]
          restaurant_name: r.restaurant_name,
          restaurant_image_url: r.restaurant_image_url || '',
        })));
        setRestLoading(false);
        return;
      }

      // Fallback: read directly from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, restaurant_name, restaurant_image_url')
        .eq('role', 'seller')
        .order('restaurant_name', { ascending: true });

      const filtered = (profileData || []).filter(
        (r) => r.restaurant_name && r.restaurant_name.trim() !== ''
      );
      setRestaurants(filtered.map((r) => ({
        id: r.id,
        restaurant_name: r.restaurant_name,
        restaurant_image_url: r.restaurant_image_url || '',
      })));
      setRestLoading(false);
    };

    loadProfile();
    loadRestaurants();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const filteredRestaurants = restaurants.filter((r) =>
    (r.restaurant_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🍛</div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => router.push('/Userlogin')} className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.email || 'User';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-orange-600">
            🍛 Thakali Express
          </Link>

          <div className="flex items-center gap-2">
            {profile?.role === 'super_admin' && (
              <button onClick={() => router.push('/super')} className="px-3 py-1.5 border border-orange-600 text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors text-sm">
                Super Admin
              </button>
            )}
            {profile?.role === 'admin' && (
              <button onClick={() => router.push('/admin')} className="px-3 py-1.5 border border-orange-600 text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors text-sm">
                Admin Dashboard
              </button>
            )}
            {profile?.role === 'seller' && (
              <button onClick={() => router.push('/admin')} className="px-3 py-1.5 border border-orange-600 text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors text-sm">
                🏪 My Dashboard
              </button>
            )}
            {profile?.role === 'delivery_rider' && (
              <button onClick={() => router.push('/delivery-rider')} className="px-3 py-1.5 border border-orange-600 text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors text-sm">
                🛵 Delivery Dashboard
              </button>
            )}

            <button onClick={() => router.push('/cart')} className="px-3 py-1.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors text-sm">
              🛒 Cart
            </button>

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                <span>👤</span>
                <span className="max-w-24 truncate">{displayName}</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{profile?.role}</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{displayName}</p>
                  </div>
                  <button onClick={() => { setDropdownOpen(false); router.push('/profile'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-2">
                    <span>⚙️</span> Profile
                  </button>
                  <button onClick={() => { setDropdownOpen(false); router.push('/orders'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-2">
                    <span>📋</span> My Orders
                  </button>
                  {profile?.role === 'delivery_rider' && (
                    <button onClick={() => { setDropdownOpen(false); router.push('/delivery-rider'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-2">
                      <span>🛵</span> Delivery Dashboard
                    </button>
                  )}
                  {(profile?.role === 'seller' || profile?.role === 'admin' || profile?.role === 'super_admin') && (
                    <button onClick={() => { setDropdownOpen(false); router.push('/seller-payments'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-2">
                      <span>💳</span> Payments
                    </button>
                  )}
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={() => { setDropdownOpen(false); logout(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                    <span>🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero / Search */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">What are you craving today?</h1>
          <p className="text-gray-400 mb-6 text-sm sm:text-base">
            Order from the best local restaurants, delivered to your door.
          </p>
          <div className="max-w-md mx-auto relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-gray-900 text-sm font-medium shadow-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 border-2 border-transparent focus:border-orange-400"
            />
          </div>
        </div>
      </div>

      {/* Restaurant grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {search ? `Results for "${search}"` : 'All Restaurants'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {restLoading
                ? 'Loading restaurants...'
                : `${filteredRestaurants.length} restaurant${filteredRestaurants.length !== 1 ? 's' : ''} available`}
            </p>
          </div>
        </div>

        {/* Loading skeletons */}
        {restLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!restLoading && filteredRestaurants.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="font-semibold text-lg text-gray-500">
              {search ? 'No restaurants match your search.' : 'No restaurants available yet.'}
            </p>
            <p className="text-sm mt-1">
              {search ? 'Try a different name.' : 'Check back soon!'}
            </p>
          </div>
        )}

        {/* Restaurant cards */}
        {!restLoading && filteredRestaurants.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredRestaurants.map((r) => (
              <button
                key={r.id}
                onClick={() => router.push(`/restaurant/${r.id}`)}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-300 transition-all hover:-translate-y-0.5 text-left"
              >
                {/* Image area */}
                <div className="relative h-40 bg-gradient-to-br from-orange-100 to-red-100 overflow-hidden">
                  {/* Fallback emoji always behind */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl">🏪</span>
                  </div>
                  {/* Actual image on top */}
                  {r.restaurant_image_url && (
                    <img
                      src={r.restaurant_image_url}
                      alt={r.restaurant_name}
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-base truncate">{r.restaurant_name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">Tap to view menu</span>
                    <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      Order →
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
