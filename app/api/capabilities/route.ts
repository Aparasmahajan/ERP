import { NextRequest, NextResponse } from 'next/server';
import { readCapabilities, writeCapabilities, writeAudit } from '@/lib/excel/excelService';
import { v4 as uuid } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenant_id');
    const userId = request.nextUrl.searchParams.get('user_id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenant_id query parameter' },
        { status: 400 }
      );
    }

    let capabilities = await readCapabilities(tenantId);

    // Filter by user_id if provided
    if (userId) {
      capabilities = capabilities.filter((c) => c.user_id === userId);
    }

    return NextResponse.json({ data: capabilities }, { status: 200 });
  } catch (error) {
    console.error('Read capabilities error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read capabilities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, capabilities, actor_id } = body;

    if (!tenant_id || !capabilities) {
      return NextResponse.json(
        { error: 'Missing required fields: tenant_id, capabilities' },
        { status: 400 }
      );
    }

    await writeCapabilities(tenant_id, capabilities);

    // Log audit
    if (actor_id) {
      await writeAudit(tenant_id, {
        id: uuid(),
        timestamp: new Date().toISOString(),
        action: 'GRANT',
        entity_type: 'capability',
        entity_id: 'bulk',
        who: actor_id,
        before: '{}',
        after: JSON.stringify(capabilities),
      } as any);
    }

    return NextResponse.json(
      { success: true, count: capabilities.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Write capabilities error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to write capabilities' },
      { status: 500 }
    );
  }
}
