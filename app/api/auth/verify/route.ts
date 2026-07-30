import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminAuth } from '@/lib/auth/superadminAuth';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('erp_auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: 'No auth token' },
        { status: 401 }
      );
    }

    // Verify token
    const session = validateSuperadminAuth(`Bearer ${token}`);

    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        email: session.email,
        role: session.role,
        expiresAt: session.expiresAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
