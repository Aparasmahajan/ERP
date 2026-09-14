/**
 * Permission checks against Google Sheets.
 *
 * Power is resolved in layers, most general first:
 *
 *   1. role_grants   — the capabilities each ROLE confers, at some scope
 *   2. capabilities  — per-person overrides, either GRANT or REVOKE
 *
 * A REVOKE override always wins, so you can take one power away from one person without
 * inventing a bespoke role. Expired overrides are ignored.
 *
 * Nothing here consults a user's `code`. That field is an identifier (employee/roll
 * number) and confers no authority — two people with different codes in the same role have
 * identical power.
 *
 * The previous version of this file read a `capabilities` sheet keyed by user only, had no
 * role→capability mapping to consult, and had zero importers.
 */

import { list } from '@/lib/sheets/erpSheets';
import { scopeSatisfies, type Scope } from '@/lib/capabilities/catalogue';

interface RoleGrantRow {
  id: string;
  tenantId: string;
  roleId: string;
  capability: string;
  scope: string;
  canDelegate: string;
}

interface UserRoleRow {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  validFrom: string;
  validTo: string;
  isActing: string;
}

interface CapabilityOverrideRow {
  id: string;
  tenantId: string;
  userId: string;
  capability: string;
  /** GRANT adds a power; REVOKE removes one the role would otherwise confer. */
  mode: string;
  scope: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt: string;
  delegable: string;
}

export interface EffectiveCapability {
  capability: string;
  scope: Scope;
  /** Where it came from, useful for showing "via Head of Department" in the UI. */
  source: 'ROLE' | 'OVERRIDE';
  roleId?: string;
}

function isExpired(iso: string): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && t < Date.now();
}

/** A role assignment counts only inside its validity window. */
function isActiveAssignment(r: UserRoleRow): boolean {
  const now = Date.now();
  if (r.validFrom) {
    const from = Date.parse(r.validFrom);
    if (Number.isFinite(from) && from > now) return false;
  }
  if (r.validTo) {
    const to = Date.parse(r.validTo);
    if (Number.isFinite(to) && to < now) return false;
  }
  return true;
}

/** Role ids a user currently holds. */
export async function rolesOf(tenantId: string, userId: string): Promise<string[]> {
  const rows = await list<UserRoleRow>('user_roles', tenantId);
  return rows.filter((r) => r.userId === userId && isActiveAssignment(r)).map((r) => r.roleId);
}

/**
 * Every capability a user effectively holds, with the widest scope for each.
 * Role grants are unioned, then per-person overrides are applied on top.
 */
export async function effectiveCapabilities(
  tenantId: string,
  userId: string
): Promise<EffectiveCapability[]> {
  const [userRoles, grants, overrides] = await Promise.all([
    list<UserRoleRow>('user_roles', tenantId),
    list<RoleGrantRow>('role_grants', tenantId),
    list<CapabilityOverrideRow>('capabilities', tenantId),
  ]);

  const heldRoleIds = new Set(
    userRoles.filter((r) => r.userId === userId && isActiveAssignment(r)).map((r) => r.roleId)
  );

  // Union role grants, keeping the widest scope when two roles grant the same capability.
  const effective = new Map<string, EffectiveCapability>();
  for (const g of grants) {
    if (!heldRoleIds.has(g.roleId)) continue;
    const existing = effective.get(g.capability);
    if (!existing || scopeSatisfies(g.scope, existing.scope)) {
      effective.set(g.capability, {
        capability: g.capability,
        scope: g.scope as Scope,
        source: 'ROLE',
        roleId: g.roleId,
      });
    }
  }

  // Per-person overrides. REVOKE wins outright; GRANT widens or adds.
  for (const o of overrides) {
    if (o.userId !== userId) continue;
    if (isExpired(o.expiresAt)) continue;

    if (o.mode === 'REVOKE') {
      effective.delete(o.capability);
      continue;
    }
    const existing = effective.get(o.capability);
    if (!existing || scopeSatisfies(o.scope, existing.scope)) {
      effective.set(o.capability, {
        capability: o.capability,
        scope: (o.scope as Scope) || 'SELF',
        source: 'OVERRIDE',
      });
    }
  }

  return [...effective.values()];
}

/** Capability ids only — handy for shipping to a client. */
export async function capabilityIdsOf(tenantId: string, userId: string): Promise<string[]> {
  return (await effectiveCapabilities(tenantId, userId)).map((c) => c.capability);
}

export interface CanOptions {
  /** Minimum reach required. Defaults to SELF. */
  scope?: Scope;
}

/**
 * Does `userId` hold `capability` at at least the required scope?
 *
 * Fails closed: any error reading the sheet returns false rather than allowing the action.
 */
export async function can(
  tenantId: string,
  userId: string,
  capability: string,
  options: CanOptions = {}
): Promise<boolean> {
  try {
    const required = options.scope ?? 'SELF';
    const held = await effectiveCapabilities(tenantId, userId);
    const match = held.find((c) => c.capability === capability);
    if (!match) return false;
    return scopeSatisfies(match.scope, required);
  } catch (err) {
    console.error('[can] permission check failed, denying:', err);
    return false;
  }
}

/** Throws with a readable message when the check fails. For use in API routes. */
export async function assertCan(
  tenantId: string,
  userId: string,
  capability: string,
  options: CanOptions = {}
): Promise<void> {
  const ok = await can(tenantId, userId, capability, options);
  if (!ok) {
    throw new PermissionError(capability, options.scope ?? 'SELF');
  }
}

export class PermissionError extends Error {
  readonly capability: string;
  readonly scope: string;
  readonly status = 403;

  constructor(capability: string, scope: string) {
    super(`Missing capability "${capability}" at scope ${scope}`);
    this.name = 'PermissionError';
    this.capability = capability;
    this.scope = scope;
  }
}

/** May this user pass `capability` on to someone else? */
export async function canDelegate(
  tenantId: string,
  userId: string,
  capability: string
): Promise<boolean> {
  try {
    const [userRoles, grants, overrides] = await Promise.all([
      list<UserRoleRow>('user_roles', tenantId),
      list<RoleGrantRow>('role_grants', tenantId),
      list<CapabilityOverrideRow>('capabilities', tenantId),
    ]);

    const heldRoleIds = new Set(
      userRoles.filter((r) => r.userId === userId && isActiveAssignment(r)).map((r) => r.roleId)
    );

    const viaRole = grants.some(
      (g) => heldRoleIds.has(g.roleId) && g.capability === capability && String(g.canDelegate) === 'true'
    );
    if (viaRole) return true;

    return overrides.some(
      (o) =>
        o.userId === userId &&
        o.capability === capability &&
        o.mode !== 'REVOKE' &&
        String(o.delegable) === 'true' &&
        !isExpired(o.expiresAt)
    );
  } catch (err) {
    console.error('[canDelegate] check failed, denying:', err);
    return false;
  }
}

/**
 * Everyone `viewerId` may SEE, and why.
 *
 * Two sources, deliberately kept apart:
 *   tree — descendants via positions.reportsToUserId. Carries authority, so a manager
 *          can both see and approve for these people.
 *   link — position_link dotted lines. Visibility ONLY. A subject lead can see the
 *          teachers who teach their subject without acquiring the right to approve
 *          their leave, which belongs to the line manager alone.
 *
 * Callers that gate an approval must use the tree set. Callers that gate a read may
 * use both.
 */
export async function visibleUserIds(
  tenantId: string,
  viewerId: string
): Promise<{ tree: string[]; link: string[]; all: string[] }> {
  const [positions, links] = await Promise.all([
    list<{ userId: string; reportsToUserId: string }>('positions', tenantId),
    list<{ userId: string; linkedToUserId: string; validFrom: string; validTo: string }>(
      'position_link',
      tenantId
    ),
  ]);

  // Walk the reporting tree downwards from the viewer.
  const childrenOf = new Map<string, string[]>();
  for (const p of positions) {
    if (!p.reportsToUserId) continue;
    const arr = childrenOf.get(p.reportsToUserId) ?? [];
    arr.push(p.userId);
    childrenOf.set(p.reportsToUserId, arr);
  }

  const tree: string[] = [];
  const seen = new Set<string>([viewerId]);
  const queue = [...(childrenOf.get(viewerId) ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue; // a pre-existing cycle must not loop forever
    seen.add(id);
    tree.push(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }

  const now = Date.now();
  const live = (r: { validFrom?: string; validTo?: string }) => {
    if (r.validFrom) {
      const f = Date.parse(r.validFrom);
      if (Number.isFinite(f) && f > now) return false;
    }
    if (r.validTo) {
      const t = Date.parse(r.validTo);
      if (Number.isFinite(t) && t < now) return false;
    }
    return true;
  };

  const link = [
    ...new Set(links.filter((l) => l.linkedToUserId === viewerId && live(l)).map((l) => l.userId)),
  ].filter((id) => !tree.includes(id));

  return { tree, link, all: [...new Set([...tree, ...link])] };
}

export default {
  can,
  assertCan,
  canDelegate,
  effectiveCapabilities,
  capabilityIdsOf,
  rolesOf,
  visibleUserIds,
};
