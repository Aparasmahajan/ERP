import { NextRequest, NextResponse } from 'next/server';
import { findBy, update, audit } from '@/lib/sheets/erpSheets';
import { requireSuperadminAuth, superadminIdFrom } from '@/lib/auth/middleware';
import { provisionTenant } from '@/lib/provisioning/provisionTenant';
import { createInviteToken, inviteUrl } from '@/lib/auth/tenantAuth';
import type { EnquiryRow } from '../route';

/**
 * Superadmin accepts or rejects an enquiry.
 *
 * Accepting provisions a real tenant from the template the enquirer chose, then stamps the
 * new tenantId back onto the enquiry row so the two are linked.
 *
 * PATCH body: { action: 'ACCEPT' } | { action: 'REJECT', reason?: string }
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSuperadminAuth(request);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const actorId = superadminIdFrom(request) || 'superadmin';
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').toUpperCase();

    if (action !== 'ACCEPT' && action !== 'REJECT') {
      return NextResponse.json({ error: "action must be 'ACCEPT' or 'REJECT'" }, { status: 400 });
    }

    const enquiry = await findBy<EnquiryRow>('enquiries', 'id', id);
    if (!enquiry) {
      return NextResponse.json({ error: `No enquiry with id "${id}"` }, { status: 404 });
    }

    // Guard against double-processing: accepting twice would provision a second tenant for
    // the same customer, and the first would be orphaned.
    if (enquiry.status !== 'NEW') {
      return NextResponse.json(
        {
          error: `This enquiry was already ${enquiry.status.toLowerCase()}${
            enquiry.reviewedAt ? ` on ${new Date(enquiry.reviewedAt).toLocaleString()}` : ''
          }.`,
          status: enquiry.status,
          tenantId: enquiry.tenantId || undefined,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    if (action === 'REJECT') {
      await update('enquiries', 'id', id, {
        status: 'REJECTED',
        reviewedBy: actorId,
        reviewedAt: now,
        rejectionReason: body.reason ? String(body.reason).trim() : '',
      });

      await audit({
        tenantId: '',
        action: 'UPDATE',
        entityType: 'enquiry',
        entityId: id,
        actorId,
        before: { status: 'NEW' },
        after: { status: 'REJECTED' },
        reason: body.reason ? String(body.reason) : 'Rejected by superadmin',
      });

      return NextResponse.json({ success: true, status: 'REJECTED' });
    }

    // ── ACCEPT: provision, then link the tenant back to the enquiry ──
    const result = await provisionTenant({
      templateId: enquiry.templateId,
      orgName: enquiry.orgName,
      adminName: enquiry.contactName,
      adminEmail: enquiry.contactEmail,
      pack: enquiry.pack,
      actorId,
    });

    await update('enquiries', 'id', id, {
      status: 'ACCEPTED',
      reviewedBy: actorId,
      reviewedAt: now,
      tenantId: result.tenantId,
    });

    await audit({
      tenantId: result.tenantId,
      action: 'UPDATE',
      entityType: 'enquiry',
      entityId: id,
      actorId,
      before: { status: 'NEW' },
      after: { status: 'ACCEPTED', tenantId: result.tenantId, slug: result.slug },
      reason: 'Accepted and provisioned',
    });

    // Provisioned users have no password, so the admin cannot sign in until they accept
    // an invite. Return the link directly — Resend is not configured yet, so the
    // superadmin passes it on manually. Wiring email later is purely additive.
    const invite = createInviteToken(result.tenantId, result.adminUserId);

    return NextResponse.json({
      success: true,
      status: 'ACCEPTED',
      tenantId: result.tenantId,
      slug: result.slug,
      portalUrl: `/portal/${result.slug}`,
      loginUrl: `/portal/${result.slug}/login`,
      inviteUrl: inviteUrl(invite),
      adminEmail: enquiry.contactEmail,
      counts: result.counts,
    });
  } catch (error) {
    console.error('Enquiry review failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not process the enquiry' },
      { status: 500 }
    );
  }
}

/** Superadmin only — a single enquiry. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSuperadminAuth(request);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const enquiry = await findBy<EnquiryRow>('enquiries', 'id', id);
    if (!enquiry) {
      return NextResponse.json({ error: `No enquiry with id "${id}"` }, { status: 404 });
    }
    return NextResponse.json({ data: enquiry });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not read the enquiry' },
      { status: 500 }
    );
  }
}
