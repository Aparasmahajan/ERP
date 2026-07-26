import { NextRequest, NextResponse } from 'next/server';
import { sendDailySummaryEmail } from '@/lib/email/resendService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, managerName, tenantName, summary } = body;

    if (!email || !managerName || !tenantName || !summary) {
      return NextResponse.json(
        { error: 'Missing required fields: email, managerName, tenantName, summary' },
        { status: 400 }
      );
    }

    const requiredSummaryFields = ['totalSales', 'itemsSold', 'refunds', 'cash', 'card', 'topProducts'];
    const missingFields = requiredSummaryFields.filter(field => !(field in summary));

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing summary fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await sendDailySummaryEmail(email, managerName, tenantName, summary);

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
