'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PersonModal, type PersonDraft } from './PersonModal';

interface Person {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  roleId: string;
  roleTitle: string;
  roleColor: string;
  reportsToUserId: string;
  orgUnitId: string;
}

interface PortalData {
  tenant: { id: string; slug: string };
  me: { id: string; name: string; email: string; capabilities: string[] };
  people: Person[];
  roles: { id: string; key: string; title: string; color: string; rank: number }[];
  orgUnits: { id: string; name: string; code: string; headUserId: string }[];
  features: { featureId: string; name: string; enabled: boolean }[];
  branding: Record<string, string>;
  attendance: { id: string; userId: string; date: string; status: string; checkIn: string; checkOut: string }[];
}

type Tab = 'dashboard' | 'people' | 'roles' | 'hierarchy' | 'attendance';

const TABS: { id: Tab; label: string; icon: string; needs?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'people', label: 'People', icon: '👥', needs: 'people.user.read' },
  { id: 'roles', label: 'Roles & Powers', icon: '🔐' },
  { id: 'hierarchy', label: 'Hierarchy', icon: '🌳' },
  { id: 'attendance', label: 'Attendance', icon: '✅' },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function TenantPortal({ params }: { params: Promise<{ tenant: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ tenant }) => setSlug(tenant));
  }, [params]);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/portal/${slug}`, { credentials: 'include' });
      if (res.status === 401) {
        router.push(`/portal/${slug}/login`);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not load your organisation.');
        return;
      }
      setData(json);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function signOut() {
    await fetch('/api/tenant-auth/session', { method: 'POST', credentials: 'include' }).catch(() => {});
    router.push(`/portal/${slug}/login`);
  }

  if (loading || !slug) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="font-semibold text-red-900">Could not open this portal</h1>
          <p className="mt-2 text-sm text-red-800">{error}</p>
          <a href={`/portal/${slug}/login`} className="mt-4 inline-block text-sm text-red-900 underline">
            Sign in again
          </a>
        </div>
      </div>
    );
  }

  const can = (c: string) => data.me.capabilities.includes(c);
  const accent = data.branding.primaryColor || '#2563eb';
  // Hide a tab entirely when the capability behind it is missing, rather than showing it
  // and failing on click.
  const visibleTabs = TABS.filter((t) => !t.needs || can(t.needs));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
          <span className="font-serif text-lg text-slate-900">{slug}</span>

          <nav className="flex flex-wrap gap-1">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  tab === t.id ? 'font-medium text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                style={tab === t.id ? { background: accent } : undefined}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{data.me.name}</span>
            <button
              onClick={signOut}
              className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {tab === 'dashboard' && <Dashboard data={data} accent={accent} onGo={setTab} />}
        {tab === 'people' && <People data={data} accent={accent} slug={slug} onSaved={load} />}
        {tab === 'roles' && <Roles data={data} accent={accent} />}
        {tab === 'hierarchy' && <Hierarchy data={data} />}
        {tab === 'attendance' && <Attendance data={data} accent={accent} slug={slug} onSaved={load} />}
      </div>
    </div>
  );
}

function Heading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
        <h1 className="mt-1 font-serif text-3xl text-slate-900">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-3 font-serif text-4xl" style={{ color: accent || '#0f172a' }}>
        {value}
      </p>
    </div>
  );
}

// ── dashboard ──

function Dashboard({ data, accent, onGo }: { data: PortalData; accent: string; onGo: (t: Tab) => void }) {
  const today = todayIso();
  const todays = data.attendance.filter((a) => a.date === today);

  return (
    <>
      <Heading eyebrow="Overview" title="Dashboard" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="People" value={data.people.length} accent={accent} />
        <Tile label="Active" value={data.people.filter((p) => p.status === 'ACTIVE').length} accent={accent} />
        <Tile label="Roles" value={data.roles.length} accent={accent} />
        <Tile label="Marked today" value={`${todays.length} / ${data.people.length}`} accent={accent} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl text-slate-900">People per role</h2>
            <button onClick={() => onGo('roles')} className="text-sm underline" style={{ color: accent }}>
              Roles
            </button>
          </div>
          <div className="space-y-2">
            {data.roles.map((r) => {
              const n = data.people.filter((p) => p.roleId === r.id).length;
              return (
                <div key={r.id} className="flex items-center gap-3 text-sm">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.color}`} />
                  <span className="w-40 shrink-0 truncate text-slate-800">{r.title}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${data.people.length ? (n / data.people.length) * 100 : 0}%`, background: accent }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-slate-500">{n}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-serif text-xl text-slate-900">Enabled features</h2>
          <div className="flex flex-wrap gap-2">
            {data.features.filter((f) => f.enabled).length === 0 ? (
              <p className="text-sm text-slate-500">None enabled yet.</p>
            ) : (
              data.features
                .filter((f) => f.enabled)
                .map((f) => (
                  <span
                    key={f.featureId}
                    className="rounded-full px-3 py-1 text-xs font-medium text-white"
                    style={{ background: accent }}
                  >
                    {f.name}
                  </span>
                ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── people ──

const BLANK: PersonDraft = {
  name: '',
  code: '',
  email: '',
  phone: '',
  status: 'INVITED',
  roleId: '',
  reportsToUserId: '',
};

function People({
  data,
  accent,
  slug,
  onSaved,
}: {
  data: PortalData;
  accent: string;
  slug: string;
  onSaved: () => void;
}) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<PersonDraft | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<{ text: string; invite?: string } | null>(null);

  const nameOf = (id: string) => data.people.find((p) => p.id === id)?.name ?? '—';
  const has = (c: string) => data.me.capabilities.includes(c);

  const canCreate = has('people.user.create');
  const canWrite = has('people.user.write');
  const canArchive = has('people.user.archive');
  const canAssignRole = has('people.role.assign');

  const rows = data.people.filter((p) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.code.toLowerCase().includes(s) ||
      p.email.toLowerCase().includes(s)
    );
  });

  /** Returns an error message, or null on success. */
  async function save(draft: PersonDraft): Promise<string | null> {
    const isNew = !draft.id;
    try {
      const res = await fetch(`/api/portal/${slug}/people`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(isNew ? draft : { userId: draft.id, ...draft }),
      });
      const json = await res.json();
      if (!res.ok) return json.error || 'Could not save.';

      setEditing(null);
      setCreating(false);
      setNotice({
        text: isNew ? `${draft.name} added.` : `${draft.name} updated.`,
        invite: json.inviteUrl || undefined,
      });
      onSaved();
      return null;
    } catch {
      return 'Could not reach the server.';
    }
  }

  async function archive(id: string, name: string) {
    if (!confirm(`Archive ${name}? They keep their history but can no longer sign in.`)) return;
    try {
      const res = await fetch(`/api/portal/${slug}/people?userId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ text: json.error || 'Could not archive.' });
        return;
      }
      setNotice({
        text: `${name} archived.${json.reparented ? ` ${json.reparented} report(s) moved up.` : ''}`,
      });
      onSaved();
    } catch {
      setNotice({ text: 'Could not reach the server.' });
    }
  }

  return (
    <>
      <Heading eyebrow="Directory" title="People">
        {canCreate && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-full px-4 py-2 text-sm font-medium text-white"
            style={{ background: accent }}
          >
            + Add person
          </button>
        )}
      </Heading>

      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <span>
            {notice.text}
            {notice.invite && (
              <>
                <br />
                <span className="text-xs">Invite link (pass this on): </span>
                <code className="break-all text-xs">{notice.invite}</code>
              </>
            )}
          </span>
          <button onClick={() => setNotice(null)} className="shrink-0 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {!canCreate && !canWrite && (
        <p className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          You have read-only access to the directory.
        </p>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, code or email…"
        className="mb-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Reports to</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {(canWrite || canArchive) && <th className="px-5 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-900">{p.code || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="text-slate-900">
                      {p.name} {p.id === data.me.id && <span className="text-xs text-slate-400">(you)</span>}
                    </div>
                    <div className="text-xs text-slate-500">{p.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <span className={`h-2 w-2 rounded-full ${p.roleColor}`} />
                      {p.roleTitle || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {p.reportsToUserId ? nameOf(p.reportsToUserId) : '— (top)'}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === 'ACTIVE' ? 'bg-green-100 text-green-800'
                        : p.status === 'INVITED' ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  {(canWrite || canArchive) && (
                    <td className="whitespace-nowrap px-5 py-3">
                      {canWrite && (
                        <button
                          onClick={() =>
                            setEditing({
                              id: p.id,
                              name: p.name,
                              code: p.code,
                              email: p.email,
                              phone: p.phone,
                              status: p.status,
                              roleId: p.roleId,
                              reportsToUserId: p.reportsToUserId,
                            })
                          }
                          className="mr-3 text-xs underline"
                          style={{ color: accent }}
                        >
                          Edit
                        </button>
                      )}
                      {canArchive && p.id !== data.me.id && p.status !== 'SUSPENDED' && (
                        <button onClick={() => archive(p.id, p.name)} className="text-xs text-red-600 underline">
                          Archive
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        <strong>Code</strong> identifies a person; it grants nothing. Power comes from the role.
      </p>

      {(creating || editing) && (
        <PersonModal
          initial={editing ?? BLANK}
          isNew={creating}
          accent={accent}
          canAssignRole={canAssignRole}
          roles={data.roles.map((r) => ({ id: r.id, label: r.title }))}
          people={data.people.map((pp) => ({ id: pp.id, label: pp.name }))}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={save}
        />
      )}
    </>
  );
}

// ── roles ──

function Roles({ data, accent }: { data: PortalData; accent: string }) {
  return (
    <>
      <Heading eyebrow="Access" title="Roles & Powers" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.roles
          .slice()
          .sort((a, b) => b.rank - a.rank)
          .map((r) => {
            const holders = data.people.filter((p) => p.roleId === r.id);
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${r.color}`} />
                  <h3 className="font-semibold text-slate-900">{r.title}</h3>
                </div>
                <p className="font-mono text-xs text-slate-400">{r.key}</p>
                <p className="mt-3 text-sm text-slate-600">
                  {holders.length} {holders.length === 1 ? 'person' : 'people'}
                </p>
                {holders.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {holders.slice(0, 3).map((h) => h.name).join(', ')}
                    {holders.length > 3 && ` +${holders.length - 3} more`}
                  </p>
                )}
              </div>
            );
          })}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Your own powers: {data.me.capabilities.length} capabilities.
      </p>
    </>
  );
}

// ── hierarchy ──

function Hierarchy({ data }: { data: PortalData }) {
  const roots = data.people.filter(
    (p) => !p.reportsToUserId || !data.people.some((o) => o.id === p.reportsToUserId)
  );

  function Node({ p, depth }: { p: Person; depth: number }) {
    const kids = data.people.filter((k) => k.reportsToUserId === p.id);
    return (
      <div>
        <div className="flex items-center gap-3 py-2" style={{ paddingLeft: depth * 24 }}>
          {depth > 0 && <span className="text-slate-300">└</span>}
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.roleColor}`} />
          <span className="font-medium text-slate-900">{p.name}</span>
          <span className="text-xs text-slate-500">{p.roleTitle}</span>
          {kids.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {kids.length} {kids.length === 1 ? 'report' : 'reports'}
            </span>
          )}
        </div>
        {kids.map((k) => (
          <Node key={k.id} p={k} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <>
      <Heading eyebrow="Structure" title="Hierarchy" />
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {roots.length === 0 ? (
          <p className="text-sm text-slate-500">No people yet.</p>
        ) : (
          roots.map((r) => <Node key={r.id} p={r} depth={0} />)
        )}
      </div>
    </>
  );
}

// ── attendance ──

const STATUSES: { s: string; label: string; on: string }[] = [
  { s: 'PRESENT', label: 'Present', on: 'border-green-300 bg-green-100 text-green-800' },
  { s: 'LATE', label: 'Late', on: 'border-amber-300 bg-amber-100 text-amber-800' },
  { s: 'HALF_DAY', label: 'Half day', on: 'border-orange-300 bg-orange-100 text-orange-800' },
  { s: 'LEAVE', label: 'Leave', on: 'border-blue-300 bg-blue-100 text-blue-800' },
  { s: 'ABSENT', label: 'Absent', on: 'border-red-300 bg-red-100 text-red-800' },
];

function Attendance({
  data,
  accent,
  slug,
  onSaved,
}: {
  data: PortalData;
  accent: string;
  slug: string;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const byUser = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of data.attendance) if (a.date === date) m.set(a.userId, a.status);
    return m;
  }, [data.attendance, date]);

  const canMarkOthers = data.me.capabilities.includes('attendance.other.mark');
  const canAmend = data.me.capabilities.includes('attendance.other.amend');

  async function mark(userId: string, status: string) {
    setBusy(userId);
    setError('');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId: data.tenant.id,
          userId,
          date,
          status,
          actorId: data.me.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not save.');
        return;
      }
      onSaved();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Heading eyebrow="Daily" title="Attendance">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </Heading>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {!canMarkOthers && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Your role lets you mark only your own attendance.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Person</th>
              <th className="px-5 py-3 font-medium">Mark</th>
            </tr>
          </thead>
          <tbody>
            {data.people.map((p) => {
              const current = byUser.get(p.id);
              const isSelf = p.id === data.me.id;
              // Marking someone else needs the capability; amending an existing record
              // needs the amend capability. Mirrors what the API enforces.
              const allowed = isSelf || (current ? canAmend : canMarkOthers);
              return (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3">
                    <div className="text-slate-900">
                      {p.name} {isSelf && <span className="text-xs text-slate-400">(you)</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {p.code} · {p.roleTitle}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {STATUSES.map((o) => (
                        <button
                          key={o.s}
                          onClick={() => mark(p.id, o.s)}
                          disabled={!allowed || busy === p.id}
                          title={allowed ? undefined : 'Your role does not allow this'}
                          className={`rounded border px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            current === o.s ? o.on : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
