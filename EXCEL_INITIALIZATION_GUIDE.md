# Excel Initialization & Soft Launch Setup

## 🚀 Quick Start (One Command)

```bash
npm run init-excel
```

This command will:
✅ Create complete Excel schema with 8 sheets  
✅ Add all required columns per Phase 1  
✅ Populate with sample data  
✅ Format headers with colors  
✅ Save to `data/tenants/demo-institution/demo-institution.xlsx`

---

## 📋 What Gets Created

### 8 Excel Sheets (Per Tenant)

| Sheet | Purpose | Columns | Sample Data |
|---|---|---|---|
| **users** | All users in tenant | 10 | Demo principal user |
| **positions** | Hierarchy (reports_to) | 8 | Principal as org head |
| **roles** | Pre-configured roles | 10 | Principal, Vice Principal, etc. |
| **org_units** | Departments/teams/locations | 8 | School Administration |
| **capabilities** | Fine-grained permissions | 7 | Principal permissions |
| **audit** | Change audit trail | 10 | Sample audit entry |
| **branding** | Tenant customization | 4 | Colors, logo, domain |
| **module_features** | Feature toggles | 6 | 22 retail features |

### Column Details

**users sheet:**
```
id | code | name | email | phone | role_ids | status | avatar_url | created_at | created_by
```

**positions sheet:**
```
user_id | reports_to_user_id | org_unit_id | title_override | span_hint | valid_from | valid_to | session_id
```

**roles sheet:**
```
id | key | title | pack | rank | kind | may_hold_reports | max_delegable_rank | color | system
```

**org_units sheet:**
```
id | name | parent_unit_id | head_user_id | location_code | address | contact_phone | status
```

**capabilities sheet:**
```
user_id | capability | scope | granted_by | granted_at | expires_at | delegable
```

**audit sheet:**
```
id | timestamp | action | entity_type | entity_id | who | before | after | reason | ip_address
```

**branding sheet:**
```
key | value | updated_at | updated_by
```

**module_features sheet:**
```
feature_id | name | category | enabled | description | phase
```

---

## 🔧 Environment Variables

Create `.env.local` with:

```bash
# Cloudinary (Image Storage)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Resend (Email Service)
RESEND_API_KEY=re_xxxxxxxxxx
```

### Getting API Keys

1. **Cloudinary:**
   - Visit: https://cloudinary.com/console
   - Copy Cloud Name, API Key, API Secret
   - Free tier: 25GB storage

2. **Resend:**
   - Visit: https://resend.com
   - Copy API Key
   - Free tier: 100 emails/day

---

## 📦 Install Dependencies

```bash
npm install
```

This adds:
- `exceljs` — Excel file I/O
- `cloudinary` — Image storage
- `next-cloudinary` — Next.js integration
- `resend` — Email service

---

## 🎯 Next Steps After Initialization

### 1. Test Excel Creation ✅
```bash
npm run init-excel
```
Check: `data/tenants/demo-institution/demo-institution.xlsx`

### 2. Integrate Cloudinary 🖼️
```typescript
// lib/storage/cloudinaryService.ts
// Already created! Just add .env variables
import { uploadImage, deleteImage } from '@/lib/storage/cloudinaryService';
```

### 3. Integrate Resend 📧
```typescript
// lib/email/resendService.ts
// Already created! Just add .env variables
import { sendInviteEmail, sendDailySummaryEmail } from '@/lib/email/resendService';
```

### 4. Build UI Components ⏳ (WEEK 1-3)
- Role Assignment form
- Hierarchy editor
- Org chart viewer
- Capability management panel
- Admin dashboard

---

## 📊 Excel File Structure

```
data/
└── tenants/
    └── demo-institution/
        └── demo-institution.xlsx
            ├── Sheet 1: users
            ├── Sheet 2: positions
            ├── Sheet 3: roles
            ├── Sheet 4: org_units
            ├── Sheet 5: capabilities
            ├── Sheet 6: audit
            ├── Sheet 7: branding
            └── Sheet 8: module_features
```

---

## 💾 Adding New Tenants

### Via Script:
```javascript
import { initializeWorkbook } from '@/scripts/initializeExcelSchema';

// Create Excel for new tenant
await initializeWorkbook('my-new-tenant-id');
```

### Via Admin UI: (WEEK 3)
- Admin clicks "Create New Tenant"
- Selects pack (Institution/Organisation)
- System runs initialization
- Excel file created automatically

---

## 🔄 Excel Sync with API

### Reading Data:
```typescript
// Read all users from Excel
const users = await readSheet<User>(tenantId, 'users');

// Read positions
const positions = await readSheet<Position>(tenantId, 'positions');
```

### Writing Data:
```typescript
// Add new user
const newUser = { id: 'u2', code: 'VP001', name: 'Ms. Sarah', ... };
await appendSheet(tenantId, 'users', [newUser]);

// Grant capability
const cap = { user_id: 'u2', capability: 'people.create', scope: 'DOWNLINE' };
await appendSheet(tenantId, 'capabilities', [cap]);

// Audit entry (automatic on all changes)
await appendSheet(tenantId, 'audit', [{
  id: 'a2',
  timestamp: new Date().toISOString(),
  action: 'CREATE',
  entity_type: 'user',
  entity_id: 'u2',
  who: 'u1',
  before: '{}',
  after: JSON.stringify(newUser),
}]);
```

---

## 🎨 Feature Toggles (22 Retail Features)

All togglable via `module_features` sheet:

```
feature_id              | enabled | phase
─────────────────────────────────────────
retail_barcode_scan     | false   | 2
retail_low_stock        | true    | 2
retail_daily_recap      | true    | 2
retail_loyalty          | false   | 6
retail_credit           | false   | 2
retail_transfers        | false   | 2
retail_recount          | true    | 2
... (15 more)
```

**To enable a feature:**
- Open Excel sheet
- Find row by feature_id
- Set enabled = true
- Save file
- Refresh app

---

## ✅ Soft Launch Checklist

- [ ] Run `npm run init-excel` 
- [ ] Add Cloudinary env vars
- [ ] Add Resend env vars
- [ ] Run `npm install`
- [ ] Test `npm run dev`
- [ ] Verify demo tenant Excel created
- [ ] Test upload image (Cloudinary)
- [ ] Test send invite email (Resend)
- [ ] Build Week 1 UI components
- [ ] Test Week 1 functionality
- [ ] Soft launch to 5-10 pilots

---

## 🚨 Troubleshooting

**Excel file not created?**
```bash
# Check directory permissions
ls -la data/tenants/

# Try with absolute path
NODE_ENV=development node scripts/initializeExcelSchema.js
```

**Cloudinary upload fails?**
- Verify env vars: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set
- Check API key is valid
- Test with curl:
```bash
curl -X POST https://api.cloudinary.com/v1_1/{cloud_name}/image/upload \
  -F "file=@test.jpg" \
  -F "api_key={api_key}"
```

**Email not sending?**
- Verify `RESEND_API_KEY` is set
- Check email domain whitelist in Resend console
- Test API key:
```bash
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY"
```

---

## 📚 Next Documentation

- `/SOFT_LAUNCH_ROADMAP.md` — 4-week plan
- `/completed.md` — Phase tracking
- `lib/storage/cloudinaryService.ts` — Image upload API
- `lib/email/resendService.ts` — Email templates

---

**Ready?** Run `npm run init-excel` to get started! 🚀
