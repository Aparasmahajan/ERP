import { NextRequest, NextResponse } from 'next/server';
import { sessionForTenant, TENANT_COOKIE } from '@/lib/auth/tenantAuth';
import { can, PermissionError, visibleUserIds } from '@/lib/permissions/can';
import {
  addLink, endLink, linksForTenant, delegateRole, revokeDelegation,
  activeDelegations, canDelegateRole, LINK_KINDS,
} from '@/lib/hierarchy/links';

/**
 * Dotted-line links and acting delegation, from inside the tenant portal.
 *
 *   GET     list links, active delegations, and what the caller can see
 *   POST    { op: 'link' }      add a dotted line          (people.role.assign)
 *           { op: 'delegate' } grant temporary cover        (people.role.assign + above them)
 *   DELETE  ?linkId= | ?delegationId=  end either one
 *
 * The tenant always comes from the session, never the body.
 */

interface Ctx { params: Promise<{ tenant: string }> }

async function sess(request: NextRequest, ctx: Ctx) {
  const { tenant: slug } = await ctx.params;
  return sessionForTenant(request.cookies.get(TENANT_COOKIE)?.value, slug);
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const session = await sess(request, ctx);
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const [links, delegations, visible] = await Promise.all([
      linksForTenant(session.tenantId),
      activeDelegations(session.tenantId),
      visibleUserIds(session.tenantId, session.userId),
    ]);

    return NextResponse.json({
      links,
      delegations,
      // Split so the UI can label "reports to you" vs "linked to you" honestly.
      visible: { viaTree: visible.tree, viaLink: visible.link },
      linkKinds: LINK_KINDS,
      canDelegateFrom: await Promise.all(
        visible.tree.map(async (id) => ({
          userId: id,
          allowed: await canDelegateRole(session.tenantId, session.userId, id),
        }))
      ),
    });
  } catch (error) {
    console.error('Hierarchy read failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not read the hierarchy' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const session = await sess(request, ctx);
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const body = await request.json();
    const op = String(body.op || '');

    // Both operations restructure who answers to whom, so both need the same power.
    if (!(await can(session.tenantId, session.userId, 'people.role.assign', { scope: 'DOWNLINE' }))) {
      throw new PermissionError('people.role.assign', 'DOWNLINE');
    }

    if (op === 'link') {
      const res = await addLink({
        tenantId: session.tenantId,
        userId: body.userId,
        linkedToUserId: body.linkedToUserId,
        kind: body.kind,
        subject: body.subject,
        weight: body.weight,
        validFrom: body.validFrom,
        validTo: body.validTo,
        actorId: session.userId,
      });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true, id: res.id }, { status: 201 });
    }

    if (op === 'delegate') {
      const res = await delegateRole({
        tenantId: session.tenantId,
        fromUserId: body.fromUserId,
        toUserId: body.toUserId,
        until: body.until,
        reason: body.reason,
        actorId: session.userId,
      });
      if (!res.ok) {
        // "Only someone above this person…" is an authorisation refusal, not bad input.
        const status = /above this person/.test(res.error) ? 403 : 400;
        return NextResponse.json({ error: res.error }, { status });
      }
      return NextResponse.json({ success: true, ids: res.ids, roles: res.ids.length }, { status: 201 });
    }

    return NextResponse.json({ error: "op must be 'link' or 'delegate'" }, { status: 400 });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message, capability: error.capability }, { status: 403 });
    }
    console.error('Hierarchy write failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save that change' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const session = await sess(request, ctx);
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    if (!(await can(session.tenantId, session.userId, 'people.role.assign', { scope: 'DOWNLINE' }))) {
      throw new PermissionError('people.role.assign', 'DOWNLINE');
    }

    const linkId = request.nextUrl.searchParams.get('linkId');
    const delegationId = request.nextUrl.searchParams.get('delegationId');

    if (linkId) {
      const ok = await endLink(session.tenantId, linkId, session.userId);
      if (!ok) return NextResponse.json({ error: 'No such link.' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    if (delegationId) {
      const res = await revokeDelegation(session.tenantId, delegationId, session.userId);
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'linkId or delegationId is required.' }, { status: 400 });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message, capability: error.capability }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not remove that' },
      { status: 500 }
    );
  }
}
