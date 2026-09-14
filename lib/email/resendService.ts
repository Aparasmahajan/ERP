/**
 * Resend Email Service
 *
 * Send emails via Resend.com (modern email API)
 * Required env vars:
 *   - RESEND_API_KEY
 */

import { Resend } from 'resend';

/**
 * Built on first use, not at import time.
 *
 * `new Resend(undefined)` throws "Missing API key", and a module-level instance runs that
 * constructor as soon as anything imports this file — which broke the production build
 * outright while RESEND_API_KEY was unset. Deferring it means email fails only when
 * someone actually tries to send, with a message they can act on.
 */
let client: Resend | null = null;

function resendClient(): Resend {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set, so email cannot be sent.');
  client = new Resend(key);
  return client;
}

/** Lets callers skip email gracefully rather than surfacing an error to a user. */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

const FROM_EMAIL = 'noreply@erpsystem.com';
const SUPPORT_EMAIL = 'support@erpsystem.com';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send a generic email
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Resend requires a body — one of html or text must be present. Reject up front
    // rather than sending a blank email.
    if (!options.html && !options.text) {
      return { success: false, error: 'Email needs either html or text content.' };
    }

    const result = await resendClient().emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      // resend v2 expects snake_case reply_to; `replyTo` is silently dropped, so replies
      // would have gone to the noreply address instead.
      reply_to: options.replyTo || SUPPORT_EMAIL,
      ...(options.html ? { html: options.html } : { text: options.text as string }),
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Send user invitation email
 */
export async function sendInviteEmail(
  email: string,
  userName: string,
  tenantName: string,
  inviteLink: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${tenantName}! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>You've been invited to join <strong>${tenantName}</strong> on our ERP system. Click the button below to accept your invitation and set up your account.</p>
            <a href="${inviteLink}" class="button">Accept Invitation</a>
            <p style="color: #6b7280; margin-top: 20px;">Or copy this link: <code>${inviteLink}</code></p>
            <p style="color: #6b7280; font-size: 12px;">This invitation expires in 7 days.</p>
            <div class="footer">
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              <p>ERP System Team</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Invitation to join ${tenantName}`,
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  resetLink: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f9fafb; padding: 20px; border-radius: 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Password Reset Request</h2>
          </div>
          <p>Hi ${userName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <div class="warning">
            <strong>⚠️ Important:</strong> This link expires in 1 hour. If you didn't request this, ignore this email and your password will remain unchanged.
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">ERP System Team</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html,
  });
}

/**
 * Send daily sales summary (for retail)
 */
export async function sendDailySummaryEmail(
  email: string,
  managerName: string,
  tenantName: string,
  summary: {
    totalSales: number;
    itemsSold: number;
    refunds: number;
    cash: number;
    card: number;
    topProducts: { name: string; qty: number }[];
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 20px; border-radius: 8px; }
          .stat { display: inline-block; width: 48%; margin: 10px 1%; padding: 15px; background: #f0f9ff; border-radius: 6px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
          .top-products { margin-top: 20px; }
          .product-row { padding: 10px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${tenantName} - Daily Summary</h2>
            <p>Today's Performance Report</p>
          </div>

          <div style="margin-top: 30px;">
            <div class="stat">
              <div class="stat-value">₹${summary.totalSales.toLocaleString()}</div>
              <div class="stat-label">Total Sales</div>
            </div>
            <div class="stat">
              <div class="stat-value">${summary.itemsSold}</div>
              <div class="stat-label">Items Sold</div>
            </div>
            <div class="stat">
              <div class="stat-value">${summary.refunds}</div>
              <div class="stat-label">Refunds</div>
            </div>
            <div class="stat">
              <div class="stat-value">₹${summary.card.toLocaleString()}</div>
              <div class="stat-label">Card Sales</div>
            </div>
          </div>

          <div class="top-products">
            <h3>Top Selling Products:</h3>
            ${summary.topProducts.map((p) => `<div class="product-row"><span>${p.name}</span><strong>${p.qty} sold</strong></div>`).join('')}
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 6px;">
            <p style="color: #6b7280; font-size: 12px;">This is an automated daily summary. Login to your dashboard for more details.</p>
            <p style="color: #6b7280; font-size: 12px;">ERP System - ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `${tenantName} - Daily Sales Summary`,
    html,
  });
}

/**
 * Send role change notification
 */
export async function sendRoleChangeEmail(
  email: string,
  userName: string,
  oldRole: string,
  newRole: string,
  tenantName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .role-box { padding: 15px; background: #f0f9ff; border-left: 4px solid #2563eb; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Role Update - ${tenantName}</h2>
          <p>Hi ${userName},</p>
          <p>Your role has been updated in ${tenantName}.</p>

          <div class="role-box">
            <strong>Previous Role:</strong> ${oldRole}<br/>
            <strong>New Role:</strong> ${newRole}
          </div>

          <p>Your access and permissions have been updated accordingly. If you have any questions, contact your administrator.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">ERP System Team</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Role Update in ${tenantName}`,
    html,
  });
}

/**
 * Send low stock alert to manager
 */
export async function sendLowStockAlert(
  email: string,
  managerName: string,
  tenantName: string,
  products: { name: string; currentStock: number; reorderLevel: number }[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 6px; }
          .product-row { padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Low Stock Alert - ${tenantName}</h2>
            <p>The following items are below reorder level:</p>
          </div>

          <div style="margin-top: 20px;">
            ${products
              .map(
                (p) => `
              <div class="product-row">
                <span>
                  <strong>${p.name}</strong><br/>
                  <small style="color: #6b7280;">Current: ${p.currentStock} | Reorder: ${p.reorderLevel}</small>
                </span>
              </div>
            `
              )
              .join('')}
          </div>

          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            Please review and place orders to avoid stockouts.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🚨 Low Stock Alert - ${tenantName}`,
    html,
  });
}

export default {
  sendEmail,
  sendInviteEmail,
  sendPasswordResetEmail,
  sendDailySummaryEmail,
  sendRoleChangeEmail,
  sendLowStockAlert,
};
