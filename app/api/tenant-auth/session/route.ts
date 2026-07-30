import { NextRequest, NextResponse } from 'next/server';
import { sessionForTenant, TENANT_COOKIE } from '@/lib/auth/tenantAuth';
import { effectiveCapabilities } from '@/lib/permissions/can';
import { list } from '@/lib/sheets/erpSheets';

/**
 * GET /api/tenant-auth/session?slug=…
 *
 * Confirms the caller holds a session for THAT tenant and returns who they are, what they
 * can do, and the tenant's branding. The slug check is what stops a valid session for one
 * customer from being used against another.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

  const session = sessionForTenant(request.cookies.get(TENANT_COOKIE)?.value, slug);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const [caps, branding] = await Promise.all([
      effectiveCapabilities(session.tenantId, session.userId),
      list<{ key: string; value: string }>('branding', session.tenantId),
    ]);

    const brandingMap: Record<string, string> = {};
    for (const b of branding) if (b.key) brandingMap[b.key] = b.value;

    return NextResponse.json({
      authenticated: true,
      user: { id: session.userId, name: session.name, email: session.email },
      tenant: { id: session.tenantId, slug: session.tenantSlug },
      capabilities: caps.map((c) => c.capability),
      branding: brandingMap,
    });
  } catch (error) {
    console.error('Session lookup failed:', error);
    // The session itself is valid; only the enrichment failed. Say so rather than
    // logging the user out over a transient Sheets error.
    return NextResponse.json({
      authenticated: true,
      user: { id: session.userId, name: session.name, email: session.email },
      tenant: { id: session.tenantId, slug: session.tenantSlug },
      capabilities: [],
      branding: {},
      degraded: true,
    });
  }
}

/** POST /api/tenant-auth/session — sign out (clears the tenant cookie only). */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({ name: TENANT_COOKIE, value: '', httpOnly: true, maxAge: 0, path: '/' });
  return response;
}
