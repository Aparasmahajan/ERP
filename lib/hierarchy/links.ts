/**
 * Dotted-line relationships and temporary role delegation.
 *
 * ── Why two mechanisms instead of "two managers" ──────────────────────────
 *
 * `positions.reportsToUserId` holds exactly ONE manager per person. That is
 * deliberate: it is the line of authority, and it answers "who approves this leave
 * request?" unambiguously. Allow two full managers and every approval becomes either
 * double-handled or dropped.
 *
 * Real organisations still need more than one relationship per person:
 *
 *   A teacher reports to their Head of Department for leave and appraisal, but
 *   answers to a Class Coordinator for one particular class, and may teach three
 *   subjects each with its own subject lead.
 *
 * So there are two tables with different powers:
 *
 *   positions      one parent   -> APPROVALS + DOWNLINE scope        (authority)
 *   position_link  many links   -> VISIBILITY only, never approvals  (matrix)
 *
 * A link can widen what you can *see*; it can never grant the right to approve or to
 * assign roles. That keeps the approval chain single-threaded while letting a subject
 * lead view the teachers who teach their subject.
 *
 * ── Acting delegation ────────────────────────────────────────────────────
 *
 * "The class teacher is away; someone above her grants another teacher her powers
 * until she is back."
 *
 * That is not a new mechanism — it is a role assignment in `user_roles` with
 * `isActing = true` and a `validTo`. `rolesOf()` already filters on the validity
 * window, so the delegation expires by itself with no cleanup job. The only new rule
 * is who may create one: see `canDelegateRole` below.
 */

import { list, append, update, audit, findBy } from '@/lib/sheets/erpSheets';

/** What a dotted line means. None of these confer approval rights. */
export const LINK_KINDS = [
  'FUNCTIONAL_LEAD',   // matrix manager for a function
  'SUBJECT_LEAD',      // owns a subject across classes (schools)
  'PROJECT_MANAGER',   // owns a project this person works on
  'CLASS_COORDINATOR', // owns a class this teacher teaches
  'MENTOR',            // pastoral, read-only
  'ACADEMIC_ADVISOR',
  'GUARDIAN_OF',       // parent -> student
  'DEPUTY_FOR',        // standing deputy; see note in canDelegateRole
] as const;

export type LinkKind = (typeof LINK_KINDS)[number];

export interface PositionLinkRow {
  id: string;
  tenantId: string;
  /** The person being linked FROM (the subordinate / the one being seen). */
  userId: string;
  /** The person the link points TO (the dotted-line manager / viewer). */
  linkedToUserId: string;
  kind: string;
  /** Optional qualifier, e.g. the subject or class this link is scoped to. */
  subject: string;
  /** 0..1 — how much of this person's time the link accounts for. Advisory. */
  weight: string;
  validFrom: string;
  validTo: string;
  createdBy: string;
  createdAt: string;
}

interface UserRoleRow {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  validFrom: string;
  validTo: string;
  isActing: string | boolean;
  assignedBy: string;
  assignedAt: string;
}

interface PositionRow {
  id: string;
  tenantId: string;
  userId: string;
  reportsToUserId: string;
}

let seq = 0;
const newId = (p: string) => {
  seq += 1;
  return `${p}_${Date.now().toString(36)}${seq.toString(36)}`;
};

/** Inside its validity window right now. */
export function isLive(row: { validFrom?: string; validTo?: string }): boolean {
  const now = Date.now();
  if (row.validFrom) {
    const f = Date.parse(row.validFrom);
    if (Number.isFinite(f) && f > now) return false;
  }
  if (row.validTo) {
    const t = Date.parse(row.validTo);
    if (Number.isFinite(t) && t < now) return false;
  }
  return true;
}

// ── dotted lines ──────────────────────────────────────────────────────────

export async function linksForTenant(tenantId: string): Promise<PositionLinkRow[]> {
  return (await list<PositionLinkRow>('position_link', tenantId)).filter(isLive);
}

/** People `viewerId` can see through dotted lines (not through the reporting tree). */
export async function linkedSubordinates(tenantId: string, viewerId: string): Promise<string[]> {
  const links = await linksForTenant(tenantId);
  return [...new Set(links.filter((l) => l.linkedToUserId === viewerId).map((l) => l.userId))];
}

/** The dotted-line managers of `userId`, with the kind of each relationship. */
export async function linkedManagers(
  tenantId: string,
  userId: string
): Promise<{ userId: string; kind: string; subject: string }[]> {
  const links = await linksForTenant(tenantId);
  return links
    .filter((l) => l.userId === userId)
    .map((l) => ({ userId: l.linkedToUserId, kind: l.kind, subject: l.subject }));
}

export interface AddLinkInput {
  tenantId: string;
  userId: string;
  linkedToUserId: string;
  kind: LinkKind | string;
  subject?: string;
  weight?: number;
  validFrom?: string;
  validTo?: string;
  actorId: string;
}

export async function addLink(
  input: AddLinkInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (input.userId === input.linkedToUserId) {
    return { ok: false, error: 'A person cannot be their own dotted-line manager.' };
  }
  if (!LINK_KINDS.includes(input.kind as LinkKind)) {
    return { ok: false, error: `Unknown link kind "${input.kind}". Expected one of: ${LINK_KINDS.join(', ')}` };
  }

  const [a, b] = await Promise.all([
    findBy<{ id: string; name: string }>('users', 'id', input.userId, input.tenantId),
    findBy<{ id: string; name: string }>('users', 'id', input.linkedToUserId, input.tenantId),
  ]);
  if (!a) return { ok: false, error: 'That person is not in this organisation.' };
  if (!b) return { ok: false, error: 'That dotted-line manager is not in this organisation.' };

  // Dotted lines are additive and non-authoritative, so duplicates are just noise —
  // reject an identical live link rather than stacking them.
  const existing = (await linksForTenant(input.tenantId)).find(
    (l) =>
      l.userId === input.userId &&
      l.linkedToUserId === input.linkedToUserId &&
      l.kind === input.kind &&
      (l.subject || '') === (input.subject || '')
  );
  if (existing) {
    return { ok: false, error: `${b.name} already has that link to ${a.name}.` };
  }

  const now = new Date().toISOString();
  const id = newId('plink');
  await append('position_link', {
    id,
    tenantId: input.tenantId,
    userId: input.userId,
    linkedToUserId: input.linkedToUserId,
    kind: input.kind,
    subject: input.subject || '',
    weight: String(input.weight ?? 0),
    validFrom: input.validFrom || now,
    validTo: input.validTo || '',
    createdBy: input.actorId,
    createdAt: now,
  });

  await audit({
    tenantId: input.tenantId,
    action: 'CREATE',
    entityType: 'position_link',
    entityId: id,
    actorId: input.actorId,
    after: { userId: input.userId, linkedToUserId: input.linkedToUserId, kind: input.kind, subject: input.subject },
    reason: `${b.name} is ${input.kind} for ${a.name}`,
  });

  return { ok: true, id };
}

/** End a dotted line by stamping validTo, so the history survives. */
export async function endLink(
  tenantId: string,
  linkId: string,
  actorId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const ok = await update('position_link', 'id', linkId, { validTo: now });
  if (ok) {
    await audit({
      tenantId,
      action: 'DELETE',
      entityType: 'position_link',
      entityId: linkId,
      actorId,
      after: { validTo: now },
    });
  }
  return ok;
}

// ── acting delegation ─────────────────────────────────────────────────────

/**
 * Is `actorId` allowed to delegate `targetUserId`'s role to someone else?
 *
 * The rule the requirement describes is "someone one level above". Implemented as:
 * the actor must be an ancestor of the target in the reporting tree. A peer cannot
 * hand out a colleague's authority, and nobody can delegate upwards.
 *
 * DEPUTY_FOR is deliberately NOT accepted here. A standing deputy may see their
 * principal's downline, but letting a dotted line create authority would reintroduce
 * exactly the ambiguity the two-table split exists to prevent.
 */
export async function canDelegateRole(
  tenantId: string,
  actorId: string,
  targetUserId: string
): Promise<boolean> {
  if (actorId === targetUserId) return false;

  const positions = await list<PositionRow>('positions', tenantId);
  const parentOf = new Map(positions.map((p) => [p.userId, p.reportsToUserId]));

  const seen = new Set<string>();
  let cursor: string | undefined = parentOf.get(targetUserId) || undefined;
  while (cursor) {
    if (cursor === actorId) return true;
    if (seen.has(cursor)) break; // defensive: a pre-existing cycle must not hang
    seen.add(cursor);
    cursor = parentOf.get(cursor) || undefined;
  }
  return false;
}

export interface DelegateInput {
  tenantId: string;
  /** Whose authority is being handed out. */
  fromUserId: string;
  /** Who receives it, temporarily. */
  toUserId: string;
  /** When the cover ends. Required — an open-ended delegation is a permanent one. */
  until: string;
  actorId: string;
  reason?: string;
}

export async function delegateRole(
  input: DelegateInput
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  if (input.fromUserId === input.toUserId) {
    return { ok: false, error: 'Cannot delegate someone their own role.' };
  }
  if (!input.until) {
    return { ok: false, error: 'An end date is required, otherwise the cover never lapses.' };
  }
  const until = Date.parse(input.until);
  if (!Number.isFinite(until)) return { ok: false, error: 'That end date is not valid.' };
  if (until < Date.now()) return { ok: false, error: 'The end date is in the past.' };

  if (!(await canDelegateRole(input.tenantId, input.actorId, input.fromUserId))) {
    return {
      ok: false,
      error: 'Only someone above this person in the reporting line can delegate their role.',
    };
  }

  const [from, to] = await Promise.all([
    findBy<{ id: string; name: string }>('users', 'id', input.fromUserId, input.tenantId),
    findBy<{ id: string; name: string }>('users', 'id', input.toUserId, input.tenantId),
  ]);
  if (!from || !to) return { ok: false, error: 'Both people must be in this organisation.' };

  const assignments = await list<UserRoleRow>('user_roles', input.tenantId);
  const theirRoles = assignments.filter((a) => a.userId === input.fromUserId && isLive(a));
  if (theirRoles.length === 0) {
    return { ok: false, error: `${from.name} holds no active role to delegate.` };
  }

  const now = new Date().toISOString();
  const ids: string[] = [];

  for (const r of theirRoles) {
    // Already covering this exact role? Do not stack duplicates.
    const already = assignments.find(
      (a) => a.userId === input.toUserId && a.roleId === r.roleId && isLive(a)
    );
    if (already) continue;

    const id = newId('ur');
    await append('user_roles', {
      id,
      tenantId: input.tenantId,
      userId: input.toUserId,
      roleId: r.roleId,
      validFrom: now,
      // The window is what makes this temporary. rolesOf() filters on it, so the
      // delegation lapses on its own with no scheduled job to run.
      validTo: input.until,
      isActing: true,
      assignedBy: input.actorId,
      assignedAt: now,
    });
    ids.push(id);
  }

  if (ids.length === 0) {
    // Common in schools: two teachers share the Faculty role, so there is no *role*
    // to hand over. What actually needs covering is her specific responsibility —
    // class teacher of 9A, subject lead for Physics — which lives in position_link.
    return {
      ok: false,
      error:
        `${to.name} already holds every role ${from.name} has, so there is no role to delegate. ` +
        `If you meant to cover a specific responsibility (a class or a subject), delegate ` +
        `${from.name}'s assignments instead.`,
    };
  }

  await audit({
    tenantId: input.tenantId,
    action: 'GRANT',
    entityType: 'user_role',
    entityId: ids.join(','),
    actorId: input.actorId,
    after: { actingFor: input.fromUserId, grantedTo: input.toUserId, until: input.until, roles: ids.length },
    reason: input.reason || `Acting cover for ${from.name} until ${input.until}`,
  });

  return { ok: true, ids };
}

/**
 * Cover someone's specific responsibilities, not their role.
 *
 * This is the half that actually matters in a school. Two teachers usually share the
 * same Faculty role, so `delegateRole` finds nothing to hand over — what distinguishes
 * the class teacher of 9A is a `position_link`, not a role. This copies the absent
 * person's dotted lines to the stand-in with an end date, so the stand-in shows up as
 * class coordinator / subject lead for exactly as long as the cover lasts.
 *
 * The originals are left untouched: the absent person keeps their assignments and
 * simply has a deputy alongside them until `until`.
 */
export async function delegateLinks(input: {
  tenantId: string;
  fromUserId: string;
  toUserId: string;
  until: string;
  actorId: string;
  /** Restrict to certain kinds, e.g. only CLASS_COORDINATOR. Omit for all. */
  kinds?: string[];
  reason?: string;
}): Promise<{ ok: true; copied: number } | { ok: false; error: string }> {
  if (input.fromUserId === input.toUserId) {
    return { ok: false, error: 'Cannot delegate someone their own assignments.' };
  }
  if (!input.until) {
    return { ok: false, error: 'An end date is required, otherwise the cover never lapses.' };
  }
  const until = Date.parse(input.until);
  if (!Number.isFinite(until)) return { ok: false, error: 'That end date is not valid.' };
  if (until < Date.now()) return { ok: false, error: 'The end date is in the past.' };

  if (!(await canDelegateRole(input.tenantId, input.actorId, input.fromUserId))) {
    return {
      ok: false,
      error: 'Only someone above this person in the reporting line can delegate their assignments.',
    };
  }

  const [from, to] = await Promise.all([
    findBy<{ id: string; name: string }>('users', 'id', input.fromUserId, input.tenantId),
    findBy<{ id: string; name: string }>('users', 'id', input.toUserId, input.tenantId),
  ]);
  if (!from || !to) return { ok: false, error: 'Both people must be in this organisation.' };

  const live = await linksForTenant(input.tenantId);

  // The absent person's own dotted lines — the ones pointing AT them as the owner of a
  // class or subject, i.e. where they are the linkedTo party.
  let theirs = live.filter((l) => l.linkedToUserId === input.fromUserId);
  if (input.kinds?.length) {
    theirs = theirs.filter((l) => input.kinds!.includes(l.kind));
  }
  if (theirs.length === 0) {
    return { ok: false, error: `${from.name} has no assignments of that kind to cover.` };
  }

  const now = new Date().toISOString();
  let copied = 0;

  for (const l of theirs) {
    const already = live.find(
      (x) =>
        x.userId === l.userId &&
        x.linkedToUserId === input.toUserId &&
        x.kind === l.kind &&
        (x.subject || '') === (l.subject || '')
    );
    if (already) continue;

    await append('position_link', {
      id: newId('plink'),
      tenantId: input.tenantId,
      userId: l.userId,
      linkedToUserId: input.toUserId,
      kind: l.kind,
      subject: l.subject,
      weight: l.weight,
      validFrom: now,
      validTo: input.until, // what makes it temporary
      createdBy: input.actorId,
      createdAt: now,
    });
    copied++;
  }

  if (copied === 0) {
    return { ok: false, error: `${to.name} already covers all of those assignments.` };
  }

  await audit({
    tenantId: input.tenantId,
    action: 'GRANT',
    entityType: 'position_link',
    entityId: `cover:${input.fromUserId}->${input.toUserId}`,
    actorId: input.actorId,
    after: { coveringFor: input.fromUserId, grantedTo: input.toUserId, until: input.until, links: copied },
    reason: input.reason || `Covering ${from.name}'s assignments until ${input.until}`,
  });

  return { ok: true, copied };
}

/** End an acting assignment early. */
export async function revokeDelegation(
  tenantId: string,
  assignmentId: string,
  actorId: string
): Promise<{ ok: boolean; error?: string }> {
  const all = await list<UserRoleRow>('user_roles', tenantId);
  const row = all.find((a) => a.id === assignmentId);
  if (!row) return { ok: false, error: 'No such assignment.' };
  if (String(row.isActing) !== 'true') {
    return { ok: false, error: 'That is a substantive role, not an acting one. End it from the People page instead.' };
  }

  const now = new Date().toISOString();
  await update('user_roles', 'id', assignmentId, { validTo: now });
  await audit({
    tenantId,
    action: 'REVOKE',
    entityType: 'user_role',
    entityId: assignmentId,
    actorId,
    after: { validTo: now },
    reason: 'Acting cover ended early',
  });
  return { ok: true };
}

/** Acting assignments currently in force, for display. */
export async function activeDelegations(tenantId: string): Promise<
  { id: string; userId: string; roleId: string; until: string; assignedBy: string }[]
> {
  const all = await list<UserRoleRow>('user_roles', tenantId);
  return all
    .filter((a) => String(a.isActing) === 'true' && isLive(a))
    .map((a) => ({
      id: a.id,
      userId: a.userId,
      roleId: a.roleId,
      until: a.validTo,
      assignedBy: a.assignedBy,
    }));
}
