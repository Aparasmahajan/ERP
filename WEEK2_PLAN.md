# Week 2 Plan - Core Features & UI Components

**Goal:** Build interactive UI components for role assignment, hierarchy management, and permission control  
**Status:** 🔴 READY TO START  
**Previous Progress:** Week 1 (100%) + Authentication (100%)

---

## Overview

Week 1 completed:
- ✅ Excel service with multi-tenant support
- ✅ Cloudinary integration for images
- ✅ Resend integration for emails
- ✅ 11 API endpoints
- ✅ Permission system (can.ts)
- ✅ Superadmin authentication

Week 2 will deliver:
- 🎯 Role assignment UI
- 🎯 Hierarchy editor with drag-and-drop
- 🎯 Org chart visualizer
- 🎯 Capability grant manager
- 🎯 Protected API routes
- 🎯 End-to-end testing

---

## Daily Breakdown

### Day 1: Protect APIs & Build Role Assignment UI

**Tasks:**

1. **Protect Week 1 APIs** with authentication middleware
   - [ ] Add `requireSuperadminAuth` to `/api/tenants/init`
   - [ ] Add `requireSuperadminAuth` to `/api/positions`
   - [ ] Add `requireSuperadminAuth` to `/api/org-units`
   - [ ] Add `requireSuperadminAuth` to `/api/capabilities`
   - [ ] Add `requireSuperadminAuth` to `/api/branding`
   - [ ] Add `requireSuperadminAuth` to `/api/module-features`
   - [ ] Add `requireSuperadminAuth` to `/api/uploads`
   - [ ] Add `requireSuperadminAuth` to `/api/emails/*`

2. **Build Role Assignment UI** (`/portal/[tenant]/roles/assign`)
   - [ ] Create role form with tenant ID, user selector
   - [ ] List of available roles with descriptions
   - [ ] Multi-select or single-select capability list
   - [ ] Grant date and expiry date pickers
   - [ ] Submit button that calls `/api/capabilities` POST
   - [ ] Show assigned roles in table
   - [ ] Edit and delete existing role assignments

**Output Files:**
- Updated API routes (8 files with middleware)
- `app/portal/[tenant]/roles/assign/page.tsx`
- `components/RoleAssignmentForm.tsx`
- `components/RoleAssignmentTable.tsx`

---

### Day 2: Build Hierarchy Editor

**Tasks:**

1. **Hierarchy Editor UI** (`/portal/[tenant]/hierarchy/editor`)
   - [ ] Tree view of current org structure
   - [ ] Add/edit/delete position button
   - [ ] Drag-and-drop to change reports-to
   - [ ] Form modal for editing positions
   - [ ] Title override field
   - [ ] Valid from/to date pickers
   - [ ] Submit calls `/api/positions` POST
   - [ ] Real-time hierarchy visualization

2. **Position Form Component**
   - [ ] User selector (from users sheet)
   - [ ] Reports-to selector (from positions)
   - [ ] Org unit selector (from org_units)
   - [ ] Title override text field
   - [ ] Valid from date picker (required)
   - [ ] Valid to date picker (optional)
   - [ ] Session selector dropdown
   - [ ] Form validation

**Output Files:**
- `app/portal/[tenant]/hierarchy/editor/page.tsx`
- `components/HierarchyEditor.tsx`
- `components/PositionForm.tsx`
- `hooks/useHierarchy.ts`

---

### Day 3: Build Org Chart Visualizer

**Tasks:**

1. **Org Chart Component** (`/portal/[tenant]/org-chart`)
   - [ ] Tree/graph visualization of hierarchy
   - [ ] User avatars in boxes
   - [ ] Role badges with color
   - [ ] Hover to show details
   - [ ] Click to edit position
   - [ ] Zoom in/out capability
   - [ ] Export as image/PDF button

2. **Data Visualization Library Integration**
   - [ ] Choose library (react-d3-tree or mermaid)
   - [ ] Parse positions data into tree structure
   - [ ] Handle deep hierarchies (10+ levels)
   - [ ] Show circular references (if any)

**Output Files:**
- `app/portal/[tenant]/org-chart/page.tsx`
- `components/OrgChart.tsx`
- `lib/utils/hierarchyUtils.ts`

---

### Day 4: Build Capability Manager UI

**Tasks:**

1. **Capability Grant UI** (`/portal/[tenant]/permissions/manage`)
   - [ ] User selector dropdown
   - [ ] List of all capabilities (grouped by module)
   - [ ] Checkboxes for grant/revoke
   - [ ] Scope selector (SELF, DIRECT_REPORTS, TENANT, etc.)
   - [ ] Delegable checkbox
   - [ ] Expiry date picker
   - [ ] Grant/revoke button
   - [ ] Audit trail of changes

2. **Capability Components**
   - [ ] `CapabilityGrid.tsx` — Show capabilities in matrix
   - [ ] `CapabilityScopeSelector.tsx` — Choose scope
   - [ ] `CapabilityAuditLog.tsx` — Show history

3. **Hooks**
   - [ ] `useCapabilities(tenantId, userId)` — Load user capabilities
   - [ ] `useGrant(tenantId)` — Grant/revoke capabilities

**Output Files:**
- `app/portal/[tenant]/permissions/manage/page.tsx`
- `components/CapabilityManager.tsx`
- `components/CapabilityGrid.tsx`
- `components/CapabilityScopeSelector.tsx`
- `components/CapabilityAuditLog.tsx`
- `hooks/useCapabilities.ts`
- `hooks/useGrant.ts`

---

### Day 5: Integration & End-to-End Testing

**Tasks:**

1. **Integrate with Portal Layout**
   - [ ] Add sidebar menu items
   - [ ] Link to new pages
   - [ ] Apply tenant branding
   - [ ] Loading states
   - [ ] Error boundaries

2. **Data Fetching Hooks**
   - [ ] `useTenantData()` — Load all tenant sheets
   - [ ] `useUsers(tenantId)` — Load users
   - [ ] `useRoles(tenantId)` — Load roles
   - [ ] `useOrgUnits(tenantId)` — Load org units
   - [ ] Error handling and retry logic

3. **End-to-End Testing**
   - [ ] Create tenant via `/api/tenants/init`
   - [ ] Assign roles to users
   - [ ] Create hierarchy with positions
   - [ ] Grant capabilities
   - [ ] Verify org chart renders
   - [ ] Export data to Excel
   - [ ] Check audit trail logs

4. **Documentation**
   - [ ] Update completed.md
   - [ ] API usage examples
   - [ ] Component props documentation
   - [ ] Testing guide

**Output Files:**
- Updated `app/portal/[tenant]/layout.tsx`
- `hooks/useTenantData.ts`
- `hooks/useUsers.ts`
- `hooks/useRoles.ts`
- `hooks/useOrgUnits.ts`
- `WEEK2_COMPLETION.md`
- `WEEK2_QUICK_TEST.md`

---

## UI Pages to Build

| Page | Route | Status |
|------|-------|--------|
| Role Assignment | `/portal/[tenant]/roles/assign` | 🔴 To do |
| Hierarchy Editor | `/portal/[tenant]/hierarchy/editor` | 🔴 To do |
| Org Chart | `/portal/[tenant]/org-chart` | 🔴 To do |
| Capability Manager | `/portal/[tenant]/permissions/manage` | 🔴 To do |

---

## Components to Build

| Component | Purpose | Status |
|-----------|---------|--------|
| `RoleAssignmentForm` | Form to assign roles to users | 🔴 To do |
| `RoleAssignmentTable` | Display assigned roles | 🔴 To do |
| `HierarchyEditor` | Interactive hierarchy editor | 🔴 To do |
| `PositionForm` | Modal form for position editing | 🔴 To do |
| `OrgChart` | Tree visualization | 🔴 To do |
| `CapabilityManager` | Grant/revoke capabilities | 🔴 To do |
| `CapabilityGrid` | Show capabilities in matrix | 🔴 To do |
| `CapabilityScopeSelector` | Choose permission scope | 🔴 To do |
| `CapabilityAuditLog` | Show permission change history | 🔴 To do |

---

## Hooks to Build

| Hook | Purpose | Status |
|------|---------|--------|
| `useHierarchy` | Load and manage hierarchy | 🔴 To do |
| `useCapabilities` | Load and filter capabilities | 🔴 To do |
| `useGrant` | Grant/revoke capabilities | 🔴 To do |
| `useTenantData` | Load all tenant sheets | 🔴 To do |
| `useUsers` | Load users for tenant | 🔴 To do |
| `useRoles` | Load roles for tenant | 🔴 To do |
| `useOrgUnits` | Load org units | 🔴 To do |

---

## API Protection

Apply `requireSuperadminAuth` middleware to:

```typescript
// Day 1: Apply to all mutation endpoints

// Tenants
POST /api/tenants/init
POST /api/positions
POST /api/org-units
POST /api/capabilities
PUT /api/branding
PUT /api/module-features
POST /api/uploads
POST /api/emails/*

// Keep GET endpoints open for now (Day 1 decision)
GET /api/positions
GET /api/org-units
GET /api/capabilities
GET /api/branding
GET /api/module-features
```

---

## Week 2 Deliverables

✅ **Protected APIs** — 8 endpoints with authentication  
✅ **Role Assignment** — Full CRUD for role assignments  
✅ **Hierarchy Editor** — Interactive org structure management  
✅ **Org Chart** — Visual hierarchy display  
✅ **Capability Manager** — Fine-grained permission control  
✅ **Data Hooks** — Reusable data fetching  
✅ **Integration** — Connected to portal layout  
✅ **Documentation** — Complete testing and usage guides  

---

## Success Criteria for Week 2

### Functionality
- [ ] Can assign roles to users
- [ ] Can edit user positions and hierarchy
- [ ] Org chart displays correctly
- [ ] Can grant/revoke capabilities
- [ ] All changes logged to audit trail
- [ ] All mutations require superadmin auth

### UI/UX
- [ ] All pages load without errors
- [ ] Forms validate input
- [ ] Error messages display
- [ ] Loading states show
- [ ] Responsive on mobile
- [ ] Forms have visual feedback

### Data
- [ ] Excel sheets update correctly
- [ ] Data persists across page reloads
- [ ] Hierarchy depth unlimited
- [ ] Audit trail captures all changes
- [ ] Permissions enforce correctly

### Testing
- [ ] 10+ end-to-end test cases
- [ ] All edge cases handled
- [ ] No console errors
- [ ] Performance acceptable

---

## File Summary (Projected)

**New Files:** ~25 files
- 8 updated API routes
- 5 new page components
- 9 new reusable components
- 7 new hooks
- 2 utility files
- 3 documentation files

**Total at end of Week 2:** ~60+ files

---

## Git Commits for Week 2

```
1. feat: protect Week 1 APIs with superadmin auth
2. feat: build role assignment UI with form and table
3. feat: build hierarchy editor with drag-and-drop
4. feat: add org chart visualization
5. feat: build capability manager UI
6. feat: add data fetching hooks for all sheets
7. feat: integrate UI pages with portal layout
8. test: end-to-end testing for Week 2 features
```

---

## Phase 1 Progress (Updated)

| Phase | Status | Completion |
|-------|--------|-----------|
| Week 1: Foundation | ✅ Complete | 40% Phase 1 |
| Week 1: Auth | ✅ Complete | +10% Phase 1 |
| Week 2: Core UI | 🔴 To Do | +20% Phase 1 = 70% |
| Week 3: Admin Panel | ⏳ Planned | +20% Phase 1 = 90% |
| Week 4: Testing | ⏳ Planned | +10% Phase 1 = 100% |

---

## Estimated Timeline

| Task | Duration | Status |
|------|----------|--------|
| Day 1: API Protection | 2 hours | 🔴 Not started |
| Day 1: Role Assignment | 4 hours | 🔴 Not started |
| Day 2: Hierarchy Editor | 5 hours | 🔴 Not started |
| Day 3: Org Chart | 4 hours | 🔴 Not started |
| Day 4: Capability Manager | 4 hours | 🔴 Not started |
| Day 5: Integration & Testing | 5 hours | 🔴 Not started |
| **Total** | **24 hours** | **🔴 Not started** |

---

## Next Steps

1. ✅ Merge auth setup
2. ✅ Test login flow works
3. 🎯 **Start Day 1:** Protect APIs
4. 🎯 **Build:** Role Assignment UI
5. 🎯 **Continue:** Days 2-5 tasks

---

## Notes

- Week 2 builds purely on Week 1 APIs (no new backend needed)
- All data flows through existing Excel sheets
- Authentication provides safety for admin operations
- UI components are fully typed with TypeScript
- Supports arbitrary org depth (no hardcoded limits)

---

**Status:** 🔴 READY FOR WEEK 2  
**Estimated Completion:** Friday of Week 2  
**Phase 1 Target:** 70% complete by end of Week 2  

Ready to start? ✅
