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

// Star rating component
function StarRating({ value, onChange, disabled = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(star)}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => !disabled && setHovered(0)}
          className={`text-2xl transition-transform ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <span className={(hovered || value) >= star ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
    </div>
  );
}

const STATUS_STEPS = [
  { key: 'pending',          label: 'Order Placed',     icon: '🛒',  color: 'bg-gray-100 text-gray-700' },
  { key: 'confirmed',        label: 'Confirmed',        icon: '✅',  color: 'bg-blue-100 text-blue-700' },
  { key: 'preparing',        label: 'Preparing',        icon: '👨‍🍳', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵',  color: 'bg-purple-100 text-purple-700' },
  { key: 'delivered',        label: 'Delivered',        icon: '🎉',  color: 'bg-green-100 text-green-700' },
];

const STATUS_MESSAGES = {
  pending:          'Your order has been placed and is waiting for confirmation.',
  confirmed:        'Great! Your order has been confirmed.',
  preparing:        'The restaurant is preparing your food.',
  out_for_delivery: 'Your order is on the way! 🛵',
  delivered:        'Your order has been delivered. Enjoy your meal! 🎉',
};

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function minutesUntil(iso) {
  if (!iso) return null;
  const diff = Math.round((new Date(iso) - Date.now()) / 60000);
  return diff;
}

function OrdersPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const orderId      = searchParams.get('order_id');

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [order, setOrder]           = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [allOrders, setAllOrders]   = useState([]);
  const [liveTag, setLiveTag]       = useState(false);   // flash when realtime fires

  // review state
  const [review, setReview]         = useState(null);   // existing review for current order
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const realtimeRef = useRef(null);
  const liveTagTimer = useRef(null);

  // ── loaders ───────────────────────────────────────────────────────────────

  const loadOrder = useCallback(async (oid, userId) => {
    // Fetch the order with location data
    const { data, error: oErr } = await supabase
      .from('orders')
      .select('id, status, payment_method, total_amount, created_at, estimated_delivery_at, delivery_rider_id, delivery_address, phone, seller_id, customer_id, restaurant_latitude, restaurant_longitude, customer_latitude, customer_longitude')
      .eq('id', oid)
      .eq('customer_id', userId)
      .maybeSingle();

    if (oErr || !data) {
      setError('Order not found.');
      setLoading(false);
      return;
    }

    // Fetch seller info separately
    let sellerInfo = null;
    if (data.seller_id) {
      const { data: sp } = await supabase
        .from('profiles')
        .select('full_name, restaurant_name')
        .eq('id', data.seller_id)
        .maybeSingle();
      sellerInfo = sp || null;
    }

    // Fetch rider info separately
    let riderInfo = null;
    if (data.delivery_rider_id) {
      const { data: rp } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', data.delivery_rider_id)
        .maybeSingle();
      riderInfo = rp || null;
    }

    setOrder({ ...data, seller: sellerInfo, rider: riderInfo });

    const { data: items } = await supabase
      .from('order_items')
      .select('id, food_name, food_price, quantity')
      .eq('order_id', oid);
    setOrderItems(items || []);

    // Load existing review for this order
    const { data: existingReview } = await supabase
      .from('order_reviews')
      .select('id, rating, comment, created_at')
      .eq('order_id', oid)
      .eq('customer_id', userId)
      .maybeSingle();
    setReview(existingReview || null);
    if (existingReview) {
      setReviewRating(existingReview.rating);
      setReviewComment(existingReview.comment || '');
    } else {
      setReviewRating(0);
      setReviewComment('');
    }
    setReviewError('');
    setReviewSuccess('');

    setLoading(false);
  }, []);

  const loadAllOrders = useCallback(async (uid) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at, delivery_rider_id')
      .eq('customer_id', uid)
      .order('created_at', { ascending: false });
    setAllOrders(data || []);
  }, []);

  // ── init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { router.push('/Userlogin'); return; }

      await loadAllOrders(user.id);

      const targetId = orderId || await (async () => {
        const { data: latest } = await supabase
          .from('orders')
          .select('id')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return latest?.id || null;
      })();

      if (targetId) await loadOrder(targetId, user.id);
      else setLoading(false);
    };
    init();
  }, [orderId, router, loadOrder, loadAllOrders]);

  // ── real-time subscription ─────────────────────────────────────────────────

  useEffect(() => {
    if (!order?.id) return;

    // Remove previous channel
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);

    const channel = supabase
      .channel(`order-customer-${order.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload) => {
          setOrder((prev) => prev ? { ...prev, ...payload.new } : prev);

          // Also refresh the sidebar list so status badge updates
          supabase.auth.getUser().then(({ data }) => {
            if (data?.user) loadAllOrders(data.user.id);
          });

          // Flash "live" indicator
          setLiveTag(true);
          clearTimeout(liveTagTimer.current);
          liveTagTimer.current = setTimeout(() => setLiveTag(false), 3000);
        }
      )
      .subscribe();

    realtimeRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      clearTimeout(liveTagTimer.current);
    };
  }, [order?.id, loadAllOrders]);

  // ── submit review ─────────────────────────────────────────────────────────

  const submitReview = async () => {
    if (!reviewRating) { setReviewError('Please select a star rating.'); return; }
    setReviewSaving(true);
    setReviewError('');
    setReviewSuccess('');
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Not authenticated.');

      if (review?.id) {
        // Update existing review
        const { error } = await supabase
          .from('order_reviews')
          .update({ rating: reviewRating, comment: reviewComment.trim() })
          .eq('id', review.id);
        if (error) throw error;
        setReview((prev) => ({ ...prev, rating: reviewRating, comment: reviewComment.trim() }));
        setReviewSuccess('Review updated!');
      } else {
        // Insert new review
        const { data: newReview, error } = await supabase
          .from('order_reviews')
          .insert([{
            order_id: order.id,
            customer_id: user.id,
            seller_id: order.seller_id,
            rating: reviewRating,
            comment: reviewComment.trim(),
          }])
          .select('id, rating, comment, created_at')
          .single();
        if (error) throw error;
        setReview(newReview);
        setReviewSuccess('Review submitted! Thank you.');
      }
    } catch (err) {
      setReviewError(err?.message || 'Failed to save review.');
    } finally {
      setReviewSaving(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">📦</div>
          <p className="text-gray-600 font-medium">Loading your orders...</p>
        </div>
      </div>
    );
  }

  const currentStepIndex = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : -1;
  const etaMins = order?.estimated_delivery_at ? minutesUntil(order.estimated_delivery_at) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow p-5 mb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">📋 My Orders</h1>
            {liveTag && (
              <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                Live update
              </span>
            )}
          </div>
          <button onClick={() => router.push('/home')} className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-sm font-medium">
            ← Home
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-4">{error}</div>}

        <div className="grid md:grid-cols-3 gap-4">

          {/* ── Sidebar: order list ── */}
          <div className="md:col-span-1 space-y-2">
            <p className="font-bold text-sm text-gray-500 uppercase tracking-wide px-1">All Orders</p>
            {allOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-gray-500 text-sm">No orders yet</p>
              </div>
            ) : (
              allOrders.map((ord) => {
                const step = STATUS_STEPS.find(s => s.key === ord.status);
                const isActive = order?.id === ord.id;
                return (
                  <button
                    key={ord.id}
                    onClick={() => router.push(`/orders?order_id=${ord.id}`)}
                    className={`w-full text-left bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition border-2 ${
                      isActive ? 'border-orange-500' : 'border-transparent'
                    }`}
                  >
                    <p className="font-bold text-sm">#{ord.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-gray-400 mb-2">{formatDateTime(ord.created_at)}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${step?.color || 'bg-gray-100 text-gray-600'}`}>
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-bold text-orange-600">Rs. {ord.total_amount}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* ── Main: order detail ── */}
          <div className="md:col-span-2 space-y-4">
            {!order ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <div className="text-5xl mb-3">📦</div>
                <p className="text-gray-500 font-medium">Select an order to track it</p>
              </div>
            ) : (
              <>
                {/* Status banner */}
                <div className={`rounded-2xl p-5 ${
                  order.status === 'delivered'        ? 'bg-green-500 text-white' :
                  order.status === 'out_for_delivery' ? 'bg-purple-600 text-white' :
                  order.status === 'preparing'        ? 'bg-yellow-500 text-white' :
                                                        'bg-orange-500 text-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl mb-1">{STATUS_STEPS.find(s => s.key === order.status)?.icon}</p>
                      <p className="font-black text-xl capitalize">{order.status.replace(/_/g, ' ')}</p>
                      <p className="text-sm opacity-90 mt-1">{STATUS_MESSAGES[order.status]}</p>
                    </div>
                    {/* ETA display */}
                    {order.estimated_delivery_at && order.status !== 'delivered' && (
                      <div className="text-right bg-white/20 rounded-xl p-3">
                        <p className="text-xs opacity-80 font-medium">Estimated arrival</p>
                        <p className="text-2xl font-black">{formatTime(order.estimated_delivery_at)}</p>
                        {etaMins !== null && (
                          <p className="text-xs opacity-80 mt-0.5">
                            {etaMins > 0 ? `~${etaMins} min away` : 'Arriving now'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rider status */}
                {order.status !== 'delivered' && (
                  <div className={`rounded-2xl p-4 flex items-center gap-3 ${
                    order.delivery_rider_id
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-amber-50 border border-amber-200'
                  }`}>
                    {order.delivery_rider_id ? (
                      <>
                        <span className="text-2xl">🛵</span>
                        <div>
                          <p className="font-bold text-green-800 text-sm">Rider Assigned</p>
                          <p className="text-green-700 text-sm">
                            {order.rider?.full_name || 'Your rider'}
                            {order.rider?.phone && <span className="ml-2 font-semibold">· {order.rider.phone}</span>}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl animate-pulse">⏳</span>
                        <div>
                          <p className="font-bold text-amber-800 text-sm">Waiting for Delivery Rider</p>
                          <p className="text-amber-700 text-sm">A rider will be assigned to your order shortly.</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Progress tracker */}
                <div className="bg-white rounded-2xl shadow p-5">
                  <h3 className="font-bold mb-4">Order Progress</h3>
                  <div className="relative">
                    <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100" />
                    <div className="space-y-4">
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
                              <p className={`font-semibold text-sm ${
                                current ? 'text-orange-600' : done ? 'text-gray-800' : 'text-gray-400'
                              }`}>
                                {step.label}
                              </p>
                              {current && (
                                <p className="text-xs text-orange-500 font-medium">● In progress</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Live Delivery Map - Show when we have location data */}
                {(order.restaurant_latitude || order.customer_latitude || order.delivery_rider_id) && order.status !== 'delivered' && (
                  <div className="bg-white rounded-2xl shadow p-5">
                    <LiveDeliveryTracker orderId={order.id} initialOrder={order} />
                  </div>
                )}

                {/* Order info */}
                <div className="bg-white rounded-2xl shadow p-5">
                  <h3 className="font-bold mb-3">Order Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Order ID</span>
                      <span className="font-mono font-semibold">#{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total</span>
                      <span className="font-bold text-orange-600">Rs. {order.total_amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment</span>
                      <span>{order.payment_method === 'online' ? '📱 Online' : '💵 Cash on Delivery'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Placed</span>
                      <span>{formatDateTime(order.created_at)}</span>
                    </div>
                    {order.seller?.restaurant_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Restaurant</span>
                        <span className="font-semibold">{order.seller.restaurant_name}</span>
                      </div>
                    )}
                    {order.delivery_address && (
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 shrink-0">Address</span>
                        <span className="text-right">{order.delivery_address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                {orderItems.length > 0 && (
                  <div className="bg-white rounded-2xl shadow p-5">
                    <h3 className="font-bold mb-3">Items</h3>
                    <div className="space-y-2">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex justify-between py-2 border-b last:border-0 text-sm">
                          <span>{item.food_name} <span className="text-gray-400">×{item.quantity}</span></span>
                          <span className="font-bold">Rs. {(item.food_price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 font-bold">
                        <span>Total</span>
                        <span className="text-orange-600">Rs. {order.total_amount}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Review & Rating — only for delivered orders */}
                {order.status === 'delivered' && (
                  <div className="bg-white rounded-2xl shadow p-5">
                    <h3 className="font-bold mb-3">
                      {review ? '⭐ Your Review' : '⭐ Rate Your Order'}
                    </h3>

                    {reviewError && (
                      <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-xl mb-3">{reviewError}</div>
                    )}
                    {reviewSuccess && (
                      <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-xl mb-3">{reviewSuccess}</div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Rating</p>
                        <StarRating
                          value={reviewRating}
                          onChange={setReviewRating}
                          disabled={reviewSaving}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Comment (optional)</p>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="How was your experience?"
                          rows={3}
                          disabled={reviewSaving}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none transition-colors resize-none"
                        />
                      </div>
                      <button
                        onClick={submitReview}
                        disabled={reviewSaving || !reviewRating}
                        className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
                      >
                        {reviewSaving ? 'Saving...' : review ? 'Update Review' : 'Submit Review'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">📦</div>
          <p className="text-gray-600 font-medium">Loading your orders...</p>
        </div>
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  );
}
