import { NextRequest, NextResponse } from 'next/server';
import { excelService } from '@/lib/excel/excelService';
import { Role } from '@/lib/types/domain';
import { CreateRoleSchema } from '@/lib/utils/validation';
import { v4 as uuidv4 } from 'uuid';

const SHEET_NAME = 'roles';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const pack = request.nextUrl.searchParams.get('pack');

    const roles = await excelService.readSheet<Role>(SHEET_NAME);
    let filteredRoles = roles.filter(r => r.tenantId === tenantId);

    if (pack) {
      filteredRoles = filteredRoles.filter(r => r.pack === pack);
    }

    return NextResponse.json({ data: filteredRoles });
  } catch (error) {
    console.error('Error reading roles:', error);
    return NextResponse.json(
      { error: 'Failed to read roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const body = await request.json();

    // Validate input
    const validated = CreateRoleSchema.parse(body);

    const role: Role = {
      id: uuidv4(),
      tenantId,
      key: validated.key,
      title: validated.title,
      pack: 'CUSTOM',
      rank: validated.rank,
      kind: validated.kind,
      system: false,
      mayHoldReports: validated.mayHoldReports,
      maxDelegableRank: validated.maxDelegableRank,
      color: validated.color,
      icon: validated.icon,
      sortOrder: 100,
    };

    const roles = await excelService.readSheet<Role>(SHEET_NAME);

    // Check for duplicate key
    if (roles.some(r => r.key === validated.key && r.tenantId === tenantId)) {
      return NextResponse.json(
        { error: 'Role key already exists in this tenant' },
        { status: 409 }
      );
    }

    roles.push(role);
    await excelService.writeSheet(SHEET_NAME, roles);

    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create role' },
      { status: 400 }
    );
  }
}
