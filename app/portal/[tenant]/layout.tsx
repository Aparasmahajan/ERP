'use client';

import { ReactNode } from 'react';

export default function PortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white p-4 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Hexaframe ERP</h1>
          <p className="text-sm text-slate-400">Multi-tenant Portal</p>
        </div>

        <nav className="space-y-2">
          <NavLink href="/portal" icon="📊">
            Dashboard
          </NavLink>
          <NavLink href="/portal/people" icon="👥">
            People
          </NavLink>
          <NavLink href="/portal/roles" icon="🔐">
            Roles & Powers
          </NavLink>
          <NavLink href="/portal/org-units" icon="🏢">
            Organization
          </NavLink>
          <NavLink href="/portal/attendance" icon="📋">
            Attendance
          </NavLink>
          <NavLink href="/portal/leave" icon="🏖️">
            Leave
          </NavLink>
          <NavLink href="/portal/settings" icon="⚙️">
            Settings
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">Portal</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Admin User</span>
              <button className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200">
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-4 py-2 rounded hover:bg-slate-800 transition text-slate-300 hover:text-white"
    >
      <span className="text-lg">{icon}</span>
      <span>{children}</span>
    </a>
  );
}
