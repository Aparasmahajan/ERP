import { NextRequest, NextResponse } from 'next/server';
import { append, list } from '@/lib/sheets/erpSheets';
import { requireSuperadminAuth } from '@/lib/auth/middleware';
import { resolveSeedKey } from '@/lib/templates/resolve';
import { TEMPLATE_DEMOS } from '@/lib/seeds/templateDemos';

export interface EnquiryRow {
  id: string;
  orgName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  templateId: string;
  pack: string;
  message: string;
  status: 'NEW' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  reviewedBy: string;
  reviewedAt: string;
  rejectionReason: string;
  tenantId: string;
  /** Human-readable reference, e.g. STU-2026-0007. Shown in the admin table. */
  code: string;
}

let seq = 0;
function newId(): string {
  seq += 1;
  return `enq_${Date.now().toString(36)}${seq.toString(36)}`;
}

/**
 * A short reference an operator can quote on a call: PREFIX-YEAR-NNNN.
 * The prefix comes from the seed key so the type is readable at a glance
 * ('student-info-system' -> STU). Numbering restarts each year.
 */
function makeCode(seedKey: string, existing: EnquiryRow[]): string {
  const prefix = (seedKey.split('-')[0] || 'ENQ').slice(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const usedThisYear = existing.filter((e) => (e.code || '').includes(`-${year}-`)).length;
  return `${prefix}-${year}-${String(usedThisYear + 1).padStart(4, '0')}`;
}

/**
 * Public — a visitor submits an enquiry from a template on the landing page.
 * Deliberately unauthenticated; this is the top of the funnel.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, orgName, contactName, contactEmail, contactPhone, message } = body;

    const missing = ['templateId', 'orgName', 'contactName', 'contactEmail'].filter((f) => !body[f]);
    if (missing.length) {
      return NextResponse.json({ error: `Missing required field(s): ${missing.join(', ')}` }, { status: 400 });
    }

    // Reject an unknown template up front. Accepting it would only fail later at
    // provisioning time, long after the enquirer was told "thank you".
    // Forms submit catalogue ids ('institution'), which resolve to seed keys here.
    const seedKey = resolveSeedKey(templateId);
    if (!seedKey) {
      return NextResponse.json({ error: `Unknown template "${templateId}"` }, { status: 400 });
    }
    const template = (TEMPLATE_DEMOS as Record<string, any>)[seedKey];

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(contactEmail))) {
      return NextResponse.json({ error: 'That email address does not look valid.' }, { status: 400 });
    }

    const existing = await list<EnquiryRow>('enquiries');

    const row: EnquiryRow = {
      id: newId(),
      code: makeCode(seedKey, existing),
      orgName: String(orgName).trim(),
      contactName: String(contactName).trim(),
      contactEmail: String(contactEmail).trim(),
      contactPhone: contactPhone ? String(contactPhone).trim() : '',
      templateId,
      pack: template.tenant?.pack || 'ORGANISATION',
      message: message ? String(message).trim() : '',
      status: 'NEW',
      createdAt: new Date().toISOString(),
      reviewedBy: '',
      reviewedAt: '',
      rejectionReason: '',
      tenantId: '',
    };

    await append('enquiries', row);

    // Return only what the form needs; don't echo internal fields to the public.
    return NextResponse.json({ success: true, id: row.id, status: row.status }, { status: 201 });
  } catch (error) {
    console.error('Create enquiry failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not submit the enquiry' },
      { status: 500 }
    );
  }
}

/** Superadmin only — the review queue. Enquiries carry contact details. */
export async function GET(request: NextRequest) {
  const denied = await requireSuperadminAuth(request);
  if (denied) return denied;

  try {
    const statusFilter = request.nextUrl.searchParams.get('status');
    let rows = await list<EnquiryRow>('enquiries');

    if (statusFilter) {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    // Newest first, so the queue reads naturally.
    rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const all = await list<EnquiryRow>('enquiries');
    return NextResponse.json({
      data: rows,
      counts: {
        total: all.length,
        new: all.filter((r) => r.status === 'NEW').length,
        accepted: all.filter((r) => r.status === 'ACCEPTED').length,
        rejected: all.filter((r) => r.status === 'REJECTED').length,
      },
    });
  } catch (error) {
    console.error('List enquiries failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not read enquiries' },
      { status: 500 }
    );
  }
}
