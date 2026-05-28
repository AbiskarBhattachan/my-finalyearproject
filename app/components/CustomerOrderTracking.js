'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../Supabase/supabaseClient';
import dynamic from 'next/dynamic';

const LiveDeliveryTracker = dynamic(() => import('./LiveDeliveryTracker'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="text-3xl mb-2 animate-bounce">🗺️</div>
        <p className="text-gray-500 text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

export default function CustomerOrderTracking({ orderId }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!error && data) {
        setOrder(data);
      }
      setLoading(false);
    };

    loadOrder();

    // Subscribe to order status updates
    const channel = supabase
      .channel(`customer-order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        setOrder(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-[300px] bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const showMap = order.delivery_rider_id && 
                  order.status !== 'pending' && 
                  order.status !== 'delivered';

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold mb-1">📦 Order Status</h2>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
            order.status === 'pending' ? 'bg-gray-100 text-gray-700' :
            order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
            order.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' :
            order.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-700' :
            'bg-green-100 text-green-700'
          }`}>
            {order.status.replace(/_/g, ' ')}
          </span>
          {order.estimated_delivery_at && order.status !== 'delivered' && (
            <span className="text-sm text-gray-600">
              ETA: {new Date(order.estimated_delivery_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
        </div>
      </div>

      {showMap ? (
        <LiveDeliveryTracker orderId={orderId} initialOrder={order} />
      ) : order.status === 'delivered' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <p className="font-bold text-green-700 text-lg">Order Delivered!</p>
          <p className="text-sm text-green-600 mt-1">
            Thank you for your order
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="font-semibold text-gray-700">Waiting for rider assignment</p>
          <p className="text-sm text-gray-500 mt-1">
            Your order will be picked up soon
          </p>
        </div>
      )}
    </div>
  );
}
