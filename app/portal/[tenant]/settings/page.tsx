'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface BrandingConfig {
  tenantId: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  customDomain?: string;
  updatedAt?: string;
}

export default function SettingsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const [config, setConfig] = useState<BrandingConfig>({
    tenantId: tenantSlug,
    primaryColor: '#2563eb',
    secondaryColor: '#7c3aed',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, [tenantSlug]);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/branding', {
        headers: { 'x-tenant-id': tenantSlug },
      });
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantSlug,
        },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setMessage('✓ Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('⚠ Failed to save settings');
      }
    } catch (error) {
      setMessage('⚠ Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center">Loading settings...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Tenant Settings</h1>

      {message && (
        <div
          className={`mb-6 p-4 rounded border ${
            message.startsWith('✓')
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Branding Settings */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Branding & Colors</h2>

          <div className="space-y-6">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">Primary Color</label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="w-24 h-24 rounded cursor-pointer border-2 border-slate-300"
                />
                <div>
                  <p className="text-slate-600 text-sm mb-3">Used for:</p>
                  <ul className="text-xs text-slate-500 space-y-2">
                    <li>• Main buttons</li>
                    <li>• Links and highlights</li>
                    <li>• Navigation elements</li>
                    <li>• Primary actions</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-3 rounded text-sm text-white" style={{ backgroundColor: config.primaryColor }}>
                This is how your primary color looks
              </div>
            </div>

            {/* Secondary Color */}
            <div className="pt-6 border-t border-slate-200">
              <label className="block text-sm font-bold text-slate-900 mb-3">Secondary Color</label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={config.secondaryColor}
                  onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                  className="w-24 h-24 rounded cursor-pointer border-2 border-slate-300"
                />
                <div>
                  <p className="text-slate-600 text-sm mb-3">Used for:</p>
                  <ul className="text-xs text-slate-500 space-y-2">
                    <li>• Accent elements</li>
                    <li>• Hover states</li>
                    <li>• Gradients</li>
                    <li>• Secondary actions</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-3 rounded text-sm text-white" style={{ backgroundColor: config.secondaryColor }}>
                This is how your secondary color looks
              </div>
            </div>

            {/* Logo URL */}
            <div className="pt-6 border-t border-slate-200">
              <label className="block text-sm font-bold text-slate-900 mb-2">Logo URL (optional)</label>
              <input
                type="text"
                value={config.logoUrl || ''}
                onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400"
              />
            </div>

            {/* Custom Domain */}
            <div className="pt-6 border-t border-slate-200">
              <label className="block text-sm font-bold text-slate-900 mb-2">Custom Domain (optional)</label>
              <input
                type="text"
                value={config.customDomain || ''}
                onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
                placeholder="portal.yourcompany.com"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400"
              />
              <p className="text-xs text-slate-500 mt-2">Available in paid plans</p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-lg font-semibold text-white transition mt-6"
              style={{ backgroundColor: config.primaryColor, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Preview</h2>

          <div
            className="rounded-lg p-12 text-center mb-6"
            style={{
              background: `linear-gradient(135deg, ${config.primaryColor}20 0%, ${config.secondaryColor}20 100%)`,
            }}
          >
            <div className="text-4xl font-bold text-slate-900 mb-2">Your Portal</div>
            <p className="text-slate-600">See how your branding will look</p>
          </div>

          <div className="space-y-3">
            <button
              className="w-full py-2 rounded-lg font-semibold text-white transition"
              style={{ backgroundColor: config.primaryColor }}
            >
              Primary Button
            </button>

            <button
              className="w-full py-2 rounded-lg font-semibold text-white transition"
              style={{ backgroundColor: config.secondaryColor }}
            >
              Secondary Button
            </button>

            <button
              className="w-full py-2 rounded-lg font-semibold text-white transition"
              style={{
                background: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})`,
              }}
            >
              Gradient Button
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm font-bold text-slate-900 mb-3">Color Swatches:</p>
            <div className="flex gap-3">
              <div
                className="flex-1 h-12 rounded border-2 border-slate-300"
                style={{ backgroundColor: config.primaryColor }}
              ></div>
              <div
                className="flex-1 h-12 rounded border-2 border-slate-300"
                style={{ backgroundColor: config.secondaryColor }}
              ></div>
            </div>
            <div className="flex gap-3 mt-2 text-xs text-slate-500">
              <div>Primary: {config.primaryColor}</div>
              <div>Secondary: {config.secondaryColor}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Settings */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <SettingCard icon="🔐" title="Security" description="Manage passwords, 2FA, API keys" />
        <SettingCard icon="📧" title="Email" description="Configure SMTP, email templates" />
        <SettingCard icon="🌍" title="Localization" description="Timezone, language, date format" />
      </div>
    </div>
  );
}

function SettingCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition cursor-pointer">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}
