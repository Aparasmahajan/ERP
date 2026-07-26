'use client';

import { useState } from 'react';

export default function SetupPage() {
  const [tenantName, setTenantName] = useState('');
  const [pack, setPack] = useState<'INSTITUTION' | 'ORGANISATION'>('INSTITUTION');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantName, pack }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initialize tenant');
      }

      const data = await response.json();
      setSuccess(true);
      setTenantName('');

      // Redirect to portal
      setTimeout(() => {
        window.location.href = `/portal/${data.tenant.slug}`;
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Initialize Tenant</h1>
        <p className="text-gray-600 mb-6">Set up a new organization or institution</p>

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
            ✓ Tenant created successfully. Redirecting...
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="e.g., Greenwood Academy"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Type
            </label>
            <select
              value={pack}
              onChange={(e) => setPack(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="INSTITUTION">
                Institution (School / College)
              </option>
              <option value="ORGANISATION">
                Organization (Office / Business)
              </option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {pack === 'INSTITUTION'
                ? 'Includes roles for academic management, students, faculty'
                : 'Includes roles for HR, payroll, projects, performance'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !tenantName}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition"
          >
            {loading ? 'Initializing...' : 'Create Tenant'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>What's next?</strong> You'll set up your first user, organization structure, and configure roles.
          </p>
        </div>
      </div>
    </main>
  );
}
