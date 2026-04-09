'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../Supabase/supabaseClient';

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setError('');

      // 1) Check auth user
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authErr || !user) {
        router.push('/Userlogin');
        return;
      }

      // 2) Load profile from DB
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

      setProfile(profileData);
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => router.push('/Userlogin')}
            className="w-full py-2 px-4 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.email || 'User';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-orange-600">
            Thakali Express
          </Link>

          <div className="flex items-center gap-3">
            {profile?.role === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 border border-orange-600 text-orange-600 rounded hover:bg-orange-50"
              >
                Admin Dashboard
              </button>
            )}

            <button
              onClick={logout}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, <span className="text-orange-600">{displayName}</span> 👋
          </h1>

          <p className="text-gray-600 mb-6">
            Role: <span className="font-medium">{profile?.role}</span>
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/menu')}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              View Menu
            </button>

            <button
              onClick={() => router.push('/orders')}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              My Orders
            </button>

            <button
              onClick={() => router.push('/order-tracking')}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Track Order
            </button>
          </div>

          {/* You can add menu preview / featured items here later */}
        </div>
      </div>
    </div>
  );
}
