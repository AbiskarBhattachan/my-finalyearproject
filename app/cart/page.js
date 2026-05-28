'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../Supabase/supabaseClient';

const buildCartTableError = (err) => {
  const message = err?.message || '';
  if (message.includes("Could not find the table 'public.cart_items'")) {
    return 'Cart table is missing in Supabase. Run the latest SQL from supabase/setup_tables.sql, then refresh this page.';
  }
  return message || 'Failed to load cart.';
};

export default function CartPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authErr || !user) {
        router.push('/Userlogin');
        return;
      }

      setUserId(user.id);
      await loadCart(user.id);
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCart = async (uid) => {
    setError('');
    const { data, error: cartErr } = await supabase
      .from('cart_items')
      .select(
        'id,quantity,food_item_id,food_items(name,price,image_url,is_available,category)'
      )
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (cartErr) {
      setError(buildCartTableError(cartErr));
      return;
    }

    setItems(data || []);
  };

  const updateQuantity = async (cartId, nextQty) => {
    if (nextQty < 1 || !userId) return;
    setBusyId(cartId);
    setError('');
    const { error: updateErr } = await supabase
      .from('cart_items')
      .update({ quantity: nextQty })
      .eq('id', cartId);

    if (updateErr) {
      setError(buildCartTableError(updateErr));
      setBusyId(null);
      return;
    }

    await loadCart(userId);
    setBusyId(null);
  };

  const removeItem = async (cartId) => {
    if (!userId) return;
    setBusyId(cartId);
    setError('');
    const { error: deleteErr } = await supabase.from('cart_items').delete().eq('id', cartId);

    if (deleteErr) {
      setError(buildCartTableError(deleteErr));
      setBusyId(null);
      return;
    }

    await loadCart(userId);
    setBusyId(null);
  };

  const grandTotal = useMemo(() => {
    return items.reduce((sum, row) => {
      const price = Number(row.food_items?.price || 0);
      const qty = Number(row.quantity || 0);
      return sum + price * qty;
    }, 0);
  }, [items]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🛒</div>
          <p className="text-gray-600 font-medium">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-orange-600">🛒 My Cart</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/menu')}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              ← Back to Menu
            </button>
            <button
              onClick={() => router.push('/home')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              Home
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Items</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">Rs. {grandTotal.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/checkout')}
              disabled={items.length === 0}
              className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Proceed to Checkout →
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {items.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-500 font-medium text-lg">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-1 mb-6">Add some delicious items from the menu</p>
              <button
                onClick={() => router.push('/menu')}
                className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <div className="col-span-4">Item</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Subtotal</div>
              </div>

              {items.map((row) => {
                const price = Number(row.food_items?.price || 0);
                const qty = Number(row.quantity || 0);
                return (
                  <div key={row.id} className="grid grid-cols-12 gap-2 px-6 py-4 border-b border-gray-50 items-center hover:bg-orange-50/30 transition-colors">
                    <div className="col-span-4">
                      <p className="font-semibold text-gray-900 text-sm">{row.food_items?.name || 'Food item removed'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                        {row.food_items?.category || '-'}
                      </span>
                    </div>
                    <div className="col-span-2 text-right text-sm text-gray-600">Rs. {price}</div>
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button
                        onClick={() => updateQuantity(row.id, qty - 1)}
                        disabled={busyId === row.id || qty <= 1}
                        className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-sm font-bold transition-colors"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-gray-900">{qty}</span>
                      <button
                        onClick={() => updateQuantity(row.id, qty + 1)}
                        disabled={busyId === row.id}
                        className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-sm font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-3">
                      <span className="text-sm font-bold text-orange-600">Rs. {(price * qty).toFixed(2)}</span>
                      <button
                        onClick={() => removeItem(row.id)}
                        disabled={busyId === row.id}
                        className="text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors text-lg leading-none"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Footer total */}
              <div className="px-6 py-4 bg-gray-50 flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Grand Total</p>
                  <p className="text-2xl font-bold text-orange-600">Rs. {grandTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
