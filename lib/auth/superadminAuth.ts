/**
 * Superadmin Authentication
 *
 * Validates superadmin credentials from environment variables
 * Used for system administration and tenant management
 *
 * Required env vars:
 *   - SUPERADMIN_EMAIL
 *   - SUPERADMIN_PASSWORD
 *   - NEXTAUTH_SECRET
 */

import jwt from 'jsonwebtoken';

export interface SuperadminSession {
  email: string;
  role: 'SUPERADMIN';
  issuedAt: number;
  expiresAt: number;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  session?: SuperadminSession;
  error?: string;
}

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'change-me-in-production';
const TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours

/**
 * Authenticate superadmin credentials
 */
export async function authenticateSuperadmin(
  email: string,
  password: string
): Promise<AuthResult> {
  // Validate credentials against environment variables
  if (email !== SUPERADMIN_EMAIL || password !== SUPERADMIN_PASSWORD) {
    return {
      success: false,
      error: 'Invalid superadmin credentials',
    };
  }

  // Generate JWT token
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + TOKEN_EXPIRY;

  const session: SuperadminSession = {
    email,
    role: 'SUPERADMIN',
    issuedAt,
    expiresAt,
  };

  const token = jwt.sign(session, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });

  return {
    success: true,
    token,
    session,
  };
}

/**
 * Verify and decode JWT token
 */
export function verifySuperadminToken(token: string): SuperadminSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SuperadminSession;

    // Verify it's a superadmin token
    if (decoded.role !== 'SUPERADMIN') {
      return null;
    }

    // Check expiry
    if (decoded.expiresAt < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Check if superadmin credentials are configured
 */
export function isSuperadminConfigured(): boolean {
  return !!(SUPERADMIN_EMAIL && SUPERADMIN_PASSWORD);
}

/**
 * Validate request has superadmin authorization
 */
export function validateSuperadminAuth(authHeader?: string): SuperadminSession | null {
  const token = extractTokenFromHeader(authHeader);
  if (!token) return null;

  return verifySuperadminToken(token);
}

export default {
  authenticateSuperadmin,
  verifySuperadminToken,
  extractTokenFromHeader,
  isSuperadminConfigured,
  validateSuperadminAuth,
};
