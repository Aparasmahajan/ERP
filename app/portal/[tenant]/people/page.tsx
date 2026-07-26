'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { User } from '@/lib/types/domain';

export default function PeoplePage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, [tenantSlug]);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'x-tenant-id': tenantSlug },
      });
      const data = await res.json();
      setUsers(data.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantSlug,
        },
        body: JSON.stringify({
          ...formData,
          displayName: `${formData.firstName} ${formData.lastName}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const newUser = await res.json();
      setUsers([...users, newUser]);
      setFormData({
        code: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      });
      setShowForm(false);
      setSuccess('User created successfully');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Archive this user?')) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantSlug },
      });

      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, status: 'ARCHIVED' } : u));
        setSuccess('User archived');
      }
    } catch (err) {
      setError('Failed to archive user');
    }
  };

  const activeUsers = users.filter(u => u.status !== 'ARCHIVED');

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">People Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          ⚠ {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
          ✓ {success}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New User</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Code (Employee/Roll No.)"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              className="col-span-2 px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className="px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              className="px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="col-span-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
            >
              Create User
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-600">Loading users...</p>
        </div>
      ) : activeUsers.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-600 mb-4">No users yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-blue-600 hover:underline font-medium"
          >
            Create the first user
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Code</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Name</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Email</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Phone</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Status</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-900 font-medium">{user.code}</td>
                  <td className="px-6 py-4 text-slate-900">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.email || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">{user.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm font-medium">
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
