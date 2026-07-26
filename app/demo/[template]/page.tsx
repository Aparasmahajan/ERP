'use client';

import { useState, useEffect } from 'react';
import { TEMPLATE_DEMOS, type TemplateId } from '@/lib/seeds/templateDemos';

interface Customization {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

interface EditingUser {
  idx: number;
  name: string;
  role: string;
  code: string;
  status: string;
}

export default function TemplateDemoPage({
  params,
}: {
  params: Promise<{ template: string }>;
}) {
  const [template, setTemplate] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [customization, setCustomization] = useState<Customization>({
    primaryColor: '#2563eb',
    secondaryColor: '#7c3aed',
    logoUrl: '',
  });
  const [templateData, setTemplateData] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [newUser, setNewUser] = useState<EditingUser | null>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      const { template: templateId } = await params;
      const demoTemplate = TEMPLATE_DEMOS[templateId as TemplateId];
      setTemplate(demoTemplate);

      // Load or initialize template data with local storage
      const savedData = localStorage.getItem(`demo-data-${templateId}`);
      if (savedData) {
        setTemplateData(JSON.parse(savedData));
      } else {
        setTemplateData(JSON.parse(JSON.stringify(demoTemplate)));
      }

      // Load customization from local storage
      const saved = localStorage.getItem(`demo-${templateId}`);
      if (saved) {
        setCustomization(JSON.parse(saved));
      }
    };
    loadTemplate();
  }, [params]);

  const saveCustomization = (updates: Partial<Customization>) => {
    const updated = { ...customization, ...updates };
    setCustomization(updated);
    const { template: templateId } = (params as any);
    localStorage.setItem(`demo-${templateId}`, JSON.stringify(updated));
  };

  const saveTemplateData = (data: any) => {
    setTemplateData(data);
    const { template: templateId } = (params as any);
    localStorage.setItem(`demo-data-${templateId}`, JSON.stringify(data));
  };

  const handleEditUser = (idx: number, user: any) => {
    setEditingUser({ idx, ...user });
  };

  const handleSaveUser = () => {
    if (editingUser && templateData) {
      const updated = { ...templateData };
      updated.users[editingUser.idx] = {
        name: editingUser.name,
        code: editingUser.code,
        role: editingUser.role,
        status: editingUser.status,
      };
      saveTemplateData(updated);
      setEditingUser(null);
    }
  };

  const handleAddUser = () => {
    if (newUser && templateData) {
      const updated = { ...templateData };
      updated.users.push({
        name: newUser.name,
        code: newUser.code,
        role: newUser.role,
        status: newUser.status,
      });
      saveTemplateData(updated);
      setNewUser(null);
    }
  };

  const handleDeleteUser = (idx: number) => {
    if (templateData) {
      const updated = { ...templateData };
      updated.users.splice(idx, 1);
      saveTemplateData(updated);
    }
  };

  if (!template) return <div>Loading...</div>;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-4 overflow-y-auto">
        <div className="mb-8">
          {customization.logoUrl ? (
            <img
              src={customization.logoUrl}
              alt="Logo"
              className="h-10 mb-2"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg mb-2 flex items-center justify-center text-xl font-bold text-white"
              style={{ backgroundColor: customization.primaryColor }}
            >
              {template.icon}
            </div>
          )}
          <h1 className="text-xl font-bold">{template.tenant.name}</h1>
          <p className="text-sm text-slate-400">Live Demo</p>
        </div>

        <nav className="space-y-2 mb-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'profile', label: 'My Profile', icon: '👤' },
            { id: 'people', label: 'People', icon: '👥' },
            { id: 'roles', label: 'Roles & Powers', icon: '🔐' },
            { id: 'settings', label: 'Branding', icon: '⚙️' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded transition ${
                currentPage === item.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-700 pt-4 space-y-2">
          <a
            href="/"
            className="block px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition text-center"
          >
            🏠 Back to Home
          </a>
          <a
            href="/demo"
            className="block px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition text-center"
          >
            ← Back to Gallery
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900 capitalize">
                {currentPage === 'dashboard' && 'Dashboard'}
                {currentPage === 'profile' && 'My Profile'}
                {currentPage === 'people' && 'People Management'}
                {currentPage === 'roles' && 'Roles & Powers'}
                {currentPage === 'settings' && 'Branding Settings'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Demo User (Admin)</span>
              <button
                style={{ backgroundColor: customization.primaryColor }}
                className="px-4 py-2 rounded text-white text-sm font-medium transition hover:opacity-90"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {currentPage === 'dashboard' && (
            <DashboardPage
              template={template}
              customization={customization}
            />
          )}
          {currentPage === 'profile' && (
            <UserProfilePage
              template={template}
              customization={customization}
            />
          )}
          {currentPage === 'people' && templateData && (
            <PeoplePage
              template={templateData}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              onAddUser={() => setNewUser({ idx: -1, name: '', code: '', role: '', status: 'ACTIVE' })}
              editingUser={editingUser}
              onEditingUserUpdate={setEditingUser}
              onCloseEditingUser={() => setEditingUser(null)}
              onSaveUser={handleSaveUser}
              newUser={newUser}
              onNewUserUpdate={setNewUser}
              onCloseNewUser={() => setNewUser(null)}
              onSaveNewUser={handleAddUser}
              roles={template?.roles || []}
            />
          )}
          {currentPage === 'roles' && <RolesPage template={template} />}
          {currentPage === 'settings' && (
            <SettingsPage
              customization={customization}
              onUpdate={saveCustomization}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function UserProfilePage({
  template,
  customization,
}: {
  template: any;
  customization: Customization;
}) {
  const adminUser = template?.users?.[0] || {
    name: 'Admin User',
    code: 'ADMIN001',
    role: 'Administrator',
    status: 'ACTIVE',
  };

  return (
    <div>
      <div className="max-w-2xl">
        <Card>
          <div className="flex items-center gap-6 mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
              style={{ backgroundColor: customization.primaryColor }}
            >
              👤
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{adminUser.name}</h1>
              <p className="text-slate-600">{adminUser.role}</p>
              <p className="text-sm text-slate-500 mt-1">ID: {adminUser.code}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-sm text-slate-600 font-semibold mb-1">Status</p>
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${customization.primaryColor}20`,
                  color: customization.primaryColor,
                }}
              >
                {adminUser.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-semibold mb-1">Organization</p>
              <p className="text-slate-900 font-medium">{template?.tenant?.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-semibold mb-1">Pack Type</p>
              <p className="text-slate-900 font-medium">{template?.tenant?.pack}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-semibold mb-1">Email</p>
              <p className="text-slate-900 font-medium">admin@{template?.tenant?.name?.toLowerCase().replace(/\s+/g, '')}.com</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">📋 Permissions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'User Management',
                'Role Management',
                'Organization Settings',
                'People Management',
                'Reporting',
                'System Configuration',
              ].map((perm, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: customization.primaryColor }}
                  ></span>
                  <span className="text-sm text-slate-700">{perm}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 mt-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">⚙️ Quick Settings</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded"
                  style={{ accentColor: customization.primaryColor }}
                />
                <span className="text-slate-700">Receive email notifications</span>
              </label>
              <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded"
                  style={{ accentColor: customization.primaryColor }}
                />
                <span className="text-slate-700">Two-factor authentication</span>
              </label>
              <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded"
                  style={{ accentColor: customization.primaryColor }}
                />
                <span className="text-slate-700">Activity log tracking</span>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 mt-8 flex gap-3">
            <button
              style={{ backgroundColor: customization.primaryColor }}
              className="px-6 py-2 text-white rounded-lg font-medium transition hover:opacity-90"
            >
              📝 Edit Profile
            </button>
            <button className="px-6 py-2 border-2 border-slate-300 text-slate-700 rounded-lg font-medium transition hover:bg-slate-50">
              🔐 Change Password
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DashboardPage({
  template,
  customization,
}: {
  template: any;
  customization: Customization;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{template.icon}</span>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {template.name}
            </h1>
            <p className="text-slate-600">{template.tenant.name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Users"
          value={template.stats.totalUsers}
          icon="👥"
          color="bg-blue-50"
          primaryColor={customization.primaryColor}
        />
        <StatCard
          label="Active Users"
          value={template.stats.activeUsers}
          icon="✅"
          color="bg-green-50"
          primaryColor={customization.primaryColor}
        />
        <StatCard
          label="Total Roles"
          value={template.stats.totalRoles}
          icon="🔐"
          color="bg-purple-50"
          primaryColor={customization.primaryColor}
        />
        <StatCard
          label="Pending Approvals"
          value={template.stats.pendingApprovals}
          icon="⏳"
          color="bg-yellow-50"
          primaryColor={customization.primaryColor}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            📋 Key Features
          </h2>
          <ul className="space-y-2">
            {template.features.map((feature: string, idx: number) => (
              <li key={idx} className="flex items-center gap-2 text-slate-700">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: customization.primaryColor }}
                ></span>
                {feature}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            📊 Organization Overview
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-600">Tenant Name</p>
              <p className="font-semibold text-slate-900">
                {template.tenant.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Pack Type</p>
              <p className="font-semibold text-slate-900">
                {template.tenant.pack}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Roles</p>
              <p className="font-semibold text-slate-900">
                {template.roles.length} roles configured
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PeoplePage({
  template,
  onEditUser,
  onDeleteUser,
  onAddUser,
  editingUser,
  onEditingUserUpdate,
  onCloseEditingUser,
  onSaveUser,
  newUser,
  onNewUserUpdate,
  onCloseNewUser,
  onSaveNewUser,
  roles,
}: {
  template: any;
  onEditUser: (idx: number, user: any) => void;
  onDeleteUser: (idx: number) => void;
  onAddUser: () => void;
  editingUser: EditingUser | null;
  onEditingUserUpdate: (user: EditingUser) => void;
  onCloseEditingUser: () => void;
  onSaveUser: () => void;
  newUser: EditingUser | null;
  onNewUserUpdate: (user: EditingUser) => void;
  onCloseNewUser: () => void;
  onSaveNewUser: () => void;
  roles: any[];
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">People Management</h1>
        <button
          onClick={onAddUser}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          + Add User
        </button>
      </div>

      <Card>
        <div className="mb-4 pb-4 border-b border-slate-200">
          <p className="text-sm text-slate-600">
            Showing {template.users.length} users
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-900">
                  Code
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-900">
                  Name
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-900">
                  Role
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-900">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {template.users.map((user: any, idx: number) => (
                <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-900 font-medium">
                    {user.code}
                  </td>
                  <td className="py-3 px-4 text-slate-900">{user.name}</td>
                  <td className="py-3 px-4 text-slate-600">{user.role}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    <button
                      onClick={() => onEditUser(idx, user)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => onDeleteUser(idx)}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editingUser !== null && (
        <EditUserModal
          user={editingUser}
          onUpdate={(field, value) =>
            onEditingUserUpdate({ ...editingUser, [field]: value })
          }
          onSave={onSaveUser}
          onClose={onCloseEditingUser}
          roles={roles}
        />
      )}

      {newUser !== null && (
        <EditUserModal
          user={newUser}
          onUpdate={(field, value) =>
            onNewUserUpdate({ ...newUser, [field]: value })
          }
          onSave={onSaveNewUser}
          onClose={onCloseNewUser}
          roles={roles}
          isNew
        />
      )}
    </div>
  );
}

function EditUserModal({
  user,
  onUpdate,
  onSave,
  onClose,
  roles,
  isNew,
}: {
  user: EditingUser;
  onUpdate: (field: string, value: string) => void;
  onSave: () => void;
  onClose: () => void;
  roles: any[];
  isNew?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {isNew ? 'Add User' : 'Edit User'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="space-y-4"
        >
          <input
            type="text"
            placeholder="Code (e.g., EMP001)"
            value={user.code}
            onChange={(e) => onUpdate('code', e.target.value)}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400"
          />
          <input
            type="text"
            placeholder="Full Name"
            value={user.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400"
          />
          <select
            value={user.role}
            onChange={(e) => onUpdate('role', e.target.value)}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400"
          >
            <option value="">Select Role</option>
            {roles.map((role: any) => (
              <option key={role.name} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            value={user.status}
            onChange={(e) => onUpdate('status', e.target.value)}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ON_LEAVE">ON LEAVE</option>
          </select>
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            {isNew ? 'Add User' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function RolesPage({ template }: { template: any }) {
  const colorPalette = [
    '#366092',
    '#4472C4',
    '#ED7D31',
    '#C55A11',
    '#A64D79',
    '#97B8F0',
    '#FFC000',
    '#70AD47',
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">
        Roles & Powers Matrix
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {template.roles.map((role: any, idx: number) => {
          const color = colorPalette[idx % colorPalette.length];
          const powers = Math.floor(Math.random() * 100) + 20;

          return (
            <Card key={role.name}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {role.name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {role.description}
                  </p>
                  <p className="text-sm text-slate-600 mt-2">{powers} capabilities</p>
                </div>
                <div
                  className="w-12 h-12 rounded-lg"
                  style={{ backgroundColor: color }}
                ></div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(powers / 132) * 100}%`,
                    backgroundColor: color,
                  }}
                ></div>
              </div>
              <button className="mt-4 text-blue-600 hover:underline text-sm font-medium">
                View all powers →
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SettingsPage({
  customization,
  onUpdate,
}: {
  customization: Customization;
  onUpdate: (updates: Partial<Customization>) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Branding Settings</h1>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-3">
              Primary Color
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={customization.primaryColor}
                onChange={(e) => onUpdate({ primaryColor: e.target.value })}
                className="w-20 h-20 rounded cursor-pointer border-4 border-slate-200"
              />
              <div>
                <p className="text-slate-600 text-sm mb-2">Used for:</p>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• Buttons & Links</li>
                  <li>• Headers</li>
                  <li>• Highlights</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-3">
              Secondary Color
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={customization.secondaryColor}
                onChange={(e) => onUpdate({ secondaryColor: e.target.value })}
                className="w-20 h-20 rounded cursor-pointer border-4 border-slate-200"
              />
              <div>
                <p className="text-slate-600 text-sm mb-2">Used for:</p>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• Accents</li>
                  <li>• Gradients</li>
                  <li>• Icons</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <label className="block text-sm font-bold text-slate-900 mb-3">
            Logo URL
          </label>
          <input
            type="url"
            placeholder="https://example.com/logo.png"
            value={customization.logoUrl}
            onChange={(e) => onUpdate({ logoUrl: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400"
          />
          <p className="text-xs text-slate-600 mt-2">
            Your changes are automatically saved to this browser
          </p>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <p className="text-sm font-bold text-slate-900 mb-4">Preview:</p>
          <div className="flex gap-4">
            <button
              className="px-6 py-2 rounded text-white font-semibold"
              style={{ backgroundColor: customization.primaryColor }}
            >
              Primary Button
            </button>
            <button
              className="px-6 py-2 rounded text-white font-semibold"
              style={{ backgroundColor: customization.secondaryColor }}
            >
              Secondary Button
            </button>
            <div
              className="px-6 py-2 rounded text-white font-semibold flex items-center"
              style={{
                background: `linear-gradient(135deg, ${customization.primaryColor}, ${customization.secondaryColor})`,
              }}
            >
              Gradient
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200">
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  primaryColor,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  primaryColor: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 mb-2">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`text-3xl ${color} w-16 h-16 rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
