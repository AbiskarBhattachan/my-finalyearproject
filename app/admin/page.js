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

export default function AdminDashboard() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  // profile (admin)
  const [adminProfile, setAdminProfile] = useState(null);

  // food items
  const [items, setItems] = useState([]);
  const [itemsError, setItemsError] = useState('');
  const [saving, setSaving] = useState(false);

  // users
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState('');

  // filters
  const [foodSearch, setFoodSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  const [userSearch, setUserSearch] = useState('');

  // form
  const [form, setForm] = useState(EMPTY_FORM);
  const isEditing = useMemo(() => Boolean(form.id), [form.id]);

  // ---------------- AUTH + ADMIN CHECK ----------------
  useEffect(() => {
    const init = async () => {
      // 1) check user
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        router.push('/Userlogin');
        return;
      }

      // 2) check role
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('email, full_name, role')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile) {
        router.push('/home');
        return;
      }

      if (profile.role !== 'admin') {
        router.push('/home');
        return;
      }

      setAdminProfile(profile);

      // 3) load admin data
      await Promise.all([loadItems(), loadUsers()]);
      setChecking(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- LOADERS ----------------
  const loadItems = async () => {
    setItemsError('');
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setItemsError(error.message);
      return;
    }
    setItems(data || []);
  };

  const loadUsers = async () => {
    setUsersError('');
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setUsersError(error.message);
      return;
    }
    setUsers(data || []);
  };

  // ---------------- FILTERS ----------------
  const categories = useMemo(() => {
    return [...new Set(items.map((i) => i.category).filter(Boolean))].sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchName = (item.name || '')
        .toLowerCase()
        .includes(foodSearch.toLowerCase());

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

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;

    return users.filter((u) => {
      const email = (u.email || '').toLowerCase();
      const name = (u.full_name || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      return email.includes(q) || name.includes(q) || role.includes(q);
    });
  }, [users, userSearch]);

  // ---------------- FORM HELPERS ----------------
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const clearForm = () => setForm(EMPTY_FORM);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateItem = () => {
    if (!form.name.trim()) return 'Food name is required.';
    const priceNum = Number(form.price);
    if (Number.isNaN(priceNum) || priceNum < 0) return 'Price must be a valid number.';
    return null;
  };

  // ---------------- CRUD: FOOD ----------------
  const saveItem = async (e) => {
    e.preventDefault();
    setItemsError('');

    const validation = validateItem();
    if (validation) {
      setItemsError(validation);
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      image_url: form.image_url.trim(),
      category: form.category.trim(),
      is_available: Boolean(form.is_available),
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('food_items')
          .update(payload)
          .eq('id', form.id);

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
    const ok = confirm('Delete this item?');
    if (!ok) return;

    setItemsError('');
    const { error } = await supabase.from('food_items').delete().eq('id', id);
    if (error) {
      setItemsError(error.message);
      return;
    }
    await loadItems();
  };

  // ---------------- LOGOUT ----------------
  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // ---------------- UI ----------------
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700">Loading admin dashboard...</p>
      </div>
    );
  }

  const displayName = adminProfile?.full_name || adminProfile?.email || 'Admin';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-orange-600">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {displayName}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/home')}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Home
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* FOOD FORM */}
        <div className="bg-white p-6 rounded border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              {isEditing ? 'Edit Food Item' : 'Add Food Item'}
            </h2>

            <button
              onClick={clearForm}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Clear
            </button>
          </div>

          {itemsError && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-4">
              {itemsError}
            </div>
          )}

          <form onSubmit={saveItem} className="grid md:grid-cols-2 gap-4">
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Food name"
              className="border p-2 rounded"
            />
            <input
              name="price"
              value={form.price}
              onChange={onChange}
              placeholder="Price"
              className="border p-2 rounded"
            />
            <input
              name="category"
              value={form.category}
              onChange={onChange}
              placeholder="Category (e.g. Thakali Set)"
              className="border p-2 rounded"
            />
            <input
              name="image_url"
              value={form.image_url}
              onChange={onChange}
              placeholder="Image URL"
              className="border p-2 rounded"
            />
            <input
              name="description"
              value={form.description}
              onChange={onChange}
              placeholder="Description"
              className="border p-2 rounded md:col-span-2"
            />

            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                name="is_available"
                checked={form.is_available}
                onChange={onChange}
              />
              Available
            </label>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </button>

              <button
                type="button"
                onClick={loadItems}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              >
                Refresh items
              </button>
            </div>
          </form>
        </div>

        {/* FOOD FILTERS */}
        <div className="bg-white p-6 rounded border border-gray-200 flex flex-wrap gap-3">
          <input
            placeholder="Search food..."
            value={foodSearch}
            onChange={(e) => setFoodSearch(e.target.value)}
            className="border p-2 rounded"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>

          <button
            onClick={() => {
              setFoodSearch('');
              setCategoryFilter('');
              setAvailabilityFilter('all');
            }}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            Reset filters
          </button>
        </div>

        {/* FOOD TABLE */}
        <div className="bg-white p-6 rounded border border-gray-200 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Food Items</h2>
            <p className="text-sm text-gray-600">
              Showing {filteredItems.length} item(s)
            </p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Available</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((i) => (
                <tr key={i.id} className="border-b">
                  <td className="py-2 pr-4">{i.name}</td>
                  <td className="py-2 pr-4">{i.category || '-'}</td>
                  <td className="py-2 pr-4">{i.price}</td>
                  <td className="py-2 pr-4">{i.is_available ? 'Yes' : 'No'}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(i)}
                        className="border px-3 py-1 rounded hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(i.id)}
                        className="border px-3 py-1 rounded text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-gray-500">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* USERS */}
        <div className="bg-white p-6 rounded border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold">Users</h2>

            <div className="flex flex-wrap gap-3">
              <input
                placeholder="Search users (email/name/role)..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="border p-2 rounded"
              />
              <button
                onClick={loadUsers}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              >
                Refresh users
              </button>
            </div>
          </div>

          {usersError && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-4">
              {usersError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4">{u.full_name || '-'}</td>
                    <td className="py-2 pr-4">{u.role}</td>
                    <td className="py-2 pr-4">
                      {u.created_at ? new Date(u.created_at).toLocaleString() : ''}
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
