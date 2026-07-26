import { NextRequest, NextResponse } from 'next/server';
import { list, append, update, audit, findBy } from '@/lib/sheets/erpSheets';
import { can, PermissionError, rolesOf, effectiveCapabilities } from '@/lib/permissions/can';
import { requireSuperadminAuth } from '@/lib/auth/middleware';

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

let seq = 0;
function newId(): string {
  seq += 1;
  return `ur_${Date.now().toString(36)}${seq.toString(36)}`;
}

/**
 * GET /api/user-roles?tenantId=…            all assignments, with role titles resolved
 * GET /api/user-roles?tenantId=…&userId=…   one person, plus their effective capabilities
 */
export async function GET(request: NextRequest) {
  const denied = await requireSuperadminAuth(request);
  if (denied) return denied;

  try {
    const sp = request.nextUrl.searchParams;
    const tenantId = sp.get('tenantId');
    const userId = sp.get('userId');

    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });

    const [assignments, roles, users] = await Promise.all([
      list<UserRoleRow>('user_roles', tenantId),
      list<{ id: string; title: string; key: string; color: string }>('roles', tenantId),
      list<{ id: string; name: string; code: string }>('users', tenantId),
    ]);

    const roleById = new Map(roles.map((r) => [r.id, r]));
    const userById = new Map(users.map((u) => [u.id, u]));

    const rows = (userId ? assignments.filter((a) => a.userId === userId) : assignments).map((a) => ({
      ...a,
      roleTitle: roleById.get(a.roleId)?.title ?? '(unknown role)',
      roleKey: roleById.get(a.roleId)?.key ?? '',
      userName: userById.get(a.userId)?.name ?? '(unknown user)',
      userCode: userById.get(a.userId)?.code ?? '',
    }));

    // For a single person, include what those roles actually let them do — the whole point
    // of the role → role_grants → capability chain.
    const capabilities = userId ? await effectiveCapabilities(tenantId, userId) : undefined;

    return NextResponse.json({ data: rows, capabilities });
  } catch (error) {
    console.error('Read user roles failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not read role assignments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-roles — assign a role to a person.
 * body: { tenantId, userId, roleId, actorId, isActing?, validFrom?, validTo? }
 *
 * Requires `people.role.assign`. Refuses duplicates so the same person cannot accumulate
 * the same role twice, which would double-count them in every "people per role" tally.
 */
export async function POST(request: NextRequest) {
  const denied = await requireSuperadminAuth(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { tenantId, userId, roleId, actorId, isActing, validFrom, validTo } = body;

    const missing = ['tenantId', 'userId', 'roleId', 'actorId'].filter((f) => !body[f]);
    if (missing.length) {
      return NextResponse.json({ error: `Missing required field(s): ${missing.join(', ')}` }, { status: 400 });
    }

    if (!(await can(tenantId, actorId, 'people.role.assign', { scope: 'DOWNLINE' }))) {
      throw new PermissionError('people.role.assign', 'DOWNLINE');
    }

    // Both ends must exist, or we would write an assignment pointing at nothing.
    const [user, role] = await Promise.all([
      findBy<{ id: string; name: string }>('users', 'id', userId, tenantId),
      findBy<{ id: string; title: string }>('roles', 'id', roleId, tenantId),
    ]);
    if (!user) return NextResponse.json({ error: `No user "${userId}" in this tenant` }, { status: 404 });
    if (!role) return NextResponse.json({ error: `No role "${roleId}" in this tenant` }, { status: 404 });

    const existing = (await list<UserRoleRow>('user_roles', tenantId)).find(
      (a) => a.userId === userId && a.roleId === roleId && !a.validTo
    );
    if (existing) {
      return NextResponse.json(
        { error: `${user.name} already holds ${role.title}.`, id: existing.id },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const row: UserRoleRow = {
      id: newId(),
      tenantId,
      userId,
      roleId,
      validFrom: validFrom || now,
      validTo: validTo || '',
      isActing: Boolean(isActing),
      assignedBy: actorId,
      assignedAt: now,
    };
    await append('user_roles', row);

    await audit({
      tenantId,
      action: 'GRANT',
      entityType: 'user_role',
      entityId: row.id,
      actorId,
      after: { userId, roleId, roleTitle: role.title, userName: user.name },
      reason: `Assigned ${role.title} to ${user.name}`,
    });

    return NextResponse.json(
      { success: true, id: row.id, roles: await rolesOf(tenantId, userId) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message, capability: error.capability }, { status: 403 });
    }
    console.error('Assign role failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not assign the role' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-roles?tenantId=…&id=…&actorId=…
 *
 * Ends an assignment by stamping `validTo` rather than deleting the row, so the history of
 * who held what remains auditable. Refuses to leave a person with no role at all.
 */
export async function DELETE(request: NextRequest) {
  const denied = await requireSuperadminAuth(request);
  if (denied) return denied;

  try {
    const sp = request.nextUrl.searchParams;
    const tenantId = sp.get('tenantId');
    const id = sp.get('id');
    const actorId = sp.get('actorId') || 'system';

    if (!tenantId || !id) {
      return NextResponse.json({ error: 'tenantId and id are required' }, { status: 400 });
    }
    if (!(await can(tenantId, actorId, 'people.role.assign', { scope: 'DOWNLINE' }))) {
      return NextResponse.json({ error: 'Missing capability "people.role.assign"' }, { status: 403 });
    }

    const all = await list<UserRoleRow>('user_roles', tenantId);
    const target = all.find((a) => a.id === id);
    if (!target) return NextResponse.json({ error: `No assignment "${id}"` }, { status: 404 });

    const stillHeld = all.filter(
      (a) => a.userId === target.userId && a.id !== id && !a.validTo
    );
    if (stillHeld.length === 0) {
      return NextResponse.json(
        { error: 'That is their only role. Assign a replacement first, or they will have no access at all.' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    await update('user_roles', 'id', id, { validTo: now });

    await audit({
      tenantId,
      action: 'REVOKE',
      entityType: 'user_role',
      entityId: id,
      actorId,
      before: { userId: target.userId, roleId: target.roleId },
      after: { validTo: now },
    });

    return NextResponse.json({ success: true, roles: await rolesOf(tenantId, target.userId) });
  } catch (error) {
    console.error('Revoke role failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not end the assignment' },
      { status: 500 }
    );
  }
}
