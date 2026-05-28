'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../Supabase/supabaseClient';

const TABS = [
  { id: 'kyc', label: 'KYC Verification', icon: '🪪' },
  { id: 'qr', label: 'QR Payment', icon: '📲' },
  { id: 'add', label: 'Add Food Item', icon: '➕' },
  { id: 'menu', label: 'My Menu', icon: '🍽️' },
  { id: 'reviews', label: 'Reviews', icon: '⭐' },
];

const EMPTY_ITEM_FORM = {
  id: null,
  name: '',
  description: '',
  price: '',
  image_url: '',
  category: '',
  is_available: true,
};

function groupBy(arr, keyFn) {
  const map = {};
  arr.forEach((item) => {
    const k = keyFn(item) || 'Uncategorised';
    if (!map[k]) map[k] = [];
    map[k].push(item);
  });
  return Object.keys(map)
    .sort()
    .map((k) => ({ key: k, items: map[k] }));
}

const EMPTY_KYC_FORM = {
  restaurant_name: '',
  restaurant_image_url: '',
  legal_name: '',
  phone: '',
  document_type: '',
  document_number: '',
  document_url: '',
  address: '',
};

const EMPTY_QR_FORM = {
  payment_qr_url: '',
  payment_phone: '',
};

const ALLOWED_SELLER_ROLES = ['seller', 'admin', 'super_admin'];

export default function SellerDashboard() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('kyc');

  const [kycStatus, setKycStatus] = useState('not_applied');
  const [kycNote, setKycNote] = useState('');
  const [kycError, setKycError] = useState('');
  const [kycSaving, setKycSaving] = useState(false);
  const [kycForm, setKycForm] = useState(EMPTY_KYC_FORM);

  const [qrForm, setQrForm] = useState(EMPTY_QR_FORM);
  const [qrSaving, setQrSaving] = useState(false);
  const [qrError, setQrError] = useState('');
  const [qrSuccess, setQrSuccess] = useState('');

  const [items, setItems] = useState([]);
  const [itemsError, setItemsError] = useState('');
  const [saving, setSaving] = useState(false);

  const [foodSearch, setFoodSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  const [form, setForm] = useState(EMPTY_ITEM_FORM);
  const isEditing = useMemo(() => Boolean(form.id), [form.id]);
  const isKycApproved = kycStatus === 'approved';
  const isKycPending = kycStatus === 'pending';

  // reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState('');
  const avgRating = useMemo(() => {
    if (!reviews.length) return null;
    return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        router.push('/Userlogin');
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile) {
        router.push('/home');
        return;
      }

      if (!ALLOWED_SELLER_ROLES.includes(profile.role)) {
        router.push('/home');
        return;
      }

      setSellerProfile(profile);
      setQrForm({
        payment_qr_url: profile.payment_qr_url || '',
        payment_phone: profile.payment_phone || '',
      });
      setForm((prev) => ({ ...prev, category: profile.restaurant_name || '' }));
      await loadKyc(user.id);
      setChecking(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadKyc = async (userId) => {
    setKycError('');
    setKycNote('');

    const { data, error } = await supabase
      .from('seller_kyc_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      setKycStatus('not_applied');
      setKycError(
        'KYC table is not ready yet. Create table `seller_kyc_applications` before using seller verification.'
      );
      return;
    }

    const latest = data?.[0];
    if (!latest) {
      setKycStatus('not_applied');
      return;
    }

    const status = (latest.status || '').toLowerCase();
    if (status === 'approved' || status === 'pending' || status === 'rejected') {
      setKycStatus(status);
    } else {
      setKycStatus('not_applied');
    }

    setKycNote(latest.rejection_reason || latest.admin_note || '');

    if (status === 'approved') {
      await loadItems(userId);
      await loadReviews(userId);
    }
  };

  const loadItems = async (sellerId) => {
    setItemsError('');
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      setItemsError(error.message);
      return;
    }

    setItems(data || []);
  };

  const loadReviews = async (sellerId) => {
    setReviewsError('');
    const { data, error } = await supabase
      .from('order_reviews')
      .select('id, rating, comment, created_at, customer:customer_id(full_name, email)')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    if (error) { setReviewsError(error.message); return; }
    setReviews(data || []);
  };

  const categories = useMemo(() => {
    return [...new Set(items.map((i) => i.category).filter(Boolean))].sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchName = (item.name || '').toLowerCase().includes(foodSearch.toLowerCase());
      const matchCategory = categoryFilter ? item.category === categoryFilter : true;
      const matchAvailability =
        availabilityFilter === 'all'
          ? true
          : availabilityFilter === 'available'
          ? Boolean(item.is_available)
          : !Boolean(item.is_available);
      return matchName && matchCategory && matchAvailability;
    });
  }, [items, foodSearch, categoryFilter, availabilityFilter]);

  const groupedItems = useMemo(() => groupBy(filteredItems, (i) => i.category), [filteredItems]);

  const onItemChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const onKycChange = (e) => {
    const { name, value } = e.target;
    setKycForm((prev) => ({ ...prev, [name]: value }));
  };

  const clearItemForm = () =>
    setForm({ ...EMPTY_ITEM_FORM, category: sellerProfile?.restaurant_name || '' });

  const startEdit = (item) => {
    setForm({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      price: item.price?.toString?.() ?? '',
      image_url: item.image_url || '',
      category: item.category || '',
      is_available: Boolean(item.is_available),
    });
  };

  const validateItem = () => {
    if (!form.name.trim()) return 'Food name is required.';
    const priceNum = Number(form.price);
    if (Number.isNaN(priceNum) || priceNum < 0) return 'Price must be a valid number.';
    return null;
  };

  const validateKyc = () => {
    if (!kycForm.restaurant_name.trim()) return 'Restaurant name is required.';
    if (!kycForm.legal_name.trim()) return 'Legal name is required.';
    if (!kycForm.phone.trim()) return 'Phone number is required.';
    if (!kycForm.document_type.trim()) return 'Document type is required.';
    if (!kycForm.document_number.trim()) return 'Document number is required.';
    if (!kycForm.address.trim()) return 'Address is required.';
    return null;
  };

  const submitKyc = async (e) => {
    e.preventDefault();
    setKycError('');

    const validation = validateKyc();
    if (validation) {
      setKycError(validation);
      return;
    }

    setKycSaving(true);
    try {
      const payload = {
        user_id: sellerProfile.id,
        restaurant_name: kycForm.restaurant_name.trim(),
        restaurant_image_url: kycForm.restaurant_image_url.trim(),
        legal_name: kycForm.legal_name.trim(),
        phone: kycForm.phone.trim(),
        document_type: kycForm.document_type,
        document_number: kycForm.document_number.trim(),
        document_url: kycForm.document_url.trim(),
        address: kycForm.address.trim(),
        status: 'pending',
      };

      const { error } = await supabase.from('seller_kyc_applications').insert([payload]);
      if (error) throw error;

      setKycForm(EMPTY_KYC_FORM);
      setKycStatus('pending');
    } catch (err) {
      setKycError(err?.message || 'Failed to submit KYC application.');
    } finally {
      setKycSaving(false);
    }
  };

  const saveItem = async (e) => {
    e.preventDefault();
    setItemsError('');

    const validation = validateItem();
    if (validation) {
      setItemsError(validation);
      return;
    }

    setSaving(true);

    const basePayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      image_url: form.image_url.trim(),
      category: (form.category.trim() || sellerProfile?.restaurant_name || '').trim(),
      is_available: Boolean(form.is_available),
    };

    try {
      if (isEditing) {
        const { error } = await supabase.from('food_items').update(basePayload).eq('id', form.id);
        if (error) throw error;
      } else {
        const payloadWithSeller = { ...basePayload, seller_id: sellerProfile.id };
        const { error } = await supabase.from('food_items').insert([payloadWithSeller]);
        if (error) throw error;
      }

      clearItemForm();
      await loadItems(sellerProfile.id);
    } catch (err) {
      setItemsError(err?.message || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    const ok = confirm('Delete this item?');
    if (!ok) return;

    setItemsError('');
    const { error } = await supabase.from('food_items').delete().eq('id', id);
    if (error) {
      setItemsError(error.message);
      return;
    }
    await loadItems(sellerProfile.id);
  };

  const saveQr = async (e) => {
    e.preventDefault();
    setQrError('');
    setQrSuccess('');
    if (!qrForm.payment_qr_url.trim() && !qrForm.payment_phone.trim()) {
      setQrError('Please enter at least a QR image URL or a payment phone number.');
      return;
    }
    setQrSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          payment_qr_url: qrForm.payment_qr_url.trim(),
          payment_phone: qrForm.payment_phone.trim(),
        })
        .eq('id', sellerProfile.id);
      if (error) throw error;
      setSellerProfile((prev) => ({
        ...prev,
        payment_qr_url: qrForm.payment_qr_url.trim(),
        payment_phone: qrForm.payment_phone.trim(),
      }));
      setQrSuccess('Payment QR saved! Customers can now pay you via QR at checkout.');
    } catch (err) {
      setQrError(err?.message || 'Failed to save QR settings.');
    } finally {
      setQrSaving(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🏪</div>
          <p className="text-gray-600 font-medium">Loading seller dashboard...</p>
        </div>
      </div>
    );
  }

  const displayName = sellerProfile?.full_name || sellerProfile?.email || 'Seller';

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'qr' || t.id === 'add' || t.id === 'menu' || t.id === 'reviews') return isKycApproved;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header + Tab Bar */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-orange-600">Seller Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Welcome, {displayName}
              {sellerProfile?.restaurant_name ? (
                <span className="ml-2 text-orange-600 font-semibold">· 🏪 {sellerProfile.restaurant_name}</span>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/menu')} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">Menu</button>
            <button onClick={() => router.push('/cart')} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">Cart</button>
            <button onClick={() => router.push('/seller-payments')} className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">💳 Payments</button>
            <button onClick={() => router.push('/home')} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">Home</button>
            <button onClick={logout} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-sm">Logout</button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="max-w-7xl mx-auto px-6 border-t border-gray-100">
          <div className="flex gap-1 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── KYC TAB ── */}
        {activeTab === 'kyc' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-gray-900 mb-1">KYC Verification</h2>
                  <p className="text-sm text-gray-500">You must be KYC verified before managing food items.</p>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide ${
                  kycStatus === 'approved' ? 'bg-green-100 text-green-700' :
                  kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  kycStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {kycStatus === 'approved' ? '✓ ' : ''}{kycStatus}
                </span>
              </div>

              {kycNote && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <span className="font-semibold">Admin note:</span> {kycNote}
                </div>
              )}
              {kycError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {kycError}
                </div>
              )}
              {isKycApproved && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                  Your restaurant is verified. Use the tabs above to set up payments and manage your menu.
                </div>
              )}
            </div>

            {!isKycApproved && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-5">Apply for KYC Verification</h2>
                <form onSubmit={submitKyc} className="grid md:grid-cols-2 gap-4">
                  <input
                    name="restaurant_name"
                    value={kycForm.restaurant_name}
                    onChange={onKycChange}
                    placeholder="Restaurant name (e.g. Thakali Kitchen)"
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors md:col-span-2"
                    disabled={isKycPending || kycSaving}
                  />
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Restaurant Picture URL (optional)</label>
                    <input
                      name="restaurant_image_url"
                      value={kycForm.restaurant_image_url}
                      onChange={onKycChange}
                      placeholder="https://... (link to your restaurant photo)"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors"
                      disabled={isKycPending || kycSaving}
                    />
                    {kycForm.restaurant_image_url && (
                      <img
                        src={kycForm.restaurant_image_url}
                        alt="Restaurant preview"
                        className="mt-2 h-28 w-full object-cover rounded-xl border border-gray-200"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <input
                    name="legal_name"
                    value={kycForm.legal_name}
                    onChange={onKycChange}
                    placeholder="Legal full name"
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors"
                    disabled={isKycPending || kycSaving}
                  />
                  <input
                    name="phone"
                    value={kycForm.phone}
                    onChange={onKycChange}
                    placeholder="Phone number"
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors"
                    disabled={isKycPending || kycSaving}
                  />
                  <select
                    name="document_type"
                    value={kycForm.document_type}
                    onChange={onKycChange}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm bg-white transition-colors"
                    disabled={isKycPending || kycSaving}
                  >
                    <option value="">Select document type</option>
                    <option value="citizenship">Citizenship</option>
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                  </select>
                  <input
                    name="document_number"
                    value={kycForm.document_number}
                    onChange={onKycChange}
                    placeholder="Document number"
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors"
                    disabled={isKycPending || kycSaving}
                  />
                  <input
                    name="document_url"
                    value={kycForm.document_url}
                    onChange={onKycChange}
                    placeholder="Document image URL (optional)"
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors md:col-span-2"
                    disabled={isKycPending || kycSaving}
                  />
                  <input
                    name="address"
                    value={kycForm.address}
                    onChange={onKycChange}
                    placeholder="Permanent address"
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors md:col-span-2"
                    disabled={isKycPending || kycSaving}
                  />
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={isKycPending || kycSaving}
                      className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
                    >
                      {isKycPending ? '⏳ KYC Pending Review' : kycSaving ? 'Submitting...' : 'Submit KYC Application'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── QR PAYMENT TAB ── */}
        {activeTab === 'qr' && isKycApproved && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-base">📲</span>
                  QR Payment Setup
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Customers will scan this QR to pay you at checkout.</p>
              </div>
              <button
                onClick={() => router.push('/seller-payments')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                💳 View Payment Requests
              </button>
            </div>

            {qrError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{qrError}</div>
            )}
            {qrSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                <span>✅</span> {qrSuccess}
              </div>
            )}

            <form onSubmit={saveQr} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Payment Phone / eSewa / Khalti Number</label>
                  <input
                    type="text"
                    value={qrForm.payment_phone}
                    onChange={(e) => setQrForm((p) => ({ ...p, payment_phone: e.target.value }))}
                    placeholder="e.g. 98XXXXXXXX"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">QR Code Image URL</label>
                  <input
                    type="url"
                    value={qrForm.payment_qr_url}
                    onChange={(e) => setQrForm((p) => ({ ...p, payment_qr_url: e.target.value }))}
                    placeholder="https://... (paste your QR image link)"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm transition-colors"
                  />
                </div>
              </div>

              {qrForm.payment_qr_url && (
                <div className="flex items-start gap-5 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="p-2 bg-white rounded-xl shadow-sm border border-blue-100 shrink-0">
                    <img
                      src={qrForm.payment_qr_url}
                      alt="QR Preview"
                      className="h-36 w-36 object-contain rounded-lg"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="space-y-1 pt-1">
                    <p className="text-sm font-semibold text-blue-800">QR Preview</p>
                    <p className="text-xs text-blue-600">This is what customers will see at checkout to scan and pay.</p>
                    {qrForm.payment_phone && (
                      <p className="text-xs text-gray-600 mt-2">📞 Payment number: <span className="font-semibold">{qrForm.payment_phone}</span></p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={qrSaving}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
                >
                  {qrSaving ? 'Saving...' : '💾 Save QR Settings'}
                </button>
                {(sellerProfile?.payment_qr_url || sellerProfile?.payment_phone) && (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
                    <span>✅</span>
                    <span>QR is live — customers can pay you</span>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ── ADD FOOD ITEM TAB ── */}
        {activeTab === 'add' && isKycApproved && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900">{isEditing ? '✏️ Edit Food Item' : '+ Add Food Item'}</h2>
                {sellerProfile?.restaurant_name && (
                  <p className="text-xs text-orange-600 font-medium mt-0.5">
                    🏪 Listed under: <span className="font-bold">{sellerProfile.restaurant_name}</span>
                  </p>
                )}
              </div>
              <button onClick={clearItemForm} className="px-4 py-2 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm">Clear</button>
            </div>

            {itemsError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{itemsError}</div>
            )}

            <form onSubmit={saveItem} className="grid md:grid-cols-2 gap-4">
              <input name="name" value={form.name} onChange={onItemChange} placeholder="Food name *" className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors" />
              <input name="price" value={form.price} onChange={onItemChange} placeholder="Price (Rs.) *" className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors" />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category (Restaurant)</label>
                <input
                  name="category"
                  value={form.category}
                  onChange={onItemChange}
                  placeholder={sellerProfile?.restaurant_name || 'Category / Restaurant name'}
                  className="w-full px-4 py-2.5 border border-orange-200 bg-orange-50 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors font-medium text-orange-800"
                />
                <p className="text-xs text-gray-400">Defaults to your restaurant name. Change only if needed.</p>
              </div>
              <input name="image_url" value={form.image_url} onChange={onItemChange} placeholder="Image URL" className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors" />
              <input name="description" value={form.description} onChange={onItemChange} placeholder="Description" className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-colors md:col-span-2" />
              <label className="flex items-center gap-3 md:col-span-2 cursor-pointer">
                <input type="checkbox" name="is_available" checked={form.is_available} onChange={onItemChange} className="w-4 h-4 text-orange-600 rounded" />
                <span className="text-sm text-gray-700 font-medium">Available for ordering</span>
              </label>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" disabled={saving} className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm text-sm">
                  {saving ? 'Saving...' : isEditing ? 'Update Item' : 'Create Item'}
                </button>
                <button type="button" onClick={() => loadItems(sellerProfile.id)} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium">
                  Refresh
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── MY MENU TAB ── */}
        {activeTab === 'menu' && isKycApproved && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-wrap gap-3 items-center">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  placeholder="Search food..."
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  className="pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-colors"
                />
              </div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white transition-colors">
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white transition-colors">
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
              <button
                onClick={() => { setFoodSearch(''); setCategoryFilter(''); setAvailabilityFilter('all'); }}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Reset
              </button>
              <button
                onClick={() => { setActiveTab('add'); clearItemForm(); }}
                className="ml-auto px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors text-sm font-semibold shadow-sm"
              >
                + Add Item
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <h2 className="font-bold text-gray-900 text-lg">
                🏪 My Menu — <span className="text-orange-600">{sellerProfile?.restaurant_name || 'Restaurant'}</span>
              </h2>
              <span className="text-sm text-gray-400">{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</span>
            </div>

            {groupedItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-4xl mb-3">🍽️</div>
                <p className="text-gray-500 font-medium">No items found.</p>
                <p className="text-gray-400 text-sm mt-1">
                  {foodSearch || categoryFilter
                    ? 'Try adjusting your filters.'
                    : 'Add your first food item from the "Add Food Item" tab.'}
                </p>
              </div>
            ) : (
              groupedItems.map(({ key, items: groupItems }) => (
                <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-3 bg-orange-50 border-b border-orange-100">
                    <span className="text-lg">🏪</span>
                    <h3 className="font-bold text-orange-700 text-sm uppercase tracking-wide">{key}</h3>
                    <span className="ml-auto text-xs text-orange-500 font-medium">{groupItems.length} item{groupItems.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                          <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                          <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                          <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupItems.map((i) => (
                          <tr key={i.id} className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors">
                            <td className="py-3 px-6 font-medium text-gray-900">{i.name}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs max-w-xs truncate">{i.description || '—'}</td>
                            <td className="py-3 px-4 font-semibold text-orange-600">Rs. {i.price}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${i.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {i.is_available ? '● Available' : '○ Unavailable'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { startEdit(i); setActiveTab('add'); }}
                                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteItem(i.id)}
                                  className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-medium transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === 'reviews' && isKycApproved && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">⭐ Customer Reviews</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Reviews left by customers for your restaurant</p>
                </div>
                <div className="flex items-center gap-3">
                  {avgRating && (
                    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-xl">
                      <span className="text-yellow-500 text-lg">★</span>
                      <span className="font-black text-yellow-700 text-lg">{avgRating}</span>
                      <span className="text-xs text-yellow-600">/ 5 ({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                    </div>
                  )}
                  <button
                    onClick={() => loadReviews(sellerProfile.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
                  >
                    ↺ Refresh
                  </button>
                </div>
              </div>

              {reviewsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{reviewsError}</div>
              )}

              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">⭐</div>
                  <p className="text-gray-500 font-medium">No reviews yet</p>
                  <p className="text-gray-400 text-sm mt-1">Reviews will appear here once customers rate their delivered orders.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="border border-gray-100 rounded-2xl p-4 hover:border-orange-200 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-800">
                              {r.customer?.full_name || r.customer?.email || 'Customer'}
                            </span>
                            <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-0.5 mb-2">
                            {[1,2,3,4,5].map((s) => (
                              <span key={s} className={s <= r.rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                            ))}
                          </div>
                          {r.comment && (
                            <p className="text-sm text-gray-600">{r.comment}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-2xl font-black text-yellow-500">{r.rating}/5</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
