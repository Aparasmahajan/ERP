/**
 * Authentication for people inside a tenant — distinct from the platform superadmin.
 *
 * Provisioning creates users with an empty passwordHash and status INVITED, so nobody can
 * sign in until they accept an invite and choose a password. Two token kinds:
 *
 *   invite  — short-lived, proves "you are allowed to set a password for this user"
 *   session — the login cookie, carries userId + tenantId
 *
 * The session cookie is a DIFFERENT name from the superadmin one, so a superadmin
 * reviewing enquiries and a tenant user working in their portal can coexist in one browser.
 *
 * Critical rule enforced here: a session is only valid for the tenant it was issued for.
 * Without that check a valid login for one customer could read another customer's data,
 * since every route takes the tenant from the URL.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findBy, update } from '@/lib/sheets/erpSheets';

export const TENANT_COOKIE = 'erp_tenant_token';

const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const BCRYPT_ROUNDS = 10;

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error('NEXTAUTH_SECRET is not set');
  return s;
}

export interface InviteToken {
  purpose: 'invite';
  tenantId: string;
  userId: string;
}

export interface TenantSession {
  purpose: 'session';
  tenantId: string;
  tenantSlug: string;
  userId: string;
  email: string;
  name: string;
}

interface UserRow {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  email: string;
  passwordHash: string;
  status: string;
}

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  status: string;
}

// ── invites ──

export function createInviteToken(tenantId: string, userId: string): string {
  const payload: InviteToken = { purpose: 'invite', tenantId, userId };
  return jwt.sign(payload, secret(), { expiresIn: INVITE_TTL_SECONDS });
}

export function verifyInviteToken(token: string): InviteToken | null {
  try {
    const decoded = jwt.verify(token, secret()) as InviteToken;
    // Reject a session token presented where an invite is expected, and vice versa.
    return decoded.purpose === 'invite' ? decoded : null;
  } catch {
    return null;
  }
}

/** Absolute URL a new user follows to choose their password. */
export function inviteUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/accept-invite?token=${encodeURIComponent(token)}`;
}

export interface AcceptInviteResult {
  ok: boolean;
  error?: string;
  tenantSlug?: string;
  email?: string;
}

/**
 * Set a password from a valid invite token and activate the account.
 * Refuses if the account already has a password, so a leaked invite link cannot be
 * replayed later to take over an active account.
 */
export async function acceptInvite(token: string, password: string): Promise<AcceptInviteResult> {
  const payload = verifyInviteToken(token);
  if (!payload) return { ok: false, error: 'That invite link is invalid or has expired.' };

  if (!password || password.length < 8) {
    return { ok: false, error: 'Choose a password of at least 8 characters.' };
  }

  const user = await findBy<UserRow>('users', 'id', payload.userId, payload.tenantId);
  if (!user) return { ok: false, error: 'That account no longer exists.' };

  if (user.passwordHash) {
    return { ok: false, error: 'This invite has already been used. Sign in instead, or reset your password.' };
  }

  const tenant = await findBy<TenantRow>('tenants', 'id', payload.tenantId);
  if (!tenant) return { ok: false, error: 'That organisation no longer exists.' };

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await update('users', 'id', user.id, { passwordHash, status: 'ACTIVE' });

  return { ok: true, tenantSlug: tenant.slug, email: user.email };
}

// ── login ──

export interface LoginResult {
  ok: boolean;
  error?: string;
  token?: string;
  session?: TenantSession;
}

/**
 * Verify credentials for a user inside one tenant.
 *
 * Deliberately returns the same message for "no such email" and "wrong password" so the
 * response cannot be used to enumerate who has an account.
 */
export async function loginTenantUser(
  tenantSlug: string,
  email: string,
  password: string
): Promise<LoginResult> {
  const GENERIC = 'Those details do not match an account.';

  const tenant = await findBy<TenantRow>('tenants', 'slug', tenantSlug);
  if (!tenant) return { ok: false, error: 'Unknown organisation.' };
  if (tenant.status !== 'ACTIVE') {
    return { ok: false, error: 'That organisation is not active. Contact your administrator.' };
  }

  const user = await findBy<UserRow>('users', 'email', email.trim(), tenant.id);
  if (!user) return { ok: false, error: GENERIC };

  if (!user.passwordHash) {
    return { ok: false, error: 'Your account is not set up yet. Use the invite link you were sent.' };
  }
  if (user.status === 'SUSPENDED') {
    return { ok: false, error: 'That account is suspended. Contact your administrator.' };
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) return { ok: false, error: GENERIC };

  const session: TenantSession = {
    purpose: 'session',
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    userId: user.id,
    email: user.email,
    name: user.name,
  };
  const token = jwt.sign(session, secret(), { expiresIn: SESSION_TTL_SECONDS });

  return { ok: true, token, session };
}

export function verifyTenantSession(token: string): TenantSession | null {
  try {
    const decoded = jwt.verify(token, secret()) as TenantSession;
    return decoded.purpose === 'session' ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * The session in this request, but ONLY if it belongs to `requiredSlug`.
 *
 * Every portal route takes its tenant from the URL, so without this comparison a valid
 * session for one customer would happily read another customer's rows.
 */
export function sessionForTenant(
  cookieValue: string | undefined,
  requiredSlug: string
): TenantSession | null {
  if (!cookieValue) return null;
  const session = verifyTenantSession(cookieValue);
  if (!session) return null;
  if (session.tenantSlug !== requiredSlug) return null;
  return session;
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
