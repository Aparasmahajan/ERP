import { NextRequest, NextResponse } from 'next/server';
import { loginTenantUser, TENANT_COOKIE, SESSION_MAX_AGE } from '@/lib/auth/tenantAuth';
import { effectiveCapabilities } from '@/lib/permissions/can';

/** POST /api/tenant-auth/login  body: { tenantSlug, email, password } */
export async function POST(request: NextRequest) {
  try {
    const { tenantSlug, email, password } = await request.json();
    if (!tenantSlug || !email || !password) {
      return NextResponse.json(
        { error: 'Organisation, email and password are all required.' },
        { status: 400 }
      );
    }

    const result = await loginTenantUser(tenantSlug, email, password);
    if (!result.ok || !result.session) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Ship the capability list so the portal can hide what this person cannot do without
    // a second round trip on first paint.
    const capabilities = (
      await effectiveCapabilities(result.session.tenantId, result.session.userId)
    ).map((c) => c.capability);

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.session.userId,
        name: result.session.name,
        email: result.session.email,
      },
      tenant: { id: result.session.tenantId, slug: result.session.tenantSlug },
      capabilities,
    });

    response.cookies.set({
      name: TENANT_COOKIE,
      value: result.token!,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Tenant login failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not sign in' },
      { status: 500 }
    );
  }
}
