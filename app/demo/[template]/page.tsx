'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDemoStore } from '@/lib/demo/useDemoStore';
import {
  CAPABILITY_CATALOGUE,
  CAPABILITY_MODULES,
  attendanceByUser,
  attendanceSummary,
  capabilityLabel,
  exportJson,
  reportsOf,
  usersInRole,
  type AttendanceStatus,
  type DemoRole,
  type DemoSnapshot,
  type DemoUser,
} from '@/lib/demo/demoStore';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'profile', label: 'My Profile', icon: '👤' },
  { id: 'people', label: 'People', icon: '👥' },
  { id: 'roles', label: 'Roles & Powers', icon: '🔐' },
  { id: 'hierarchy', label: 'Hierarchy', icon: '🌳' },
  { id: 'departments', label: 'Departments', icon: '🏢' },
  { id: 'attendance', label: 'Attendance', icon: '✅' },
  { id: 'features', label: 'Features', icon: '🧩' },
  { id: 'settings', label: 'Branding', icon: '⚙️' },
] as const;

type PageId = (typeof NAV)[number]['id'];
type Store = ReturnType<typeof useDemoStore>;

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function TemplateDemoPage({ params }: { params: Promise<{ template: string }> }) {
  // `params` is a Promise in Next 15. The previous version destructured it synchronously on
  // the save path, so templateId was `undefined` and every edit was written to
  // "demo-undefined" — a key nothing ever read back, so changes vanished on reload.
  // Resolve it once into state and use that everywhere.
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [page, setPage] = useState<PageId>('dashboard');

  useEffect(() => {
    let active = true;
    params.then(({ template }) => {
      if (active) setTemplateId(template);
    });
    return () => {
      active = false;
    };
  }, [params]);

  const store = useDemoStore(templateId);
  const { snapshot } = store;

  if (store.error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-900">Could not load this template</h2>
          <p className="mt-2 text-sm text-red-800">{store.error}</p>
          <a href="/demo" className="mt-4 inline-block text-sm text-red-900 underline">
            Back to all templates
          </a>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  const accent = snapshot.branding.primaryColor;
  const current = NAV.find((n) => n.id === page);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto bg-slate-900 p-4 text-white">
        <div className="mb-8">
          {snapshot.branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={snapshot.branding.logoUrl}
              alt=""
              className="mb-2 h-10"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg text-xl font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {snapshot.profile.icon}
            </div>
          )}
          <h1 className="text-xl font-bold">{snapshot.profile.orgName}</h1>
          <p className="text-sm text-slate-400">Editable demo</p>
        </div>

        <nav className="mb-8 space-y-1">
          {NAV.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex w-full items-center gap-3 rounded px-4 py-2 text-left text-sm transition ${
                  active ? 'text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
                style={active ? { backgroundColor: accent } : undefined}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-slate-700 pt-4">
          <p className="px-1 text-xs leading-relaxed text-slate-400">
            Saved in this browser only. Nothing is uploaded.
          </p>
          <a href="/" className="block rounded bg-slate-800 px-4 py-2 text-center text-sm transition hover:bg-slate-700">
            🏠 Back to Home
          </a>
          <a href="/demo" className="block rounded bg-slate-800 px-4 py-2 text-center text-sm transition hover:bg-slate-700">
            ← Back to Gallery
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">{current?.label}</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {snapshot.users[0]?.name ?? 'Demo user'}
                {snapshot.roles.find((r) => r.id === snapshot.users[0]?.roleId) &&
                  ` · ${snapshot.roles.find((r) => r.id === snapshot.users[0]?.roleId)!.name}`}
              </span>
              <span className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Sandbox
              </span>
            </div>
          </div>
        </header>

        <div className="p-6">
          {page === 'dashboard' && <DashboardPage snapshot={snapshot} onGo={setPage} />}
          {page === 'profile' && <ProfilePage snapshot={snapshot} store={store} />}
          {page === 'people' && <PeoplePage snapshot={snapshot} store={store} />}
          {page === 'roles' && <RolesPage snapshot={snapshot} store={store} />}
          {page === 'hierarchy' && <HierarchyPage snapshot={snapshot} store={store} />}
          {page === 'departments' && <DepartmentsPage snapshot={snapshot} store={store} />}
          {page === 'attendance' && <AttendancePage snapshot={snapshot} store={store} />}
          {page === 'features' && <FeaturesPage snapshot={snapshot} store={store} />}
          {page === 'settings' && <SettingsPage snapshot={snapshot} store={store} />}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────── shared ───────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-6 ${className}`}>{children}</div>;
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-900">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Btn({
  children,
  onClick,
  variant = 'primary',
  accent,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  accent?: string;
  disabled?: boolean;
}) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50';
  if (variant === 'primary') {
    return (
      <button onClick={onClick} disabled={disabled} className={`${base} text-white hover:opacity-90`} style={{ backgroundColor: accent || '#2563eb' }}>
        {children}
      </button>
    );
  }
  if (variant === 'danger') {
    return (
      <button onClick={onClick} disabled={disabled} className={`${base} bg-red-50 text-red-700 hover:bg-red-100`}>
        {children}
      </button>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
      {children}
    </button>
  );
}

function Notice({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span>{msg}</span>
      <button onClick={onClose} className="shrink-0 font-medium underline">
        Dismiss
      </button>
    </div>
  );
}

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────── dashboard ───────────────────────────

function DashboardPage({ snapshot, onGo }: { snapshot: DemoSnapshot; onGo: (p: PageId) => void }) {
  const accent = snapshot.branding.primaryColor;
  const date = todayIso();
  const att = attendanceSummary(snapshot, date);

  // Counts are computed from the live sandbox, not the template's hardcoded `stats` block,
  // so they move the moment you add or remove someone.
  const cards: { label: string; value: number; icon: string; go: PageId }[] = [
    { label: 'People', value: snapshot.users.length, icon: '👥', go: 'people' },
    { label: 'Active', value: snapshot.users.filter((u) => u.status === 'ACTIVE').length, icon: '✅', go: 'people' },
    { label: 'Roles', value: snapshot.roles.length, icon: '🔐', go: 'roles' },
    { label: 'Departments', value: snapshot.orgUnits.length, icon: '🏢', go: 'departments' },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <span className="text-4xl">{snapshot.profile.icon}</span>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{snapshot.profile.templateName}</h1>
          <p className="text-slate-600">
            {snapshot.profile.orgName} · {snapshot.profile.pack}
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        {cards.map((c) => (
          <button key={c.label} onClick={() => onGo(c.go)} className="rounded-lg border border-slate-200 bg-white p-6 text-left transition hover:border-slate-300 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-2 text-sm text-slate-600">{c.label}</p>
                <p className="text-3xl font-bold" style={{ color: accent }}>
                  {c.value}
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-50 text-3xl">{c.icon}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">✅ Attendance today</h2>
            <button onClick={() => onGo('attendance')} className="text-sm underline" style={{ color: accent }}>
              Mark
            </button>
          </div>
          {att.marked === 0 ? (
            <p className="text-sm text-slate-500">Nobody marked yet for {date}.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <Bar label="Present" n={att.present} total={att.total} color="#16a34a" />
              <Bar label="Late" n={att.late} total={att.total} color="#f59e0b" />
              <Bar label="Half day" n={att.halfDay} total={att.total} color="#ea580c" />
              <Bar label="Leave" n={att.leave} total={att.total} color="#3b82f6" />
              <Bar label="Absent" n={att.absent} total={att.total} color="#dc2626" />
              <p className="pt-1 text-xs text-slate-500">
                {att.marked} of {att.total} marked
              </p>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">🧩 Enabled features</h2>
            <button onClick={() => onGo('features')} className="text-sm underline" style={{ color: accent }}>
              Manage
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {snapshot.features.filter((f) => f.enabled).length === 0 ? (
              <p className="text-sm text-slate-500">Everything is switched off.</p>
            ) : (
              snapshot.features
                .filter((f) => f.enabled)
                .map((f) => (
                  <span key={f.id} className="rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: accent }}>
                    {f.name}
                  </span>
                ))
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-slate-900">👥 People per role</h2>
          <div className="space-y-2">
            {snapshot.roles.map((r) => {
              const n = usersInRole(snapshot, r.id).length;
              return (
                <div key={r.id} className="flex items-center gap-3 text-sm">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${r.color}`} />
                  <span className="w-44 shrink-0 truncate text-slate-800">{r.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${snapshot.users.length ? (n / snapshot.users.length) * 100 : 0}%`, backgroundColor: accent }} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-slate-500">
                    {n} {n === 1 ? 'person' : 'people'}
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs text-slate-400">{r.capabilities.length} powers</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Bar({ label, n, total, color }: { label: string; n: number; total: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-slate-700">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${total ? (n / total) * 100 : 0}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 shrink-0 text-right text-slate-600">{n}</span>
    </div>
  );
}

// ─────────────────────────── my profile ───────────────────────────

function ProfilePage({ snapshot, store }: { snapshot: DemoSnapshot; store: Store }) {
  const accent = snapshot.branding.primaryColor;
  // Whoever sits at the top of the tree acts as "you" in the sandbox.
  const me = snapshot.users.find((u) => !u.reportsToUserId) ?? snapshot.users[0];

  if (!me) {
    return <p className="text-slate-500">Add a person first.</p>;
  }

  const role = snapshot.roles.find((r) => r.id === me.roleId);
  const unit = snapshot.orgUnits.find((o) => o.id === me.orgUnitId);
  const powers = role?.capabilities ?? [];

  return (
    <div className="max-w-3xl">
      <Card>
        <div className="mb-8 flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full text-3xl" style={{ backgroundColor: accent }}>
            👤
          </div>
          <div className="min-w-0 flex-1">
            <input
              value={me.name}
              onChange={(e) => store.updateUser(me.id, { name: e.target.value })}
              className="w-full border-b border-transparent bg-transparent text-3xl font-bold text-slate-900 hover:border-slate-200 focus:border-slate-400 focus:outline-none"
            />
            <p className="text-slate-600">{role?.name ?? 'No role'}</p>
            <p className="mt-1 text-sm text-slate-500">ID: {me.code || '—'}</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Role">
            <select value={me.roleId} onChange={(e) => store.updateUser(me.id, { roleId: e.target.value })} className={inputCls}>
              {snapshot.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={me.status} onChange={(e) => store.updateUser(me.id, { status: e.target.value as DemoUser['status'] })} className={inputCls}>
              <option value="ACTIVE">Active</option>
              <option value="INVITED">Invited</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </Field>
          <Field label="Email">
            <input value={me.email} onChange={(e) => store.updateUser(me.id, { email: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Phone">
            <input value={me.phone} onChange={(e) => store.updateUser(me.id, { phone: e.target.value })} className={inputCls} />
          </Field>
          <div>
            <p className="mb-1 text-sm font-semibold text-slate-900">Organisation</p>
            <p className="font-medium text-slate-900">{snapshot.profile.orgName}</p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-slate-900">Department</p>
            <p className="font-medium text-slate-900">{unit?.name ?? '—'}</p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8">
          <h2 className="mb-1 text-lg font-bold text-slate-900">📋 What this role can do</h2>
          <p className="mb-4 text-sm text-slate-600">
            {powers.length} of {CAPABILITY_CATALOGUE.length} capabilities, granted via{' '}
            <strong>{role?.name}</strong>. Change them under Roles &amp; Powers.
          </p>
          {powers.length === 0 ? (
            <p className="text-sm text-slate-500">This role has no powers granted.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {powers.map((p) => (
                <div key={p} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                  <span className="text-sm text-slate-700">{capabilityLabel(p)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────── people ───────────────────────────

const BLANK_USER: Omit<DemoUser, 'id'> = {
  name: '',
  code: '',
  roleId: '',
  email: '',
  phone: '',
  status: 'ACTIVE',
  reportsToUserId: '',
  orgUnitId: '',
};

function PeoplePage({ snapshot, store }: { snapshot: DemoSnapshot; store: Store }) {
  const [editing, setEditing] = useState<DemoUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const accent = snapshot.branding.primaryColor;

  const visible = snapshot.users.filter((u) => {
    if (roleFilter && u.roleId !== roleFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const nameOf = (id: string) => snapshot.users.find((u) => u.id === id)?.name ?? '—';

  return (
    <div>
      <PageTitle
        title="People"
        subtitle={`${snapshot.users.length} in this sandbox`}
        action={
          <Btn accent={accent} onClick={() => setCreating(true)}>
            + Add person
          </Btn>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, code or email…" className={`${inputCls} max-w-xs`} />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={`${inputCls} max-w-xs`}>
          <option value="">All roles</option>
          {snapshot.roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Reports to</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Nobody matches that filter.
                  </td>
                </tr>
              )}
              {visible.map((u) => {
                const role = snapshot.roles.find((r) => r.id === u.roleId);
                return (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">{u.code || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{u.name}</div>
                      {u.email && <div className="text-xs text-slate-500">{u.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        {role && <span className={`h-2 w-2 rounded-full ${role.color}`} />}
                        {role?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.reportsToUserId ? nameOf(u.reportsToUserId) : '— (top)'}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={u.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button onClick={() => setEditing(u)} className="mr-3 underline" style={{ color: accent }}>
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${u.name}? Their attendance history goes too.`)) store.deleteUser(u.id);
                        }}
                        className="text-red-600 underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        <strong>Code</strong> is only an identifier (employee or roll number) — it grants no
        permissions. Two people can share a role and have different codes. Power comes from the
        role, editable under <em>Roles &amp; Powers</em>.
      </p>

      {(editing || creating) && (
        <UserModal
          snapshot={snapshot}
          initial={editing ?? BLANK_USER}
          isNew={creating}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={(data) => {
            if (creating) store.addUser(data);
            else if (editing) store.updateUser(editing.id, data);
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: DemoUser['status'] }) {
  const map: Record<DemoUser['status'], string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INVITED: 'bg-amber-100 text-amber-800',
    SUSPENDED: 'bg-red-100 text-red-800',
  };
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${map[status]}`}>{status}</span>;
}

function UserModal({
  snapshot,
  initial,
  isNew,
  onSave,
  onCancel,
}: {
  snapshot: DemoSnapshot;
  initial: Omit<DemoUser, 'id'> | DemoUser;
  isNew: boolean;
  onSave: (u: Omit<DemoUser, 'id'>) => void;
  onCancel: () => void;
}) {
  const editingId = 'id' in initial ? initial.id : null;
  const [form, setForm] = useState<Omit<DemoUser, 'id'>>({
    name: initial.name,
    code: initial.code,
    roleId: initial.roleId || snapshot.roles[0]?.id || '',
    email: initial.email,
    phone: initial.phone,
    status: initial.status,
    reportsToUserId: initial.reportsToUserId,
    orgUnitId: initial.orgUnitId || snapshot.orgUnits[0]?.id || '',
  });
  const [err, setErr] = useState('');
  const accent = snapshot.branding.primaryColor;

  function submit() {
    if (!form.name.trim()) return setErr('A name is required.');
    const code = form.code.trim();
    if (code) {
      const dupe = snapshot.users.find((u) => u.code.toLowerCase() === code.toLowerCase() && u.id !== editingId);
      if (dupe) return setErr(`Code "${code}" already belongs to ${dupe.name}. Codes must be unique.`);
    }
    onSave({ ...form, name: form.name.trim(), code });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-slate-900">{isNew ? 'Add person' : `Edit ${initial.name}`}</h2>
        {err && <Notice msg={err} onClose={() => setErr('')} />}

        <div className="space-y-4">
          <Field label="Full name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} autoFocus />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Code" hint="Employee / roll number">
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} placeholder="EMP001" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DemoUser['status'] })} className={inputCls}>
                <option value="ACTIVE">Active</option>
                <option value="INVITED">Invited</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </Field>
          </div>

          <Field label="Role" hint="Determines what this person can do">
            <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className={inputCls}>
              {snapshot.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.capabilities.length} powers
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
            </Field>
          </div>

          <Field label="Department">
            <select value={form.orgUnitId} onChange={(e) => setForm({ ...form, orgUnitId: e.target.value })} className={inputCls}>
              {snapshot.orgUnits.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reports to">
            <select value={form.reportsToUserId} onChange={(e) => setForm({ ...form, reportsToUserId: e.target.value })} className={inputCls}>
              <option value="">— nobody (top of tree)</option>
              {snapshot.users
                .filter((u) => u.id !== editingId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Btn variant="ghost" onClick={onCancel}>
            Cancel
          </Btn>
          <Btn accent={accent} onClick={submit}>
            {isNew ? 'Add person' : 'Save changes'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── roles & powers ───────────────────────────

const ROLE_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500', 'bg-teal-500', 'bg-pink-500', 'bg-slate-500'];

function RolesPage({ snapshot, store }: { snapshot: DemoSnapshot; store: Store }) {
  const [selectedId, setSelectedId] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const accent = snapshot.branding.primaryColor;

  const selected = snapshot.roles.find((r) => r.id === selectedId) ?? snapshot.roles[0];

  return (
    <div>
      <PageTitle
        title="Roles & Powers"
        subtitle="Tick a capability to grant it. Counts below are real — they come from what you tick."
        action={
          <Btn accent={accent} onClick={() => setCreating(true)}>
            + Add role
          </Btn>
        }
      />

      {notice && <Notice msg={notice} onClose={() => setNotice('')} />}

      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <div className="space-y-2">
          {snapshot.roles.map((r) => {
            const holders = usersInRole(snapshot, r.id).length;
            const active = r.id === selected?.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${active ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${r.color}`} />
                  <span className="truncate font-semibold text-slate-900">{r.name}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {r.capabilities.length} powers · {holders} {holders === 1 ? 'person' : 'people'}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(r.capabilities.length / CAPABILITY_CATALOGUE.length) * 100}%`, backgroundColor: accent }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <Card>
            <div className="mb-5 space-y-3">
              <Field label="Role name">
                <input value={selected.name} onChange={(e) => store.updateRole(selected.id, { name: e.target.value })} className={inputCls} />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Code" hint="Short key, e.g. HOD">
                  <input value={selected.code} onChange={(e) => store.updateRole(selected.id, { code: e.target.value.toUpperCase() })} className={inputCls} />
                </Field>
                <Field label="Description">
                  <input value={selected.description} onChange={(e) => store.updateRole(selected.id, { description: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <Field label="Colour">
                <div className="flex flex-wrap gap-2">
                  {ROLE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => store.updateRole(selected.id, { color: c })}
                      className={`h-8 w-8 rounded-full ${c} ${selected.color === c ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
                      aria-label={c}
                    />
                  ))}
                </div>
              </Field>
            </div>

            <div className="mb-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <h3 className="font-bold text-slate-900">
                Powers{' '}
                <span className="font-normal text-slate-500">
                  ({selected.capabilities.length} of {CAPABILITY_CATALOGUE.length})
                </span>
              </h3>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => store.setRoleCapabilities(selected.id, CAPABILITY_CATALOGUE.map((c) => c.id))}>
                  Grant all
                </Btn>
                <Btn variant="ghost" onClick={() => store.setRoleCapabilities(selected.id, [])}>
                  Clear
                </Btn>
              </div>
            </div>

            <div className="space-y-5">
              {CAPABILITY_MODULES.map((mod) => {
                const caps = CAPABILITY_CATALOGUE.filter((c) => c.module === mod);
                const onCount = caps.filter((c) => selected.capabilities.includes(c.id)).length;
                return (
                  <div key={mod}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{mod}</span>
                      <span className="text-xs text-slate-400">
                        {onCount}/{caps.length}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {caps.map((cap) => {
                        const on = selected.capabilities.includes(cap.id);
                        return (
                          <label
                            key={cap.id}
                            className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm transition ${
                              on ? 'border-slate-300 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input type="checkbox" checked={on} onChange={() => store.toggleCapability(selected.id, cap.id)} className="mt-0.5" />
                            <span className="min-w-0">
                              <span className="text-slate-900">{cap.label}</span>
                              {cap.sensitive && <span className="ml-1 rounded bg-amber-100 px-1 text-xs font-medium text-amber-800">sensitive</span>}
                              <span className="block truncate font-mono text-xs text-slate-400">{cap.id}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <Btn
                variant="danger"
                onClick={() => {
                  const res = store.deleteRole(selected.id);
                  if (!res.ok) setNotice(res.error!);
                  else setSelectedId('');
                }}
              >
                Delete this role
              </Btn>
              <p className="mt-2 text-xs text-slate-500">Blocked while anyone still holds it — reassign them first.</p>
            </div>
          </Card>
        )}
      </div>

      {creating && (
        <RoleModal
          accent={accent}
          onCancel={() => setCreating(false)}
          onSave={(r) => {
            store.addRole(r);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function RoleModal({ accent, onSave, onCancel }: { accent: string; onSave: (r: Omit<DemoRole, 'id'>) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Omit<DemoRole, 'id'>>({ name: '', code: '', color: ROLE_COLORS[0], description: '', capabilities: [] });
  const [err, setErr] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-lg bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Add role</h2>
        {err && <Notice msg={err} onClose={() => setErr('')} />}
        <div className="space-y-4">
          <Field label="Role name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} autoFocus />
          </Field>
          <Field label="Code" hint="Short key like HOD or MGR">
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={inputCls} />
          </Field>
          <Field label="Description">
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Colour">
            <div className="flex flex-wrap gap-2">
              {ROLE_COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-full ${c} ${form.color === c ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`} aria-label={c} />
              ))}
            </div>
          </Field>
          <p className="text-xs text-slate-500">Created with no powers. Grant them straight after.</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Btn variant="ghost" onClick={onCancel}>
            Cancel
          </Btn>
          <Btn
            accent={accent}
            onClick={() => {
              if (!form.name.trim()) return setErr('A role name is required.');
              onSave({ ...form, name: form.name.trim(), code: form.code.trim() });
            }}
          >
            Add role
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── hierarchy ───────────────────────────

function HierarchyPage({ snapshot, store }: { snapshot: DemoSnapshot; store: Store }) {
  const [notice, setNotice] = useState('');

  // Treat anyone with no manager — or a manager who no longer exists — as a root, so a
  // dangling reference can never hide people from the tree.
  const roots = snapshot.users.filter((u) => !u.reportsToUserId || !snapshot.users.some((o) => o.id === u.reportsToUserId));

  return (
    <div>
      <PageTitle title="Hierarchy" subtitle="Who reports to whom. Reassign with the dropdown on any row — loops are rejected." />
      {notice && <Notice msg={notice} onClose={() => setNotice('')} />}
      <Card>
        {roots.length === 0 ? (
          <p className="text-sm text-slate-500">No people yet.</p>
        ) : (
          <div>
            {roots.map((r) => (
              <TreeNode key={r.id} user={r} snapshot={snapshot} store={store} depth={0} onError={setNotice} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TreeNode({
  user,
  snapshot,
  store,
  depth,
  onError,
}: {
  user: DemoUser;
  snapshot: DemoSnapshot;
  store: Store;
  depth: number;
  onError: (m: string) => void;
}) {
  const kids = reportsOf(snapshot, user.id);
  const role = snapshot.roles.find((r) => r.id === user.roleId);

  return (
    <div>
      <div className="flex items-center gap-3 rounded-lg py-2 hover:bg-slate-50" style={{ paddingLeft: depth * 24 }}>
        {depth > 0 && <span className="text-slate-300">└</span>}
        {role && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${role.color}`} />}
        <span className="font-medium text-slate-900">{user.name}</span>
        <span className="text-xs text-slate-500">{role?.name}</span>
        {kids.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {kids.length} {kids.length === 1 ? 'report' : 'reports'}
          </span>
        )}
        <select
          value={user.reportsToUserId}
          onChange={(e) => {
            const res = store.setReportsTo(user.id, e.target.value);
            if (!res.ok) onError(res.error!);
          }}
          className="ml-auto rounded border border-slate-300 px-2 py-1 text-xs"
        >
          <option value="">— top of tree</option>
          {snapshot.users
            .filter((u) => u.id !== user.id)
            .map((u) => (
              <option key={u.id} value={u.id}>
                reports to {u.name}
              </option>
            ))}
        </select>
      </div>
      {kids.map((k) => (
        <TreeNode key={k.id} user={k} snapshot={snapshot} store={store} depth={depth + 1} onError={onError} />
      ))}
    </div>
  );
}

// ─────────────────────────── departments ───────────────────────────

function DepartmentsPage({ snapshot, store }: { snapshot: DemoSnapshot; store: Store }) {
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const accent = snapshot.branding.primaryColor;

  return (
    <div>
      <PageTitle title="Departments" subtitle="Teams, branches or units. Everyone belongs to one." />
      {notice && <Notice msg={notice} onClose={() => setNotice('')} />}

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <Field label="New department">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Science Faculty" />
            </Field>
          </div>
          <div className="w-32">
            <Field label="Code">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputCls} placeholder="SCI" />
            </Field>
          </div>
          <Btn
            accent={accent}
            onClick={() => {
              if (!name.trim()) return setNotice('Give the department a name.');
              store.addOrgUnit({ name: name.trim(), code: code.trim(), parentUnitId: snapshot.orgUnits[0]?.id ?? '', headUserId: '' });
              setName('');
              setCode('');
            }}
          >
            Add
          </Btn>
        </div>
      </Card>

      <div className="space-y-3">
        {snapshot.orgUnits.map((o) => {
          const members = snapshot.users.filter((u) => u.orgUnitId === o.id);
          return (
            <Card key={o.id}>
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem_1fr_auto] sm:items-end">
                <Field label="Name">
                  <input value={o.name} onChange={(e) => store.updateOrgUnit(o.id, { name: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Code">
                  <input value={o.code} onChange={(e) => store.updateOrgUnit(o.id, { code: e.target.value.toUpperCase() })} className={inputCls} />
                </Field>
                <Field label="Head">
                  <select value={o.headUserId} onChange={(e) => store.updateOrgUnit(o.id, { headUserId: e.target.value })} className={inputCls}>
                    <option value="">— none</option>
                    {snapshot.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Btn
                  variant="danger"
                  onClick={() => {
                    const res = store.deleteOrgUnit(o.id);
                    if (!res.ok) setNotice(res.error!);
                  }}
                >
                  Delete
                </Btn>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {members.length} {members.length === 1 ? 'person' : 'people'}
                {members.length > 0 && `: ${members.map((m) => m.name).join(', ')}`}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────── attendance ───────────────────────────

const ATT_OPTIONS: { status: AttendanceStatus; label: string; on: string }[] = [
  { status: 'PRESENT', label: 'Present', on: 'border-green-300 bg-green-100 text-green-800' },
  { status: 'LATE', label: 'Late', on: 'border-amber-300 bg-amber-100 text-amber-800' },
  { status: 'HALF_DAY', label: 'Half day', on: 'border-orange-300 bg-orange-100 text-orange-800' },
  { status: 'LEAVE', label: 'Leave', on: 'border-blue-300 bg-blue-100 text-blue-800' },
  { status: 'ABSENT', label: 'Absent', on: 'border-red-300 bg-red-100 text-red-800' },
];

function AttendancePage({ snapshot, store }: { snapshot: DemoSnapshot; store: Store }) {
  const [date, setDate] = useState(todayIso());
  const accent = snapshot.branding.primaryColor;

  const marked = useMemo(() => attendanceByUser(snapshot, date), [snapshot, date]);
  const summary = attendanceSummary(snapshot, date);

  return (
    <div>
      <PageTitle title="Attendance" subtitle="Click a status to mark. One record per person per day — clicking again overwrites it." />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-44">
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Btn accent={accent} onClick={() => store.markAllAttendance(date, 'PRESENT')}>
            Mark everyone present
          </Btn>
          <div className="ml-auto text-sm text-slate-600">
            <strong>{summary.marked}</strong> of {summary.total} marked
            {summary.marked > 0 && (
              <div className="mt-1 text-xs text-slate-500">
                {summary.present} present · {summary.late} late · {summary.halfDay} half · {summary.leave} leave · {summary.absent} absent
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Person</th>
                <th className="px-4 py-3 font-semibold">Mark</th>
                <th className="px-4 py-3 font-semibold">In / Out</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {snapshot.users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Add people first.
                  </td>
                </tr>
              )}
              {snapshot.users.map((u) => {
                const rec = marked.get(u.id);
                const role = snapshot.roles.find((r) => r.id === u.roleId);
                return (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500">
                        {u.code || '—'} · {role?.name ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ATT_OPTIONS.map((o) => {
                          const on = rec?.status === o.status;
                          return (
                            <button
                              key={o.status}
                              onClick={() => store.markAttendance(u.id, date, o.status)}
                              className={`rounded border px-2 py-1 text-xs font-medium transition ${on ? o.on : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={rec?.checkIn ?? ''}
                          onChange={(e) => store.markAttendance(u.id, date, rec?.status ?? 'PRESENT', { checkIn: e.target.value })}
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                        <span className="text-slate-400">–</span>
                        <input
                          type="time"
                          value={rec?.checkOut ?? ''}
                          onChange={(e) => store.markAttendance(u.id, date, rec?.status ?? 'PRESENT', { checkOut: e.target.value })}
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {rec && (
                        <button onClick={() => store.clearAttendance(u.id, date)} className="text-xs text-slate-500 underline">
                          Clear
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {snapshot.attendance.length} attendance {snapshot.attendance.length === 1 ? 'record' : 'records'} stored across all dates.
      </p>
    </div>
  );
}

// ─────────────────────────── features ───────────────────────────

function FeaturesPage({ snapshot, store }: { snapshot: DemoSnapshot; store: Store }) {
  const [name, setName] = useState('');
  const accent = snapshot.branding.primaryColor;

  return (
    <div>
      <PageTitle title="Features" subtitle="Switch modules on or off for this organisation." />

      <Card className="mb-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="Add a feature">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Library Management" />
            </Field>
          </div>
          <Btn
            accent={accent}
            onClick={() => {
              if (!name.trim()) return;
              store.addFeature(name.trim());
              setName('');
            }}
          >
            Add
          </Btn>
        </div>
      </Card>

      <div className="space-y-2">
        {snapshot.features.length === 0 && <p className="text-sm text-slate-500">No features defined.</p>}
        {snapshot.features.map((f) => (
          <div key={f.id} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
            <button
              onClick={() => store.toggleFeature(f.id)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${f.enabled ? '' : 'bg-slate-300'}`}
              style={f.enabled ? { backgroundColor: accent } : undefined}
              aria-label={`Toggle ${f.name}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${f.enabled ? 'left-[1.375rem]' : 'left-0.5'}`} />
            </button>
            <span className={`flex-1 font-medium ${f.enabled ? 'text-slate-900' : 'text-slate-400'}`}>{f.name}</span>
            <span className="text-xs text-slate-500">{f.enabled ? 'On' : 'Off'}</span>
            <button onClick={() => store.deleteFeature(f.id)} className="text-xs text-red-600 underline">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── branding / settings ───────────────────────────

function SettingsPage({ snapshot, store }: { snapshot: DemoSnapshot; store: Store }) {
  const [notice, setNotice] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const accent = snapshot.branding.primaryColor;

  function download() {
    const blob = new Blob([exportJson(snapshot)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.templateId}-sandbox.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl">
      <PageTitle title="Branding & data" subtitle="Identity, colours, and the sandbox itself." />
      {notice && <Notice msg={notice} onClose={() => setNotice('')} />}

      <div className="space-y-4">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Organisation</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name">
              <input value={snapshot.profile.orgName} onChange={(e) => store.updateProfile({ orgName: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Icon" hint="Any emoji">
              <input value={snapshot.profile.icon} onChange={(e) => store.updateProfile({ icon: e.target.value })} className={inputCls} maxLength={4} />
            </Field>
            <Field label="Pack">
              <select value={snapshot.profile.pack} onChange={(e) => store.updateProfile({ pack: e.target.value })} className={inputCls}>
                <option value="INSTITUTION">Institution</option>
                <option value="ORGANISATION">Organisation</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </Field>
            <Field label="Template name">
              <input value={snapshot.profile.templateName} onChange={(e) => store.updateProfile({ templateName: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Colours & logo</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field label="Primary colour" hint="Nav, buttons, accents">
              <div className="flex items-center gap-3">
                <input type="color" value={snapshot.branding.primaryColor} onChange={(e) => store.updateBranding({ primaryColor: e.target.value })} className="h-12 w-16 cursor-pointer rounded border-2 border-slate-200" />
                <input value={snapshot.branding.primaryColor} onChange={(e) => store.updateBranding({ primaryColor: e.target.value })} className={inputCls} />
              </div>
            </Field>
            <Field label="Secondary colour" hint="Gradients and highlights">
              <div className="flex items-center gap-3">
                <input type="color" value={snapshot.branding.secondaryColor} onChange={(e) => store.updateBranding({ secondaryColor: e.target.value })} className="h-12 w-16 cursor-pointer rounded border-2 border-slate-200" />
                <input value={snapshot.branding.secondaryColor} onChange={(e) => store.updateBranding({ secondaryColor: e.target.value })} className={inputCls} />
              </div>
            </Field>
          </div>

          <div className="mt-6">
            <Field label="Logo URL" hint="Any image URL; leave blank to use the emoji instead">
              <input value={snapshot.branding.logoUrl} onChange={(e) => store.updateBranding({ logoUrl: e.target.value })} className={inputCls} placeholder="https://example.com/logo.png" />
            </Field>
          </div>

          <div className="mt-6 rounded-lg p-5 text-white" style={{ background: `linear-gradient(135deg, ${snapshot.branding.primaryColor}, ${snapshot.branding.secondaryColor})` }}>
            <div className="text-sm opacity-90">Live preview</div>
            <div className="text-xl font-bold">
              {snapshot.profile.icon} {snapshot.profile.orgName}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-bold text-slate-900">Sandbox data</h2>
          <p className="mb-4 text-sm text-slate-600">
            Stored in this browser under a key unique to this template — editing another template
            cannot touch it. Export to keep a copy or move it elsewhere.
          </p>
          <div className="flex flex-wrap gap-3">
            <Btn variant="ghost" onClick={download}>
              ⬇ Export JSON
            </Btn>
            <Btn variant="ghost" onClick={() => setShowImport((v) => !v)}>
              ⬆ Import JSON
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                if (confirm('Discard every change and restore the original demo data?')) {
                  store.resetAll();
                  setNotice('Sandbox reset to the original template data.');
                }
              }}
            >
              Reset to defaults
            </Btn>
          </div>

          {showImport && (
            <div className="mt-4">
              <Field label="Paste an exported sandbox">
                <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={6} className={`${inputCls} font-mono text-xs`} placeholder='{ "version": 2, "users": [ … ] }' />
              </Field>
              <div className="mt-2">
                <Btn
                  accent={accent}
                  onClick={() => {
                    const res = store.importAll(importText);
                    if (res.ok) {
                      setNotice('Imported successfully.');
                      setImportText('');
                      setShowImport(false);
                    } else {
                      setNotice(res.error!);
                    }
                  }}
                >
                  Import
                </Btn>
              </div>
            </div>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 md:grid-cols-4">
            {(
              [
                ['People', snapshot.users.length],
                ['Roles', snapshot.roles.length],
                ['Departments', snapshot.orgUnits.length],
                ['Attendance rows', snapshot.attendance.length],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="text-lg font-bold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
