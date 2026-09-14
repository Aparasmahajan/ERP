import { NextRequest, NextResponse } from 'next/server';
import { acceptInvite, verifyInviteToken } from '@/lib/auth/tenantAuth';
import { findBy, audit } from '@/lib/sheets/erpSheets';

/**
 * GET  /api/tenant-auth/accept-invite?token=…   who is this invite for?
 * POST /api/tenant-auth/accept-invite           set the password
 *
 * Public by design — the signed token IS the authorisation.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const payload = verifyInviteToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'That invite link is invalid or has expired.' }, { status: 400 });
  }

  const [user, tenant] = await Promise.all([
    findBy<{ id: string; name: string; email: string; passwordHash: string }>(
      'users', 'id', payload.userId, payload.tenantId
    ),
    findBy<{ id: string; slug: string; name: string }>('tenants', 'id', payload.tenantId),
  ]);

  if (!user || !tenant) {
    return NextResponse.json({ error: 'That invite no longer applies.' }, { status: 404 });
  }
  if (user.passwordHash) {
    return NextResponse.json(
      { error: 'This invite has already been used.', alreadyUsed: true, tenantSlug: tenant.slug },
      { status: 409 }
    );
  }

  // Only non-sensitive fields, so a guessed token reveals nothing useful.
  return NextResponse.json({
    name: user.name,
    email: user.email,
    orgName: tenant.name,
    tenantSlug: tenant.slug,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are both required.' }, { status: 400 });
    }

    const result = await acceptInvite(token, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const payload = verifyInviteToken(token);
    if (payload) {
      await audit({
        tenantId: payload.tenantId,
        action: 'UPDATE',
        entityType: 'user',
        entityId: payload.userId,
        actorId: payload.userId,
        after: { status: 'ACTIVE' },
        reason: 'Accepted invite and set a password',
      });
    }

    return NextResponse.json({
      success: true,
      tenantSlug: result.tenantSlug,
      email: result.email,
      loginUrl: `/portal/${result.tenantSlug}/login`,
    });
  } catch (error) {
    console.error('Accept invite failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not accept the invite' },
      { status: 500 }
    );
  }
}
