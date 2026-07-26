'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Stats {
  totalUsers: number;
  totalRoles: number;
  activeUsers: number;
  pendingApprovals: number;
}

export default function PortalDashboard() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalRoles: 0,
    activeUsers: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          fetch('/api/users', {
            headers: { 'x-tenant-id': tenantSlug },
          }),
          fetch('/api/roles', {
            headers: { 'x-tenant-id': tenantSlug },
          }),
        ]);

        const users = await usersRes.json();
        const roles = await rolesRes.json();

        setStats({
          totalUsers: users.data?.length || 0,
          totalRoles: roles.data?.length || 0,
          activeUsers: users.data?.filter((u: any) => u.status === 'ACTIVE').length || 0,
          pendingApprovals: 0,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [tenantSlug]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Dashboard</h1>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            label="Total Users"
            value={stats.totalUsers}
            color="bg-blue-50"
            icon="👥"
          />
          <StatCard
            label="Active Users"
            value={stats.activeUsers}
            color="bg-green-50"
            icon="✅"
          />
          <StatCard
            label="Total Roles"
            value={stats.totalRoles}
            color="bg-purple-50"
            icon="🔐"
          />
          <StatCard
            label="Pending Approvals"
            value={stats.pendingApprovals}
            color="bg-yellow-50"
            icon="⏳"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <ul className="space-y-2">
            <li>
              <a href="/portal/people" className="text-blue-600 hover:underline">
                → Add new user
              </a>
            </li>
            <li>
              <a href="/portal/roles" className="text-blue-600 hover:underline">
                → Manage roles & permissions
              </a>
            </li>
            <li>
              <a href="/portal/org-units" className="text-blue-600 hover:underline">
                → View organization structure
              </a>
            </li>
            <li>
              <a href="/portal/settings" className="text-blue-600 hover:underline">
                → Configure tenant settings
              </a>
            </li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <p className="text-slate-600">No recent activity to display.</p>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  color: string;
  icon: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`${color} rounded-lg p-3 text-2xl`}>{icon}</div>
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-lg border border-slate-200 p-6">{children}</div>;
}
