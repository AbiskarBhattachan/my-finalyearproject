'use client';
import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../Supabase/supabaseClient';
import dynamic from 'next/dynamic';

// Dynamically import LiveDeliveryTracker to avoid SSR issues
const LiveDeliveryTracker = dynamic(() => import('../components/LiveDeliveryTracker'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-bounce">🗺️</div>
          <p className="text-gray-500 font-medium">Loading map...</p>
        </div>
      </div>
    </div>
  ),
});

const RiderLocationUpdater = dynamic(() => import('../components/RiderLocationUpdater'), {
  ssr: false,
});

const STATUS_STEPS = [
  { key: 'confirmed',        label: 'Order Accepted',   icon: '✅' },
  { key: 'preparing',        label: 'Preparing',        icon: '👨‍🍳' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵' },
  { key: 'delivered',        label: 'Delivered',        icon: '🎉' },
];

const RIDER_TRANSITIONS = {
  confirmed:        { next: 'preparing',        label: '👨‍🍳 Start Preparing',  color: 'bg-yellow-500 hover:bg-yellow-600' },
  preparing:        { next: 'out_for_delivery', label: '🛵 Out for Delivery',  color: 'bg-blue-600 hover:bg-blue-700' },
  out_for_delivery: { next: 'delivered',        label: '🎉 Mark Delivered',    color: 'bg-green-600 hover:bg-green-700' },
};

const STATUS_COLOR = {
  pending:          'bg-gray-100 text-gray-700',
  confirmed:        'bg-blue-100 text-blue-700',
  preparing:        'bg-yellow-100 text-yellow-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered:        'bg-green-100 text-green-700',
};

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function DeliveryRiderContent() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const orderId     = searchParams.get('order_id');

  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [order, setOrder]                     = useState(null);
  const [orderItems, setOrderItems]           = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders]               = useState([]);
  const [userRole, setUserRole]               = useState('user');
  const [userId, setUserId]                   = useState(null);
  const [updating, setUpdating]               = useState(false);
  const [view, setView]                       = useState('available');
  const [etaMinutes, setEtaMinutes]           = useState('');
  const [etaSaving, setEtaSaving]             = useState(false);
  const [etaSuccess, setEtaSuccess]           = useState('');

  // refs to hold realtime channels so we can clean them up
  const orderChannelRef     = useRef(null);
  const dashboardChannelRef = useRef(null);
  const userIdRef           = useRef(null);

  // ── loaders ───────────────────────────────────────────────────────────────

  const loadOrder = useCallback(async (oid, attempt = 0) => {
    const { data, error: oErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', oid)
      .maybeSingle();

    if (oErr || !data) {
      if (attempt < 5) {
        setTimeout(() => loadOrder(oid, attempt + 1), 700 * (attempt + 1));
        return;
      }
      setError('Order not found. Make sure you have run the SQL fix for order_items RLS.');
      setLoading(false);
      return;
    }

    // fetch related profiles separately to avoid join RLS issues
    const [sellerRes, riderRes, itemsRes] = await Promise.all([
      data.seller_id
        ? supabase.from('profiles').select('full_name, restaurant_name, email').eq('id', data.seller_id).maybeSingle()
        : Promise.resolve({ data: null }),
      data.delivery_rider_id
        ? supabase.from('profiles').select('full_name, email, phone').eq('id', data.delivery_rider_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('order_items').select('id, food_name, food_price, quantity').eq('order_id', oid),
    ]);

    setOrder({ ...data, seller: sellerRes.data, rider: riderRes.data });
    setOrderItems(itemsRes.data || []);
    setLoading(false);
  }, []);

  const loadAvailableOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, payment_method, total_amount, created_at, delivery_address, phone')
      .is('delivery_rider_id', null)
      .in('status', ['confirmed', 'preparing'])
      .order('created_at', { ascending: false });
    setAvailableOrders(data || []);
  }, []);

  const loadMyOrders = useCallback(async (riderId) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, payment_method, total_amount, created_at, delivery_address, phone, estimated_delivery_at')
      .eq('delivery_rider_id', riderId)
      .order('created_at', { ascending: false });
    setMyOrders(data || []);
  }, []);

  // ── init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { router.push('/Userlogin'); return; }
      setUserId(user.id);
      userIdRef.current = user.id;

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle();
      const role = profile?.role || 'user';
      setUserRole(role);

      if (role === 'delivery_rider') {
        await Promise.all([loadAvailableOrders(), loadMyOrders(user.id)]);
      }

      if (orderId) {
        await loadOrder(orderId);
      } else if (role !== 'delivery_rider') {
        setError('No order found.');
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    init();
  }, [orderId, router, loadOrder, loadAvailableOrders, loadMyOrders]);

  // ── realtime: order detail view ───────────────────────────────────────────

  useEffect(() => {
    if (!order?.id) return;
    if (orderChannelRef.current) supabase.removeChannel(orderChannelRef.current);

    const ch = supabase
      .channel(`rider-order-detail-${order.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        async (payload) => {
          // merge scalar fields immediately
          setOrder((prev) => prev ? { ...prev, ...payload.new } : prev);
          // if rider changed, re-fetch rider profile
          if (payload.new.delivery_rider_id) {
            const { data: r } = await supabase
              .from('profiles').select('full_name, email, phone')
              .eq('id', payload.new.delivery_rider_id).maybeSingle();
            setOrder((prev) => prev ? { ...prev, rider: r } : prev);
          }
        }
      )
      .subscribe();

    orderChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [order?.id]);

  // ── realtime: dashboard lists (available + my orders) ────────────────────

  useEffect(() => {
    if (!userIdRef.current) return;
    if (dashboardChannelRef.current) supabase.removeChannel(dashboardChannelRef.current);

    // Listen to ALL order changes — filter in the callback
    const ch = supabase
      .channel('rider-dashboard-orders')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          // Re-fetch both lists whenever any order changes
          loadAvailableOrders();
          if (userIdRef.current) loadMyOrders(userIdRef.current);
        }
      )
      .subscribe();

    dashboardChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [loadAvailableOrders, loadMyOrders]);

  // ── actions ───────────────────────────────────────────────────────────────

  const updateStatus = async (newStatus, extraFields = {}) => {
    if (!order || updating) return;
    setUpdating(true);
    const { error: uErr } = await supabase
      .from('orders')
      .update({ status: newStatus, ...extraFields })
      .eq('id', order.id);
    if (uErr) setError(uErr.message);
    // realtime will update the UI — no manual reload needed
    setUpdating(false);
  };

  const saveEta = async () => {
    if (!order || !etaMinutes || etaSaving) return;
    const mins = parseInt(etaMinutes, 10);
    if (isNaN(mins) || mins < 1) return;
    setEtaSaving(true);
    setEtaSuccess('');
    const eta = new Date(Date.now() + mins * 60 * 1000).toISOString();
    const { error: uErr } = await supabase
      .from('orders').update({ estimated_delivery_at: eta }).eq('id', order.id);
    if (uErr) setError(uErr.message);
    else {
      setEtaSuccess(`ETA set to ${formatTime(eta)}`);
      setEtaMinutes('');
      setTimeout(() => setEtaSuccess(''), 3000);
    }
    setEtaSaving(false);
  };

  const acceptOrder = async (oid) => {
    if (!userId || updating) return;
    setUpdating(true);
    setError('');
    const { error: uErr } = await supabase
      .from('orders')
      .update({ delivery_rider_id: userId })
      .eq('id', oid)
      .is('delivery_rider_id', null);
    if (uErr) {
      setError(uErr.message || 'Failed to accept order');
      setUpdating(false);
      return;
    }
    // wait for DB to commit before navigating so RLS passes on the detail query
    await new Promise((r) => setTimeout(r, 700));
    setUpdating(false);
    router.push(`/delivery-rider?order_id=${oid}`);
  };

  const rejectOrder = async (oid) => {
    if (!userId || updating) return;
    if (!confirm('Reject this order? It will return to the available pool.')) return;
    setUpdating(true);
    setError('');
    const { error: uErr } = await supabase
      .from('orders')
      .update({ delivery_rider_id: null })
      .eq('id', oid)
      .eq('delivery_rider_id', userId);
    if (uErr) setError(uErr.message || 'Failed to reject order');
    else if (orderId === oid) router.push('/delivery-rider');
    // realtime will refresh the lists automatically
    setUpdating(false);
  };

  // ── loading screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🛵</div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const isRider = userRole === 'delivery_rider';
  const isSeller = userRole === 'seller';
  const isAdmin  = userRole === 'admin' || userRole === 'super_admin';

  // ── DASHBOARD VIEW ────────────────────────────────────────────────────────

  if (isRider && !orderId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">

          <div className="bg-white rounded-2xl shadow p-5 mb-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">🛵 Delivery Dashboard</h1>
              <p className="text-xs text-green-600 font-medium mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
                Live — updates automatically
              </p>
            </div>
            <button onClick={() => router.push('/home')} className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-sm font-medium">
              ← Home
            </button>
          </div>

          {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-4">{error}</div>}

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setView('available')}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition ${view === 'available' ? 'bg-orange-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-orange-50'}`}
            >
              📦 Available ({availableOrders.length})
            </button>
            <button
              onClick={() => setView('my-orders')}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition ${view === 'my-orders' ? 'bg-orange-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-orange-50'}`}
            >
              🛵 My Deliveries ({myOrders.length})
            </button>
          </div>

          {/* Available Orders */}
          {view === 'available' && (
            <div className="space-y-3">
              {availableOrders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="text-gray-500 font-medium">No available orders right now</p>
                  <p className="text-xs text-gray-400 mt-1">This list updates automatically</p>
                </div>
              ) : (
                availableOrders.map((ord) => (
                  <div key={ord.id} className="bg-white rounded-2xl shadow p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base mb-1">Order #{ord.id.slice(0, 8).toUpperCase()}</p>
                        <div className="space-y-0.5 text-sm text-gray-600">
                          <p>💰 <span className="font-bold text-orange-600">Rs. {ord.total_amount}</span> · {ord.payment_method === 'online' ? '📱 Online' : '💵 COD'}</p>
                          <p>📍 {ord.delivery_address || 'Address not specified'}</p>
                          <p>📞 {ord.phone || 'No phone'}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(ord.created_at)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => acceptOrder(ord.id)}
                        disabled={updating}
                        className="shrink-0 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 disabled:opacity-50 text-sm"
                      >
                        {updating ? '...' : '✓ Accept'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* My Deliveries */}
          {view === 'my-orders' && (
            <div className="space-y-3">
              {myOrders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center">
                  <div className="text-5xl mb-3">🛵</div>
                  <p className="text-gray-500 font-medium">No deliveries yet</p>
                </div>
              ) : (
                myOrders.map((ord) => (
                  <div key={ord.id} className="bg-white rounded-2xl shadow p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/delivery-rider?order_id=${ord.id}`)}>
                        <p className="font-bold text-base mb-1">Order #{ord.id.slice(0, 8).toUpperCase()}</p>
                        <div className="space-y-0.5 text-sm text-gray-600">
                          <p>💰 <span className="font-bold text-orange-600">Rs. {ord.total_amount}</span></p>
                          <p>📍 {ord.delivery_address || 'Not specified'}</p>
                          {ord.estimated_delivery_at && (
                            <p>⏱ ETA: <span className="font-semibold">{formatTime(ord.estimated_delivery_at)}</span></p>
                          )}
                          <p className="text-xs text-gray-400">{formatDateTime(ord.created_at)}</p>
                        </div>
                        <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full font-semibold capitalize ${STATUS_COLOR[ord.status] || 'bg-gray-100 text-gray-700'}`}>
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => router.push(`/delivery-rider?order_id=${ord.id}`)}
                          className="px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700"
                        >
                          Manage →
                        </button>
                        {ord.status !== 'delivered' && ord.status !== 'out_for_delivery' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); rejectOrder(ord.id); }}
                            disabled={updating}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 disabled:opacity-50"
                          >
                            ✗ Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ORDER DETAIL / MANAGEMENT VIEW ────────────────────────────────────────

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order?.status);
  const transition = order ? RIDER_TRANSITIONS[order.status] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow p-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{isRider ? '🛵 Manage Delivery' : '📦 Track Order'}</h1>
            {order && (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-gray-500">#{order.id.slice(0, 8).toUpperCase()}</p>
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
                  Live
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => isRider ? router.push('/delivery-rider') : router.push('/home')}
            className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-sm font-medium"
          >
            ← {isRider ? 'Dashboard' : 'Home'}
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>}

        {order && (
          <>
            {/* Status Progress */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-bold mb-4">Order Progress</h2>
              <div className="relative">
                <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />
                <div className="space-y-5">
                  {STATUS_STEPS.map((step, idx) => {
                    const done    = idx < currentStepIndex;
                    const current = idx === currentStepIndex;
                    return (
                      <div key={step.key} className="flex items-center gap-4 relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 shrink-0 transition-all ${
                          done    ? 'bg-green-500 text-white' :
                          current ? 'bg-orange-500 text-white ring-4 ring-orange-200' :
                                    'bg-gray-100 text-gray-400'
                        }`}>
                          {done ? '✓' : step.icon}
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${current ? 'text-orange-600' : done ? 'text-gray-800' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          {current && <p className="text-xs text-orange-500 animate-pulse">● In progress</p>}
                        </div>
                        {done && <span className="text-green-500 text-xs font-bold">Done</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Delivery Map - Show when rider is assigned and order is not delivered */}
            {order.delivery_rider_id && order.status !== 'delivered' && (
              <div className="bg-white rounded-2xl shadow p-5">
                <LiveDeliveryTracker orderId={order.id} initialOrder={order} />
              </div>
            )}

            {/* Rider Location Updater - Only for riders with active deliveries */}
            {isRider && order.status !== 'delivered' && order.status !== 'pending' && (
              <RiderLocationUpdater 
                riderId={userId} 
                autoUpdate={order.status === 'out_for_delivery'} 
              />
            )}

            {/* ETA */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-bold mb-3">⏱ Estimated Delivery Time</h2>
              {order.estimated_delivery_at ? (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-3">
                  <p className="text-sm text-gray-500">Estimated arrival</p>
                  <p className="text-2xl font-black text-orange-600">{formatTime(order.estimated_delivery_at)}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(order.estimated_delivery_at)}</p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
                  <p className="text-sm text-gray-500">No ETA set yet</p>
                </div>
              )}
              {isRider && order.status !== 'delivered' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Set ETA (minutes from now)</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    {[15, 20, 30, 45, 60].map((m) => (
                      <button
                        key={m}
                        onClick={() => setEtaMinutes(String(m))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${etaMinutes === String(m) ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-orange-100'}`}
                      >
                        {m}m
                      </button>
                    ))}
                    <input
                      type="number" min="1" max="180"
                      value={etaMinutes}
                      onChange={(e) => setEtaMinutes(e.target.value)}
                      placeholder="custom"
                      className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <button
                      onClick={saveEta}
                      disabled={!etaMinutes || etaSaving}
                      className="px-4 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-50"
                    >
                      {etaSaving ? '...' : 'Set ETA'}
                    </button>
                  </div>
                  {etaSuccess && <p className="text-green-600 text-sm mt-2 font-medium">✓ {etaSuccess}</p>}
                </div>
              )}
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-bold mb-3">Order Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-orange-600">Rs. {order.total_amount}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Payment</span><span>{order.payment_method === 'online' ? '📱 Online' : '💵 Cash on Delivery'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Placed</span><span>{formatDateTime(order.created_at)}</span></div>
                {order.delivery_address && <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Address</span><span className="text-right">{order.delivery_address}</span></div>}
                {order.phone && <div className="flex justify-between"><span className="text-gray-500">Phone</span><a href={`tel:${order.phone}`} className="text-orange-600 font-semibold">{order.phone}</a></div>}
                {order.seller?.restaurant_name && <div className="flex justify-between"><span className="text-gray-500">Restaurant</span><span className="font-semibold">{order.seller.restaurant_name}</span></div>}
              </div>
            </div>

            {/* Items */}
            {orderItems.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-5">
                <h2 className="font-bold mb-3">Items</h2>
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between py-2 border-b last:border-0 text-sm">
                    <span>{item.food_name} <span className="text-gray-400">×{item.quantity}</span></span>
                    <span className="font-bold">Rs. {(item.food_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Rider action buttons */}
            {isRider && order.status !== 'delivered' && (
              <div className="bg-white rounded-2xl shadow p-5 space-y-3">
                <h2 className="font-bold">Actions</h2>
                {transition && (
                  <button
                    onClick={() => {
                      const extra = {};
                      if (transition.next === 'out_for_delivery') extra.seller_received_at = new Date().toISOString();
                      if (transition.next === 'delivered')        extra.customer_received_at = new Date().toISOString();
                      updateStatus(transition.next, extra);
                    }}
                    disabled={updating}
                    className={`w-full py-3.5 rounded-xl text-white font-bold text-base transition disabled:opacity-50 ${transition.color}`}
                  >
                    {updating ? 'Updating...' : transition.label}
                  </button>
                )}
                {order.status !== 'out_for_delivery' && (
                  <button
                    onClick={() => rejectOrder(order.id)}
                    disabled={updating}
                    className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 disabled:opacity-50"
                  >
                    ✗ Reject & Return to Pool
                  </button>
                )}
              </div>
            )}

            {/* Seller / Admin actions */}
            {(isSeller || isAdmin) && order.status !== 'delivered' && (
              <div className="bg-white rounded-2xl shadow p-5">
                <h2 className="font-bold mb-3">Admin / Seller Actions</h2>
                <div className="flex flex-wrap gap-2">
                  {order.status === 'pending'    && <button onClick={() => updateStatus('confirmed')}  disabled={updating} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">Confirm Order</button>}
                  {order.status === 'confirmed'  && <button onClick={() => updateStatus('preparing')} disabled={updating} className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-semibold">Start Preparing</button>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DeliveryRiderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🛵</div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <DeliveryRiderContent />
    </Suspense>
  );
}
