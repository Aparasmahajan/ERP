import { NextRequest, NextResponse } from 'next/server';
import { readPositions, writePositions, writeAudit } from '@/lib/excel/excelService';
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

    const positions = await readPositions(tenantId);
    return NextResponse.json({ data: positions }, { status: 200 });
  } catch (error) {
    console.error('Read positions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read positions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, positions, actor_id } = body;

    if (!tenant_id || !positions) {
      return NextResponse.json(
        { error: 'Missing required fields: tenant_id, positions' },
        { status: 400 }
      );
    }

    await writePositions(tenant_id, positions);

    // Log audit
    if (actor_id) {
      await writeAudit(tenant_id, {
        id: uuid(),
        timestamp: new Date().toISOString(),
        action: 'UPDATE',
        entity_type: 'position',
        entity_id: 'bulk',
        who: actor_id,
        before: '{}',
        after: JSON.stringify(positions),
      } as any);
    }

    return NextResponse.json(
      { success: true, count: positions.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Write positions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to write positions' },
      { status: 500 }
    );
  }
}
