/**
 * localStorage-backed store for the template demo portals.
 *
 * Each template is a fully independent sandbox: a visitor can edit anything and the
 * changes persist in their own browser only. Nothing is sent to a server.
 *
 * The entity shapes deliberately mirror lib/sheets/headers.json so a demo is a truthful
 * preview of the real product, and so a sandbox could later be promoted into a real
 * tenant without reshaping the data.
 *
 * One JSON blob per template, written atomically and keyed by template id — so editing
 * the school demo cannot affect the hospital demo.
 */

import { TEMPLATE_DEMOS } from '@/lib/seeds/templateDemos';
import {
  CAPABILITY_CATALOGUE,
  CAPABILITY_MODULES,
  capabilityLabel,
  presetFor,
  type CapabilityDef,
} from '@/lib/capabilities/catalogue';

// Re-exported so demo components can keep importing these from one place, while the
// definitions live in lib/capabilities/catalogue.ts — shared with the server so a power in
// a demo is the same power in a real tenant.
export { CAPABILITY_CATALOGUE, CAPABILITY_MODULES, capabilityLabel };
export type { CapabilityDef };

/** Bump when an entity shape changes; old snapshots are re-seeded rather than crashing. */
const STORAGE_VERSION = 2;
const keyFor = (templateId: string) => `erp-demo:v${STORAGE_VERSION}:${templateId}`;

// ── entity shapes ──

export interface DemoRole {
  id: string;
  name: string;
  code: string;
  color: string;
  description: string;
  /** Capability ids from CAPABILITY_CATALOGUE. This is what actually confers power. */
  capabilities: string[];
}

export interface DemoUser {
  id: string;
  name: string;
  code: string;
  roleId: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  reportsToUserId: string;
  orgUnitId: string;
}

export interface DemoOrgUnit {
  id: string;
  name: string;
  code: string;
  parentUnitId: string;
  headUserId: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HALF_DAY';

export interface DemoAttendance {
  id: string;
  userId: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  note: string;
}

export interface DemoFeature {
  id: string;
  name: string;
  enabled: boolean;
}

export interface DemoBranding {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

export interface DemoProfile {
  orgName: string;
  pack: string;
  icon: string;
  templateName: string;
}

export interface DemoSnapshot {
  version: number;
  templateId: string;
  profile: DemoProfile;
  branding: DemoBranding;
  roles: DemoRole[];
  users: DemoUser[];
  orgUnits: DemoOrgUnit[];
  attendance: DemoAttendance[];
  features: DemoFeature[];
  updatedAt: string;
}

// ── seeding ──

let idCounter = 0;
/** Unique within one snapshot, which is all that is required here. */
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Capability ids for a seeded role, from the shared preset in lib/capabilities. */
function seedCapabilitiesForRank(index: number, total: number): string[] {
  return presetFor(index, total).map((g) => g.capability);
}

export function buildSeed(templateId: string): DemoSnapshot {
  const t = (TEMPLATE_DEMOS as Record<string, any>)[templateId];
  if (!t) throw new Error(`Unknown template "${templateId}"`);

  const roles: DemoRole[] = (t.roles || []).map((r: any, i: number) => ({
    id: `role_${r.code}`,
    name: r.name,
    code: r.code,
    color: r.color || 'bg-gray-500',
    description: r.description || '',
    capabilities: seedCapabilitiesForRank(i, (t.roles || []).length),
  }));

  const roleIdByName = new Map(roles.map((r) => [r.name, r.id]));
  const orgName = t.tenant?.name || 'Head Office';

  const orgUnits: DemoOrgUnit[] = [
    { id: 'ou_root', name: orgName, code: 'HQ', parentUnitId: '', headUserId: '' },
  ];

  const seedUsers = t.users || [];
  const users: DemoUser[] = seedUsers.map((u: any, i: number) => ({
    id: `user_${u.code}`,
    name: u.name,
    code: u.code,
    roleId: roleIdByName.get(u.role) || roles[0]?.id || '',
    email: `${String(u.code).toLowerCase()}@${slugify(orgName)}.example`,
    phone: '',
    status: (u.status as DemoUser['status']) || 'ACTIVE',
    // Everyone reports to the first (most senior) person, giving a valid starting tree.
    reportsToUserId: i === 0 ? '' : `user_${seedUsers[0].code}`,
    orgUnitId: 'ou_root',
  }));

  if (users[0]) orgUnits[0].headUserId = users[0].id;

  const features: DemoFeature[] = (t.features || []).map((f: string, i: number) => ({
    id: `feat_${i}_${slugify(f)}`,
    name: f,
    enabled: i < 4, // a few on by default so toggling shows a visible difference
  }));

  return {
    version: STORAGE_VERSION,
    templateId,
    profile: {
      orgName,
      pack: t.tenant?.pack || 'ORGANISATION',
      icon: t.icon || '🏢',
      templateName: t.name || templateId,
    },
    branding: { primaryColor: '#2563eb', secondaryColor: '#7c3aed', logoUrl: '' },
    roles,
    users,
    orgUnits,
    attendance: [],
    features,
    updatedAt: new Date().toISOString(),
  };
}

// ── persistence ──

export function load(templateId: string): DemoSnapshot {
  if (typeof window === 'undefined') return buildSeed(templateId);

  try {
    const raw = window.localStorage.getItem(keyFor(templateId));
    if (!raw) return buildSeed(templateId);

    const parsed = JSON.parse(raw) as DemoSnapshot;
    if (parsed.version !== STORAGE_VERSION) return buildSeed(templateId);

    // Tolerate a snapshot written by an older build that lacked a newer collection.
    const seed = buildSeed(templateId);
    return {
      ...seed,
      ...parsed,
      attendance: parsed.attendance ?? [],
      orgUnits: parsed.orgUnits?.length ? parsed.orgUnits : seed.orgUnits,
      features: parsed.features?.length ? parsed.features : seed.features,
    };
  } catch {
    // Corrupt JSON, or localStorage blocked (private mode) — fall back to a clean seed.
    return buildSeed(templateId);
  }
}

export function save(snapshot: DemoSnapshot): DemoSnapshot {
  const next = { ...snapshot, updatedAt: new Date().toISOString() };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(keyFor(snapshot.templateId), JSON.stringify(next));
    } catch (err) {
      // Quota exceeded or storage disabled. In-memory state still updates so the session
      // keeps working; it just will not survive a reload.
      console.warn('[demo] could not persist to localStorage:', err);
    }
  }
  return next;
}

export function reset(templateId: string): DemoSnapshot {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(keyFor(templateId));
    } catch {
      /* ignore */
    }
  }
  return buildSeed(templateId);
}

export function exportJson(snapshot: DemoSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

/** Returns the snapshot on success, or a message explaining why the import failed. */
export function importJson(
  templateId: string,
  text: string
): { ok: true; snapshot: DemoSnapshot } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That is not valid JSON.' };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'Expected a JSON object.' };

  const s = parsed as Partial<DemoSnapshot>;
  if (!Array.isArray(s.users) || !Array.isArray(s.roles)) {
    return { ok: false, error: 'Missing "users" or "roles" array — is this an ERP demo export?' };
  }
  if (s.templateId && s.templateId !== templateId) {
    return { ok: false, error: `This export is for template "${s.templateId}", not "${templateId}".` };
  }

  const merged: DemoSnapshot = { ...buildSeed(templateId), ...s, templateId, version: STORAGE_VERSION };
  return { ok: true, snapshot: save(merged) };
}

// ── derived helpers ──

export function roleOf(snapshot: DemoSnapshot, user: DemoUser): DemoRole | undefined {
  return snapshot.roles.find((r) => r.id === user.roleId);
}

export function capabilitiesOf(snapshot: DemoSnapshot, userId: string): string[] {
  const user = snapshot.users.find((u) => u.id === userId);
  if (!user) return [];
  return roleOf(snapshot, user)?.capabilities ?? [];
}

/** Does this user hold `capability`, via their role? */
export function can(snapshot: DemoSnapshot, userId: string, capability: string): boolean {
  return capabilitiesOf(snapshot, userId).includes(capability);
}

export function usersInRole(snapshot: DemoSnapshot, roleId: string): DemoUser[] {
  return snapshot.users.filter((u) => u.roleId === roleId);
}

export function reportsOf(snapshot: DemoSnapshot, userId: string): DemoUser[] {
  return snapshot.users.filter((u) => u.reportsToUserId === userId);
}

/**
 * True when making `userId` report to `newManagerId` would create a cycle, including the
 * trivial self-report case. Guards the hierarchy editor against an unrenderable tree.
 */
export function wouldCycle(snapshot: DemoSnapshot, userId: string, newManagerId: string): boolean {
  if (!newManagerId) return false;
  if (userId === newManagerId) return true;

  const seen = new Set<string>();
  let cur: string | undefined = newManagerId;
  while (cur) {
    if (cur === userId) return true;
    if (seen.has(cur)) return true; // pre-existing cycle; do not loop forever
    seen.add(cur);
    cur = snapshot.users.find((u) => u.id === cur)?.reportsToUserId || undefined;
  }
  return false;
}

/** Attendance rows for one date, indexed by userId. */
export function attendanceByUser(snapshot: DemoSnapshot, date: string): Map<string, DemoAttendance> {
  const m = new Map<string, DemoAttendance>();
  for (const a of snapshot.attendance) if (a.date === date) m.set(a.userId, a);
  return m;
}

export function attendanceSummary(snapshot: DemoSnapshot, date: string) {
  const rows = snapshot.attendance.filter((a) => a.date === date);
  const count = (s: AttendanceStatus) => rows.filter((r) => r.status === s).length;
  return {
    marked: rows.length,
    total: snapshot.users.length,
    present: count('PRESENT'),
    absent: count('ABSENT'),
    late: count('LATE'),
    leave: count('LEAVE'),
    halfDay: count('HALF_DAY'),
  };
}

export { STORAGE_VERSION };
