import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminAuth } from './superadminAuth';

export type AuthMiddlewareResponse = NextResponse | null;

/**
 * Middleware to verify superadmin authentication on API routes
 *
 * Usage in route handlers:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const auth = await requireSuperadminAuth(request);
 *   if (auth instanceof NextResponse) return auth; // Unauthorized
 *
 *   // Auth is valid, continue...
 * }
 * ```
 */
export async function requireSuperadminAuth(
  request: NextRequest
): Promise<AuthMiddlewareResponse> {
  try {
    // Get token from cookie
    const token = request.cookies.get('erp_auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: No authentication token' },
        { status: 401 }
      );
    }

    // Verify token
    const session = validateSuperadminAuth(`Bearer ${token}`);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      );
    }

    // Auth successful - return null to indicate middleware passed
    return null;
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Unauthorized: Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * Middleware to verify superadmin OR tenant-specific access
 *
 * For multi-tenant routes that should allow:
 * - Superadmin access (full control)
 * - Tenant admin access (their own tenant only)
 */
export async function requireTenantAuth(
  request: NextRequest,
  requiredTenantId?: string
): Promise<{ authorized: boolean; response?: NextResponse; tenantId?: string }> {
  try {
    // Check superadmin first
    const token = request.cookies.get('erp_auth_token')?.value;

    if (token) {
      const session = validateSuperadminAuth(`Bearer ${token}`);
      if (session) {
        // Superadmin has access to everything
        return { authorized: true, tenantId: requiredTenantId };
      }
    }

    // For now, require superadmin
    // Future: Add tenant-specific JWT tokens in Phase 2
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  } catch (error) {
    console.error('Tenant auth error:', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Authentication failed' },
        { status: 401 }
      ),
    };
  }
}

/**
 * The authenticated superadmin's email, or null. Use for audit trails so a row records who
 * actually performed an action rather than a generic 'system'.
 */
export function superadminIdFrom(request: NextRequest): string | null {
  const token = request.cookies.get('erp_auth_token')?.value;
  if (!token) return null;
  return validateSuperadminAuth(`Bearer ${token}`)?.email ?? null;
}

export default {
  requireSuperadminAuth,
  requireTenantAuth,
  superadminIdFrom,
};
