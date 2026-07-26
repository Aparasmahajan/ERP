import { NextRequest, NextResponse } from 'next/server';
import { excelService } from '@/lib/excel/excelService';
import { User, Role, Tenant, Session, OrgUnit } from '@/lib/types/domain';
import { INSTITUTION_ROLES, ORGANISATION_ROLES, getAllRoles } from '@/lib/seeds/roleSeeds';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantName, pack } = body;

    if (!tenantName || !pack) {
      return NextResponse.json(
        { error: 'tenantName and pack are required' },
        { status: 400 }
      );
    }

    if (!['INSTITUTION', 'ORGANISATION', 'HYBRID'].includes(pack)) {
      return NextResponse.json(
        { error: 'Invalid pack. Must be INSTITUTION, ORGANISATION, or HYBRID' },
        { status: 400 }
      );
    }

    // Initialize Excel workbook with sheets
    const sheets = [
      { name: 'tenants', headers: ['id', 'slug', 'name', 'legalName', 'pack', 'status', 'timezone', 'locale', 'currency', 'weekStart', 'createdAt', 'grantVersion'] },
      { name: 'users', headers: ['id', 'tenantId', 'code', 'email', 'phone', 'firstName', 'lastName', 'displayName', 'gender', 'dob', 'photoKey', 'status', 'joinedOn', 'leftOn', 'lastLoginAt', 'customFields'] },
      { name: 'roles', headers: ['id', 'tenantId', 'key', 'title', 'pack', 'rank', 'kind', 'system', 'mayHoldReports', 'maxDelegableRank', 'powerPresetId', 'color', 'icon', 'sortOrder'] },
      { name: 'user_roles', headers: ['id', 'userId', 'roleId', 'validFrom', 'validTo', 'isActing', 'assignedBy'] },
      { name: 'positions', headers: ['id', 'userId', 'tenantId', 'reportsToUserId', 'orgUnitId', 'titleOverride', 'spanHint', 'sessionId', 'validFrom', 'validTo'] },
      { name: 'org_units', headers: ['id', 'tenantId', 'parentId', 'kind', 'name', 'code', 'headUserId', 'path', 'sortOrder'] },
      { name: 'sessions', headers: ['id', 'tenantId', 'name', 'startsOn', 'endsOn', 'isCurrent'] },
      { name: 'audit_events', headers: ['id', 'tenantId', 'actorId', 'onBehalfOf', 'action', 'entity', 'entityId', 'before', 'after', 'ip', 'ua', 'requestId', 'createdAt'] },
    ];

    await excelService.initializeWorkbook(sheets);

    // Create tenant
    const tenantId = uuidv4();
    const slug = tenantName.toLowerCase().replace(/\s+/g, '-').substring(0, 31);

    const tenant: Tenant = {
      id: tenantId,
      slug,
      name: tenantName,
      legalName: tenantName,
      pack: pack as any,
      status: 'ACTIVE',
      timezone: 'UTC',
      locale: 'en-US',
      currency: 'USD',
      weekStart: 0,
      createdAt: new Date().toISOString(),
      grantVersion: 1,
    };

    // Create session
    const sessionId = uuidv4();
    const currentYear = new Date().getFullYear();
    const session: Session = {
      id: sessionId,
      tenantId,
      name: `${currentYear}-${currentYear + 1}`,
      startsOn: `${currentYear}-01-01`,
      endsOn: `${currentYear + 1}-12-31`,
      isCurrent: true,
    };

    // Create root org unit
    const rootUnitId = uuidv4();
    const rootUnit: OrgUnit = {
      id: rootUnitId,
      tenantId,
      kind: pack === 'INSTITUTION' ? 'FACULTY' : 'DIVISION',
      name: tenantName,
      code: 'ROOT',
      path: 'root',
      sortOrder: 0,
    };

    // Read existing data and add new
    const tenants = await excelService.readSheet<Tenant>('tenants');
    const roles = await excelService.readSheet<Role>('roles');
    const sessions = await excelService.readSheet<Session>('sessions');
    const orgUnits = await excelService.readSheet<OrgUnit>('org_units');

    tenants.push(tenant);
    sessions.push(session);
    orgUnits.push(rootUnit);

    // Add roles based on pack
    const seedRoles = getAllRoles(pack === 'INSTITUTION' ? 'INSTITUTION' : 'ORGANISATION');
    seedRoles.forEach(seedRole => {
      const role: Role = {
        id: uuidv4(),
        tenantId,
        ...seedRole,
      };
      roles.push(role);
    });

    // Write all data
    await excelService.writeSheet('tenants', tenants);
    await excelService.writeSheet('roles', roles);
    await excelService.writeSheet('sessions', sessions);
    await excelService.writeSheet('org_units', orgUnits);

    return NextResponse.json(
      {
        success: true,
        tenant,
        session,
        message: `Tenant '${tenantName}' initialized with ${pack} pack`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error setting up tenant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set up tenant' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenants = await excelService.readSheet('tenants');
    return NextResponse.json({ data: tenants });
  } catch (error) {
    console.error('Error reading tenants:', error);
    return NextResponse.json(
      { error: 'Failed to read tenants' },
      { status: 500 }
    );
  }
}
