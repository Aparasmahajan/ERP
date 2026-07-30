# Local Testing Suite - Complete Guide

**Everything configured for local testing. Run these tests in order.**

---

## 🟢 Status: Ready to Test

✅ .env.local configured with test credentials  
✅ Dependencies available  
✅ All APIs ready  
✅ Test data prepared  

---

## Quick Start (5 minutes)

```bash
# 1. Start dev server
npm run dev

# Server should start at http://localhost:3000
# You should see: "Ready in X.XXXs"
```

Open another terminal:

```bash
# 2. Run test suite (see below for individual tests)
# Tests must be run after server is running

# Or open browser
http://localhost:3000/login
```

---

## Test Credentials

```
Email:    <your SUPERADMIN_EMAIL>
Password: <your SUPERADMIN_PASSWORD>
```

Use these for all authentication tests.

---

## Test 1: Login Page ✅

**Test In Browser:**
```
http://localhost:3000/login
```

**Expected:**
- ✅ Login page loads
- ✅ Gradient background visible
- ✅ Email field present
- ✅ Password field present
- ✅ "Sign In" button visible

**Result:** _______________

---

## Test 2: Valid Login ✅

**Option A: Browser**
```
http://localhost:3000/login
Email: <your SUPERADMIN_EMAIL>
Password: <your SUPERADMIN_PASSWORD>
Click "Sign In"
```

**Expected:**
- ✅ No error message
- ✅ Redirects to http://localhost:3000/admin
- ✅ Admin dashboard displays
- ✅ Shows "<your SUPERADMIN_EMAIL>" in header

**Result:** _______________

**Option B: cURL**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "<your SUPERADMIN_EMAIL>",
    "password": "<your SUPERADMIN_PASSWORD>"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "email": "<your SUPERADMIN_EMAIL>",
  "role": "SUPERADMIN",
  "expiresAt": 1690123456
}
```

**Result:** _______________

---

## Test 3: Invalid Login ✅

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "<your SUPERADMIN_EMAIL>",
    "password": "WrongPassword"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid superadmin credentials"
}
```

**HTTP Status:** 401

**Result:** _______________

---

## Test 4: Verify Authentication ✅

**cURL:**
```bash
curl http://localhost:3000/api/auth/verify \
  -b cookies.txt
```

(cookies.txt is from Test 2)

**Expected Response:**
```json
{
  "authenticated": true,
  "email": "<your SUPERADMIN_EMAIL>",
  "role": "SUPERADMIN",
  "expiresAt": 1690123456
}
```

**Result:** _______________

---

## Test 5: Create Tenant ✅

**cURL:**
```bash
curl -X POST http://localhost:3000/api/tenants/init \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "tenantName": "Test Store #1",
    "pack": "ORGANISATION",
    "adminEmail": "admin@teststore.com",
    "adminName": "Store Manager"
  }' > tenant_response.json
```

**Expected Response:**
```json
{
  "success": true,
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantName": "Test Store #1",
  "adminEmail": "admin@teststore.com",
  "filePath": "data/tenants/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440000.xlsx"
}
```

**Verify File Created:**
```bash
# Should exist:
dir "data\tenants\550e8400-e29b-41d4-a716-446655440000\"
```

**Result:** _______________

---

## Test 6: Read Tenant Branding ✅

**From Test 5, save TENANT_ID:**
```bash
set TENANT_ID=550e8400-e29b-41d4-a716-446655440000
```

**cURL:**
```bash
curl "http://localhost:3000/api/branding?tenant_id=%TENANT_ID%" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "data": {
    "primary_color": "#2563eb",
    "secondary_color": "#7c3aed",
    "domain": "test-store-1.erp"
  }
}
```

**Result:** _______________

---

## Test 7: Update Branding ✅

**cURL:**
```bash
curl -X PUT http://localhost:3000/api/branding \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{
    \"tenant_id\": \"%TENANT_ID%\",
    \"branding\": {
      \"primary_color\": \"#dc2626\",
      \"secondary_color\": \"#f59e0b\",
      \"logo_url\": \"https://via.placeholder.com/200\"
    },
    \"actor_id\": \"admin-user\"
  }"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "primary_color": "#dc2626",
    "secondary_color": "#f59e0b",
    "logo_url": "https://via.placeholder.com/200"
  }
}
```

**Result:** _______________

---

## Test 8: Read Module Features ✅

**cURL:**
```bash
curl "http://localhost:3000/api/module-features?tenant_id=%TENANT_ID%" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "data": [
    {
      "feature_id": "retail_barcode_scan",
      "name": "Barcode Scanning",
      "category": "Scanning & Speed",
      "enabled": false,
      "description": "Scan barcodes for fast product entry",
      "phase": 2
    },
    ...more features
  ]
}
```

**Check:** Should have 19+ features

**Result:** _______________

---

## Test 9: Read Positions ✅

**cURL:**
```bash
curl "http://localhost:3000/api/positions?tenant_id=%TENANT_ID%" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "data": [
    {
      "user_id": "admin-user-id",
      "org_unit_id": "org-unit-id",
      "title_override": "Administrator",
      "valid_from": "2026-07-26T00:00:00Z",
      "session_id": "SESSION_2026"
    }
  ]
}
```

**Check:** Should have at least 1 position (admin)

**Result:** _______________

---

## Test 10: Read Org Units ✅

**cURL:**
```bash
curl "http://localhost:3000/api/org-units?tenant_id=%TENANT_ID%" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "org-unit-id",
      "name": "Main Office",
      "location_code": "HQ",
      "status": "ACTIVE"
    }
  ]
}
```

**Check:** Should have at least 1 org unit

**Result:** _______________

---

## Test 11: Read Capabilities ✅

**cURL:**
```bash
curl "http://localhost:3000/api/capabilities?tenant_id=%TENANT_ID%" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "data": [
    {
      "user_id": "admin-user-id",
      "capability": "platform.tenant.provision",
      "scope": "TENANT",
      "granted_by": "system",
      "granted_at": "2026-07-26T00:00:00Z",
      "delegable": true
    }
  ]
}
```

**Result:** _______________

---

## Test 12: Create Second Tenant ✅

**cURL:**
```bash
curl -X POST http://localhost:3000/api/tenants/init \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "tenantName": "Test School",
    "pack": "INSTITUTION",
    "adminEmail": "principal@testschool.com",
    "adminName": "Principal"
  }' > tenant2_response.json
```

**Expected:** Success with different tenantId

**Result:** _______________

---

## Test 13: Logout ✅

**cURL:**
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

**Result:** _______________

---

## Test 14: Verify After Logout ✅

**cURL:**
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

**HTTP Status:** 401

**Result:** _______________

---

## Test 15: Admin Dashboard ✅

**Browser:**
```
1. Go to http://localhost:3000/admin
2. Should redirect to http://localhost:3000/login (not authenticated)
3. Login again with credentials
4. Should load admin dashboard
5. Should show session info
6. Should show "Logout" button
```

**Result:** _______________

---

## Summary Checklist

All 15 tests should pass:

- [ ] Test 1: Login page loads
- [ ] Test 2: Valid login succeeds
- [ ] Test 3: Invalid login fails
- [ ] Test 4: Token verification works
- [ ] Test 5: Tenant creation works
- [ ] Test 6: Read branding works
- [ ] Test 7: Update branding works
- [ ] Test 8: Read features works
- [ ] Test 9: Read positions works
- [ ] Test 10: Read org units works
- [ ] Test 11: Read capabilities works
- [ ] Test 12: Create second tenant works
- [ ] Test 13: Logout works
- [ ] Test 14: Verify logout works
- [ ] Test 15: Admin dashboard works

**All passing = System Ready ✅**

---

## Local Test Data

After running tests, you should have:

- **2 Tenants Created:**
  - Test Store #1 (ORGANISATION)
  - Test School (INSTITUTION)

- **Files Created:**
  - `data/tenants/[tenant-id]/[tenant-id].xlsx` (x2)
  - Each with 8 sheets:
    - users
    - positions
    - roles
    - org_units
    - capabilities
    - audit
    - branding
    - module_features

- **Sample Data Included:**
  - Admin user per tenant
  - Default org unit
  - 4 default roles
  - 19 module features
  - Default branding colors

---

## Troubleshooting Tests

### "Cannot POST /api/auth/login"

**Fix:**
```bash
# Make sure dev server is running
npm run dev

# In another terminal, run tests
# Do NOT run tests in same terminal
```

### "Invalid superadmin credentials" (unexpected)

**Fix:**
```bash
# Verify credentials in .env.local
cat .env.local | grep SUPERADMIN

# Should show:
# SUPERADMIN_EMAIL=<your SUPERADMIN_EMAIL>
# SUPERADMIN_PASSWORD=<your SUPERADMIN_PASSWORD>
```

### "No auth token" on protected routes

**Fix:**
```bash
# Need to login first and save cookies:
curl -c cookies.txt ... /api/auth/login

# Then use cookies:
curl -b cookies.txt ... /api/positions
```

### "Tenant file not created"

**Fix:**
```bash
# Check directory exists:
dir data\tenants\

# Check permissions:
# User should have write access to project directory
```

### Curl commands not working on Windows PowerShell

**Use this syntax instead:**
```powershell
# Instead of curl with single quotes:
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"<your SUPERADMIN_EMAIL>\",\"password\":\"<your SUPERADMIN_PASSWORD>\"}'
```

Or use Command Prompt (cmd) instead of PowerShell for easier curl syntax.

---

## Files to Check After Testing

```
Project Root:
├── .env.local ✅ (created)
├── data/
│   └── tenants/
│       ├── [tenant-id-1]/
│       │   └── [tenant-id-1].xlsx ✅
│       └── [tenant-id-2]/
│           └── [tenant-id-2].xlsx ✅
├── node_modules/ ✅ (dependencies)
├── app/
│   ├── login/ ✅ (login page)
│   ├── admin/ ✅ (admin dashboard)
│   └── api/
│       ├── auth/ ✅ (auth endpoints)
│       ├── tenants/ ✅
│       ├── positions/ ✅
│       ├── org-units/ ✅
│       ├── capabilities/ ✅
│       ├── branding/ ✅
│       └── module-features/ ✅
```

---

## After All Tests Pass

You're ready for Week 2! Proceed with:

1. **WEEK2_PLAN.md** — UI component development
2. **Build Role Assignment UI**
3. **Build Hierarchy Editor**
4. **Build Org Chart**
5. **Build Capability Manager**

---

**Status: 🟢 LOCAL TESTING READY**

**Run: npm run dev, then follow tests above**
