import { NextRequest, NextResponse } from 'next/server';
import { sendLowStockAlert } from '@/lib/email/resendService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, managerName, tenantName, products } = body;

    if (!email || !managerName || !tenantName || !products) {
      return NextResponse.json(
        { error: 'Missing required fields: email, managerName, tenantName, products' },
        { status: 400 }
      );
    }

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Products must be a non-empty array' },
        { status: 400 }
      );
    }

    const result = await sendLowStockAlert(email, managerName, tenantName, products);

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
