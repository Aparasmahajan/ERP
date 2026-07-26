# Soft Launch Roadmap - Excel-Based MVP

**Target:** Soft launch to 5-10 pilot shops/institutions  
**Stack:** Next.js 15 + Excel (openpyxl) + Cloudinary + Resend.com  
**Duration:** 4 weeks estimated

---

## Phase 1: Core Hierarchy & Permissions - AUDIT

### Status: ⚠️ INCOMPLETE (65% done)

### ✅ COMPLETED in Phase 0
- [x] Project setup (Next.js 15, TypeScript, Tailwind)
- [x] Excel I/O service (read/write sheets)
- [x] File storage service (local files)
- [x] Landing page with 12 templates
- [x] Template gallery with filters
- [x] Demo portal (template-specific routes)
- [x] People management CRUD (list, add, edit, delete)
- [x] User profile page
- [x] Branding customization (colors, logo)
- [x] Enquiry form for leads
- [x] Role seed data (Institution & Organisation packs)
- [x] Type definitions for User, Role, Position, Tenant

### ❌ MISSING for Phase 1 (needed for soft launch)
1. **Role Assignment UI** - Assign roles to users
   - Status: API exists (`/api/roles`), UI missing
   - Need: Form to select role(s) for each user

2. **Position/Hierarchy Model** - Who reports to whom
   - Status: Type defined, not implemented in Excel
   - Need: Position table in Excel (user_id, reports_to_user_id, org_unit_id)

3. **Org Chart Visualization** - See the hierarchy
   - Status: Not started
   - Need: Simple tree view showing reports structure

4. **Permission/Capability System**
   - Status: Enum defined (132 capabilities), not enforced
   - Need: Capability table in Excel (user_id, capability, scope, granted_by)

5. **Org Units Management** - Departments, teams
   - Status: Type defined, not implemented
   - Need: UI to create/manage departments

6. **Admin Portal for Tenant** - Main dashboard after login
   - Status: Demo portal exists, real portal missing
   - Need: Role-based dashboard, navigation based on capabilities

7. **Email Service Integration** - Resend.com
   - Status: Not integrated
   - Need: Send invites, notifications, reports

8. **Image Upload to Cloudinary**
   - Status: Local file storage works
   - Need: Replace with Cloudinary integration

9. **Multi-Tenant Routing** - Separate portal per tenant
   - Status: `/portal/[tenant]` path exists but limited
   - Need: Full tenant isolation, proper routing

10. **Permission Enforcement** - Check capabilities in UI & API
    - Status: Can() function not used
    - Need: Hide/disable UI based on capabilities

---

## Phase 1: Complete Checklist (For Soft Launch)

### WEEK 1: Foundation

**Task 1.1: Excel Schema for Tenants**
```
tenant_users.xlsx (per tenant)
├─ Sheet: users
│  ├─ id, code, name, email, phone, role_ids[], status
│  └─ Example: id=u1, name=Alice, role_ids=[r1,r2]
│
├─ Sheet: positions
│  ├─ user_id, reports_to_user_id, org_unit_id, title_override
│  └─ Example: user_id=u1, reports_to=null (Head), org_unit=dept1
│
├─ Sheet: roles
│  ├─ id, key, title, pack, rank, power_preset
│  └─ (seed data pre-filled per pack)
│
├─ Sheet: org_units
│  ├─ id, name, parent_unit_id, head_user_id
│  └─ Example: id=dept1, name=Sales, head_user=u2
│
└─ Sheet: capabilities
   ├─ user_id, capability, scope, granted_by, granted_at
   └─ Example: user_id=u1, capability=people.create, scope=TENANT
```

**Task 1.2: Update Excel Service**
- [ ] Add `readPositions()`, `writePositions()` methods
- [ ] Add `readCapabilities()`, `writeCapabilities()` methods
- [ ] Add `readOrgUnits()`, `writeOrgUnits()` methods
- [ ] Ensure all writes are idempotent (no duplicates)

**Task 1.3: Cloudinary Integration**
- [ ] Install cloudinary SDK
- [ ] Create `lib/storage/cloudinaryService.ts`
- [ ] Methods: `uploadImage()`, `deleteImage()`, `getImageUrl()`
- [ ] Replace local file uploads with Cloudinary

**Task 1.4: Resend.com Integration**
- [ ] Install resend SDK
- [ ] Create `lib/email/resendService.ts`
- [ ] Methods: `sendInvite()`, `sendNotification()`, `sendReport()`
- [ ] Test email delivery

**Status for Week 1:** Foundation ready ✅

---

### WEEK 2: Core Features

**Task 2.1: Role Assignment UI**
- [ ] Page: `/portal/[tenant]/people/[id]/roles`
- [ ] Multi-select roles for user
- [ ] Save to Excel (roles column)
- [ ] Show role descriptions

**Task 2.2: Position/Hierarchy**
- [ ] Page: `/portal/[tenant]/org-structure`
- [ ] Form: Create/edit org unit
- [ ] Form: Assign user to position (who reports to whom)
- [ ] Cycle detection (don't allow cycles)
- [ ] Save to Excel positions sheet

**Task 2.3: Org Chart Visualization**
- [ ] Simple tree view (no drag-drop yet)
- [ ] Show: name, role, position in tree
- [ ] Drill down into units
- [ ] Mobile-friendly

**Task 2.4: Permission Enforcement (Basic)**
- [ ] Create `lib/permissions/can.ts` function
- [ ] Check: does user have capability?
- [ ] Hide UI elements based on capabilities
- [ ] Log permission denials to audit sheet

**Status for Week 2:** Core hierarchy working ✅

---

### WEEK 3: Admin Features

**Task 3.1: Tenant Admin Portal**
- [ ] Dashboard: Headcount, org structure summary, pending actions
- [ ] People page: Better search/filter
- [ ] Org chart page: Full tree view
- [ ] Settings: Module toggles (from §8.14)
- [ ] Roles page: View/edit role names, presets

**Task 3.2: Capability Management**
- [ ] Page: `/portal/[tenant]/settings/capabilities`
- [ ] Grant/revoke capabilities to users
- [ ] Bulk grant by role
- [ ] Scope selector (SELF, DIRECT_REPORTS, DOWNLINE, TENANT, ORG_UNIT)
- [ ] Audit trail (who granted what when)

**Task 3.3: Org Units Management**
- [ ] CRUD for departments, teams, locations
- [ ] Hierarchy (unit A under unit B)
- [ ] Assign head of unit
- [ ] Multi-store support for retail

**Task 3.4: Email Notifications**
- [ ] Send invite when user created
- [ ] Notify on role changes
- [ ] Daily summary emails (opt-in)
- [ ] Resend.com templates for emails

**Status for Week 3:** Admin panel functional ✅

---

### WEEK 4: Testing & Polish

**Task 4.1: Data Validation**
- [ ] Validate all Excel inputs
- [ ] Prevent circular hierarchies
- [ ] Check rank ceilings on role assignment
- [ ] Validate email addresses

**Task 4.2: Error Handling**
- [ ] Graceful failures when Excel is missing sheet
- [ ] User-friendly error messages
- [ ] Audit all errors

**Task 4.3: Performance**
- [ ] Optimize Excel reads (cache if < 10KB)
- [ ] Image optimization for Cloudinary
- [ ] Test with 100+ users, 1000+ transactions

**Task 4.4: Documentation**
- [ ] Update completed.md
- [ ] Create user guide for admin
- [ ] API documentation

**Status for Week 4:** Ready for soft launch ✅

---

## Phase 1 Deliverables for Soft Launch

### User Stories Completed

**As an Admin, I want to:**
- [ ] Create a new tenant and initialize with my pack (Institution/Organisation)
- [ ] Add users (name, email, code)
- [ ] Assign roles to users (single or multiple)
- [ ] Define org structure (departments, teams, locations)
- [ ] Specify who reports to whom
- [ ] Grant/revoke capabilities per user
- [ ] See the org chart
- [ ] Invite users via email
- [ ] Customize branding (colors, logo)
- [ ] Configure module features (turn on/off 22 retail features)

**As a User, I want to:**
- [ ] Receive invite email
- [ ] Login with email
- [ ] See my profile
- [ ] View my role & capabilities
- [ ] See my position in org chart

**As a Developer, I want to:**
- [ ] All data in Excel (audit trail)
- [ ] Images in Cloudinary (no local storage)
- [ ] Emails via Resend (trackable delivery)
- [ ] Type-safe API (TypeScript)
- [ ] Audit every change (who, what, when)

---

## Tech Stack for Soft Launch

| Component | Library | Status |
|---|---|---|
| Frontend | Next.js 15 + React 19 | ✅ Ready |
| Styling | Tailwind CSS | ✅ Ready |
| Database | Excel (openpyxl via Node) | ✅ Ready |
| File Storage | Cloudinary | ⏳ To integrate |
| Email | Resend.com | ⏳ To integrate |
| Validation | Zod | ✅ Ready |
| Image Upload | Cloudinary SDK | ⏳ To integrate |
| Auth | NextAuth.js (optional for v1) | ⏳ Consider for v1.1 |

---

## Soft Launch Pilot Plan

### Pilot Group: 5-10 shops/institutions
- **3 retail shops** (grocery, pharmacy, clothing)
- **2 schools** (primary, secondary)
- **1 office** (small business)

### Week 0 (Prep)
- [ ] Setup pilot tenant in Excel
- [ ] Create test users
- [ ] Configure roles for each vertical

### Week 1 (Internal Testing)
- [ ] Smoke test all features
- [ ] Load test with 100+ users
- [ ] Permission boundary testing

### Week 2 (Soft Launch)
- [ ] Invite pilot admins
- [ ] Train on dashboard
- [ ] Monitor for issues

### Week 3 (Feedback Loop)
- [ ] Collect feedback
- [ ] Fix critical issues
- [ ] Iterate on UX

---

## Success Metrics for Soft Launch

- [ ] 5+ tenants created
- [ ] 100+ users added
- [ ] 0 data loss incidents
- [ ] 50ms avg response time
- [ ] Email delivery > 95%
- [ ] Image uploads reliable
- [ ] Admin portal usable (no support calls)

---

## Decision Log

| Decision | Rationale |
|---|---|
| **Excel over PostgreSQL** | Quick iteration, reversible, admins understand Excel |
| **Cloudinary not S3** | Free tier sufficient, simpler setup |
| **Resend not SendGrid** | Modern API, better templates, reliable |
| **No auth in v1** | Assumes internal use; add OAuth in v1.1 |
| **Next.js not Next-Gen** | Stability over bleeding edge |

---

## Notes

- All Excel files stored locally in `/data/tenants/[tenant_id]/`
- Backup strategy: Daily export to cloud (TBD - maybe Drive?)
- Migration to Spring Boot: Post soft launch; data export via Excel

---

**Next Step:** Review this checklist, confirm completion status, then proceed with WEEK 1 tasks.
