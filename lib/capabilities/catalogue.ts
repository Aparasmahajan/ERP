/**
 * The single capability catalogue for the whole product.
 *
 * Imported by both the server (provisioning, permission checks) and the client demo
 * sandbox, so a power that exists in a demo also exists in a real tenant.
 *
 * A capability is a verb the system understands. Roles are granted capabilities via the
 * `role_grants` tab; individual people can be granted or denied one on top via
 * `capabilities`. Nothing is ever derived from a user's `code` — that is only an identifier.
 */

export interface CapabilityDef {
  id: string;
  label: string;
  module: string;
  /** Touches money, or grants authority to others. Surfaced with a warning in the UI. */
  sensitive?: boolean;
}

export const CAPABILITY_CATALOGUE: CapabilityDef[] = [
  { id: 'people.user.read', label: 'View people', module: 'People' },
  { id: 'people.user.create', label: 'Add people', module: 'People' },
  { id: 'people.user.write', label: 'Edit people', module: 'People' },
  { id: 'people.user.archive', label: 'Archive people', module: 'People' },
  { id: 'people.role.assign', label: 'Assign roles', module: 'People', sensitive: true },

  { id: 'attendance.self.mark', label: 'Mark own attendance', module: 'Attendance' },
  { id: 'attendance.other.mark', label: "Mark others' attendance", module: 'Attendance' },
  { id: 'attendance.other.amend', label: 'Amend attendance records', module: 'Attendance', sensitive: true },
  { id: 'attendance.report.read', label: 'View attendance reports', module: 'Attendance' },

  { id: 'leave.request.submit', label: 'Request leave', module: 'Leave' },
  { id: 'leave.request.approve', label: 'Approve leave', module: 'Leave' },
  { id: 'leave.balance.view', label: 'View leave balances', module: 'Leave' },

  { id: 'marks.entry.read', label: 'View marks', module: 'Academics' },
  { id: 'marks.entry.write', label: 'Enter marks', module: 'Academics' },
  { id: 'marks.publish', label: 'Publish results', module: 'Academics', sensitive: true },

  { id: 'payroll.salary.read', label: 'View salaries', module: 'Payroll', sensitive: true },
  { id: 'payroll.run.execute', label: 'Run payroll', module: 'Payroll', sensitive: true },

  { id: 'settings.branding.manage', label: 'Change branding', module: 'Settings' },
  { id: 'settings.features.manage', label: 'Toggle features', module: 'Settings' },

  { id: 'iam.grant.assign_peer', label: 'Grant powers to peers', module: 'Admin', sensitive: true },
  { id: 'iam.policy_override', label: 'Override policy', module: 'Admin', sensitive: true },
];

export const CAPABILITY_MODULES = Array.from(new Set(CAPABILITY_CATALOGUE.map((c) => c.module)));

export const ALL_CAPABILITY_IDS = CAPABILITY_CATALOGUE.map((c) => c.id);

export function capabilityLabel(id: string): string {
  return CAPABILITY_CATALOGUE.find((c) => c.id === id)?.label ?? id;
}

export function isKnownCapability(id: string): boolean {
  return CAPABILITY_CATALOGUE.some((c) => c.id === id);
}

/**
 * How far a capability reaches. Ordered least to most reach — a grant satisfies a
 * requirement when its scope sits at or above the required level.
 */
export const SCOPES = ['SELF', 'DIRECT_REPORTS', 'ORG_UNIT', 'DOWNLINE', 'TENANT'] as const;
export type Scope = (typeof SCOPES)[number];

export function scopeRank(s: string): number {
  const i = SCOPES.indexOf(s as Scope);
  return i < 0 ? -1 : i;
}

/** Does a granted scope satisfy the required one? */
export function scopeSatisfies(granted: string, required: string): boolean {
  return scopeRank(granted) >= scopeRank(required);
}

/**
 * Starting capabilities for a seeded role, by its position in the template's role list.
 * Templates list roles most-senior first, so the top role gets everything and juniors get
 * progressively less — a sensible default matrix that an admin then edits.
 *
 * Returns capability ids paired with the scope that role should hold them at.
 */
export function presetFor(index: number, total: number): { capability: string; scope: Scope }[] {
  const seniority = total <= 1 ? 1 : 1 - index / total;
  const pick = (pred: (c: CapabilityDef) => boolean, scope: Scope) =>
    CAPABILITY_CATALOGUE.filter(pred).map((c) => ({ capability: c.id, scope }));

  // Top of the house: everything, tenant-wide.
  if (seniority > 0.95) return pick(() => true, 'TENANT');

  // Senior leadership: everything except payroll and platform admin, tenant-wide.
  if (seniority > 0.7) return pick((c) => c.module !== 'Admin' && c.module !== 'Payroll', 'TENANT');

  // Middle management: day-to-day modules over their downline, nothing sensitive.
  if (seniority > 0.5) {
    return pick(
      (c) => !c.sensitive && ['People', 'Attendance', 'Leave', 'Academics'].includes(c.module),
      'DOWNLINE'
    );
  }

  // Line staff: read people, run attendance and marks for their direct reports.
  if (seniority > 0.3) {
    const ids = [
      'people.user.read',
      'attendance.self.mark',
      'attendance.other.mark',
      'attendance.report.read',
      'leave.request.submit',
      'marks.entry.read',
      'marks.entry.write',
    ];
    return ids.map((capability) => ({ capability, scope: 'DIRECT_REPORTS' as Scope }));
  }

  // Everyone else: themselves only.
  return ['attendance.self.mark', 'leave.request.submit', 'marks.entry.read'].map((capability) => ({
    capability,
    scope: 'SELF' as Scope,
  }));
}
