'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../Supabase/supabaseClient';

const ALLOWED = ['seller', 'admin', 'super_admin'];

const STATUS_STYLES = {
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const STATUS_ICONS = { confirmed: '✅', rejected: '❌', pending: '⏳' };

const COD_ORDER_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  preparing: 'bg-purple-100 text-purple-700 border-purple-200',
  out_for_delivery: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const COD_ORDER_STATUS_ICONS = {
  pending: '⏳',
  confirmed: '✅',
  preparing: '👨‍🍳',
  out_for_delivery: '🛵',
  delivered: '🎉',
  cancelled: '❌',
};

const COD_STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

export default function SellerPaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cod');
  const [rows, setRows] = useState([]);
  const [codOrders, setCodOrders] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [codBusyId, setCodBusyId] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [codFilter, setCodFilter] = useState('pending');
  const [newPaymentAlert, setNewPaymentAlert] = useState(false);
  const [newCodOrderAlert, setNewCodOrderAlert] = useState(false);
  const sellerIdRef = useRef(null);
  const audioRef = useRef(null);

  const loadRows = async (sellerId) => {
    const { data, error: rowErr } = await supabase
      .from('online_payment_requests')
      .select('id,customer_id,amount,status,customer_note,created_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (rowErr) {
      setError(rowErr.message || 'Failed to load payment requests.');
      return;
    }
    setRows(data || []);
  };

  const loadCodOrders = async (sellerId) => {
    const { data, error: ordErr } = await supabase
      .from('orders')
      .select('id,customer_id,total_amount,status,delivery_address,phone,created_at,order_items(*)')
      .eq('seller_id', sellerId)
      .eq('payment_method', 'cod')
      .order('created_at', { ascending: false });

    if (ordErr) {
      setError(ordErr.message || 'Failed to load COD orders.');
      return;
    }
    setCodOrders(data || []);
  };

  useEffect(() => {
    let onlineChannel;
    let codChannel;

    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        router.push('/Userlogin');
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id,role')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile || !ALLOWED.includes(profile.role)) {
        router.push('/home');
        return;
      }

      sellerIdRef.current = user.id;
      await Promise.all([loadRows(user.id), loadCodOrders(user.id)]);
      setLoading(false);

      // Real-time: online payment requests
      onlineChannel = supabase
        .channel(`seller-payments-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'online_payment_requests',
            filter: `seller_id=eq.${user.id}`,
          },
          (payload) => {
            setRows((prev) => [payload.new, ...prev]);
            setNewPaymentAlert(true);
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            setTimeout(() => setNewPaymentAlert(false), 8000);
          }
        )
        .subscribe();

      // Real-time: new COD orders
      codChannel = supabase
        .channel(`seller-cod-orders-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `seller_id=eq.${user.id}`,
          },
          async (payload) => {
            if (payload.new?.payment_method === 'cod') {
              // Fetch full order with items
              const { data: fullOrder } = await supabase
                .from('orders')
                .select('id,customer_id,total_amount,status,delivery_address,phone,created_at,order_items(*)')
                .eq('id', payload.new.id)
                .maybeSingle();
              if (fullOrder) {
                setCodOrders((prev) => [fullOrder, ...prev]);
              }
              setNewCodOrderAlert(true);
              if (audioRef.current) {
                audioRef.current.play().catch(() => {});
              }
              setTimeout(() => setNewCodOrderAlert(false), 8000);
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (onlineChannel) supabase.removeChannel(onlineChannel);
      if (codChannel) supabase.removeChannel(codChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decide = async (id, nextStatus) => {
    setBusyId(id);
    setError('');
    const payload =
      nextStatus === 'confirmed'
        ? {
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            seller_note: 'Payment confirmed by seller.',
          }
        : {
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            seller_note: 'Payment rejected by seller.',
          };

    const { error: updateErr } = await supabase
      .from('online_payment_requests')
      .update(payload)
      .eq('id', id);

    if (updateErr) {
      setError(updateErr.message || 'Failed to update payment status.');
      setBusyId(null);
      return;
    }

    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...payload } : r))
    );
    setBusyId(null);
  };

  const updateCodOrderStatus = async (orderId, newStatus) => {
    setCodBusyId(orderId);
    setError('');

    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (updateErr) {
      setError(updateErr.message || 'Failed to update order status.');
      setCodBusyId(null);
      return;
    }

    setCodOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    setCodBusyId(null);
  };

  const filteredRows = rows.filter((r) =>
    filter === 'all' ? true : r.status === filter
  );

  const filteredCodOrders = codOrders.filter((o) =>
    codFilter === 'all' ? true : o.status === codFilter
  );

  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const pendingCodCount = codOrders.filter((o) => o.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">💳</div>
          <p className="text-gray-600 font-medium">Loading orders &amp; payments...</p>
        </div>
      </div>
    );
  }

  const totalPendingAlerts = pendingCount + pendingCodCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <audio ref={audioRef} preload="none">
        <source src="/notification.mp3" type="audio/mpeg" />
      </audio>

      {/* New online payment toast */}
      {newPaymentAlert && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-blue-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-bounce">
          <span className="text-xl">🔔</span>
          <div>
            <p className="font-bold text-sm">New Payment Request!</p>
            <p className="text-xs text-blue-200">A customer just sent a QR payment — review it below.</p>
          </div>
          <button onClick={() => setNewPaymentAlert(false)} className="ml-2 text-blue-200 hover:text-white text-lg leading-none">×</button>
        </div>
      )}

      {/* New COD order toast */}
      {newCodOrderAlert && (
        <div className="fixed top-4 left-4 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-bounce">
          <span className="text-xl">🛵</span>
          <div>
            <p className="font-bold text-sm">New COD Order!</p>
            <p className="text-xs text-green-200">A customer placed a cash on delivery order.</p>
          </div>
          <button onClick={() => setNewCodOrderAlert(false)} className="ml-2 text-green-200 hover:text-white text-lg leading-none">×</button>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-orange-100/60">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🧾 Orders &amp; Payments
              {totalPendingAlerts > 0 && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black animate-pulse">
                  {totalPendingAlerts}
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage COD orders and verify QR payments</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (sellerIdRef.current) {
                  loadRows(sellerIdRef.current);
                  loadCodOrders(sellerIdRef.current);
                }
              }}
              className="px-3 py-2 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              title="Refresh"
            >
              🔄
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/home')}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Home
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="max-w-4xl mx-auto px-6 border-t border-gray-100">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('cod')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'cod'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🛵 COD Orders
              {pendingCodCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-black">
                  {pendingCodCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'online'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💳 QR Payments
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-black">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── COD ORDERS TAB ── */}
        {activeTab === 'cod' && (
          <>
            {/* COD Stats */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map((s) => {
                const count = codOrders.filter((o) => o.status === s).length;
                return (
                  <div key={s} className={`rounded-2xl border p-3 text-center ${COD_ORDER_STATUS_STYLES[s]}`}>
                    <div className="text-xl font-black">{count}</div>
                    <div className="text-xs font-semibold mt-0.5 capitalize leading-tight">
                      {COD_ORDER_STATUS_ICONS[s]} {s.replace('_', ' ')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* COD Filter */}
            <div className="flex flex-wrap gap-2 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm w-fit">
              {['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'all'].map((f) => (
                <button
                  key={f}
                  onClick={() => setCodFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${
                    codFilter === f
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {f === 'pending' && pendingCodCount > 0
                    ? `Pending (${pendingCodCount})`
                    : f === 'all'
                    ? 'All'
                    : f.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>

            {/* COD Order cards */}
            {filteredCodOrders.map((order) => {
              const nextIdx = COD_STATUS_FLOW.indexOf(order.status) + 1;
              const nextStatus = nextIdx < COD_STATUS_FLOW.length ? COD_STATUS_FLOW[nextIdx] : null;
              const isBusy = codBusyId === order.id;
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl shadow-sm border p-6 transition-all ${
                    order.status === 'pending' ? 'border-orange-200 ring-1 ring-orange-100' : 'border-gray-100'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Status + ID + time */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${COD_ORDER_STATUS_STYLES[order.status]}`}>
                          {COD_ORDER_STATUS_ICONS[order.status]} {order.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded-lg">
                          #{order.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleString()}
                        </span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                          💵 Cash on Delivery
                        </span>
                      </div>

                      {/* Amount */}
                      <p className="text-3xl font-black text-orange-600">
                        Rs. {Number(order.total_amount || 0).toFixed(2)}
                      </p>

                      {/* Delivery info */}
                      {order.delivery_address && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <span>📍</span>
                          <span className="text-xs">{order.delivery_address}</span>
                        </div>
                      )}
                      {order.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>📞</span>
                          <span className="text-xs font-medium">{order.phone}</span>
                        </div>
                      )}

                      {/* Order items */}
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="mt-2 bg-gray-50 rounded-xl p-3 space-y-1">
                          {order.order_items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-600">
                              <span>{item.food_name} <span className="text-gray-400">×{item.quantity}</span></span>
                              <span className="font-semibold">Rs. {(Number(item.food_price) * Number(item.quantity)).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <div className="flex flex-col gap-2 shrink-0">
                        {nextStatus && (
                          <button
                            onClick={() => updateCodOrderStatus(order.id, nextStatus)}
                            disabled={isBusy}
                            className="px-4 py-2.5 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm shadow-sm flex items-center gap-2 whitespace-nowrap"
                          >
                            {isBusy ? (
                              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : COD_ORDER_STATUS_ICONS[nextStatus]}
                            Mark as {nextStatus.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </button>
                        )}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateCodOrderStatus(order.id, 'cancelled')}
                            disabled={isBusy}
                            className="px-4 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
                          >
                            ❌ Cancel Order
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredCodOrders.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <div className="text-5xl mb-4">{codFilter === 'pending' ? '🎉' : '🛵'}</div>
                <p className="text-gray-600 font-semibold text-lg">
                  {codFilter === 'pending' ? 'No pending COD orders' : `No ${codFilter.replace('_', ' ')} COD orders`}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {codFilter === 'pending'
                    ? 'All caught up! New COD orders will appear here in real-time.'
                    : 'COD orders will appear here once customers place them.'}
                </p>
              </div>
            )}
          </>
        )}

        {/* ── ONLINE PAYMENTS TAB ── */}
        {activeTab === 'online' && (
          <>
            {/* Online payment stats */}
            <div className="grid grid-cols-3 gap-3">
              {['pending', 'confirmed', 'rejected'].map((s) => {
                const count = rows.filter((r) => r.status === s).length;
                const icons = { pending: '⏳', confirmed: '✅', rejected: '❌' };
                const colors = {
                  pending: 'bg-yellow-50 border-yellow-200 text-yellow-700',
                  confirmed: 'bg-green-50 border-green-200 text-green-700',
                  rejected: 'bg-red-50 border-red-200 text-red-700',
                };
                return (
                  <div key={s} className={`rounded-2xl border p-4 text-center ${colors[s]}`}>
                    <div className="text-2xl font-black">{count}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide mt-0.5 capitalize">
                      {icons[s]} {s}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Online filter tabs */}
            <div className="flex gap-2 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm w-fit">
              {['pending', 'confirmed', 'rejected', 'all'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                    filter === f
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {f === 'pending' && pendingCount > 0 ? `Pending (${pendingCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Payment request cards */}
            {filteredRows.map((row) => (
              <div
                key={row.id}
                className={`bg-white rounded-2xl shadow-sm border p-6 transition-all ${
                  row.status === 'pending' ? 'border-yellow-200 ring-1 ring-yellow-100' : 'border-gray-100'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${STATUS_STYLES[row.status] || STATUS_STYLES.pending}`}>
                        {STATUS_ICONS[row.status]} {row.status}
                      </span>
                      <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded-lg">
                        #{row.id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(row.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-3xl font-black text-orange-600">
                      Rs. {Number(row.amount || 0).toFixed(2)}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">👤</span>
                      <span className="font-mono text-xs truncate">{row.customer_id}</span>
                    </div>

                    {row.customer_note && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-sm text-amber-800">
                        <span className="mt-0.5">💬</span>
                        <span className="italic">&ldquo;{row.customer_note}&rdquo;</span>
                      </div>
                    )}
                  </div>

                  {row.status === 'pending' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => decide(row.id, 'confirmed')}
                        disabled={busyId === row.id}
                        className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors text-sm shadow-sm flex items-center gap-2"
                      >
                        {busyId === row.id ? (
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : '✓'}
                        Confirm Payment
                      </button>
                      <button
                        onClick={() => decide(row.id, 'rejected')}
                        disabled={busyId === row.id}
                        className="px-5 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredRows.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <div className="text-5xl mb-4">{filter === 'pending' ? '🎉' : '💳'}</div>
                <p className="text-gray-600 font-semibold text-lg">
                  {filter === 'pending' ? 'No pending payments' : `No ${filter} payments`}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {filter === 'pending'
                    ? 'All caught up! New requests will appear here in real-time.'
                    : 'Payment requests will appear here once customers pay via QR.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
