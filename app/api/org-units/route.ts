import { NextRequest, NextResponse } from 'next/server';
import { readOrgUnits, writeOrgUnits, writeAudit } from '@/lib/excel/excelService';
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

    const units = await readOrgUnits(tenantId);
    return NextResponse.json({ data: units }, { status: 200 });
  } catch (error) {
    console.error('Read org units error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read org units' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, org_units, actor_id } = body;

    if (!tenant_id || !org_units) {
      return NextResponse.json(
        { error: 'Missing required fields: tenant_id, org_units' },
        { status: 400 }
      );
    }

    await writeOrgUnits(tenant_id, org_units);

    // Log audit
    if (actor_id) {
      await writeAudit(tenant_id, {
        id: uuid(),
        timestamp: new Date().toISOString(),
        action: 'UPDATE',
        entity_type: 'org_unit',
        entity_id: 'bulk',
        who: actor_id,
        before: '{}',
        after: JSON.stringify(org_units),
      } as any);
    }

    return NextResponse.json(
      { success: true, count: org_units.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Write org units error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to write org units' },
      { status: 500 }
    );
  }
}
