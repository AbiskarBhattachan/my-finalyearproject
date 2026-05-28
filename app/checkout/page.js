'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../Supabase/supabaseClient';

const buildCartTableError = (err) => {
  const message = err?.message || '';
  if (message.includes("Could not find the table 'public.cart_items'")) {
    return 'Cart table is missing in Supabase. Run the latest SQL from supabase/setup_tables.sql, then refresh this page.';
  }
  return message || 'Failed to load checkout details.';
};

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [notice, setNotice] = useState('');
  const [sellerInfo, setSellerInfo] = useState(null);
  const [activeOnlinePaymentId, setActiveOnlinePaymentId] = useState(null);
  const [amountCopied, setAmountCopied] = useState(false);
  
  // Delivery details state
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  
  // Customer location state
  const [customerLocation, setCustomerLocation] = useState({
    latitude: '',
    longitude: ''
  });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const copyAmount = (amount) => {
    navigator.clipboard?.writeText(amount.toFixed(2)).then(() => {
      setAmountCopied(true);
      setTimeout(() => setAmountCopied(false), 2000);
    });
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
        setCustomerLocation({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        });
        setGettingLocation(false);
        setLocationError('');
      },
      (error) => {
        setGettingLocation(false);
        setLocationError('Failed to get location: ' + error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    const init = async () => {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authErr || !user) {
        router.push('/Userlogin');
        return;
      }

      const { data, error: cartErr } = await supabase
        .from('cart_items')
        .select('id,quantity,food_items(name,price,category,seller_id)')
        .eq('user_id', user.id);

      if (cartErr) {
        setError(buildCartTableError(cartErr));
        setLoading(false);
        return;
      }

      const cartRows = data || [];
      setItems(cartRows);

      const sellerIds = [...new Set(cartRows.map((row) => row.food_items?.seller_id).filter(Boolean))];
      if (sellerIds.length === 1) {
        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('id,full_name,email,payment_qr_url,payment_phone,restaurant_latitude,restaurant_longitude')
          .eq('id', sellerIds[0])
          .maybeSingle();
        setSellerInfo(sellerProfile || null);
      } else {
        setSellerInfo(null);
      }
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeOnlinePaymentId) return;

    let mounted = true;
    const intervalId = setInterval(async () => {
      const { data: payment, error: paymentErr } = await supabase
        .from('online_payment_requests')
        .select('id,status')
        .eq('id', activeOnlinePaymentId)
        .maybeSingle();

      if (paymentErr || !payment || !mounted) return;

      if (payment.status === 'confirmed') {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        // Check if an order was already created for this payment (avoid duplicates on re-poll)
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('payment_reference_id', payment.id)
          .eq('customer_id', user.id)
          .maybeSingle();

        if (existingOrder?.id) {
          setItems([]);
          setActiveOnlinePaymentId(null);
          clearInterval(intervalId);
          router.push(`/orders?order_id=${existingOrder.id}&payment_id=${payment.id}`);
          return;
        }

        const { data: cartSnapshot } = await supabase
          .from('cart_items')
          .select('id,quantity,food_item_id,food_items(name,price,seller_id)')
          .eq('user_id', user.id);

        const cartRows = cartSnapshot || [];
        const sellerIds = [...new Set(cartRows.map((r) => r.food_items?.seller_id).filter(Boolean))];
        const sellerId = sellerIds.length === 1 ? sellerIds[0] : null;
        const totalAmt = cartRows.reduce((s, r) => s + Number(r.food_items?.price || 0) * Number(r.quantity || 1), 0);

        const fullAddress = `${deliveryAddress}, ${city}${postalCode ? ', ' + postalCode : ''}${deliveryNotes ? ' | Notes: ' + deliveryNotes : ''}`;

        const orderData = {
          customer_id: user.id,
          seller_id: sellerId,
          total_amount: Number(totalAmt.toFixed(2)),
          payment_method: 'online',
          status: 'confirmed',
          payment_reference_id: payment.id,
          delivery_address: fullAddress,
          phone: phone.trim(),
          estimated_delivery_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
          restaurant_latitude: sellerInfo?.restaurant_latitude || null,
          restaurant_longitude: sellerInfo?.restaurant_longitude || null,
        };

        // Add customer location if available
        if (customerLocation.latitude && customerLocation.longitude) {
          orderData.customer_latitude = parseFloat(customerLocation.latitude);
          orderData.customer_longitude = parseFloat(customerLocation.longitude);
        }

        const { data: orderRow, error: orderInsertErr } = await supabase
          .from('orders')
          .insert([orderData])
          .select('id')
          .single();

        if (orderInsertErr || !orderRow?.id) {
          setError(orderInsertErr?.message || 'Failed to create order after payment confirmation.');
          setActiveOnlinePaymentId(null);
          clearInterval(intervalId);
          return;
        }

        const orderItems = cartRows.map((r) => ({
          order_id: orderRow.id,
          food_item_id: r.food_item_id || null,
          food_name: r.food_items?.name || 'Unknown',
          food_price: Number(r.food_items?.price || 0),
          quantity: Number(r.quantity || 1),
        }));
        await supabase.from('order_items').insert(orderItems);

        await supabase.from('cart_items').delete().eq('user_id', user.id);
        setItems([]);
        setActiveOnlinePaymentId(null);
        clearInterval(intervalId);
        router.push(`/orders?order_id=${orderRow.id}&payment_id=${payment.id}`);
      } else if (payment.status === 'rejected') {
        setError('Seller rejected this payment request. Please try again.');
        setActiveOnlinePaymentId(null);
        clearInterval(intervalId);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [activeOnlinePaymentId, router]);

  const total = useMemo(() => {
    return items.reduce((sum, row) => {
      const price = Number(row.food_items?.price || 0);
      const qty = Number(row.quantity || 0);
      return sum + price * qty;
    }, 0);
  }, [items]);

  const sellerIdsInCart = useMemo(
    () => [...new Set(items.map((row) => row.food_items?.seller_id).filter(Boolean))],
    [items]
  );

  const placeOrder = async () => {
    if (items.length === 0 || placingOrder) return;

    try {
      setPlacingOrder(true);
      setError('');
      setNotice('');

      // Validate delivery details
      if (!deliveryAddress.trim()) {
        setError('Please enter your delivery address.');
        setPlacingOrder(false);
        return;
      }
      if (!phone.trim()) {
        setError('Please enter your phone number.');
        setPlacingOrder(false);
        return;
      }
      if (!city.trim()) {
        setError('Please enter your city.');
        setPlacingOrder(false);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        router.push('/Userlogin');
        return;
      }

      const fullAddress = `${deliveryAddress}, ${city}${postalCode ? ', ' + postalCode : ''}${deliveryNotes ? ' | Notes: ' + deliveryNotes : ''}`;

      if (paymentMethod === 'cod') {
        const sellerId = sellerIdsInCart.length === 1 ? sellerIdsInCart[0] : null;
        
        const orderData = {
          customer_id: user.id,
          seller_id: sellerId,
          total_amount: Number(total.toFixed(2)),
          payment_method: 'cod',
          status: 'pending',
          delivery_address: fullAddress,
          phone: phone.trim(),
          estimated_delivery_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
          restaurant_latitude: sellerInfo?.restaurant_latitude || null,
          restaurant_longitude: sellerInfo?.restaurant_longitude || null,
        };

        // Add customer location if available
        if (customerLocation.latitude && customerLocation.longitude) {
          orderData.customer_latitude = parseFloat(customerLocation.latitude);
          orderData.customer_longitude = parseFloat(customerLocation.longitude);
        }

        const { data: orderRow, error: orderErr } = await supabase
          .from('orders')
          .insert([orderData])
          .select('id')
          .single();
        if (orderErr) throw orderErr;

        const orderItems = items.map((row) => ({
          order_id: orderRow.id,
          food_item_id: row.food_items ? row.food_item_id || null : null,
          food_name: row.food_items?.name || 'Unknown',
          food_price: Number(row.food_items?.price || 0),
          quantity: Number(row.quantity || 1),
        }));
        await supabase.from('order_items').insert(orderItems);

        const { error: clearErr } = await supabase.from('cart_items').delete().eq('user_id', user.id);
        if (clearErr) throw clearErr;

        setItems([]);
        router.push(`/orders?order_id=${orderRow.id}`);
        return;
      }

      if (sellerIdsInCart.length !== 1) {
        throw new Error('Online payment supports cart items from one seller at a time.');
      }

      const { data: paymentRow, error: paymentErr } = await supabase
        .from('online_payment_requests')
        .insert([
          {
            customer_id: user.id,
            seller_id: sellerIdsInCart[0],
            amount: Number(total.toFixed(2)),
            status: 'pending',
            customer_note: 'Customer marked payment as sent from checkout.',
          },
        ])
        .select('id,status')
        .single();

      if (paymentErr) throw paymentErr;
      setActiveOnlinePaymentId(paymentRow.id);
      setNotice('Payment request sent to seller. Waiting for seller confirmation...');
    } catch (err) {
      setError(err?.message || 'Could not place order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-red-50">
        <div className="text-center space-y-4">
          <div className="relative inline-flex">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-3xl">💳</div>
            <div className="absolute inset-0 rounded-full border-4 border-orange-300 border-t-orange-600 animate-spin" />
          </div>
          <p className="text-gray-600 font-semibold text-lg">Loading checkout...</p>
        </div>
      </div>
    );
  }

  const isPlaceDisabled =
    items.length === 0 ||
    placingOrder ||
    !deliveryAddress.trim() ||
    !phone.trim() ||
    !city.trim() ||
    (paymentMethod === 'online' && !sellerInfo?.payment_qr_url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-orange-100/60">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-lg shadow-md">
              💳
            </div>
            <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
          </div>
          <button
            onClick={() => router.push('/cart')}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-sm font-semibold"
          >
            ← Back to Cart
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 rounded-2xl text-sm shadow-sm">
            <span className="text-lg mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3.5 rounded-2xl text-sm shadow-sm">
            <span className="text-lg animate-pulse">⏳</span>
            <span className="font-medium">{notice}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Order Summary</h2>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🛒</div>
              <p className="text-gray-500 font-medium">Your cart is empty.</p>
              <button
                onClick={() => router.push('/menu')}
                className="mt-4 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((row) => {
                const price = Number(row.food_items?.price || 0);
                const qty = Number(row.quantity || 0);
                return (
                  <div key={row.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-base">🍽️</div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{row.food_items?.name || '-'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {row.food_items?.category || '-'} &nbsp;·&nbsp;
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded-md font-medium">×{qty}</span>
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-orange-600 text-sm">Rs. {(price * qty).toFixed(2)}</p>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-orange-100">
                <p className="font-bold text-gray-900">Total</p>
                <p className="text-2xl font-black text-orange-600">Rs. {total.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Delivery Details Form */}
          <div className="mt-6 rounded-2xl border border-gray-100 p-5 bg-gradient-to-br from-green-50/40 to-emerald-50/40">
            <p className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-sm">📍</span>
              Delivery Information
            </p>
            <div className="space-y-4">
              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Delivery Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Street address, building, apartment"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                  required
                />
              </div>

              {/* City and Postal Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Your city"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Postal Code
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your contact number"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                  required
                />
              </div>

              {/* Customer Location */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      📍 Your Location (Optional but Recommended)
                    </p>
                    <p className="text-xs text-gray-500">
                      Help delivery riders find you faster with GPS coordinates
                    </p>
                  </div>
                </div>
                
                {locationError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs mb-2">
                    {locationError}
                  </div>
                )}

                {customerLocation.latitude && customerLocation.longitude ? (
                  <div className="bg-white border border-green-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-600 text-lg">✓</span>
                      <span className="text-sm font-semibold text-green-700">Location Captured</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p>Lat: {customerLocation.latitude}</p>
                      <p>Lng: {customerLocation.longitude}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
                    <p className="text-xs text-gray-500">No location captured yet</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {gettingLocation ? (
                    <>
                      <span className="animate-spin">⌛</span>
                      Getting Location...
                    </>
                  ) : (
                    <>
                      📍 {customerLocation.latitude ? 'Update' : 'Get'} My Location
                    </>
                  )}
                </button>
              </div>

              {/* Delivery Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Delivery Notes
                </label>
                <textarea
                  id="notes"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Any special instructions for delivery (optional)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mt-6 rounded-2xl border border-gray-100 p-5 bg-gray-50/60">
            <p className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center text-sm">💳</span>
              Payment Method
            </p>
            <div className="space-y-3">
              <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'cod'
                  ? 'border-orange-500 bg-orange-50 shadow-sm shadow-orange-100'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="payment-method"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-orange-600 w-4 h-4"
                />
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">💵</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Cash on Delivery</p>
                  <p className="text-xs text-gray-500 mt-0.5">Pay when your order arrives</p>
                </div>
                {paymentMethod === 'cod' && (
                  <span className="ml-auto text-xs bg-orange-500 text-white px-2.5 py-1 rounded-full font-bold">Selected</span>
                )}
              </label>

              <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'online'
                  ? 'border-orange-500 bg-orange-50 shadow-sm shadow-orange-100'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="payment-method"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-orange-600 w-4 h-4"
                />
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">📱</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Online Payment (Seller QR)</p>
                  <p className="text-xs text-gray-500 mt-0.5">Scan QR and pay digitally</p>
                </div>
                {paymentMethod === 'online' && (
                  <span className="ml-auto text-xs bg-orange-500 text-white px-2.5 py-1 rounded-full font-bold">Selected</span>
                )}
              </label>
            </div>
          </div>

          {/* Online Payment Details */}
          {paymentMethod === 'online' && (
            <div className="mt-4 rounded-2xl border border-blue-200 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 space-y-4">
              <p className="font-bold text-gray-900 flex items-center gap-2">
                <span>📲</span> Pay Seller via QR
              </p>

              {sellerIdsInCart.length > 1 ? (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="text-red-500 mt-0.5">⚠️</span>
                  <p className="text-sm text-red-700">
                    Your cart has items from multiple sellers. Keep items from one seller only for online payment.
                  </p>
                </div>
              ) : !sellerInfo?.payment_qr_url ? (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="text-red-500 mt-0.5">⚠️</span>
                  <p className="text-sm text-red-700">
                    Seller has not set up a payment QR yet. Please use Cash on Delivery or contact the seller.
                  </p>
                </div>
              ) : (
                <>
                  {/* Step 1 — Amount */}
                  <div className="bg-white rounded-2xl border border-blue-100 p-4 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Step 1 — Amount to Pay</p>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black text-blue-700">Rs. {total.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => copyAmount(total)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold hover:bg-blue-200 transition-colors"
                      >
                        {amountCopied ? '✅ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                    {sellerInfo?.payment_phone && (
                      <p className="text-sm text-gray-600 pt-1">
                        📞 Send to: <span className="font-bold text-gray-800">{sellerInfo.payment_phone}</span>
                      </p>
                    )}
                  </div>

                  {/* Step 2 — QR Code */}
                  <div className="bg-white rounded-2xl border border-blue-100 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Step 2 — Scan QR Code</p>
                    <div className="flex flex-col items-center">
                      <div className="p-3 bg-white rounded-2xl shadow-md border border-blue-100 inline-block">
                        <img
                          src={sellerInfo.payment_qr_url}
                          alt="Seller Payment QR"
                          className="h-56 w-56 object-contain rounded-xl"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Open your payment app and scan this code</p>
                    </div>
                  </div>

                  {/* Step 3 — Confirm */}
                  <div className="bg-white rounded-2xl border border-blue-100 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Step 3 — Confirm Payment</p>
                    <p className="text-sm text-gray-600">
                      After paying, click the button below. The seller will verify and confirm your order.
                    </p>
                  </div>
                </>
              )}

              {activeOnlinePaymentId && (
                <div className="flex items-center gap-3 bg-amber-100 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  <span className="animate-spin text-base">⏳</span>
                  <div>
                    <p className="font-semibold">Waiting for seller to verify payment...</p>
                    <p className="text-xs text-amber-600 mt-0.5">You&apos;ll be redirected automatically once confirmed.</p>
                    <p className="text-xs text-amber-500 font-mono mt-0.5">Ref: {activeOnlinePaymentId}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Place Order Button */}
          <button
            onClick={placeOrder}
            disabled={isPlaceDisabled}
            className={`mt-6 w-full py-4 px-6 rounded-2xl font-black text-base transition-all shadow-lg active:scale-[0.98] ${
              isPlaceDisabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : paymentMethod === 'online'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-blue-200'
                : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-orange-200'
            }`}
          >
            {placingOrder ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : paymentMethod === 'online' ? (
              '✅ I Paid Online — Send for Seller Verification'
            ) : (
              '🛵 Place Order (Cash on Delivery)'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
