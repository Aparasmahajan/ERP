# 🚀 START LOCAL TESTING NOW

**Everything is configured. Follow these exact steps.**

---

## ✅ What's Already Done

- ✅ `.env.local` created with test credentials
- ✅ All dependencies available
- ✅ All APIs ready
- ✅ Test data prepared
- ✅ Automated test script created

---

## 🎯 Start Testing (3 Simple Steps)

### Step 1: Start the Development Server

**In Terminal 1:**
```bash
cd "C:\Users\parmahaj\Documents\New folder\ERP"
npm run dev
```

**Wait for message:**
```
▲ Next.js 15.0.0
  - Local:        http://localhost:3000
```

✅ Keep this running

---

### Step 2: Run Automated Tests

**In Terminal 2 (new window):**
```bash
cd "C:\Users\parmahaj\Documents\New folder\ERP"
powershell -ExecutionPolicy Bypass -File run-tests.ps1
```

**Expected Output:**
```
✅ Server is running
✅ Login successful
✅ Authentication verified
✅ Tenant created
✅ Branding retrieved
✅ Branding updated
✅ Features retrieved
✅ Positions retrieved
✅ Org units retrieved
✅ Capabilities retrieved
✅ Logout successful

🎉 All tests passed! System ready for Week 2!
```

---

### Step 3: Manual Testing (Optional)

**Test in Browser:**

```
http://localhost:3000/login
```

**Login with:**
- Email: `<your SUPERADMIN_EMAIL>`
- Password: `<your SUPERADMIN_PASSWORD>`

**You should see:**
- ✅ Login page loads
- ✅ Can enter credentials
- ✅ Click "Sign In"
- ✅ Redirects to admin dashboard
- ✅ Shows session info
- ✅ Can click "Logout"

---

## 📋 Test Credentials

```
Email:    <your SUPERADMIN_EMAIL>
Password: <your SUPERADMIN_PASSWORD>
```

Use these for all tests.

---

## ✨ What Gets Tested

**10 Automated Tests:**

1. ✅ Login with valid credentials
2. ✅ Verify authentication token
3. ✅ Create new tenant
4. ✅ Read tenant branding
5. ✅ Update tenant branding
6. ✅ Read module features
7. ✅ Read positions (hierarchy)
8. ✅ Read organization units
9. ✅ Read capabilities (permissions)
10. ✅ Logout

---

## 📁 Test Data Created

**After tests run, you'll have:**

```
data/
└── tenants/
    └── [random-uuid]/
        └── [random-uuid].xlsx
            ├── users (1 admin)
            ├── positions (1 admin position)
            ├── roles (4 default roles)
            ├── org_units (1 main office)
            ├── capabilities (admin permissions)
            ├── audit (test operations logged)
            ├── branding (customized colors)
            └── module_features (19 features)
```

---

## 🔍 Manual Test Examples

If you want to test manually with curl:

### Test 1: Login
```bash
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "<your SUPERADMIN_EMAIL>",
    "password": "<your SUPERADMIN_PASSWORD>"
  }'
```

**Should return:**
```json
{
  "success": true,
  "email": "<your SUPERADMIN_EMAIL>",
  "role": "SUPERADMIN"
}
```

### Test 2: Create Tenant
```bash
curl -X POST http://localhost:3000/api/tenants/init `
  -H "Content-Type: application/json" `
  -d '{
    "tenantName": "My Store",
    "pack": "ORGANISATION",
    "adminEmail": "admin@mystore.com",
    "adminName": "Store Admin"
  }'
```

### Test 3: Check File Created
```bash
dir "data\tenants\[tenant-id]\"
```

Should show `[tenant-id].xlsx` file.

---

## ⚡ Quick Troubleshooting

### Server won't start

```bash
# Make sure you're in the project directory
cd "C:\Users\parmahaj\Documents\New folder\ERP"

# Try again
npm run dev
```

### Tests fail with "Cannot reach server"

```bash
# Terminal 1 should show:
# ▲ Next.js 15.0.0
# - Local: http://localhost:3000

# If not running, do:
npm run dev
```

### Login fails

```bash
# Check .env.local exists
type .env.local

# Should show credentials:
# SUPERADMIN_EMAIL=<your SUPERADMIN_EMAIL>
# SUPERADMIN_PASSWORD=<your SUPERADMIN_PASSWORD>
```

### Test script permission error

```bash
# Use this instead:
powershell -ExecutionPolicy Bypass -File run-tests.ps1
```

---

## ✅ Success Indicators

After running `run-tests.ps1`, you should see:

- ✅ `Server is running`
- ✅ `Login successful`
- ✅ `Tenant created`
- ✅ `All tests passed`

**If all show ✅, the system is ready!**

---

## 📊 What's Working After Tests

| Component | Status | Notes |
|-----------|--------|-------|
| Authentication | ✅ Working | Login, verify, logout |
| Tenants | ✅ Working | Create, store in Excel |
| Branding | ✅ Working | Read, update colors |
| Features | ✅ Working | 19 features available |
| Positions | ✅ Working | Hierarchy structure |
| Org Units | ✅ Working | Organization structure |
| Capabilities | ✅ Working | Permissions system |
| Excel | ✅ Working | All sheets created |

---

## 🎯 Next After Testing

### Immediate (Today)
1. ✅ Run automated tests
2. ✅ Verify browser login works
3. ✅ Check Excel files created

### Tomorrow (Week 2)
1. Read `WEEK2_PLAN.md`
2. Start UI component development
3. Build Role Assignment form

---

## 📖 Documentation to Review

After tests pass, read in this order:

1. **PROJECT_STATUS.md** — Overall project state
2. **WEEK2_PLAN.md** — What to build next
3. **LOCAL_TEST_SUITE.md** — Detailed test documentation

---

## 💡 Tips

- Keep Terminal 1 (dev server) always running
- Open Terminal 2 for tests/other commands
- Use PowerShell for Windows (easier syntax)
- Check browser console (F12) for any errors
- Check Terminal 1 for server-side errors

---

## 🚀 You're Ready!

Run these commands now:

```bash
# Terminal 1
cd "C:\Users\parmahaj\Documents\New folder\ERP"
npm run dev

# Wait for "Local: http://localhost:3000"

# Then in Terminal 2
cd "C:\Users\parmahaj\Documents\New folder\ERP"
powershell -ExecutionPolicy Bypass -File run-tests.ps1
```

---

## Status

- ✅ Environment configured
- ✅ Credentials set
- ✅ APIs ready
- ✅ Test script created
- 🔴 **Tests not run yet**

**Run: `npm run dev` + `powershell -ExecutionPolicy Bypass -File run-tests.ps1`**

---

Good luck! 🎉 All systems ready for testing.
