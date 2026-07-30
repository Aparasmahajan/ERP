'use client';

import { useState } from 'react';

export interface PersonDraft {
  id?: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  status: string;
  roleId: string;
  reportsToUserId: string;
}

interface Option {
  id: string;
  label: string;
}

export function PersonModal({
  initial,
  isNew,
  roles,
  people,
  accent,
  canAssignRole,
  onCancel,
  onSave,
}: {
  initial: PersonDraft;
  isNew: boolean;
  roles: Option[];
  people: Option[];
  accent: string;
  canAssignRole: boolean;
  onCancel: () => void;
  onSave: (draft: PersonDraft) => Promise<string | null>;
}) {
  const [form, setForm] = useState<PersonDraft>(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const input =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none';

  async function submit() {
    if (!form.name.trim()) return setError('A name is required.');
    if (!form.roleId) return setError('Pick a role.');

    setBusy(true);
    setError('');
    // onSave returns an error message, or null on success — so the modal stays open and
    // keeps the user's input when the server rejects it.
    const err = await onSave(form);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-serif text-2xl text-slate-900">
          {isNew ? 'Add a person' : `Edit ${initial.name}`}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Full name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} autoFocus />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Code</span>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className={input}
                placeholder="EMP001"
              />
              <span className="mt-1 block text-xs text-slate-500">Employee / roll number.</span>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input}>
                <option value="INVITED">Invited</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
            <select
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              className={input}
              disabled={!canAssignRole}
            >
              <option value="">— pick a role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              {canAssignRole
                ? 'This determines what they can do.'
                : 'Your role does not allow changing role assignments.'}
            </span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Reports to</span>
            <select
              value={form.reportsToUserId}
              onChange={(e) => setForm({ ...form, reportsToUserId: e.target.value })}
              className={input}
            >
              <option value="">— nobody (top of tree)</option>
              {people
                .filter((p) => p.id !== form.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
            </select>
          </label>

          {isNew && (
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              They start as <strong>Invited</strong> and cannot sign in until they accept an
              invite. Give them an email and you&apos;ll get a link to pass on.
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: accent }}
          >
            {busy ? 'Saving…' : isNew ? 'Add person' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
