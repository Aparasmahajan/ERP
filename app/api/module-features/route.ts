import { NextRequest, NextResponse } from 'next/server';
import { readModuleFeatures, writeModuleFeatures, writeAudit } from '@/lib/excel/excelService';
import { v4 as uuid } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenant_id');
    const category = request.nextUrl.searchParams.get('category');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenant_id query parameter' },
        { status: 400 }
      );
    }

    let features = await readModuleFeatures(tenantId);

    // Filter by category if provided
    if (category) {
      features = features.filter((f) => f.category === category);
    }

    return NextResponse.json({ data: features }, { status: 200 });
  } catch (error) {
    console.error('Read module features error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read module features' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, features, actor_id } = body;

    if (!tenant_id || !features) {
      return NextResponse.json(
        { error: 'Missing required fields: tenant_id, features' },
        { status: 400 }
      );
    }

    const oldFeatures = await readModuleFeatures(tenant_id);
    await writeModuleFeatures(tenant_id, features);

    // Log audit
    if (actor_id) {
      await writeAudit(tenant_id, {
        id: uuid(),
        timestamp: new Date().toISOString(),
        action: 'UPDATE',
        entity_type: 'module_feature',
        entity_id: 'bulk',
        who: actor_id,
        before: JSON.stringify(oldFeatures),
        after: JSON.stringify(features),
      } as any);
    }

    return NextResponse.json(
      { success: true, count: features.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update module features error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update module features' },
      { status: 500 }
    );
  }
}
