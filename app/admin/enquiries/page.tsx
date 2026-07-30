'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminNav, PageHeading, StatusPill } from '../AdminNav';

interface Enquiry {
  id: string;
  code: string;
  orgName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  templateId: string;
  pack: string;
  message: string;
  status: 'NEW' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  reviewedBy: string;
  reviewedAt: string;
  rejectionReason: string;
  tenantId: string;
}

interface Counts {
  total: number;
  new: number;
  accepted: number;
  rejected: number;
}

type Filter = 'NEW' | 'ACCEPTED' | 'REJECTED' | 'ALL';
type SortKey = 'code' | 'orgName' | 'templateId' | 'createdAt' | 'status';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'code', label: 'Code' },
  { key: 'orgName', label: 'Organisation' },
  { key: 'templateId', label: 'Template' },
  { key: 'createdAt', label: 'Submitted' },
  { key: 'status', label: 'Status' },
];

export default function EnquiriesPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [filter, setFilter] = useState<Filter>('NEW');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<{ msg: string; portalUrl?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = filter === 'ALL' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/enquiries${qs}`, { credentials: 'include' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not load enquiries');
        return;
      }
      setRows(json.data || []);
      setCounts(json.counts || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load enquiries');
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    fetch('/api/auth/verify', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setEmail(s.email))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Clicking a header sorts by it; clicking the active header flips direction. */
  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Dates read most naturally newest-first; text reads A-Z.
      setSortDir(key === 'createdAt' ? 'desc' : 'asc');
    }
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      // localeCompare with numeric handles the NNNN suffix in codes correctly, so
      // STU-2026-0009 sorts before STU-2026-0010 rather than after it.
      const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  async function review(id: string, action: 'ACCEPT' | 'REJECT') {
    let reason = '';
    if (action === 'REJECT') {
      const answer = prompt('Reason for rejecting (optional):');
      if (answer === null) return;
      reason = answer;
    } else if (!confirm('Accept this enquiry? This creates a live tenant with users and roles.')) {
      return;
    }

    setBusyId(id);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || `Could not ${action.toLowerCase()} the enquiry`);
        await load(); // a 409 means our view was stale
        return;
      }

      if (action === 'ACCEPT') {
        const c = json.counts;
        setResult({
          msg: `Tenant "${json.slug}" created — ${c.users} users, ${c.roles} roles, ${c.roleGrants} capability grants, ${c.features} features.`,
          portalUrl: json.portalUrl,
        });
      } else {
        setResult({ msg: 'Enquiry rejected.' });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav active="enquiries" email={email} />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeading eyebrow="Pipeline" title="Enquiries">
          <button
            onClick={load}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            ↻ Refresh
          </button>
        </PageHeading>

        {/* filters */}
        <div className="mb-5 flex flex-wrap gap-2">
          {(['NEW', 'ACCEPTED', 'REJECTED', 'ALL'] as Filter[]).map((f) => {
            const n =
              !counts ? null
              : f === 'ALL' ? counts.total
              : f === 'NEW' ? counts.new
              : f === 'ACCEPTED' ? counts.accepted
              : counts.rejected;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  filter === f
                    ? 'bg-slate-900 font-medium text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                {n !== null && <span className="ml-2 opacity-70">{n}</span>}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{error}</span>
            <button onClick={() => setError('')} className="shrink-0 font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        {result && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            <span>
              {result.msg}
              {result.portalUrl && (
                <>
                  {' '}
                  <a href={result.portalUrl} className="font-medium underline">
                    Open portal →
                  </a>
                </>
              )}
            </span>
            <button onClick={() => setResult(null)} className="shrink-0 font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        {/* current sort, stated plainly */}
        <p className="mb-2 text-xs text-slate-500">
          Sorted by <strong className="text-slate-700">{COLUMNS.find((c) => c.key === sortKey)?.label}</strong>
          {' · '}
          {sortDir === 'asc' ? 'ascending' : 'descending'}
          {' — click any column heading to change it'}
        </p>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">
              {filter === 'NEW' ? 'No enquiries waiting for review.' : `No ${filter.toLowerCase()} enquiries.`}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              They arrive from the template cards on the{' '}
              <a href="/" className="underline">
                landing page
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left">
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    {COLUMNS.map((c) => {
                      const active = c.key === sortKey;
                      return (
                        <th key={c.key} className="px-5 py-3 font-medium">
                          <button
                            onClick={() => toggleSort(c.key)}
                            className={`group inline-flex items-center gap-1 uppercase tracking-wider transition ${
                              active ? 'text-slate-900' : 'hover:text-slate-700'
                            }`}
                            title={`Sort by ${c.label}`}
                          >
                            {c.label}
                            <span className={active ? 'text-slate-900' : 'text-slate-300 group-hover:text-slate-400'}>
                              {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </button>
                        </th>
                      );
                    })}
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((e) => (
                    <Fragment key={e.id}>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                            className="font-mono text-xs text-slate-900 underline"
                            title="Show details"
                          >
                            {e.code || e.id.slice(0, 12)}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-900">{e.orgName}</div>
                          <div className="text-xs text-slate-500">{e.contactName}</div>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{e.templateId}</td>
                        <td className="px-5 py-3 text-slate-500">
                          {e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-CA') : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <StatusPill status={e.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          {e.status === 'NEW' ? (
                            <>
                              <button
                                onClick={() => review(e.id, 'ACCEPT')}
                                disabled={busyId === e.id}
                                className="mr-2 rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                              >
                                {busyId === e.id ? 'Provisioning…' : 'Accept'}
                              </button>
                              <button
                                onClick={() => review(e.id, 'REJECT')}
                                disabled={busyId === e.id}
                                className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {e.reviewedAt ? new Date(e.reviewedAt).toLocaleDateString('en-CA') : '—'}
                            </span>
                          )}
                        </td>
                      </tr>

                      {expanded === e.id && (
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <td colSpan={6} className="px-5 py-4">
                            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                              <div>
                                <dt className="text-xs uppercase tracking-wider text-slate-500">Contact</dt>
                                <dd className="text-slate-800">
                                  {e.contactName}
                                  <br />
                                  {e.contactEmail}
                                  {e.contactPhone && (
                                    <>
                                      <br />
                                      {e.contactPhone}
                                    </>
                                  )}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wider text-slate-500">Pack</dt>
                                <dd className="text-slate-800">{e.pack}</dd>
                                {e.tenantId && (
                                  <>
                                    <dt className="mt-2 text-xs uppercase tracking-wider text-slate-500">Tenant</dt>
                                    <dd className="font-mono text-xs text-slate-800">{e.tenantId}</dd>
                                  </>
                                )}
                                {e.reviewedBy && (
                                  <>
                                    <dt className="mt-2 text-xs uppercase tracking-wider text-slate-500">Reviewed by</dt>
                                    <dd className="text-slate-800">{e.reviewedBy}</dd>
                                  </>
                                )}
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wider text-slate-500">Message</dt>
                                <dd className="text-slate-800">{e.message || <span className="text-slate-400">—</span>}</dd>
                                {e.rejectionReason && (
                                  <>
                                    <dt className="mt-2 text-xs uppercase tracking-wider text-slate-500">Rejection reason</dt>
                                    <dd className="text-red-700">{e.rejectionReason}</dd>
                                  </>
                                )}
                              </div>
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
