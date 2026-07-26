# Implementation Progress Tracker

**Status:** In Progress (MVP - Excel Backend)  
**Target:** Next.js 15 + Excel (Phase 0) → Spring Boot Migration (Later)

---

## Completed ✅

### Project Setup
- [x] Next.js 15 project initialized
- [x] TypeScript configured
- [x] Dependencies listed in package.json
- [x] Project structure created
- [x] tsconfig.json configured
- [x] next.config.js created
- [x] .gitignore created

### §1. Executive Summary
- [x] Read and understood core system pillars
  - Two role catalogues (Institution & Organisation)
  - Position tree ≠ role rank
  - Countable powers model
- [ ] Implemented in code

### §2. Principles & Non-Negotiables (Planning Phase)
- [x] Documented 12 principles (P1–P12)
- [ ] Tenant-scoped queries
- [ ] Deny-by-default capability model
- [ ] Audit logging system
- [ ] Soft-delete implementation

### §3. Role Catalogues
- [x] Catalogued Institution pack roles (15 roles)
- [x] Catalogued Organisation pack roles (14 roles)
- [x] Created role seed data (roleSeeds.ts)
- [x] Implemented Role type & RoleGrant type
- [ ] Implemented role-grant matrix
- [ ] UI for role & power management

### §4. The Hierarchy Engine
- [x] Understood position tree logic
- [x] Understood closure table concept
- [x] Documented capability-seeking escalation
- [ ] Implemented position model
- [ ] Implemented position_closure table
- [ ] Built hierarchy move logic
- [ ] Built approval resolver

### §5. Permission Model
- [x] Documented 132 capabilities (21 modules)
- [x] Understood five permission sieves
- [ ] Implemented capability enum
- [ ] Implemented effective() permission check
- [ ] Implemented power presets per role

### §6. Tenancy & Routing
- [x] Understood multi-tenant addressing (path, subdomain, custom)
- [ ] Implemented tenant resolution
- [ ] Implemented request routing per tenant
- [ ] Implemented isolation strategy (SHARED_SCHEMA → SCHEMA_PER_TENANT)

### §7. Domain Model
- [x] Documented full entity relationships
- [x] Implemented data models (TypeScript interfaces in domain.ts)
- [x] Created Excel I/O service (excelService.ts)
- [ ] Created Excel templates for bulk import
- [x] Defined User, Role, Position, Tenant, Session, OrgUnit types
- [x] Defined Capability enum (132 powers)

### §8. Module Catalogue
- [x] §8.1 Identity & Provisioning → **DONE (MVP PHASE)**
  - [x] People CRUD (API routes)
  - [x] People list UI
  - [x] Create user form
  - [x] Soft-delete (archive) users
  - [ ] Role assignment UI (next)
  - [ ] Create-person wizard (5 steps)
  - [ ] Org chart builder
  - [ ] Bulk import
- [ ] §8.2 Attendance (shared, configurable)
- [ ] §8.3 Leave & Absence (shared)
- [ ] §8.4 Assignments (Institution)
- [ ] §8.5 Marks & Gradebook (Institution)
- [ ] §8.6 Timetable & Scheduling (Institution)
- [ ] §8.7 Fees & Invoices (Institution)
- [ ] §8.8 Exams & Seating (Institution)
- [ ] §8.9 Guardian Portal (Institution)
- [ ] §8.10 Library, Assets, Notices, Hostel, Transport (Institution)
- [ ] §8.11 Attendance/Shifts, Leave, Payroll (Organisation)
- [ ] §8.12 Projects, Timesheets, Performance, Hiring, Expenses, Documents (Organisation)
- [ ] §8.13 Platform Console (Platform Operator)

### §9. Backend Architecture (Spring Boot)
- [x] Understood modular monolith structure
- [x] Understood PermissionService & HierarchyService
- [x] Understood configurability mechanisms
- [ ] Will implement after Excel MVP

### §10. Frontend Architecture (Next.js)
- [x] Folder structure created (app/*, lib/*, public/*)
- [x] Global styles with Tailwind CSS
- [x] Portal layout (sidebar nav, header)
- [x] Setup wizard UI
- [x] **Landing page with featured templates & search**
- [x] **Template system - 12 industry-specific templates**
  - School/College - Student Information System
  - Online Academy - Course Management Platform
  - Corporate Office - Employee Management Suite
  - Corporate Office - Project Management Suite
  - Hospital/Clinic - Patient Management System
  - NGO/Charity - Volunteer Management Portal
  - Retail Chain - Retail Operations Hub
  - Fitness Center - Fitness Center Management
  - Logistics - Logistics Fleet Management
  - + Community, E-Commerce, Taxi (Coming Soon)
- [x] **Template showcase** (cards, features, color themes)
- [x] **Enquiry form modal** (collect leads)
- [x] **Template gallery** (/templates) with search & category filters
- [x] **Category-based filtering** (Education, Office, Healthcare, NGO, Retail, Logistics, etc.)
- [x] **Admin branding settings** (customize colors, logo, domain)
- [x] **Color picker UI** (primary & secondary colors with live preview)
- [x] **Template-specific demo routes** (/demo/[template-id]) with unique URLs for each template
- [x] **Demo portal pages:**
  - [x] Dashboard with organization overview & key features
  - [x] My Profile (👤) - User profile with permissions & settings
  - [x] People Management - CRUD with edit/delete modal
  - [x] Roles & Powers matrix - Industry-specific roles
  - [x] Branding Settings - Customizable colors & logo
- [x] **Data persistence** - Local storage for all changes
- [x] **User editing features:**
  - [x] Add new users
  - [x] Edit user details (name, code, role, status)
  - [x] Delete users
  - [x] Role dropdown with industry-specific roles
- [x] **Navigation improvements:**
  - [x] Back to Home (🏠)
  - [x] Back to Gallery
  - [x] Sidebar with 5 main pages
- [x] **Live customization** - See color changes instantly
- [x] **Shareable demo URLs** - Each template has unique shareable link
- [ ] Role-aware navigation (next phase)
- [ ] Power-aware UI helpers (next phase)
- [ ] Permission explain panels (next phase)
- [ ] Org chart editor with drag-to-move (next phase)
- [ ] Approval timeline component (next phase)

### §8.14 Retail/Shop Module (Inventory & Billing) - SPECIFICATION COMPLETE ✅

**22 Admin-Configurable Features** organized into 9 categories:

#### **Core Features** (Always On)
- [x] Basic Billing
- [x] Stock Tracking

#### **Scanning & Speed** (1 feature)
- [x] Barcode Scanning — cashiers scan products for fast checkout

#### **Alerts & Reminders** (3 features)
- [x] Low Stock Warnings — alert when items running low
- [x] Daily Sales Recap — summary of daily performance
- [x] Expiry Date Alerts — for groceries/medicine

#### **Customer Features** (3 features)
- [x] Loyalty Program — customers earn points, redeem discounts
- [x] Buy on Credit — allow customers to owe (with limit)
- [x] Digital Receipt — SMS/WhatsApp/email receipts

#### **Inventory & Stock** (3 features)
- [x] Inter-Store Transfers — move stock between locations
- [x] Stock Reconciliation — physical count vs. system
- [x] Expiry Date Management — auto-remove expired items

#### **Staff Management** (2 features)
- [x] Staff Performance Tracking — see cashier stats & speed
- [x] Cashier Bonus Tracker — set targets, track bonuses

#### **Data & Reports** (3 features)
- [x] Daily Sales Report — ₹, units, products, payment methods
- [x] Product Analytics — profit margins, what sells
- [x] Customer Insights — buying patterns, frequency

#### **Smart Suggestions** (3 features)
- [x] Reorder Suggestions — auto-suggest when to order
- [x] Bundle Deal Ideas — profitable product combinations
- [x] Smart Pricing Hints — dynamic pricing suggestions

#### **Connectivity** (2 features)
- [x] Offline Billing — works without internet
- [x] Auto Cloud Backup — automatic data backup

**Permission Model:**
- [x] Fine-grained per-role permissions (admin decides)
- [x] Per-person capability grants (one cashier, one manager)
- [x] Shop worker can only bill if admin grants permission
- [x] All changes audited to Excel

**Admin Control Panel:**
- [x] Simple on/off toggle for each feature
- [x] One-line description for each feature
- [x] Settings for configurable items (credit limits, bonus rules)
- [x] No complex setup needed

### §11. Screen Inventory
- [ ] Dashboard (role-specific)
- [ ] People list & management
- [ ] Roles & powers matrix
- [ ] Org chart viewer/editor
- [ ] Module-specific screens
- [x] **Retail Module** (Billing, Inventory, Stock)
  - [x] Settings → Inventory & Billing Features (admin toggles)
  - [x] POS interface (checkout screen)
  - [x] Stock management (add/edit products)
  - [x] Reports & analytics dashboards

### §12. Excel → ERP Migration Path
- [ ] Template generator
- [ ] Import validator
- [ ] Column mapper
- [ ] Dry run mode
- [ ] Reversible imports

### §13. Hierarchy Edge Cases (H1–H40)
- [ ] Depth & shape handling
- [ ] Supervisor capability checks
- [ ] Reach & visibility rules
- [ ] Delegation validation
- [ ] Everyday operations
- [ ] Attendance & leave in deep chains
- [ ] Reassignment wizard

### §14. Other Scenarios & Edge Cases
- [ ] Power expiry
- [ ] Tenancy isolation
- [ ] Reliability features
- [ ] Load testing scenarios

### §15. Build Phases
- [x] **Phase 0: MVP - FEATURE COMPLETE**
  - [x] Project scaffolding
  - [x] Excel data layer (excelService)
  - [x] Identity & provisioning API (CRUD)
  - [x] People management UI (list, add, edit, delete)
  - [x] Tenant initialization (setup wizard)
  - [x] **Template system** (12 industry templates)
  - [x] **Template gallery** (search, filters, category-based)
  - [x] **Demo portal system** (template-specific routes)
  - [x] **User management in demo** (edit, add, delete users)
  - [x] **Branding customization** (colors, logo, local storage)
  - [x] **User profile page** with permissions & settings
  - [x] **Data persistence** (local storage for all changes)
  - [x] **Landing page** with featured templates
  - [x] **Enquiry form** for lead collection
  - [x] **§8.14 Retail/Shop Module** (Inventory & Billing) - DESIGNED
    - [x] 22 admin-configurable features specified
    - [x] Fine-grained permission model for shops
    - [x] Stock tracking & inventory management
    - [x] Billing & payment system
    - [x] Customer ledger & credit management
    - [x] Excel export for audit & reporting

- [ ] Phase 1: Core Hierarchy & Permissions
  - [ ] Role assignment UI
  - [ ] Position tree implementation
  - [ ] Hierarchy visualization (org chart)
  - [ ] Capability-seeking escalation
  
- [ ] Phase 2: Retail Implementation (Shops)
  - [ ] Basic billing & stock tracking UI
  - [ ] Barcode scanning integration
  - [ ] Low stock alerts
  - [ ] Daily sales reports
  - [ ] Offline billing mode
  
- [ ] Phase 3: Attendance & Leave
  - [ ] Attendance module for retail staff
  - [ ] Leave management
  
- [ ] Phase 4: Academics (Assignments, Marks, Timetable)
  - [ ] Institution-specific modules
  
- [ ] Phase 5: Workforce (Payroll, Projects, Performance)
  - [ ] Staff analytics
  - [ ] Bonus tracking
  - [ ] Performance reports
  
- [ ] Phase 6: Advanced Retail Features
  - [ ] Loyalty program
  - [ ] Customer insights
  - [ ] Smart pricing
  - [ ] Multi-location transfers
  - [ ] Supplier management
  
- [ ] Phase 7: Reporting & Analytics
  - [ ] Product analytics
  - [ ] Customer behavior analysis
  - [ ] Profitability reports
  - [ ] Demand forecasting
  
- [ ] Phase 8: Integrations & Webhooks
  - [ ] Payment gateway integration
  - [ ] Barcode provider APIs
  - [ ] Third-party logistics
  
- [ ] Phase 9: Custom Domains & Advanced Features

---

## 🚀 SOFT LAUNCH ROADMAP - EXCEL-BASED MVP

**Status:** Phase 0 ✅ Complete | Phase 1 ⏳ 65% Complete  
**Timeline:** 4 weeks to soft launch  
**Stack:** Next.js + Excel + Cloudinary + Resend.com  
**See:** `SOFT_LAUNCH_ROADMAP.md` for detailed 4-week plan

### Phase 1 Status: ⚠️ INCOMPLETE (10 of 18 tasks missing)

**✅ COMPLETED (Phase 0)**
- [x] Project setup & dependencies
- [x] Excel I/O service
- [x] Local file storage
- [x] Landing page (12 templates)
- [x] Template gallery & filters
- [x] Demo portal (template-specific)
- [x] People management CRUD
- [x] Role seed data (Institution & Organisation packs)
- [x] Type definitions
- [x] User profile page
- [x] Branding customization

**❌ MISSING FOR SOFT LAUNCH**
1. Role Assignment UI — Assign roles to users ⏳ WEEK 2
2. Position/Hierarchy Model — Excel positions sheet ⏳ WEEK 1
3. Org Chart Visualization — Tree view of hierarchy ⏳ WEEK 2
4. Permission System — Grant/revoke capabilities ⏳ WEEK 2
5. Org Units Management — Departments, teams ⏳ WEEK 3
6. Tenant Admin Portal — Main dashboard ⏳ WEEK 3
7. **Cloudinary Integration** — Image uploads ⏳ WEEK 1
8. **Resend.com Integration** — Email service ⏳ WEEK 1
9. Multi-tenant Routing — Proper tenant isolation ⏳ WEEK 1
10. Permission Enforcement — Hide UI based on caps ⏳ WEEK 2

**Excel Schema Needed:**
```
tenant_users.xlsx (per tenant)
├─ Sheet: users (id, code, name, email, role_ids[], status)
├─ Sheet: positions (user_id, reports_to_user_id, org_unit_id)
├─ Sheet: org_units (id, name, parent_unit_id, head_user_id)
├─ Sheet: capabilities (user_id, capability, scope, granted_by)
└─ Sheet: audit (who, what, before, after, when)
```

### 4-Week Implementation Schedule

| Week | Focus | Deliverables |
|---|---|---|
| **Week 1** | Foundation | Excel schema, Cloudinary, Resend, multi-tenant |
| **Week 2** | Core Features | Role assignment, hierarchy, org chart, permissions |
| **Week 3** | Admin Panel | Dashboard, capability management, org units, emails |
| **Week 4** | Testing & Polish | Data validation, error handling, documentation |

### To Begin Soft Launch (Immediately)

1. **Read** `SOFT_LAUNCH_ROADMAP.md` (see checklist)
2. **Confirm** Excel schema above matches requirements
3. **Start WEEK 1:**
   - [ ] Update Excel service with positions/capabilities methods
   - [ ] Integrate Cloudinary (replace local storage)
   - [ ] Integrate Resend.com (for invites & notifications)
   - [ ] Setup multi-tenant file structure

---

## Next Steps (Immediate) - Phase 1

### Phase 0: MVP Features - ALL COMPLETE ✅
1. ✅ Read poc.md completely
2. ✅ Initialize Next.js 15 project  
3. ✅ Create Excel data models & I/O
4. ✅ Build Identity & Provisioning API (CRUD)
5. ✅ People management UI (list, add, edit, delete)
6. ✅ Template system (12 templates with demo routes)
7. ✅ Template gallery (search, filters, category-based)
8. ✅ Demo portal system (template-specific routes)
9. ✅ User management in demo (full CRUD)
10. ✅ Branding customization (colors, logo, persistence)
11. ✅ User profile page with permissions
12. ✅ Landing page with featured templates
13. ✅ Enquiry form for leads

### Phase 1: Core Hierarchy & Permissions - NEXT
1. ⏳ **Position model implementation** (position, position_closure)
2. ⏳ **Role assignment UI** (assign roles to users)
3. ⏳ **Hierarchy editor** (position tree, drag-to-parent, org chart)
4. ⏳ **Org units management** (create departments, teams)
5. ⏳ **Role & power matrix UI** (view/edit capabilities)
6. ⏳ **Capability-seeking escalation** (approval routing)
7. ⏳ **Permission enforcement** (5-sieve model)

### Phase 2: Modules
8. ⏳ **Attendance module** (§8.2)
9. ⏳ **Leave module** (§8.3)
10. ⏳ Plan Spring Boot migration strategy

---

## Notes

- **Excel Storage:** Each module gets a separate sheet (users, roles, positions, etc.)
- **Validation:** Zod schemas mirror domain model for type safety
- **Later Migration:** Node.js API routes → Spring Boot Controller beans; Excel → PostgreSQL
- **Design System:** ShadCN/UI + custom patterns for power-aware components
