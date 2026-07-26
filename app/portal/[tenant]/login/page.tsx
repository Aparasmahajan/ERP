'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TenantLoginPage({ params }: { params: Promise<{ tenant: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    params.then(({ tenant }) => setSlug(tenant));
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;

    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/tenant-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantSlug: slug, email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not sign in.');
        return;
      }
      router.push(`/portal/${slug}`);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sign in</p>
          <h1 className="mt-1 font-serif text-3xl text-slate-900">{slug ?? '…'}</h1>
          <p className="mt-2 text-sm text-slate-600">Use the email your invite was sent to.</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                autoFocus
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                required
              />
            </label>

            <button
              type="submit"
              disabled={busy || !slug}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Not set up yet? Use the invite link you were sent to choose a password.
        </p>
      </div>
    </div>
  );
}
