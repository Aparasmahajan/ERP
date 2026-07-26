# Superadmin Authentication Setup

**Complete guide for setting up and using the authentication system**

---

## Quick Start

### 1. Setup Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your credentials:

```bash
# Superadmin credentials (REQUIRED)
SUPERADMIN_EMAIL=eparasmahajan@gmail.com
SUPERADMIN_PASSWORD=YourSecurePassword123!

# JWT Secret for session tokens (REQUIRED)
NEXTAUTH_SECRET=your-super-secret-key-here-change-in-production

# Other services (already covered in Week 1)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RESEND_API_KEY=re_xxxxxxxx
```

### 2. Install Dependencies

```bash
npm install jsonwebtoken
```

### 3. Start Development Server

```bash
npm run dev
```

---

## Login Flow

### 1. Visit Login Page

```
http://localhost:3000/login
```

### 2. Enter Credentials

- **Email:** Value from `SUPERADMIN_EMAIL`
- **Password:** Value from `SUPERADMIN_PASSWORD`

### 3. Access Admin Portal

After successful login, you'll be redirected to:

```
http://localhost:3000/admin
```

---

## API Endpoints

### POST `/api/auth/login`

Login with superadmin credentials.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "eparasmahajan@gmail.com",
    "password": "YourSecurePassword123!"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "email": "eparasmahajan@gmail.com",
  "role": "SUPERADMIN",
  "expiresAt": 1690000000
}
```

**Note:** Auth token is set in HTTP-only cookie `erp_auth_token`

**Response (Failure):**
```json
{
  "error": "Invalid superadmin credentials"
}
```

---

### GET `/api/auth/verify`

Verify current authentication session.

**Request:**
```bash
curl http://localhost:3000/api/auth/verify \
  -H "Cookie: erp_auth_token=<token>"
```

**Response (Authenticated):**
```json
{
  "authenticated": true,
  "email": "eparasmahajan@gmail.com",
  "role": "SUPERADMIN",
  "expiresAt": 1690000000
}
```

**Response (Not Authenticated):**
```json
{
  "authenticated": false,
  "error": "No auth token"
}
```

---

### POST `/api/auth/logout`

Clear authentication session.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: erp_auth_token=<token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Token Structure

JWT tokens contain:

```json
{
  "email": "eparasmahajan@gmail.com",
  "role": "SUPERADMIN",
  "issuedAt": 1689999000,
  "expiresAt": 1690085400,
  "iat": 1689999000,
  "exp": 1690085400
}
```

**Token Lifespan:** 24 hours

---

## Protecting Routes with Authentication

### In API Routes

```typescript
import { requireSuperadminAuth } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  // Verify authentication
  const auth = await requireSuperadminAuth(request);
  if (auth instanceof NextResponse) return auth; // Unauthorized

  // Continue with authenticated request
  const body = await request.json();
  // ... handle request
}
```

### In Page Components

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedPage() {
  const router = useRouter();

  useEffect(() => {
    // Verify auth on page load
    async function checkAuth() {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        router.push('/login');
      }
    }

    checkAuth();
  }, [router]);

  // Component content
}
```

---

## Security Considerations

### Environment Variables

✅ **DO:**
- Use strong passwords (minimum 12 characters)
- Change `NEXTAUTH_SECRET` to a random value
- Never commit `.env.local` to git
- Use different credentials for dev/staging/production
- Rotate credentials periodically

❌ **DON'T:**
- Use the same password as other services
- Use simple passwords (123456, password, etc.)
- Share environment files
- Commit credentials to version control
- Use hardcoded credentials in code

### Cookie Security

The auth token is stored in an HTTP-only cookie with:

- ✅ `httpOnly: true` — Prevents XSS attacks
- ✅ `secure: true` — HTTPS only in production
- ✅ `sameSite: strict` — CSRF protection
- ✅ 24-hour expiration

### Token Expiry

Tokens expire after 24 hours. Users must login again to get a new token.

---

## Troubleshooting

### "Superadmin credentials not configured"

**Error:** 503 Service Unavailable

**Cause:** Environment variables not set

**Fix:**
```bash
# Check .env.local exists
ls .env.local

# Verify variables are set
grep SUPERADMIN_EMAIL .env.local
grep SUPERADMIN_PASSWORD .env.local
```

### "Invalid superadmin credentials"

**Error:** 401 Unauthorized

**Cause:** Wrong email or password

**Fix:**
- Verify credentials in `.env.local`
- Check for extra spaces or quotes
- Restart dev server after env changes

### "No auth token" / "Invalid or expired token"

**Error:** 401 Unauthorized

**Cause:** Token missing or expired

**Fix:**
- Login again at `/login`
- Clear cookies and try again
- Check browser dev tools → Application → Cookies

### "Authentication failed"

**Error:** 500 Internal Server Error

**Cause:** JWT secret misconfigured

**Fix:**
- Verify `NEXTAUTH_SECRET` is set
- Check it's not empty or whitespace
- Restart dev server

---

## Development vs Production

### Development

```bash
# .env.local
SUPERADMIN_EMAIL=dev@localhost
SUPERADMIN_PASSWORD=dev123
NEXTAUTH_SECRET=dev-secret-key-not-secure
NEXTAUTH_URL=http://localhost:3000
```

### Production

```bash
# .env.production
SUPERADMIN_EMAIL=your-email@company.com
SUPERADMIN_PASSWORD=GenerateSecurePassword_2024!
NEXTAUTH_SECRET=$(openssl rand -base64 32)  # Generate random secret
NEXTAUTH_URL=https://yourdomain.com
```

---

## Future: Multi-Tenant Admin Access (Phase 2)

Currently only superadmin access is implemented. Phase 2 will add:

- Tenant-specific admin accounts
- Role-based access control (RBAC)
- Permission scopes (SELF, TENANT, etc.)
- Audit trail for admin actions

---

## Testing the Auth System

### Test 1: Login with Valid Credentials

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "eparasmahajan@gmail.com",
    "password": "YourSecurePassword123!"
  }'
```

Expected: 200 OK with success: true

### Test 2: Verify Authentication

```bash
curl http://localhost:3000/api/auth/verify \
  -b cookies.txt
```

Expected: 200 OK with authenticated: true

### Test 3: Access Protected Route

```bash
curl http://localhost:3000/api/tenants/init \
  -b cookies.txt
```

Expected: 200 OK (endpoint accessible)

### Test 4: Access Without Auth

```bash
curl http://localhost:3000/api/tenants/init
```

Expected: 401 Unauthorized

### Test 5: Login with Invalid Credentials

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "eparasmahajan@gmail.com",
    "password": "wrongpassword"
  }'
```

Expected: 401 Unauthorized

### Test 6: Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

Expected: 200 OK with success: true

---

## Files Created

- `.env.example` — Environment variables template
- `lib/auth/superadminAuth.ts` — Authentication logic
- `lib/auth/middleware.ts` — Route protection middleware
- `app/api/auth/login/route.ts` — Login endpoint
- `app/api/auth/logout/route.ts` — Logout endpoint
- `app/api/auth/verify/route.ts` — Verify authentication
- `app/login/page.tsx` — Login UI
- `app/admin/page.tsx` — Admin dashboard

---

## Next Steps

1. **Setup .env.local** with your superadmin credentials
2. **Test login flow** using the 6 test cases above
3. **Protect API routes** using `requireSuperadminAuth` middleware
4. **Build tenant admin features** in Week 2
5. **Implement audit logging** for all admin actions

---

**Status:** ✅ Authentication system complete and ready for use

**Security Level:** ⭐⭐⭐⭐ (Production-ready for soft launch)
