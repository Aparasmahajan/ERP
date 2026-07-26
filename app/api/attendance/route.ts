import { NextRequest, NextResponse } from 'next/server';
import { list, append, update, remove, audit, findBy } from '@/lib/sheets/erpSheets';
import { can, PermissionError } from '@/lib/permissions/can';
import { requireSuperadminOrTenant } from '@/lib/auth/middleware';

export interface AttendanceRow {
  id: string;
  tenantId: string;
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HALF_DAY';
  checkIn: string;
  checkOut: string;
  markedBy: string;
  markedAt: string;
  note: string;
}

const VALID_STATUS = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HALF_DAY'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

let seq = 0;
function newId(): string {
  seq += 1;
  return `att_${Date.now().toString(36)}${seq.toString(36)}`;
}

/**
 * GET /api/attendance?tenantId=…&date=YYYY-MM-DD
 * GET /api/attendance?tenantId=…&userId=…            (that person's history)
 *
 * Returns rows plus a tally, so the UI does not have to recount.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const tenantId = sp.get('tenantId');
    const date = sp.get('date');
    const userId = sp.get('userId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const denied = await requireSuperadminOrTenant(request, tenantId);
    if (denied) return denied;
    if (date && !DATE_RE.test(date)) {
      return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
    }

    let rows = await list<AttendanceRow>('attendance', tenantId);
    if (date) rows = rows.filter((r) => r.date === date);
    if (userId) rows = rows.filter((r) => r.userId === userId);

    const count = (s: string) => rows.filter((r) => r.status === s).length;

    return NextResponse.json({
      data: rows,
      summary: {
        marked: rows.length,
        present: count('PRESENT'),
        absent: count('ABSENT'),
        late: count('LATE'),
        leave: count('LEAVE'),
        halfDay: count('HALF_DAY'),
      },
    });
  } catch (error) {
    console.error('Read attendance failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not read attendance' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attendance
 * body: { tenantId, userId, date, status, checkIn?, checkOut?, note?, actorId }
 *
 * Upsert — one record per person per day. Re-posting the same (userId, date) amends the
 * existing row rather than creating a duplicate, which is what makes the UI's
 * click-to-change behaviour safe.
 *
 * Capability required:
 *   marking yourself   -> attendance.self.mark
 *   marking anyone else -> attendance.other.mark at DIRECT_REPORTS or wider
 *   amending an existing row for someone else -> attendance.other.amend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, userId, date, status, checkIn, checkOut, note, actorId } = body;

    const missing = ['tenantId', 'userId', 'date', 'status', 'actorId'].filter((f) => !body[f]);
    if (missing.length) {
      return NextResponse.json({ error: `Missing required field(s): ${missing.join(', ')}` }, { status: 400 });
    }

    const denied = await requireSuperadminOrTenant(request, tenantId);
    if (denied) return denied;
    if (!DATE_RE.test(String(date))) {
      return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
    }
    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUS.join(', ')}` },
        { status: 400 }
      );
    }

    // The person being marked must exist in this tenant, or we would write an orphan row.
    const target = await findBy<{ id: string; name: string }>('users', 'id', userId, tenantId);
    if (!target) {
      return NextResponse.json({ error: `No user "${userId}" in tenant "${tenantId}"` }, { status: 404 });
    }

    const existing = (await list<AttendanceRow>('attendance', tenantId)).find(
      (r) => r.userId === userId && r.date === date
    );

    // Permission depends on who you are marking, and whether you are changing history.
    const markingSelf = actorId === userId;
    if (markingSelf) {
      if (!(await can(tenantId, actorId, 'attendance.self.mark'))) {
        throw new PermissionError('attendance.self.mark', 'SELF');
      }
    } else if (existing) {
      if (!(await can(tenantId, actorId, 'attendance.other.amend', { scope: 'DIRECT_REPORTS' }))) {
        throw new PermissionError('attendance.other.amend', 'DIRECT_REPORTS');
      }
    } else if (!(await can(tenantId, actorId, 'attendance.other.mark', { scope: 'DIRECT_REPORTS' }))) {
      throw new PermissionError('attendance.other.mark', 'DIRECT_REPORTS');
    }

    const now = new Date().toISOString();

    if (existing) {
      await update('attendance', 'id', existing.id, {
        status,
        checkIn: checkIn ?? existing.checkIn,
        checkOut: checkOut ?? existing.checkOut,
        note: note ?? existing.note,
        markedBy: actorId,
        markedAt: now,
      });

      await audit({
        tenantId,
        action: 'UPDATE',
        entityType: 'attendance',
        entityId: existing.id,
        actorId,
        before: { status: existing.status },
        after: { status },
      });

      return NextResponse.json({ success: true, id: existing.id, amended: true });
    }

    const row: AttendanceRow = {
      id: newId(),
      tenantId,
      userId,
      date,
      status,
      checkIn: checkIn || '',
      checkOut: checkOut || '',
      markedBy: actorId,
      markedAt: now,
      note: note || '',
    };
    await append('attendance', row);

    await audit({
      tenantId,
      action: 'CREATE',
      entityType: 'attendance',
      entityId: row.id,
      actorId,
      after: { userId, date, status },
    });

    return NextResponse.json({ success: true, id: row.id, amended: false }, { status: 201 });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message, capability: error.capability }, { status: 403 });
    }
    console.error('Mark attendance failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not mark attendance' },
      { status: 500 }
    );
  }
}

/** DELETE /api/attendance?tenantId=…&userId=…&date=…&actorId=… */
export async function DELETE(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const tenantId = sp.get('tenantId');
    const userId = sp.get('userId');
    const date = sp.get('date');
    const actorId = sp.get('actorId') || 'system';

    if (!tenantId || !userId || !date) {
      return NextResponse.json({ error: 'tenantId, userId and date are required' }, { status: 400 });
    }

    const denied = await requireSuperadminOrTenant(request, tenantId);
    if (denied) return denied;

    if (!(await can(tenantId, actorId, 'attendance.other.amend', { scope: 'DIRECT_REPORTS' }))) {
      return NextResponse.json(
        { error: 'Missing capability "attendance.other.amend"' },
        { status: 403 }
      );
    }

    const existing = (await list<AttendanceRow>('attendance', tenantId)).find(
      (r) => r.userId === userId && r.date === date
    );
    if (!existing) {
      return NextResponse.json({ error: 'No attendance record for that person and date' }, { status: 404 });
    }

    await remove('attendance', 'id', existing.id);
    await audit({
      tenantId,
      action: 'DELETE',
      entityType: 'attendance',
      entityId: existing.id,
      actorId,
      before: { userId, date, status: existing.status },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete attendance failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not delete the record' },
      { status: 500 }
    );
  }
}
