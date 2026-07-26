'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  load,
  save,
  reset as resetSnapshot,
  importJson,
  newId,
  wouldCycle,
  type DemoSnapshot,
  type DemoUser,
  type DemoRole,
  type DemoOrgUnit,
  type DemoAttendance,
  type AttendanceStatus,
  type DemoBranding,
  type DemoProfile,
} from './demoStore';

/**
 * Loads a template's sandbox from localStorage and exposes mutators that persist on every
 * change. Returns `null` while hydrating so the first paint matches the server render —
 * localStorage is unavailable during SSR, and reading it during the initial render would
 * cause a hydration mismatch.
 */
export function useDemoStore(templateId: string | null) {
  const [snapshot, setSnapshot] = useState<DemoSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) return;
    try {
      setSnapshot(load(templateId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [templateId]);

  /** Apply a pure transform to the snapshot and persist the result. */
  const mutate = useCallback((fn: (s: DemoSnapshot) => DemoSnapshot) => {
    setSnapshot((current) => (current ? save(fn(current)) : current));
  }, []);

  const api = useMemo(() => ({
    // ── profile & branding ──
    updateProfile: (patch: Partial<DemoProfile>) =>
      mutate((s) => ({ ...s, profile: { ...s.profile, ...patch } })),

    updateBranding: (patch: Partial<DemoBranding>) =>
      mutate((s) => ({ ...s, branding: { ...s.branding, ...patch } })),

    // ── users ──
    addUser: (u: Omit<DemoUser, 'id'>) =>
      mutate((s) => ({ ...s, users: [...s.users, { ...u, id: newId('user') }] })),

    updateUser: (id: string, patch: Partial<DemoUser>) =>
      mutate((s) => ({
        ...s,
        users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      })),

    deleteUser: (id: string) =>
      mutate((s) => ({
        ...s,
        users: s.users
          .filter((u) => u.id !== id)
          // Anyone who reported to the removed person is re-parented to the root, so the
          // tree never ends up with dangling managers.
          .map((u) => (u.reportsToUserId === id ? { ...u, reportsToUserId: '' } : u)),
        // Their attendance history goes with them.
        attendance: s.attendance.filter((a) => a.userId !== id),
        orgUnits: s.orgUnits.map((o) => (o.headUserId === id ? { ...o, headUserId: '' } : o)),
      })),

    /** Rejects the change if it would create a reporting cycle. */
    setReportsTo: (userId: string, managerId: string): { ok: boolean; error?: string } => {
      let result: { ok: boolean; error?: string } = { ok: true };
      mutate((s) => {
        if (wouldCycle(s, userId, managerId)) {
          result = { ok: false, error: 'That would create a reporting loop.' };
          return s;
        }
        return {
          ...s,
          users: s.users.map((u) => (u.id === userId ? { ...u, reportsToUserId: managerId } : u)),
        };
      });
      return result;
    },

    // ── roles ──
    addRole: (r: Omit<DemoRole, 'id'>) =>
      mutate((s) => ({ ...s, roles: [...s.roles, { ...r, id: newId('role') }] })),

    updateRole: (id: string, patch: Partial<DemoRole>) =>
      mutate((s) => ({
        ...s,
        roles: s.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      })),

    /** Blocked while anyone still holds the role, so no user is left role-less. */
    deleteRole: (id: string): { ok: boolean; error?: string } => {
      let result: { ok: boolean; error?: string } = { ok: true };
      mutate((s) => {
        const holders = s.users.filter((u) => u.roleId === id);
        if (holders.length > 0) {
          result = {
            ok: false,
            error: `${holders.length} ${holders.length === 1 ? 'person holds' : 'people hold'} this role. Reassign them first.`,
          };
          return s;
        }
        return { ...s, roles: s.roles.filter((r) => r.id !== id) };
      });
      return result;
    },

    toggleCapability: (roleId: string, capabilityId: string) =>
      mutate((s) => ({
        ...s,
        roles: s.roles.map((r) =>
          r.id === roleId
            ? {
                ...r,
                capabilities: r.capabilities.includes(capabilityId)
                  ? r.capabilities.filter((c) => c !== capabilityId)
                  : [...r.capabilities, capabilityId],
              }
            : r
        ),
      })),

    setRoleCapabilities: (roleId: string, capabilities: string[]) =>
      mutate((s) => ({
        ...s,
        roles: s.roles.map((r) => (r.id === roleId ? { ...r, capabilities } : r)),
      })),

    // ── org units ──
    addOrgUnit: (o: Omit<DemoOrgUnit, 'id'>) =>
      mutate((s) => ({ ...s, orgUnits: [...s.orgUnits, { ...o, id: newId('ou') }] })),

    updateOrgUnit: (id: string, patch: Partial<DemoOrgUnit>) =>
      mutate((s) => ({
        ...s,
        orgUnits: s.orgUnits.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      })),

    deleteOrgUnit: (id: string): { ok: boolean; error?: string } => {
      let result: { ok: boolean; error?: string } = { ok: true };
      mutate((s) => {
        if (s.orgUnits.length <= 1) {
          result = { ok: false, error: 'At least one unit must remain.' };
          return s;
        }
        const fallback = s.orgUnits.find((o) => o.id !== id)!.id;
        return {
          ...s,
          orgUnits: s.orgUnits
            .filter((o) => o.id !== id)
            .map((o) => (o.parentUnitId === id ? { ...o, parentUnitId: '' } : o)),
          // Move anyone assigned to the deleted unit rather than orphaning them.
          users: s.users.map((u) => (u.orgUnitId === id ? { ...u, orgUnitId: fallback } : u)),
        };
      });
      return result;
    },

    // ── attendance ──
    /** Upsert: one record per user per date. */
    markAttendance: (
      userId: string,
      date: string,
      status: AttendanceStatus,
      extra?: Partial<Pick<DemoAttendance, 'checkIn' | 'checkOut' | 'note'>>
    ) =>
      mutate((s) => {
        const existing = s.attendance.find((a) => a.userId === userId && a.date === date);
        if (existing) {
          return {
            ...s,
            attendance: s.attendance.map((a) =>
              a.id === existing.id ? { ...a, status, ...extra } : a
            ),
          };
        }
        return {
          ...s,
          attendance: [
            ...s.attendance,
            {
              id: newId('att'),
              userId,
              date,
              status,
              checkIn: extra?.checkIn ?? '',
              checkOut: extra?.checkOut ?? '',
              note: extra?.note ?? '',
            },
          ],
        };
      }),

    clearAttendance: (userId: string, date: string) =>
      mutate((s) => ({
        ...s,
        attendance: s.attendance.filter((a) => !(a.userId === userId && a.date === date)),
      })),

    markAllAttendance: (date: string, status: AttendanceStatus) =>
      mutate((s) => {
        const others = s.attendance.filter((a) => a.date !== date);
        return {
          ...s,
          attendance: [
            ...others,
            ...s.users.map((u) => ({
              id: newId('att'),
              userId: u.id,
              date,
              status,
              checkIn: '',
              checkOut: '',
              note: '',
            })),
          ],
        };
      }),

    // ── features ──
    toggleFeature: (id: string) =>
      mutate((s) => ({
        ...s,
        features: s.features.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
      })),

    addFeature: (name: string) =>
      mutate((s) => ({
        ...s,
        features: [...s.features, { id: newId('feat'), name, enabled: true }],
      })),

    deleteFeature: (id: string) =>
      mutate((s) => ({ ...s, features: s.features.filter((f) => f.id !== id) })),

    // ── whole-sandbox operations ──
    resetAll: () => {
      if (!templateId) return;
      setSnapshot(resetSnapshot(templateId));
    },

    importAll: (text: string): { ok: boolean; error?: string } => {
      if (!templateId) return { ok: false, error: 'No template loaded.' };
      const res = importJson(templateId, text);
      if (res.ok) {
        setSnapshot(res.snapshot);
        return { ok: true };
      }
      return { ok: false, error: res.error };
    },
  }), [mutate, templateId]);

  return { snapshot, error, ...api };
}
