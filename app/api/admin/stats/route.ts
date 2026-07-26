import { NextRequest, NextResponse } from 'next/server';
import { list } from '@/lib/sheets/erpSheets';
import { requireSuperadminAuth } from '@/lib/auth/middleware';

/**
 * Counts for the superadmin dashboard, read live from Sheets.
 *
 * The dashboard previously showed static placeholder cards with no data behind them.
 */
export async function GET(request: NextRequest) {
  const denied = await requireSuperadminAuth(request);
  if (denied) return denied;

  try {
    // Platform-level counts only. Roles are deliberately NOT counted: every tenant gets
    // its own copy of its template's role catalogue, so a total would just track
    // tenants x template size and mean nothing at this level. Skipping it also saves one
    // Sheets read per dashboard load, which matters against the per-minute quota.
    const [enquiries, tenants, users] = await Promise.all([
      list<{ status: string }>('enquiries'),
      list<{ status: string }>('tenants'),
      list<{ id: string; status: string }>('users'),
    ]);

    const accepted = enquiries.filter((e) => e.status === 'ACCEPTED').length;
    const decided = accepted + enquiries.filter((e) => e.status === 'REJECTED').length;

    return NextResponse.json({
      enquiries: {
        total: enquiries.length,
        pending: enquiries.filter((e) => e.status === 'NEW').length,
        accepted,
        rejected: enquiries.filter((e) => e.status === 'REJECTED').length,
        /** Share of reviewed enquiries that were accepted. null until something is reviewed. */
        conversionPct: decided > 0 ? Math.round((accepted / decided) * 100) : null,
      },
      tenants: {
        total: tenants.length,
        active: tenants.filter((t) => t.status === 'ACTIVE').length,
      },
      users: {
        total: users.length,
        active: users.filter((u) => u.status === 'ACTIVE').length,
        /** Provisioned but never signed in — onboarding that has stalled. */
        invited: users.filter((u) => u.status === 'INVITED').length,
      },
    });
  } catch (error) {
    console.error('Admin stats failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not read stats' },
      { status: 500 }
    );
  }
}
