import { NextRequest, NextResponse } from 'next/server';
import { authenticateSuperadmin, isSuperadminConfigured } from '@/lib/auth/superadminAuth';

export async function POST(request: NextRequest) {
  try {
    // Check if superadmin is configured
    if (!isSuperadminConfigured()) {
      return NextResponse.json(
        { error: 'Superadmin credentials not configured in environment' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      );
    }

    const result = await authenticateSuperadmin(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Set secure HTTP-only cookie with token
    const response = NextResponse.json(
      {
        success: true,
        email: result.session?.email,
        role: result.session?.role,
        expiresAt: result.session?.expiresAt,
      },
      { status: 200 }
    );

    // Set HTTP-only cookie (more secure than returning token)
    response.cookies.set({
      name: 'erp_auth_token',
      value: result.token!,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 }
    );
  }
}
