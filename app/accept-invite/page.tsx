'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [info, setInfo] = useState<{ name: string; email: string; orgName: string; tenantSlug: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ loginUrl: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('This link is missing its token. Ask your administrator to resend the invite.');
      setLoading(false);
      return;
    }

    fetch(`/api/tenant-auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'That invite link is not valid.');
          // Already used is recoverable — point them at the login page.
          if (json.alreadyUsed && json.tenantSlug) {
            setDone({ loginUrl: `/portal/${json.tenantSlug}/login` });
          }
          return;
        }
        setInfo(json);
      })
      .catch(() => setError('Could not reach the server.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) return setError('Choose a password of at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');

    setSaving(true);
    try {
      const res = await fetch('/api/tenant-auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not set your password.');
        return;
      }
      setDone({ loginUrl: json.loginUrl });
      setTimeout(() => router.push(json.loginUrl), 2500);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8">
        {loading ? (
          <p className="text-center text-slate-500">Checking your invite…</p>
        ) : done ? (
          <div className="text-center">
            <div className="mb-3 text-4xl">✓</div>
            <h1 className="font-serif text-2xl text-slate-900">You&apos;re all set</h1>
            <p className="mt-2 text-sm text-slate-600">Taking you to the sign-in page…</p>
            <a href={done.loginUrl} className="mt-4 inline-block text-sm text-slate-900 underline">
              Sign in now →
            </a>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Welcome</p>
            <h1 className="mt-1 font-serif text-3xl text-slate-900">Set your password</h1>

            {info && (
              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
                <p className="text-slate-900">{info.name}</p>
                <p className="text-slate-600">{info.email}</p>
                <p className="mt-1 text-slate-500">{info.orgName}</p>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {info && (
              <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">New password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    autoFocus
                    required
                  />
                  <span className="mt-1 block text-xs text-slate-500">At least 8 characters.</span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Confirm password</span>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Set password and continue'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
