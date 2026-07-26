# ERP — Multi-Tenant Portal (MVP with Excel Backend)

A modern, configurable ERP system for educational institutions and organizations. This is the **Phase 0 MVP** built with **Next.js 15 + Excel storage**, designed to be migrated to **Spring Boot + PostgreSQL** later.

## 🎯 What It Is

**ERP** is a multi-tenant SaaS platform that handles:

- **Two role catalogues** — Institution pack (schools/colleges) & Organisation pack (offices/businesses)
- **Arbitrary-depth hierarchies** — unlimited reporting chains, not fixed levels
- **Countable powers** — fine-grained, grantable capabilities per person
- **Flex permission model** — five-sieve authorization (plan → tenant flag → role preset → person override → reach)

## 🏗️ Architecture (This Phase)

```
Next.js 15 (App Router, TypeScript)
  ↓
API Routes (Node.js)
  ↓
Excel Files (data/erp-data.xlsx)
```

**Later migration:**
```
Spring Boot 3.3 (Modular monolith)
  ↓
PostgreSQL 16
  ↓
Redis (caching)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (or Bun)
- npm / pnpm / yarn

### Installation

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Open browser
# http://localhost:3000

# Data will be stored in:
# - data/erp-data.xlsx (Excel database)
# - uploads/[tenant-id]/ (user files, photos, documents)
```

### First Steps

1. **Initialize a tenant** → Visit `/setup`
   - Create a new institution or organization
   - Choose pack: `INSTITUTION` or `ORGANISATION`
   - This auto-generates Excel sheets + seed roles

2. **Add users** → `/portal/{slug}/people`
   - Create people with identity (name, code, email)
   - Data is stored in `data/erp-data.xlsx` → `users` sheet

3. **View dashboard** → `/portal/{slug}`
   - Quick stats
   - Navigation to other modules

## 📂 Project Structure

```
erp/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (Node.js backend)
│   │   ├── setup/               # Tenant initialization
│   │   ├── users/               # User CRUD
│   │   └── roles/               # Role management
│   ├── portal/[tenant]/          # Tenant portal (multi-tenant)
│   │   ├── layout.tsx           # Portal shell
│   │   ├── page.tsx             # Dashboard
│   │   ├── people/              # People management
│   │   └── ...
│   ├── setup/                   # Setup wizard UI
│   ├── page.tsx                 # Home
│   └── globals.css              # Global styles
├── lib/
│   ├── types/
│   │   └── domain.ts            # Core types (User, Role, Position, etc.)
│   ├── excel/
│   │   └── excelService.ts      # Excel read/write logic
│   ├── seeds/
│   │   └── roleSeeds.ts         # Seed data (Institution & Org roles)
│   └── utils/
│       └── validation.ts         # Zod schemas for validation
├── data/                        # Excel files (created at runtime)
│   └── erp-data.xlsx           # Main database
├── package.json
├── tsconfig.json
├── next.config.js
└── completed.md                # Progress tracker (from poc.md)
```

## 📊 Data Model (Excel Sheets)

Current sheets in `erp-data.xlsx`:

| Sheet | Purpose | Key Fields |
|-------|---------|-----------|
| `tenants` | Organizations/institutions | id, slug, name, pack, status |
| `users` | People | id, code, email, firstName, lastName, status |
| `roles` | Role definitions | id, key, title, rank, kind (LINE/STAFF/EXTERNAL) |
| `user_roles` | Role assignments | userId, roleId, validFrom, validTo |
| `positions` | Hierarchy nodes | userId, reportsToUserId, orgUnitId |
| `org_units` | Org structure | id, name, kind (FACULTY/DEPARTMENT/TEAM) |
| `sessions` | Academic/fiscal years | id, name, startsOn, endsOn |
| `audit_events` | Change log | id, action, entity, before, after |

## 🔐 Permission Model (Simplified MVP)

Five sieves:
1. **Plan** — Is the module in the tenant's plan? (always YES in MVP)
2. **Tenant flag** — Did the Head switch it on? (stored in `setting` sheet)
3. **Role preset** — Does the role include this power? (bundled in seed data)
4. **Person override** — Was it granted/revoked? (stored in `user_grant` sheet)
5. **Reach** — Can the person see the target? (from position tree)

**Capabilities:** 132 total (see `lib/types/domain.ts` → `enum Capability`)

## 🎬 Demo Workflow (12 Clicks)

1. Go to `/setup` → Create "Greenwood Academy" (Institution pack)
2. Go to `/portal/greenwood-academy` → Dashboard
3. Go to `/portal/greenwood-academy/people` → Add Principal
4. Add Vice Principal (reports to Principal)
5. Add Department Head (reports to VP)
6. Add Class Coordinator (reports to HOD)
7. Add Students (reports to Coordinator)
8. View org chart (later phase)
9. Assign roles & powers (later phase)
10. See approval chains (later phase)

## 🛠️ API Endpoints (MVP Phase)

### Setup
```
POST /api/setup
  Create a new tenant with seed data
  Body: { tenantName, pack: "INSTITUTION" | "ORGANISATION" }
  Returns: Tenant, Session, RootOrgUnit

GET /api/setup
  List all tenants
  Returns: Tenant[]
```

### Users
```
GET /api/users
  List users for tenant (headers: x-tenant-id)
  Returns: User[]

POST /api/users
  Create user
  Body: { code, firstName, lastName, email?, phone? }
  Returns: User

GET /api/users/{id}
  Get one user

PUT /api/users/{id}
  Update user

DELETE /api/users/{id}
  Soft-delete (archive) user
```

### Roles
```
GET /api/roles?pack=INSTITUTION
  List roles for tenant
  Returns: Role[]

POST /api/roles
  Create custom role
  Body: { key, title, rank, kind, mayHoldReports, ... }
  Returns: Role
```

## 📋 Completed from poc.md

Check **`completed.md`** for detailed progress.

**Currently Done:**
- ✅ Project structure & Next.js setup
- ✅ Core types (User, Role, Position, Tenant, etc.)
- ✅ Excel I/O service (read/write/append)
- ✅ Institution & Organisation role seeds
- ✅ Validation schemas (Zod)
- ✅ API routes: setup, users, roles
- ✅ Portal layout & shell
- ✅ Dashboard (stats)
- ✅ People management (CRUD)

**Next Steps:**
- [ ] Roles & powers matrix UI
- [ ] Org chart builder (drag to re-parent)
- [ ] Hierarchy validation (cycle detection, closure table)
- [ ] Position tree & escalation resolver
- [ ] Attendance module
- [ ] Leave module
- [ ] Bulk import from Excel template
- [ ] Spring Boot migration plan

## 🔄 Multi-Tenancy

**Addressing strategy (MVP uses PATH):**
```
myapp.com/greenwood-academy  →  Tenant: greenwood-academy
myapp.com/northwind-corp     →  Tenant: northwind-corp
```

Each request includes `x-tenant-id` header or path param.

**Isolation:** SHARED_SCHEMA (one Excel file, filtered by tenant_id)
- Later: SCHEMA_PER_TENANT or DB_PER_TENANT per config

## 🎨 UI Design

- **Color scheme:** Slate background + blue accents (from poc.md)
- **Components:** Semantic HTML + Tailwind utilities (no CSS framework yet)
- **Responsive:** Desktop-first (admin), mobile-friendly (enduser features)
- **Accessibility:** Keyboard-complete, aria labels

## 📦 Dependencies

- **next** — App Router, SSR, API routes
- **react** — UI
- **typescript** — Type safety
- **zod** — Schema validation
- **exceljs** — Excel I/O
- **uuid** — ID generation
- **@tanstack/react-table** — (future: data tables)
- **lucide-react** — (future: icons)

## 🚧 Known Limitations (MVP)

1. **Excel storage** — Not suitable for >100k rows; replaced by PostgreSQL in Phase 1
2. **No real auth** — Tenant ID from header (no JWT yet)
3. **No audit timestamps** — Hardcoded to request time
4. **Single file** — All tenants in one workbook (per design)
5. **No RLS** — Anyone with tenant ID can read all data (mitigated in Spring Boot)
6. **No transactions** — Excel file reads/writes not atomic (mitigated by Postgres)
7. **Sync issues** — Multiple processes writing Excel will conflict

## 🔗 Migration Path to Spring Boot

**Phase 1:** Keep Excel, add database schema alongside
**Phase 2:** Dual-write to Excel + PostgreSQL, read from PostgreSQL
**Phase 3:** Deprecate Excel, cut over to Spring Boot
**Phase 4:** Decommission Excel export

See `poc.md` §15 for full build phases.

## 📚 Documentation

- **poc.md** — Complete specification (1200+ lines)
- **completed.md** — What's built vs. what's planned
- **lib/types/domain.ts** — All entity types
- **lib/seeds/roleSeeds.ts** — Institution & Organisation roles
- **API comments** — Inline JSDoc

## 🐛 Debugging

```bash
# Enable verbose logging
DEBUG=erp:* npm run dev

# Inspect Excel file (use a tool like LibreOffice Calc)
open data/erp-data.xlsx

# Check TypeScript
npm run type-check

# Lint
npm run lint
```

## 🤝 Contributing

1. Features branch from `main`
2. Update `completed.md` as you go
3. Keep types in sync with `lib/types/domain.ts`
4. Test API routes with curl or Postman

## 📄 License

(Placeholder — fill in your license)

---

**Built with ❤️ for institutions and organisations worldwide.**
