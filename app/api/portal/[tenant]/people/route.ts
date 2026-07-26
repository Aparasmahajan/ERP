import { NextRequest, NextResponse } from 'next/server';
import { append, list, update, audit, findBy } from '@/lib/sheets/erpSheets';
import { sessionForTenant, TENANT_COOKIE, createInviteToken, inviteUrl } from '@/lib/auth/tenantAuth';
import { can, PermissionError } from '@/lib/permissions/can';

/**
 * People management from inside the tenant portal.
 *
 * Every handler resolves the tenant from the session (never from the body), so a caller
 * cannot write into someone else's tenant by passing a different id.
 *
 * Capabilities enforced:
 *   POST   people.user.create   (+ people.role.assign, since creating implies a role)
 *   PATCH  people.user.write    (+ people.role.assign when the role changes)
 *   DELETE people.user.archive
 */

let seq = 0;
const newId = (p: string) => {
  seq += 1;
  return `${p}_${Date.now().toString(36)}${seq.toString(36)}`;
};

interface Ctx {
  params: Promise<{ tenant: string }>;
}

async function authed(request: NextRequest, ctx: Ctx) {
  const { tenant: slug } = await ctx.params;
  const session = sessionForTenant(request.cookies.get(TENANT_COOKIE)?.value, slug);
  return { slug, session };
}

/** POST — add a person, assign their role, and place them in the hierarchy. */
export async function POST(request: NextRequest, ctx: Ctx) {
  const { session } = await authed(request, ctx);
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const tenantId = session.tenantId;

  try {
    const body = await request.json();
    const { name, code, email, phone, roleId, reportsToUserId, orgUnitId, status } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'A name is required.' }, { status: 400 });
    if (!roleId) return NextResponse.json({ error: 'A role is required.' }, { status: 400 });

    if (!(await can(tenantId, session.userId, 'people.user.create', { scope: 'DOWNLINE' }))) {
      throw new PermissionError('people.user.create', 'DOWNLINE');
    }
    // Creating someone necessarily assigns them a role, so that power is required too.
    if (!(await can(tenantId, session.userId, 'people.role.assign', { scope: 'DOWNLINE' }))) {
      throw new PermissionError('people.role.assign', 'DOWNLINE');
    }

    const role = await findBy<{ id: string; title: string }>('roles', 'id', roleId, tenantId);
    if (!role) return NextResponse.json({ error: 'That role does not exist.' }, { status: 404 });

    const existing = await list<{ id: string; code: string }>('users', tenantId);
    const wanted = String(code || '').trim();
    if (wanted && existing.some((u) => (u.code || '').toLowerCase() === wanted.toLowerCase())) {
      return NextResponse.json({ error: `Code "${wanted}" is already in use.` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const userId = newId('usr');

    // status INVITED with an empty passwordHash means "cannot sign in yet" — they must
    // accept an invite first, exactly like the tenant admin did.
    await append('users', {
      id: userId,
      tenantId,
      code: wanted,
      name: String(name).trim(),
      email: String(email || '').trim(),
      phone: String(phone || '').trim(),
      passwordHash: '',
      status: status === 'ACTIVE' ? 'ACTIVE' : 'INVITED',
      avatarUrl: '',
      createdAt: now,
      createdBy: session.userId,
    });

    await append('user_roles', {
      id: newId('ur'),
      tenantId,
      userId,
      roleId,
      validFrom: now,
      validTo: '',
      isActing: false,
      assignedBy: session.userId,
      assignedAt: now,
    });

    const units = await list<{ id: string }>('org_units', tenantId);
    await append('positions', {
      id: newId('pos'),
      tenantId,
      userId,
      reportsToUserId: reportsToUserId || session.userId,
      orgUnitId: orgUnitId || units[0]?.id || '',
      titleOverride: '',
      validFrom: now,
      validTo: '',
      sessionId: `SESSION_${new Date().getFullYear()}`,
    });

    await audit({
      tenantId,
      action: 'CREATE',
      entityType: 'user',
      entityId: userId,
      actorId: session.userId,
      after: { name, code: wanted, roleId, roleTitle: role.title },
    });

    // Only useful if they were given an email; otherwise there is nowhere to send it.
    const invite = email ? inviteUrl(createInviteToken(tenantId, userId)) : null;

    return NextResponse.json({ success: true, id: userId, inviteUrl: invite }, { status: 201 });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message, capability: error.capability }, { status: 403 });
    }
    console.error('Add person failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not add that person' },
      { status: 500 }
    );
  }
}

/** PATCH — edit details, change role, or move someone in the hierarchy. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { session } = await authed(request, ctx);
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const tenantId = session.tenantId;

  try {
    const body = await request.json();
    const { userId, name, code, email, phone, status, roleId, reportsToUserId } = body;
    if (!userId) return NextResponse.json({ error: 'userId is required.' }, { status: 400 });

    if (!(await can(tenantId, session.userId, 'people.user.write', { scope: 'DOWNLINE' }))) {
      throw new PermissionError('people.user.write', 'DOWNLINE');
    }

    const target = await findBy<any>('users', 'id', userId, tenantId);
    if (!target) return NextResponse.json({ error: 'No such person in this organisation.' }, { status: 404 });

    // Codes must stay unique or two people become indistinguishable in exports.
    if (code !== undefined) {
      const wanted = String(code).trim();
      if (wanted) {
        const clash = (await list<any>('users', tenantId)).find(
          (u) => u.id !== userId && (u.code || '').toLowerCase() === wanted.toLowerCase()
        );
        if (clash) {
          return NextResponse.json({ error: `Code "${wanted}" belongs to ${clash.name}.` }, { status: 409 });
        }
      }
    }

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (code !== undefined) patch.code = String(code).trim();
    if (email !== undefined) patch.email = String(email).trim();
    if (phone !== undefined) patch.phone = String(phone).trim();
    if (status !== undefined) patch.status = status;
    if (Object.keys(patch).length) await update('users', 'id', userId, patch);

    // ── role change ──
    if (roleId) {
      if (!(await can(tenantId, session.userId, 'people.role.assign', { scope: 'DOWNLINE' }))) {
        throw new PermissionError('people.role.assign', 'DOWNLINE');
      }
      const role = await findBy<any>('roles', 'id', roleId, tenantId);
      if (!role) return NextResponse.json({ error: 'That role does not exist.' }, { status: 404 });

      const assignments = await list<any>('user_roles', tenantId);
      const current = assignments.find((a) => a.userId === userId && !a.validTo);

      if (!current || current.roleId !== roleId) {
        const now = new Date().toISOString();
        // End the old assignment rather than deleting it, so role history survives.
        if (current) await update('user_roles', 'id', current.id, { validTo: now });
        await append('user_roles', {
          id: newId('ur'),
          tenantId,
          userId,
          roleId,
          validFrom: now,
          validTo: '',
          isActing: false,
          assignedBy: session.userId,
          assignedAt: now,
        });
        await audit({
          tenantId,
          action: 'GRANT',
          entityType: 'user_role',
          entityId: userId,
          actorId: session.userId,
          before: { roleId: current?.roleId },
          after: { roleId, roleTitle: role.title },
        });
      }
    }

    // ── manager change ──
    if (reportsToUserId !== undefined) {
      if (reportsToUserId === userId) {
        return NextResponse.json({ error: 'Someone cannot report to themselves.' }, { status: 400 });
      }

      const positions = await list<any>('positions', tenantId);

      // Walk up from the proposed manager; if we meet this user, the change closes a loop
      // and the hierarchy would become unrenderable.
      let cursor: string | undefined = reportsToUserId || undefined;
      const seen = new Set<string>();
      while (cursor) {
        if (cursor === userId) {
          return NextResponse.json({ error: 'That would create a reporting loop.' }, { status: 400 });
        }
        if (seen.has(cursor)) break;
        seen.add(cursor);
        cursor = positions.find((p) => p.userId === cursor)?.reportsToUserId || undefined;
      }

      const pos = positions.find((p) => p.userId === userId);
      if (pos) {
        await update('positions', 'id', pos.id, { reportsToUserId: reportsToUserId || '' });
      }
    }

    await audit({
      tenantId,
      action: 'UPDATE',
      entityType: 'user',
      entityId: userId,
      actorId: session.userId,
      before: { name: target.name, status: target.status },
      after: patch,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message, capability: error.capability }, { status: 403 });
    }
    console.error('Edit person failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save that change' },
      { status: 500 }
    );
  }
}

/**
 * DELETE — archive rather than remove.
 *
 * Deleting the row would orphan their attendance history and any audit entry referring to
 * them, so the record stays and the status changes.
 */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { session } = await authed(request, ctx);
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const tenantId = session.tenantId;

  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId is required.' }, { status: 400 });

    if (userId === session.userId) {
      return NextResponse.json({ error: 'You cannot archive your own account.' }, { status: 400 });
    }
    if (!(await can(tenantId, session.userId, 'people.user.archive', { scope: 'DOWNLINE' }))) {
      throw new PermissionError('people.user.archive', 'DOWNLINE');
    }

    const target = await findBy<any>('users', 'id', userId, tenantId);
    if (!target) return NextResponse.json({ error: 'No such person.' }, { status: 404 });

    await update('users', 'id', userId, { status: 'SUSPENDED' });

    // Re-parent anyone who reported to them, so nobody drops out of the tree.
    const positions = await list<any>('positions', tenantId);
    const orphaned = positions.filter((p) => p.reportsToUserId === userId);
    const theirManager = positions.find((p) => p.userId === userId)?.reportsToUserId || '';
    for (const o of orphaned) {
      await update('positions', 'id', o.id, { reportsToUserId: theirManager });
    }

    await audit({
      tenantId,
      action: 'UPDATE',
      entityType: 'user',
      entityId: userId,
      actorId: session.userId,
      before: { status: target.status },
      after: { status: 'SUSPENDED' },
      reason: `Archived; ${orphaned.length} report(s) re-parented`,
    });

    return NextResponse.json({ success: true, reparented: orphaned.length });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message, capability: error.capability }, { status: 403 });
    }
    console.error('Archive person failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not archive that person' },
      { status: 500 }
    );
  }
}
