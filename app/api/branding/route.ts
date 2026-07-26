import { NextRequest, NextResponse } from 'next/server';
import { readBranding, writeBranding, writeAudit } from '@/lib/excel/excelService';
import { v4 as uuid } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenant_id query parameter' },
        { status: 400 }
      );
    }

    const branding = await readBranding(tenantId);
    return NextResponse.json({ data: branding }, { status: 200 });
  } catch (error) {
    console.error('Read branding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read branding' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, branding, actor_id } = body;

    if (!tenant_id || !branding || typeof branding !== 'object') {
      return NextResponse.json(
        { error: 'Missing required fields: tenant_id, branding (object)' },
        { status: 400 }
      );
    }

    const oldBranding = await readBranding(tenant_id);
    await writeBranding(tenant_id, branding);

    // Log audit
    if (actor_id) {
      await writeAudit(tenant_id, {
        id: uuid(),
        timestamp: new Date().toISOString(),
        action: 'UPDATE',
        entity_type: 'branding',
        entity_id: tenant_id,
        who: actor_id,
        before: JSON.stringify(oldBranding),
        after: JSON.stringify(branding),
      } as any);
    }

    return NextResponse.json(
      { success: true, data: branding },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update branding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update branding' },
      { status: 500 }
    );
  }
}
