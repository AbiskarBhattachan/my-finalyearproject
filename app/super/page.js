'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../Supabase/supabaseClient';

const EMPTY_FORM = {
  id: null,
  name: '',
  description: '',
  price: '',
  image_url: '',
  category: '',
  is_available: true,
};

const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'seller', label: 'Seller' },
  { value: 'delivery_rider', label: 'Delivery Rider' },
];

const LEGACY_ROLE_MAP = { delivery: 'delivery_rider' };

const KYC_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const TABS = ['Food Items', 'KYC Review', 'Users', 'Reviews'];

export default function AdminDashboard() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('Food Items');

  const [adminProfile, setAdminProfile] = useState(null);

  // food items
  const [items, setItems] = useState([]);
  const [itemsError, setItemsError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const isEditing = useMemo(() => Boolean(form.id), [form.id]);
  const [foodSearch, setFoodSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // users
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState('');
  const [savingUserId, setSavingUserId] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // kyc
  const [kycList, setKycList] = useState([]);
  const [kycError, setKycError] = useState('');
  const [kycFilter, setKycFilter] = useState('pending');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [kycBusyId, setKycBusyId] = useState(null);

  // reviews
  const [allReviews, setAllReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewSellerFilter, setReviewSellerFilter] = useState('all');

  // ---------------- AUTH ----------------
  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { router.push('/Userlogin'); return; }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id,email,full_name,role')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile || profile.role !== 'super_admin') {
        router.push('/home');
        return;
      }

      setAdminProfile(profile);
      await Promise.all([loadItems(), loadUsers(), loadKyc(), loadAllReviews()]);
      setChecking(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- LOADERS ----------------
  const loadItems = async () => {
    setItemsError('');
    const { data, error } = await supabase
      .from('food_items').select('*').order('created_at', { ascending: false });
    if (error) { setItemsError(error.message); return; }
    setItems(data || []);
  };

  const loadUsers = async () => {
    setUsersError('');
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,created_at')
      .order('created_at', { ascending: false });
    if (error) { setUsersError(error.message); return; }
    setUsers(data || []);
  };

  const loadKyc = async () => {
    setKycError('');
    const { data, error } = await supabase
      .from('seller_kyc_applications')
      .select('id,user_id,restaurant_name,legal_name,phone,document_type,document_number,document_url,address,status,admin_note,rejection_reason,reviewed_at,created_at,profiles!seller_kyc_applications_user_id_fkey(email,full_name)')
      .order('created_at', { ascending: false });
    if (error) { setKycError(error.message || 'Failed to load KYC applications.'); return; }
    setKycList(data || []);
  };

  const loadAllReviews = async () => {
    setReviewsError('');
    const { data, error } = await supabase
      .from('order_reviews')
      .select('id, rating, comment, created_at, customer:customer_id(full_name, email), seller:seller_id(full_name, restaurant_name)')
      .order('created_at', { ascending: false });
    if (error) { setReviewsError(error.message || 'Failed to load reviews.'); return; }
    setAllReviews(data || []);
  };

  // ---------------- KYC REVIEW ----------------
  const reviewKyc = async (kycId, userId, action) => {
    setKycBusyId(kycId);
    try {
      const note = reviewNote.trim();
      const updatePayload = {
        status: action,
        reviewed_by: adminProfile.id,
        reviewed_at: new Date().toISOString(),
        ...(action === 'approved' ? { admin_note: note } : { rejection_reason: note }),
      };

      const { error: kycErr } = await supabase
        .from('seller_kyc_applications').update(updatePayload).eq('id', kycId);
      if (kycErr) throw kycErr;

      if (action === 'approved') {
        const kycRecord = kycList.find((k) => k.id === kycId);
        const { error: roleErr } = await supabase
          .from('profiles')
          .update({
            role: 'seller',
            restaurant_name: kycRecord?.restaurant_name || '',
            restaurant_image_url: kycRecord?.restaurant_image_url || '',
          })
          .eq('id', userId);
        if (roleErr) throw roleErr;
      }

      setReviewingId(null);
      setReviewNote('');
      await Promise.all([loadKyc(), loadUsers()]);
    } catch (err) {
      setKycError(err?.message || 'Failed to review KYC.');
    } finally {
      setKycBusyId(null);
    }
  };

  // ---------------- FILTERS ----------------
  const categories = useMemo(() =>
    [...new Set(items.map((i) => i.category).filter(Boolean))].sort(), [items]);

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchName = (item.name || '').toLowerCase().includes(foodSearch.toLowerCase());
    const matchCategory = categoryFilter ? item.category === categoryFilter : true;
    const matchAvailability = availabilityFilter === 'all' ? true
      : availabilityFilter === 'available' ? Boolean(item.is_available) : !Boolean(item.is_available);
    return matchName && matchCategory && matchAvailability;
  }), [items, foodSearch, categoryFilter, availabilityFilter]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    return users.filter((u) => {
      const matchRole = userRoleFilter === 'all' ? true : (LEGACY_ROLE_MAP[u.role] || u.role) === userRoleFilter;
      const matchSearch = !q ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [users, userSearch, userRoleFilter]);

  const filteredKyc = useMemo(() =>
    kycFilter === 'all' ? kycList : kycList.filter((k) => k.status === kycFilter),
    [kycList, kycFilter]);

  const pendingKycCount = useMemo(() =>
    kycList.filter((k) => k.status === 'pending').length, [kycList]);

  const userRoleCounts = useMemo(() => {
    const counts = { all: users.length, user: 0, seller: 0, delivery_rider: 0, admin: 0, super_admin: 0 };
    users.forEach((u) => {
      const role = LEGACY_ROLE_MAP[u.role] || u.role;
      if (counts[role] !== undefined) counts[role]++;
    });
    return counts;
  }, [users]);

  // reviews computed
  const sellerOptions = useMemo(() => {
    const map = {};
    allReviews.forEach((r) => {
      if (r.seller?.restaurant_name) map[r.seller.restaurant_name] = true;
    });
    return Object.keys(map).sort();
  }, [allReviews]);

  const filteredReviews = useMemo(() => {
    if (reviewSellerFilter === 'all') return allReviews;
    return allReviews.filter((r) => r.seller?.restaurant_name === reviewSellerFilter);
  }, [allReviews, reviewSellerFilter]);

  const avgRatingAll = useMemo(() => {
    if (!filteredReviews.length) return null;
    return (filteredReviews.reduce((s, r) => s + r.rating, 0) / filteredReviews.length).toFixed(1);
  }, [filteredReviews]);

  // ---------------- FORM HELPERS ----------------
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  const clearForm = () => setForm(EMPTY_FORM);
  const startEdit = (item) => {
    setForm({
      id: item.id, name: item.name || '', description: item.description || '',
      price: item.price?.toString?.() ?? '', image_url: item.image_url || '',
      category: item.category || '', is_available: Boolean(item.is_available),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---------------- CRUD: FOOD ----------------
  const saveItem = async (e) => {
    e.preventDefault();
    setItemsError('');
    if (!form.name.trim()) { setItemsError('Food name is required.'); return; }
    const priceNum = Number(form.price);
    if (Number.isNaN(priceNum) || priceNum < 0) { setItemsError('Price must be a valid number.'); return; }

    setSaving(true);
    const payload = {
      seller_id: adminProfile.id, name: form.name.trim(),
      description: form.description.trim(), price: priceNum,
      image_url: form.image_url.trim(), category: form.category.trim(),
      is_available: Boolean(form.is_available),
    };
    try {
      if (isEditing) {
        const { error } = await supabase.from('food_items').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('food_items').insert([payload]);
        if (error) throw error;
      }
      clearForm();
      await loadItems();
    } catch (err) {
      setItemsError(err?.message || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    if (!confirm('Delete this item?')) return;
    setItemsError('');
    const { error } = await supabase.from('food_items').delete().eq('id', id);
    if (error) { setItemsError(error.message); return; }
    await loadItems();
  };

  // ---------------- ROLE UPDATE ----------------
  const updateUserRole = async (userId, newRole) => {
    setUsersError('');
    if (adminProfile?.id === userId) { setUsersError("You can't change your own role."); return; }
    const normalizedRole = LEGACY_ROLE_MAP[newRole] || newRole;
    setSavingUserId(userId);
    try {
      const { error } = await supabase.from('profiles').update({ role: normalizedRole }).eq('id', userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: normalizedRole } : u)));
    } catch (err) {
      setUsersError(err?.message || 'Failed to update role (check RLS).');
    } finally {
      setSavingUserId(null);
    }
  };

  const logout = async () => { await supabase.auth.signOut(); router.push('/'); };

  // ---------------- UI ----------------
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-red-50">
        <div className="text-center space-y-4">
          <div className="relative inline-flex">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-3xl shadow-lg shadow-orange-200">⚙️</div>
            <div className="absolute inset-0 rounded-2xl border-4 border-orange-300 border-t-orange-600 animate-spin" />
          </div>
          <p className="text-gray-700 font-bold text-lg">Loading Super Admin Dashboard</p>
          <p className="text-gray-400 text-sm">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  const displayName = adminProfile?.full_name || adminProfile?.email || 'Super Admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Top bar */}
      <nav className="bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-orange-100/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xl shadow-md shadow-orange-200">
              👑
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Super Admin Dashboard</h1>
              <p className="text-xs text-gray-400 mt-0.5">Welcome back, <span className="font-semibold text-orange-600">{displayName}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/menu')} className="inline-flex items-center gap-1.5 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-sm font-semibold">🍽️ Menu</button>
            <button onClick={() => router.push('/home')} className="inline-flex items-center gap-1.5 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-sm font-semibold">🏠 Home</button>
            <button onClick={logout} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all text-sm font-bold shadow-md shadow-orange-200 active:scale-95">
              ↩ Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 border-t border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'
              }`}
            >
              {tab}
              {tab === 'KYC Review' && pendingKycCount > 0 && (
                <span className="ml-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold shadow-sm">
                  {pendingKycCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ===== FOOD ITEMS TAB ===== */}
        {activeTab === 'Food Items' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${isEditing ? 'bg-blue-100' : 'bg-orange-100'}`}>
                    {isEditing ? '✏️' : '➕'}
                  </div>
                  <h2 className="font-bold text-gray-900">{isEditing ? 'Edit Food Item' : 'Add Food Item'}</h2>
                </div>
                <button onClick={clearForm} className="inline-flex items-center gap-1.5 px-4 py-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-sm font-semibold">
                  ✕ Clear
                </button>
              </div>
              {itemsError && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                  <span className="mt-0.5">⚠️</span><span>{itemsError}</span>
                </div>
              )}
              <form onSubmit={saveItem} className="grid md:grid-cols-2 gap-4">
                <input name="name" value={form.name} onChange={onChange} placeholder="Food name *" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-all bg-gray-50 focus:bg-white" />
                <input name="price" value={form.price} onChange={onChange} placeholder="Price (Rs.) *" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-all bg-gray-50 focus:bg-white" />
                <input name="category" value={form.category} onChange={onChange} placeholder="Category" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-all bg-gray-50 focus:bg-white" />
                <input name="image_url" value={form.image_url} onChange={onChange} placeholder="Image URL" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-all bg-gray-50 focus:bg-white" />
                <input name="description" value={form.description} onChange={onChange} placeholder="Description" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm transition-all bg-gray-50 focus:bg-white md:col-span-2" />
                <label className="flex items-center gap-3 md:col-span-2 cursor-pointer p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <input type="checkbox" name="is_available" checked={form.is_available} onChange={onChange} className="w-4 h-4 text-orange-600 rounded accent-orange-500" />
                  <div>
                    <span className="text-sm text-gray-800 font-semibold">Available for ordering</span>
                    <p className="text-xs text-gray-400 mt-0.5">Customers can add this item to their cart</p>
                  </div>
                </label>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-red-600 disabled:opacity-50 transition-all shadow-md shadow-orange-200 text-sm active:scale-95">
                    {saving ? (
                      <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
                    ) : isEditing ? (
                      <><span>💾</span> Update Item</>
                    ) : (
                      <><span>✨</span> Create Item</>
                    )}
                  </button>
                  <button type="button" onClick={loadItems} className="inline-flex items-center gap-1.5 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-sm font-semibold">
                    ↺ Refresh
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-wrap gap-3 items-center">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input placeholder="Search food..." value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} className="pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-colors" />
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
              <button onClick={() => { setFoodSearch(''); setCategoryFilter(''); setAvailabilityFilter('all'); }} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium">Reset</button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">Food Items</h2>
                <span className="text-sm text-gray-400">{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((i) => (
                      <tr key={i.id} className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors">
                        <td className="py-3 px-6 font-medium text-gray-900">{i.name}</td>
                        <td className="py-3 px-4">{i.category ? <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{i.category}</span> : <span className="text-gray-400">-</span>}</td>
                        <td className="py-3 px-4 font-semibold text-orange-600">Rs. {i.price}</td>
                        <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${i.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{i.is_available ? '● Available' : '○ Unavailable'}</span></td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(i)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-all active:scale-95">✏️ Edit</button>
                            <button onClick={() => deleteItem(i.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 text-xs font-semibold transition-all active:scale-95">🗑 Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr><td colSpan="5" className="py-12 text-center text-gray-400"><div className="text-3xl mb-2">🍽️</div>No items found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ===== KYC REVIEW TAB ===== */}
        {activeTab === 'KYC Review' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="font-bold text-gray-900 text-lg">Seller KYC Applications</h2>
              <div className="flex gap-2 flex-wrap">
                {['all', 'pending', 'approved', 'rejected'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setKycFilter(f)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all active:scale-95 ${
                      kycFilter === f ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f}
                    {f === 'pending' && pendingKycCount > 0 && (
                      <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 font-bold ${kycFilter === f ? 'bg-white text-orange-600' : 'bg-orange-600 text-white'}`}>
                        {pendingKycCount}
                      </span>
                    )}
                  </button>
                ))}
                <button onClick={loadKyc} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-all">↺ Refresh</button>
              </div>
            </div>

            {kycError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{kycError}</div>
            )}

            {filteredKyc.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-500 font-medium">No {kycFilter === 'all' ? '' : kycFilter} KYC applications found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredKyc.map((kyc) => {
                  const applicant = kyc.profiles?.full_name || kyc.profiles?.email || kyc.user_id;
                  const isExpanded = reviewingId === kyc.id;
                  const isBusy = kycBusyId === kyc.id;

                  return (
                    <div key={kyc.id} className="border border-gray-100 rounded-2xl p-5 hover:border-orange-200 transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{kyc.legal_name}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wide font-bold ${KYC_STATUS_COLORS[kyc.status] || 'bg-gray-100 text-gray-700'}`}>
                              {kyc.status}
                            </span>
                          </div>
                          {kyc.restaurant_name && (
                            <p className="text-sm font-semibold text-orange-700">🏪 {kyc.restaurant_name}</p>
                          )}
                          <p className="text-sm text-gray-600">Applicant: <span className="font-semibold text-gray-800">{applicant}</span></p>
                          <p className="text-sm text-gray-600">Phone: {kyc.phone} &nbsp;·&nbsp; {kyc.document_type}: {kyc.document_number}</p>
                          <p className="text-sm text-gray-600">Address: {kyc.address}</p>
                          {kyc.document_url && (
                            <a href={kyc.document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-medium">
                              📄 View Document
                            </a>
                          )}
                          <p className="text-xs text-gray-400">Submitted: {new Date(kyc.created_at).toLocaleString()}</p>
                          {kyc.reviewed_at && (
                            <p className="text-xs text-gray-400">Reviewed: {new Date(kyc.reviewed_at).toLocaleString()}</p>
                          )}
                          {(kyc.admin_note || kyc.rejection_reason) && (
                            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 mt-1">
                              <span className="font-semibold">Note:</span> {kyc.admin_note || kyc.rejection_reason}
                            </p>
                          )}
                        </div>

                        {kyc.status === 'pending' && (
                          <button
                            onClick={() => { setReviewingId(isExpanded ? null : kyc.id); setReviewNote(''); }}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 active:scale-95 ${
                              isExpanded
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-200 hover:from-orange-600 hover:to-amber-600'
                            }`}
                          >
                            {isExpanded ? '✕ Cancel' : '🔍 Review'}
                          </button>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                          <textarea
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="Optional note for the seller..."
                            rows={2}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none transition-colors"
                          />
                          <div className="flex gap-3">
                            <button
                              disabled={isBusy}
                              onClick={() => reviewKyc(kyc.id, kyc.user_id, 'approved')}
                              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-sm font-bold shadow-md shadow-green-200 transition-all active:scale-95"
                            >
                              {isBusy ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing...</> : <><span>✓</span> Approve</>}
                            </button>
                            <button
                              disabled={isBusy}
                              onClick={() => reviewKyc(kyc.id, kyc.user_id, 'rejected')}
                              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 disabled:opacity-50 text-sm font-bold shadow-md shadow-red-200 transition-all active:scale-95"
                            >
                              {isBusy ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing...</> : <><span>✕</span> Reject</>}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">Approving will automatically set the user&apos;s role to &quot;seller&quot;.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {activeTab === 'Users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Users &amp; Role Management</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  <input
                    placeholder="Search by name, email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-colors w-56"
                  />
                </div>
                <button onClick={loadUsers} className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all text-sm font-semibold">↺ Refresh</button>
              </div>
            </div>

            {/* Role filter tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { key: 'all',            label: 'All',             icon: '👥' },
                { key: 'user',           label: 'Customers',       icon: '🙋' },
                { key: 'seller',         label: 'Sellers',         icon: '🏪' },
                { key: 'delivery_rider', label: 'Delivery Riders', icon: '🛵' },
                { key: 'admin',          label: 'Admins',          icon: '🛡️' },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setUserRoleFilter(key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    userRoleFilter === key
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[20px] text-center ${
                    userRoleFilter === key ? 'bg-white/25 text-white' : 'bg-white text-gray-500 border border-gray-200'
                  }`}>
                    {userRoleCounts[key] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {usersError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{usersError}</div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Change Role</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => {
                    const isMe = adminProfile?.id === u.id;
                    const isSuperAdmin = u.role === 'super_admin';
                    const disabled = isMe || isSuperAdmin || savingUserId === u.id;
                    const currentRole = LEGACY_ROLE_MAP[u.role] || u.role;
                    const roleOptionsForUser = ROLE_OPTIONS.some((r) => r.value === currentRole)
                      ? ROLE_OPTIONS
                      : [...ROLE_OPTIONS, { value: currentRole, label: currentRole }];

                    const roleMeta = {
                      super_admin:    { color: 'bg-purple-100 text-purple-700', icon: '👑', label: 'Super Admin' },
                      admin:          { color: 'bg-blue-100 text-blue-700',     icon: '🛡️', label: 'Admin' },
                      seller:         { color: 'bg-green-100 text-green-700',   icon: '🏪', label: 'Seller' },
                      delivery_rider: { color: 'bg-yellow-100 text-yellow-700', icon: '🛵', label: 'Delivery Rider' },
                      user:           { color: 'bg-gray-100 text-gray-600',     icon: '🙋', label: 'Customer' },
                    }[currentRole] || { color: 'bg-gray-100 text-gray-600', icon: '👤', label: currentRole };

                    return (
                      <tr key={u.id} className={`border-t border-gray-50 transition-colors ${isMe ? 'bg-orange-50/50' : 'hover:bg-gray-50/60'}`}>
                        <td className="py-3 px-4 text-xs text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {u.full_name || <span className="text-gray-400 font-normal">—</span>}
                          {isMe && <span className="ml-1.5 text-xs text-orange-500 font-normal">(you)</span>}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs max-w-[200px] truncate" title={u.email}>{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${roleMeta.color}`}>
                            {roleMeta.icon} {roleMeta.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isSuperAdmin ? (
                            <span className="text-xs text-gray-400 italic">🔒 Protected</span>
                          ) : isMe ? (
                            <span className="text-xs text-gray-400 italic">Cannot change own role</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                value={currentRole}
                                disabled={disabled}
                                onChange={(e) => updateUserRole(u.id, e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-orange-400 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {roleOptionsForUser.map((r) => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                              {savingUserId === u.id && (
                                <span className="text-xs text-orange-500 animate-pulse">Saving…</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-14 text-center text-gray-400">
                        <div className="text-4xl mb-2">👥</div>
                        <p className="font-medium">No {userRoleFilter !== 'all' ? userRoleFilter.replace('_', ' ') + 's' : 'users'} found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Role changes take effect immediately. <span className="font-semibold">super_admin</span> roles are protected and cannot be changed here.
            </p>
          </div>
        )}

        {/* ===== REVIEWS TAB ===== */}
        {activeTab === 'Reviews' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">⭐ All Customer Reviews</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Reviews submitted by customers across all restaurants</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {avgRatingAll && (
                    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-xl">
                      <span className="text-yellow-500 text-lg">★</span>
                      <span className="font-black text-yellow-700 text-lg">{avgRatingAll}</span>
                      <span className="text-xs text-yellow-600">/ 5 ({filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''})</span>
                    </div>
                  )}
                  <select
                    value={reviewSellerFilter}
                    onChange={(e) => setReviewSellerFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none"
                  >
                    <option value="all">All Restaurants</option>
                    {sellerOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={loadAllReviews}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
                  >
                    ↺ Refresh
                  </button>
                </div>
              </div>

              {reviewsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{reviewsError}</div>
              )}

              {filteredReviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">⭐</div>
                  <p className="text-gray-500 font-medium">No reviews yet</p>
                  <p className="text-gray-400 text-sm mt-1">Reviews appear here once customers rate their delivered orders.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Restaurant</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Comment</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReviews.map((r) => (
                        <tr key={r.id} className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {r.customer?.full_name || r.customer?.email || 'Customer'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                              {r.seller?.restaurant_name || r.seller?.full_name || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-yellow-600">{r.rating}</span>
                              <span className="text-yellow-400">★</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 max-w-xs">
                            {r.comment ? (
                              <span className="line-clamp-2">{r.comment}</span>
                            ) : (
                              <span className="text-gray-300 italic">No comment</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
