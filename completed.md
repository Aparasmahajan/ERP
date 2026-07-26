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
- [ ] §8.1 Identity & Provisioning → **IN PROGRESS**
  - [x] People CRUD (API routes)
  - [x] People list UI
  - [x] Create user form
  - [x] Soft-delete (archive) users
  - [ ] Role assignment UI
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
- [x] Global styles (globals.css)
- [x] Portal layout (sidebar nav, header)
- [x] Setup wizard UI
- [ ] Design system components (buttons, cards, tables)
- [ ] Role-aware navigation
- [ ] Power-aware UI helpers
- [ ] Permission explain panels
- [ ] Org chart editor
- [ ] Approval timeline component

### §11. Screen Inventory
- [ ] Dashboard (role-specific)
- [ ] People list & management
- [ ] Roles & powers matrix
- [ ] Org chart viewer/editor
- [ ] Module-specific screens

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
- [ ] Phase 0: MVP (Current)
  - [x] Project scaffolding
  - [x] Excel data layer (excelService)
  - [x] Identity & provisioning API (CRUD)
  - [x] People management UI
  - [x] Tenant initialization
  - [ ] Role assignment UI
  - [ ] Simple hierarchy visualization (org chart)
- [ ] Phase 1: Core Hierarchy & Permissions
- [ ] Phase 2: Attendance & Leave
- [ ] Phase 3: Academics (Assignments, Marks, Timetable)
- [ ] Phase 4: Workforce (Payroll, Projects, Performance)
- [ ] Phase 5: Reporting & Analytics
- [ ] Phase 6: Integrations & Webhooks
- [ ] Phase 7: Custom Domains & Advanced Features

---

## Next Steps (Immediate)

1. ✅ Read poc.md completely
2. ✅ Initialize Next.js 15 project
3. ✅ Create Excel data models & I/O
4. ✅ Build Identity & Provisioning API (CRUD)
5. ✅ People management UI (list, add, archive)
6. ⏳ **Role assignment UI** (assign roles to users)
7. ⏳ **Hierarchy editor** (position tree, drag-to-parent, org chart)
8. ⏳ **Org units management** (create departments, teams)
9. ⏳ **Role & power matrix UI** (view/edit capabilities)
10. ⏳ **Attendance module** (§8.2)
11. ⏳ **Leave module** (§8.3)
12. ⏳ Plan Spring Boot migration strategy

---

## Notes

- **Excel Storage:** Each module gets a separate sheet (users, roles, positions, etc.)
- **Validation:** Zod schemas mirror domain model for type safety
- **Later Migration:** Node.js API routes → Spring Boot Controller beans; Excel → PostgreSQL
- **Design System:** ShadCN/UI + custom patterns for power-aware components
