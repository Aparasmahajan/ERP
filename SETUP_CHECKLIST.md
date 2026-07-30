# Setup Checklist - Before Starting Week 2

**Complete these steps to prepare for Week 2 UI development**

---

## Prerequisites (Do This First)

- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] Git configured
- [ ] Text editor ready (VS Code recommended)

---

## Step 1: Install Dependencies

```bash
cd "c:\Users\parmahaj\Documents\New folder\ERP"
npm install
```

**Expected:** ~50 packages installed (no errors)

---

## Step 2: Create Environment File

```bash
cp .env.example .env.local
```

**Edit .env.local:**
```
SUPERADMIN_EMAIL=eparasmahajan@gmail.com
SUPERADMIN_PASSWORD=YourSecurePassword123!
NEXTAUTH_SECRET=your-random-secret-key-here
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RESEND_API_KEY=re_xxxxxxxxxx
```

---

## Step 3: Start Development Server

```bash
npm run dev
```

**Expected:** http://localhost:3000 ready

---

## Step 4: Test Login Page

Visit: http://localhost:3000/login

- [ ] Page loads without errors
- [ ] Gradient background visible
- [ ] Email and password fields present
- [ ] Sign In button visible

---

## Step 5: Test Login

**Enter:**
- Email: eparasmahajan@gmail.com
- Password: YourSecurePassword123!

**Click Sign In**

- [ ] No errors
- [ ] Redirects to /admin
- [ ] Admin dashboard displays

---

## Step 6: Test Auth APIs

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"eparasmahajan@gmail.com","password":"YourSecurePassword123!"}'
```

- [ ] Returns: success: true

---

## Step 7: Read Documentation

- [ ] PROJECT_STATUS.md
- [ ] AUTH_SETUP.md
- [ ] WEEK2_PLAN.md

---

## Completion

- [ ] All steps complete
- [ ] No console errors
- [ ] Can login and access /admin
- [ ] Documentation reviewed

**Ready for Week 2! ✅**

---

## Troubleshooting

**"Module not found"**
```bash
npm install
npm run dev
```

**"Cannot find .env.local"**
```bash
cp .env.example .env.local
```

**"Port 3000 in use"**
```bash
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Login fails with "credentials not configured"**
```bash
# Restart dev server
npm run dev
```

---

Good luck! 🚀
