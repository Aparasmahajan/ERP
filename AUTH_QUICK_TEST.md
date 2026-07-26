# Authentication Quick Test

Test the superadmin authentication system (takes 5 minutes)

---

## Setup

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Edit .env.local with your credentials
# Make sure to set:
# - SUPERADMIN_EMAIL=eparasmahajan@gmail.com
# - SUPERADMIN_PASSWORD=YourPassword123!
# - NEXTAUTH_SECRET=your-secret-key

# 3. Install dependencies
npm install jsonwebtoken @types/jsonwebtoken

# 4. Start dev server
npm run dev
```

---

## Test 1: UI Login Page ✅

Visit the login page in browser:

```
http://localhost:3000/login
```

**Check:**
- ✅ Blue/purple gradient background visible
- ✅ Login form displays
- ✅ Email and password fields present

---

## Test 2: Login with Valid Credentials ✅

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "eparasmahajan@gmail.com",
    "password": "YourPassword123!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "email": "eparasmahajan@gmail.com",
  "role": "SUPERADMIN",
  "expiresAt": 1690000000
}
```

**Status:** 200 OK

---

## Test 3: Verify Authentication ✅

```bash
curl http://localhost:3000/api/auth/verify \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "authenticated": true,
  "email": "eparasmahajan@gmail.com",
  "role": "SUPERADMIN",
  "expiresAt": 1690000000
}
```

**Status:** 200 OK

---

## Test 4: Access Admin Dashboard ✅

```
http://localhost:3000/admin
```

**Check:**
- ✅ Page loads (no redirect to /login)
- ✅ Shows email and role
- ✅ Session info visible
- ✅ Feature cards displayed

---

## Test 5: Login with Invalid Credentials ✅

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "eparasmahajan@gmail.com",
    "password": "WrongPassword"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid superadmin credentials"
}
```

**Status:** 401 Unauthorized

---

## Test 6: Logout ✅

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Status:** 200 OK

---

## Test 7: Access After Logout ✅

```bash
curl http://localhost:3000/api/auth/verify \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "authenticated": false,
  "error": "No auth token"
}
```

**Status:** 401 Unauthorized

---

## Test 8: Browser Login Flow ✅

1. Visit `http://localhost:3000/login`
2. Enter credentials:
   - Email: `eparasmahajan@gmail.com`
   - Password: `YourPassword123!`
3. Click "Sign In"
4. Should redirect to `/admin`
5. Click "Logout" button
6. Should redirect to `/login`

---

## Common Issues

### "Superadmin credentials not configured"

**Fix:**
```bash
# Restart dev server
npm run dev

# Check env file
cat .env.local | grep SUPERADMIN
```

### "Invalid superadmin credentials"

**Fix:**
- Check password in `.env.local`
- Ensure no extra spaces
- Verify email matches exactly

### Cookie not being set

**Check:**
```bash
# In curl command, use -c to save cookies:
curl -c cookies.txt ...

# View cookies:
cat cookies.txt
```

### "Authentication failed" (500 error)

**Fix:**
```bash
# Check NEXTAUTH_SECRET is set
grep NEXTAUTH_SECRET .env.local

# If empty, set a value:
echo 'NEXTAUTH_SECRET=my-secret-key-here' >> .env.local
```

---

## Success Criteria

All 8 tests should pass:

- [ ] Test 1: Login page loads
- [ ] Test 2: Valid login returns token
- [ ] Test 3: Token can be verified
- [ ] Test 4: Admin dashboard loads
- [ ] Test 5: Invalid credentials rejected
- [ ] Test 6: Logout clears session
- [ ] Test 7: No access after logout
- [ ] Test 8: Browser login flow works

---

**All tests passing = Authentication System Ready ✅**

Proceed to Week 2 with confidence!
