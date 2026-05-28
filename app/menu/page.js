'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../Supabase/supabaseClient';

const buildCartTableError = (err) => {
  const message = err?.message || '';
  if (message.includes("Could not find the table 'public.cart_items'")) {
    return 'Cart table is missing in Supabase. Run the latest SQL from supabase/setup_tables.sql, then try again.';
  }
  return message || 'Failed to add item to cart.';
};

export default function SharedMenuPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    const init = async () => {
      setError('');
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authErr || !user) {
        router.push('/Userlogin');
        return;
      }

      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id,email,full_name,role')
        .eq('id', user.id)
        .single();

      if (profileErr || !profileData) {
        router.push('/home');
        return;
      }

      setProfile(profileData);
      await loadItems();
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadItems = async () => {
    setError('');
    const { data, error: itemsErr } = await supabase
      .from('food_items')
      .select('id,name,description,price,image_url,category,is_available,created_at')
      .order('created_at', { ascending: false });

    if (itemsErr) {
      setError(itemsErr.message || 'Failed to load menu items.');
      return;
    }

    setItems(data || []);
  };

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      return name.includes(q) || category.includes(q) || description.includes(q);
    });
  }, [items, search]);

  const addToCart = async (item) => {
    if (!profile?.id) return;
    if (!item.is_available) return;

    setAddingId(item.id);
    setError('');

    try {
      const { data: existing, error: existingErr } = await supabase
        .from('cart_items')
        .select('id,quantity')
        .eq('user_id', profile.id)
        .eq('food_item_id', item.id)
        .maybeSingle();

      if (existingErr) throw existingErr;

      if (existing?.id) {
        const { error: updateErr } = await supabase
          .from('cart_items')
          .update({ quantity: Number(existing.quantity || 0) + 1 })
          .eq('id', existing.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from('cart_items').insert([
          {
            user_id: profile.id,
            food_item_id: item.id,
            quantity: 1,
          },
        ]);
        if (insertErr) throw insertErr;
      }
    } catch (err) {
      setError(buildCartTableError(err));
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-gray-600 font-medium">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-orange-600">🍛 Food Menu</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/home')}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Home
            </button>
            <button
              onClick={() => router.push('/cart')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-sm"
            >
              🛒 View Cart
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, category, description..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-colors text-sm"
              />
            </div>
            <button
              onClick={loadItems}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Refresh
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Logged in as: <span className="font-semibold text-orange-600">{profile?.role}</span>
            {' · '}{visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''} shown
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              {/* Image placeholder */}
              <div className="h-36 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-5xl">🍛</span>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="font-bold text-gray-900 text-sm leading-tight">{item.name}</h2>
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.is_available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.is_available ? '● Available' : '○ Unavailable'}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{item.description || 'No description'}</p>

                <div className="flex items-center justify-between mb-3">
                  {item.category && (
                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                      {item.category}
                    </span>
                  )}
                  <span className="text-base font-bold text-orange-600 ml-auto">Rs. {item.price}</span>
                </div>

                <button
                  onClick={() => addToCart(item)}
                  disabled={!item.is_available || addingId === item.id}
                  className="w-full py-2 px-4 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingId === item.id
                    ? 'Adding...'
                    : item.is_available
                    ? '+ Add to Cart'
                    : 'Not Available'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {visibleItems.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center mt-4">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 font-medium">No menu items found.</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}
