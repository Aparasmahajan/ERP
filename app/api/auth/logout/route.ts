import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  // Clear the auth cookie
  response.cookies.set({
    name: 'erp_auth_token',
    value: '',
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });

  return response;
}
