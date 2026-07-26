import { NextRequest, NextResponse } from 'next/server';
import { sendRoleChangeEmail } from '@/lib/email/resendService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userName, oldRole, newRole, tenantName } = body;

    if (!email || !userName || !oldRole || !newRole || !tenantName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, userName, oldRole, newRole, tenantName' },
        { status: 400 }
      );
    }

    const result = await sendRoleChangeEmail(email, userName, oldRole, newRole, tenantName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, messageId: result.messageId },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Email send failed' },
      { status: 500 }
    );
  }
}
