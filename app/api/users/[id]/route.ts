import { NextRequest, NextResponse } from 'next/server';
import { excelService } from '@/lib/excel/excelService';
import { User } from '@/lib/types/domain';
import { UpdateUserSchema } from '@/lib/utils/validation';

const SHEET_NAME = 'users';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { id } = await params;

    const users = await excelService.readSheet<User>(SHEET_NAME);
    const user = users.find(u => u.id === id && u.tenantId === tenantId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error reading user:', error);
    return NextResponse.json(
      { error: 'Failed to read user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validated = UpdateUserSchema.parse(body);

    const users = await excelService.readSheet<User>(SHEET_NAME);
    const userIndex = users.findIndex(u => u.id === id && u.tenantId === tenantId);

    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = { ...users[userIndex], ...validated };
    users[userIndex] = updatedUser;
    await excelService.writeSheet(SHEET_NAME, users);

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { id } = await params;

    const users = await excelService.readSheet<User>(SHEET_NAME);
    const userIndex = users.findIndex(u => u.id === id && u.tenantId === tenantId);

    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Soft delete - mark as ARCHIVED
    users[userIndex].status = 'ARCHIVED';
    users[userIndex].leftOn = new Date().toISOString();
    await excelService.writeSheet(SHEET_NAME, users);

    return NextResponse.json({ success: true, message: 'User archived' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
