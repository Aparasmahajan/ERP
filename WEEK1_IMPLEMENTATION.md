# Week 1 Implementation Plan - Foundation

**Goal:** Setup foundation for soft launch (Excel schema, Cloudinary, Resend, multi-tenant routing)  
**Duration:** 5 working days  
**Status:** 🔴 NOT STARTED

---

## Daily Breakdown

### Day 1: Excel Service Enhancement & Multi-Tenant Setup

**Tasks:**
- [ ] Update `lib/excel/excelService.ts` with new methods
  - [ ] `readPositions(tenantId)` — Get hierarchy
  - [ ] `writePositions(tenantId, data)` — Save hierarchy
  - [ ] `readCapabilities(tenantId)` — Get permissions
  - [ ] `writeCapabilities(tenantId, data)` — Save permissions
  - [ ] `readOrgUnits(tenantId)` — Get departments
  - [ ] `writeOrgUnits(tenantId, data)` — Save departments
  - [ ] `readBranding(tenantId)` — Get customization
  - [ ] `writeBranding(tenantId, data)` — Save customization
  - [ ] `readModuleFeatures(tenantId)` — Get feature toggles
  - [ ] `writeModuleFeatures(tenantId, data)` — Save features

- [ ] Create multi-tenant file structure
  - [ ] Create `/data` directory
  - [ ] Create `/data/tenants/[tenant-id]/` pattern
  - [ ] Create backup directory structure

- [ ] Create TypeScript types for new sheets
  - [ ] `Position` interface
  - [ ] `Capability` interface
  - [ ] `OrgUnit` interface
  - [ ] `BrandingConfig` interface
  - [ ] `ModuleFeature` interface

**Output Files:**
- Updated `lib/excel/excelService.ts`
- Updated `lib/types/domain.ts`

---

### Day 2: Cloudinary Integration

**Tasks:**
- [ ] Add Cloudinary env vars to `.env.local`
- [ ] Test `lib/storage/cloudinaryService.ts`
  - [ ] Test `uploadImage()`
  - [ ] Test `uploadBase64()`
  - [ ] Test `getOptimizedUrl()`
  - [ ] Test `deleteImage()`

- [ ] Create API route for image upload
  - [ ] File: `app/api/uploads/route.ts`
  - [ ] Handle multipart form data
  - [ ] Validate file size/type
  - [ ] Call cloudinaryService
  - [ ] Return public URL

- [ ] Replace local file uploads
  - [ ] Update branding settings (logo upload)
  - [ ] Update user profile (avatar upload)

- [ ] Test uploads with Cloudinary

**Output Files:**
- `app/api/uploads/route.ts`
- Updated `/app/portal/[tenant]/settings/page.tsx`

---

### Day 3: Resend Email Integration

**Tasks:**
- [ ] Add Resend API key to `.env.local`
- [ ] Test `lib/email/resendService.ts`
  - [ ] Test `sendEmail()`
  - [ ] Test `sendInviteEmail()`
  - [ ] Test `sendDailySummaryEmail()`

- [ ] Create API route for sending emails
  - [ ] File: `app/api/emails/invite/route.ts`
  - [ ] File: `app/api/emails/summary/route.ts`
  - [ ] Handle POST requests
  - [ ] Validate input
  - [ ] Call resendService
  - [ ] Return status

- [ ] Create notification queue (optional for Week 1)
  - [ ] Track sent emails in Excel audit

- [ ] Test email delivery

**Output Files:**
- `app/api/emails/invite/route.ts`
- `app/api/emails/summary/route.ts`

---

### Day 4: Multi-Tenant Routing & Tenant Initialization

**Tasks:**
- [ ] Create tenant initialization API
  - [ ] File: `app/api/tenants/init/route.ts`
  - [ ] Accept tenant name, pack, admin email
  - [ ] Call `initializeWorkbook()` script
  - [ ] Create Excel file
  - [ ] Return tenant ID & file path

- [ ] Update `/app/setup/page.tsx`
  - [ ] Form submits to `/api/tenants/init`
  - [ ] Show loading state
  - [ ] Handle success (redirect to portal)
  - [ ] Handle errors (show message)

- [ ] Create tenant context/hook
  - [ ] Hook: `useTenant()` — Get current tenant ID
  - [ ] Hook: `useTenantData()` — Load tenant Excel sheets
  - [ ] Provide to portal layout

- [ ] Update `app/portal/[tenant]/layout.tsx`
  - [ ] Load tenant branding from Excel
  - [ ] Apply colors dynamically
  - [ ] Load tenant features from Excel
  - [ ] Show/hide nav items based on features

**Output Files:**
- `app/api/tenants/init/route.ts`
- `hooks/useTenant.ts`
- Updated `app/setup/page.tsx`
- Updated `app/portal/[tenant]/layout.tsx`

---

### Day 5: API Routes for Excel Sheets & Testing

**Tasks:**
- [ ] Create API routes for new sheets
  - [ ] `app/api/positions/route.ts` — GET/POST positions
  - [ ] `app/api/org-units/route.ts` — GET/POST org units
  - [ ] `app/api/capabilities/route.ts` — GET/POST capabilities
  - [ ] `app/api/branding/route.ts` — GET/PUT branding
  - [ ] `app/api/module-features/route.ts` — GET/PUT features

- [ ] Implement permission checks
  - [ ] Create `lib/permissions/can.ts`
  - [ ] Check user capabilities from Excel
  - [ ] Enforce in API routes
  - [ ] Log to audit sheet

- [ ] End-to-end testing
  - [ ] Create tenant via setup
  - [ ] Upload image (Cloudinary)
  - [ ] Send invite email (Resend)
  - [ ] Read/write Excel data
  - [ ] Check audit trail

- [ ] Documentation
  - [ ] Update completed.md
  - [ ] Document new API routes
  - [ ] Document environment setup

**Output Files:**
- `app/api/positions/route.ts`
- `app/api/org-units/route.ts`
- `app/api/capabilities/route.ts`
- `app/api/branding/route.ts`
- `app/api/module-features/route.ts`
- `lib/permissions/can.ts`
- Updated `completed.md`

---

## Week 1 Deliverables

✅ Enhanced Excel service (10+ new methods)  
✅ Cloudinary integration (image uploads)  
✅ Resend integration (email sending)  
✅ Multi-tenant initialization  
✅ Multi-tenant routing & context  
✅ 5 new API routes  
✅ Permission system scaffold  
✅ End-to-end tests  

**Status After Week 1:** 
- Phase 1 Foundation ✅ 40% complete
- Ready for Week 2 (UI components)

---

## Code Checklist

### Excel Service Enhancement

```typescript
// lib/excel/excelService.ts - ADD THESE METHODS

export async function readPositions(tenantId: string): Promise<Position[]> {
  return readSheet<Position>(tenantId, 'positions');
}

export async function writePositions(tenantId: string, positions: Position[]): Promise<void> {
  return writeSheet<Position>(tenantId, 'positions', positions);
}

export async function readCapabilities(tenantId: string): Promise<Capability[]> {
  return readSheet<Capability>(tenantId, 'capabilities');
}

export async function writeCapabilities(tenantId: string, capabilities: Capability[]): Promise<void> {
  return writeSheet<Capability>(tenantId, 'capabilities', capabilities);
}

export async function readOrgUnits(tenantId: string): Promise<OrgUnit[]> {
  return readSheet<OrgUnit>(tenantId, 'org_units');
}

export async function writeOrgUnits(tenantId: string, units: OrgUnit[]): Promise<void> {
  return writeSheet<OrgUnit>(tenantId, 'org_units', units);
}

export async function readBranding(tenantId: string): Promise<BrandingConfig> {
  const rows = await readSheet<any>(tenantId, 'branding');
  const config: BrandingConfig = {};
  rows.forEach(row => {
    config[row.key] = row.value;
  });
  return config;
}

export async function readModuleFeatures(tenantId: string): Promise<ModuleFeature[]> {
  return readSheet<ModuleFeature>(tenantId, 'module_features');
}

export async function writeModuleFeatures(tenantId: string, features: ModuleFeature[]): Promise<void> {
  return writeSheet<ModuleFeature>(tenantId, 'module_features', features);
}

// Audit helper
export async function writeAudit(tenantId: string, entry: AuditEvent): Promise<void> {
  return appendSheet<AuditEvent>(tenantId, 'audit', [entry]);
}
```

### Types to Add

```typescript
// lib/types/domain.ts - ADD THESE

export interface Position {
  user_id: string;
  reports_to_user_id?: string;
  org_unit_id: string;
  title_override?: string;
  span_hint?: number;
  valid_from: string;
  valid_to?: string;
  session_id: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  parent_unit_id?: string;
  head_user_id?: string;
  location_code?: string;
  address?: string;
  contact_phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Capability {
  user_id: string;
  capability: string;
  scope: 'SELF' | 'DIRECT_REPORTS' | 'DOWNLINE' | 'TENANT' | 'ORG_UNIT';
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  delegable: boolean;
}

export interface BrandingConfig {
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  domain?: string;
  [key: string]: any;
}

export interface ModuleFeature {
  feature_id: string;
  name: string;
  category: string;
  enabled: boolean;
  description: string;
  phase: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'GRANT' | 'REVOKE';
  entity_type: string;
  entity_id: string;
  who: string;
  before: string;
  after: string;
  reason?: string;
  ip_address?: string;
}
```

---

## Success Criteria for Week 1

- [ ] All Excel service methods working
- [ ] Image uploads to Cloudinary working
- [ ] Emails sending via Resend working
- [ ] Tenant initialization working
- [ ] Multi-tenant routing working
- [ ] Tenant branding loading from Excel
- [ ] Feature toggles respected in UI
- [ ] API routes returning correct data
- [ ] Audit trail logging all changes
- [ ] No console errors in dev mode

---

## Git Commits for Week 1

```
1. docs: add Week 1 implementation plan
2. feat: enhance ExcelService with new sheet methods
3. feat: add Cloudinary integration for image uploads
4. feat: integrate Resend for email notifications
5. feat: implement multi-tenant routing and context
6. feat: create API routes for positions, org-units, capabilities
7. feat: implement basic permission checking system
8. test: end-to-end testing for Week 1 features
```

---

## Next Steps (Week 2)

After Week 1 completes:
- [ ] Build Role Assignment UI
- [ ] Build Hierarchy Editor
- [ ] Build Org Chart Viewer
- [ ] Build Capability Grant UI

---

**Status:** 🔴 READY TO START  
**Start Date:** [Today]  
**Target Completion:** [Today + 5 days]  

Ready to begin? Start with **Day 1: Excel Service Enhancement**
