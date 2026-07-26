'use client';

import { useRouter } from 'next/navigation';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', href: '/admin' },
  { id: 'enquiries', label: 'Enquiries', href: '/admin/enquiries' },
  { id: 'templates', label: 'Templates', href: '/templates' },
  { id: 'demos', label: 'Demos', href: '/demo' },
] as const;

export type AdminTab = (typeof TABS)[number]['id'];

/** Shared top bar for the superadmin pages. */
export function AdminNav({ active, email }: { active: AdminTab; email?: string }) {
  const router = useRouter();

  async function signOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      router.push('/login');
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
        <span className="font-serif text-lg text-slate-900">ERP · Admin</span>

        <nav className="flex flex-wrap items-center gap-1">
          {TABS.map((t) => {
            const isActive = t.id === active;
            return (
              <a
                key={t.id}
                href={t.href}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  isActive
                    ? 'bg-slate-900 font-medium text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {t.label}
              </a>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {email && <span className="hidden text-sm text-slate-600 sm:inline">{email}</span>}
          <button
            onClick={signOut}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

/** Small-caps eyebrow above a page title, as in the reference layout. */
export function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
        <h1 className="mt-1 font-serif text-4xl text-slate-900">{title}</h1>
      </div>
      {children}
    </div>
  );
}

/** Big-number metric tile. */
export function StatTile({ label, value, tone = 'plain' }: { label: string; value: number | string; tone?: 'plain' | 'alert' }) {
  return (
    <div className={`rounded-xl border p-6 ${tone === 'alert' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <p className={`text-xs uppercase tracking-wider ${tone === 'alert' ? 'text-amber-700' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-3 font-serif text-4xl ${tone === 'alert' ? 'text-amber-900' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export function Pill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-full border border-slate-300 px-5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </a>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'ACCEPTED' ? 'bg-green-50 text-green-800 border-green-200'
    : status === 'REJECTED' ? 'bg-red-50 text-red-800 border-red-200'
    : 'bg-amber-50 text-amber-800 border-amber-200';
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${tone}`}>
      {status}
    </span>
  );
}
