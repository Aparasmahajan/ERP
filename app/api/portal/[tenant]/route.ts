import { NextRequest, NextResponse } from 'next/server';
import { sessionForTenant, TENANT_COOKIE } from '@/lib/auth/tenantAuth';
import { list } from '@/lib/sheets/erpSheets';
import { effectiveCapabilities } from '@/lib/permissions/can';

/**
 * Everything the tenant portal needs, in one authenticated request.
 *
 * One endpoint rather than six because each Sheets tab is a separate API call and the
 * per-minute quota is shared; batching keeps a page load to a single burst.
 *
 * The session must belong to the tenant in the URL — otherwise a valid login for one
 * customer could read another's rows.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await ctx.params;

  const session = sessionForTenant(request.cookies.get(TENANT_COOKIE)?.value, slug);
  if (!session) {
    return NextResponse.json({ error: 'Not signed in to this organisation.' }, { status: 401 });
  }

  const tenantId = session.tenantId;

  try {
    const [users, roles, userRoles, positions, orgUnits, features, branding, attendance, caps] =
      await Promise.all([
        list<any>('users', tenantId),
        list<any>('roles', tenantId),
        list<any>('user_roles', tenantId),
        list<any>('positions', tenantId),
        list<any>('org_units', tenantId),
        list<any>('module_features', tenantId),
        list<any>('branding', tenantId),
        list<any>('attendance', tenantId),
        effectiveCapabilities(tenantId, session.userId),
      ]);

    // Resolve role + manager + unit per person so the client does not re-derive them.
    const roleById = new Map(roles.map((r) => [r.id, r]));
    const activeAssignment = new Map<string, string>();
    for (const a of userRoles) {
      if (a.validTo) continue; // ended
      if (!activeAssignment.has(a.userId)) activeAssignment.set(a.userId, a.roleId);
    }
    const positionByUser = new Map(positions.map((p) => [p.userId, p]));

    const people = users.map((u) => {
      const roleId = activeAssignment.get(u.id) || '';
      const role = roleById.get(roleId);
      const pos = positionByUser.get(u.id);
      return {
        id: u.id,
        code: u.code,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        roleId,
        roleTitle: role?.title || '',
        roleColor: role?.color || 'bg-slate-400',
        reportsToUserId: pos?.reportsToUserId || '',
        orgUnitId: pos?.orgUnitId || '',
      };
    });

    const brandingMap: Record<string, string> = {};
    for (const b of branding) if (b.key) brandingMap[b.key] = b.value;

    return NextResponse.json({
      tenant: { id: tenantId, slug, name: session.tenantSlug },
      me: {
        id: session.userId,
        name: session.name,
        email: session.email,
        capabilities: caps.map((c) => c.capability),
      },
      people,
      roles: roles.map((r) => ({
        id: r.id,
        key: r.key,
        title: r.title,
        color: r.color,
        rank: Number(r.rank) || 0,
      })),
      orgUnits: orgUnits.map((o) => ({ id: o.id, name: o.name, code: o.code, headUserId: o.headUserId })),
      features: features.map((f) => ({
        featureId: f.featureId,
        name: f.name,
        enabled: String(f.enabled) === 'true',
      })),
      branding: brandingMap,
      attendance: attendance.map((a) => ({
        id: a.id,
        userId: a.userId,
        date: a.date,
        status: a.status,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
      })),
    });
  } catch (error) {
    console.error('Portal load failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load your organisation' },
      { status: 500 }
    );
  }
}
