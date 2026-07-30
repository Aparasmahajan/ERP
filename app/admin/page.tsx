'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminNav, PageHeading, Pill, StatTile, StatusPill } from './AdminNav';
import Link from 'next/link';

interface Stats {
  enquiries: { total: number; pending: number; accepted: number; rejected: number; conversionPct: number | null };
  tenants: { total: number; active: number };
  users: { total: number; active: number; invited: number };
}

interface Enquiry {
  id: string;
  code: string;
  orgName: string;
  templateId: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/verify', { credentials: 'include' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const session = await res.json();
        if (cancelled) return;
        setEmail(session.email);

        // Both are non-fatal: the page still renders if Sheets is unreachable.
        const [s, e] = await Promise.all([
          fetch('/api/admin/stats', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch('/api/enquiries', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        if (cancelled) return;
        if (s) setStats(s);
        if (e?.data) setRecent(e.data.slice(0, 6));
      } catch {
        router.push('/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav active="dashboard" email={email} />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeading eyebrow="Overview" title="Dashboard" />

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label="New enquiries"
            value={stats?.enquiries.pending ?? '—'}
            tone={stats && stats.enquiries.pending > 0 ? 'alert' : 'plain'}
          />
          <StatTile label="Accepted" value={stats?.enquiries.accepted ?? '—'} />
          <StatTile label="Rejected" value={stats?.enquiries.rejected ?? '—'} />
          <StatTile
            label="Live tenants"
            value={stats ? `${stats.tenants.active} / ${stats.tenants.total}` : '—'}
          />
          <StatTile
            label="People"
            value={stats ? `${stats.users.active} / ${stats.users.total}` : '—'}
          />
          <StatTile
            label="Awaiting first sign-in"
            value={stats?.users.invited ?? '—'}
            tone={stats && stats.users.invited > 0 ? 'alert' : 'plain'}
          />
        </div>

        <div className="mb-10 flex flex-wrap gap-3">
          <Pill href="/admin/enquiries">Review enquiries</Pill>
          <Pill href="/templates">Template catalogue</Pill>
          <Pill href="/demo">Template demos</Pill>
          <Pill href="/">Landing page</Pill>
        </div>

        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-serif text-2xl text-slate-900">Recent enquiries</h2>
          <Link href="/admin/enquiries" className="text-sm text-slate-600 underline hover:text-slate-900">
            See all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">No enquiries yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              They arrive from the template cards on the{' '}
              <Link href="/" className="underline">
                landing page
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left">
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-medium">Code</th>
                    <th className="px-5 py-3 font-medium">Organisation</th>
                    <th className="px-5 py-3 font-medium">Template</th>
                    <th className="px-5 py-3 font-medium">Submitted</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link href="/admin/enquiries" className="font-mono text-xs text-slate-900 underline">
                          {e.code || e.id.slice(0, 12)}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-900">{e.orgName}</td>
                      <td className="px-5 py-3 text-slate-600">{e.templateId}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-CA') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={e.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
