import { NextRequest, NextResponse } from 'next/server';
import { excelService } from '@/lib/excel/excelService';
import { User } from '@/lib/types/domain';
import { CreateUserSchema } from '@/lib/utils/validation';
import { v4 as uuidv4 } from 'uuid';

const SHEET_NAME = 'users';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';

    const users = await excelService.readSheet<User>(SHEET_NAME);
    const filteredUsers = users.filter(u => u.tenantId === tenantId);

    return NextResponse.json({ data: filteredUsers });
  } catch (error) {
    console.error('Error reading users:', error);
    return NextResponse.json(
      { error: 'Failed to read users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const body = await request.json();

    // Validate input
    const validated = CreateUserSchema.parse(body);

    const user: User = {
      id: uuidv4(),
      tenantId,
      code: validated.code,
      email: validated.email,
      phone: validated.phone,
      firstName: validated.firstName,
      lastName: validated.lastName,
      displayName: validated.displayName || `${validated.firstName} ${validated.lastName}`,
      gender: validated.gender,
      dob: validated.dob,
      status: 'ACTIVE',
      joinedOn: new Date().toISOString(),
    };

    const users = await excelService.readSheet<User>(SHEET_NAME);

    // Check for duplicate code
    if (users.some(u => u.code === validated.code && u.tenantId === tenantId)) {
      return NextResponse.json(
        { error: 'User code already exists in this tenant' },
        { status: 409 }
      );
    }

    // Check for duplicate email
    if (validated.email && users.some(u => u.email === validated.email && u.tenantId === tenantId)) {
      return NextResponse.json(
        { error: 'Email already exists in this tenant' },
        { status: 409 }
      );
    }

    users.push(user);
    await excelService.writeSheet(SHEET_NAME, users);

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 400 }
    );
  }
}
