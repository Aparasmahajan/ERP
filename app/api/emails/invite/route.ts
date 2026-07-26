import { NextRequest, NextResponse } from 'next/server';
import { sendInviteEmail } from '@/lib/email/resendService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userName, tenantName, inviteLink } = body;

    if (!email || !userName || !tenantName || !inviteLink) {
      return NextResponse.json(
        { error: 'Missing required fields: email, userName, tenantName, inviteLink' },
        { status: 400 }
      );
    }

    const result = await sendInviteEmail(email, userName, tenantName, inviteLink);

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
