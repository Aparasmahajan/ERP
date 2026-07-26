# System Architecture

## Overview

**ERP** follows a multi-tier architecture, currently running on Next.js + Excel (MVP), designed to migrate to Spring Boot + PostgreSQL.

```
┌─────────────────────────────────────────────────────────────────┐
│                     User's Browser                              │
│                  (Chrome, Safari, etc.)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/HTTPS
                         │
┌─────────────────────────▼────────────────────────────────────────┐
│                      Next.js 15                                  │
│                   (App Router)                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐      ┌──────────────────────────────────┐ │
│  │   React Pages    │      │      API Routes (Node.js)        │ │
│  │                  │      │                                  │ │
│  │  /setup          │      │  POST /api/setup                │ │
│  │  /portal/[...]   │      │  GET  /api/users                │ │
│  │  /people         │      │  POST /api/users                │ │
│  │  /roles          │      │  PUT  /api/users/{id}           │ │
│  │  /org-units      │      │  DEL  /api/users/{id}           │ │
│  │  /attendance     │      │  GET  /api/roles                │ │
│  │  /leave          │      │  POST /api/roles                │ │
│  └──────────────────┘      └──────────────────────────────────┘ │
│           │                             │                       │
│           └─────────────┬───────────────┘                       │
│                         │                                       │
│                    fetch() calls                               │
│                    x-tenant-id header                          │
│                                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ JSON over HTTP
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   Business Logic Layer                          │
│                   (Excel Service)                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  excelService.readSheet('users')                             │
│  excelService.writeSheet('users', data)                      │
│  excelService.appendSheet('users', newRows)                 │
│                                                                │
│  Validation & Error Handling (Zod schemas)                   │
│                                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ File I/O
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Data Storage Layer (Excel)                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  data/erp-data.xlsx                                          │
│  ├─ Sheet: tenants                                           │
│  ├─ Sheet: users                                             │
│  ├─ Sheet: roles                                             │
│  ├─ Sheet: user_roles                                        │
│  ├─ Sheet: positions                                         │
│  ├─ Sheet: org_units                                         │
│  ├─ Sheet: sessions                                          │
│  └─ Sheet: audit_events                                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Layers Explained

### 1. Presentation Layer (React)

- **Technology:** React 19 (Next.js App Router)
- **Responsibilities:**
  - Render UI pages and components
  - Handle user interactions (forms, buttons, tables)
  - Manage local state with `useState`
  - Fetch from API routes
  - Display errors and loading states

**Key Pages:**
- `/` — Home
- `/setup` — Tenant initialization wizard
- `/portal/[tenant]/` — Dashboard
- `/portal/[tenant]/people` — People management (CRUD)
- `/portal/[tenant]/roles` — Role management
- `/portal/[tenant]/org-units` — Organization structure
- `/portal/[tenant]/attendance` — Attendance (future)
- `/portal/[tenant]/leave` — Leave management (future)

**Design:**
- Tailwind CSS utility classes
- Semantic HTML
- Mobile-responsive
- Accessibility (ARIA labels, keyboard nav)

---

### 2. API Route Layer (Node.js + Express-like)

- **Technology:** Next.js API Routes (`/api/*`)
- **Responsibilities:**
  - HTTP request handling (GET, POST, PUT, DELETE)
  - Input validation (Zod schemas)
  - Business logic orchestration
  - Multi-tenant routing (x-tenant-id header)
  - Error handling + response formatting
  - Call Excel service layer

**Key Routes:**
```
POST   /api/setup              → Initialize tenant
GET    /api/users              → List users (filtered by tenant)
POST   /api/users              → Create user
GET    /api/users/{id}         → Get one user
PUT    /api/users/{id}         → Update user
DELETE /api/users/{id}         → Soft-delete user

GET    /api/roles              → List roles
POST   /api/roles              → Create custom role
```

**Pattern (example):**
```typescript
export async function GET(request: NextRequest) {
  // 1. Extract tenant ID from header
  const tenantId = request.headers.get('x-tenant-id');
  
  // 2. Read data from Excel
  const users = await excelService.readSheet('users');
  
  // 3. Filter by tenant
  const filtered = users.filter(u => u.tenantId === tenantId);
  
  // 4. Return JSON
  return NextResponse.json({ data: filtered });
}
```

---

### 3. Business Logic Layer (Excel Service + Validation)

- **Technology:** exceljs (Node.js Excel library)
- **Responsibilities:**
  - Read Excel files into memory
  - Write data back to Excel
  - Maintain Excel structure (headers, formatting)
  - Provide CRUD operations on data
  - Handle file locking / conflicts (logging, not prevention in MVP)

**ExcelService API:**
```typescript
readSheet<T>(sheetName: string): Promise<T[]>
  → Read all rows from a sheet, parsed to objects

writeSheet<T>(sheetName: string, data: T[]): Promise<void>
  → Replace entire sheet with new data (overwrite)

appendSheet<T>(sheetName: string, data: T[]): Promise<void>
  → Add rows to the end of a sheet (non-destructive)

deleteFromSheet<T>(sheetName, predicate): Promise<void>
  → Delete rows matching condition (by filtering, not destructive)

updateSheet<T>(sheetName, predicate, updates): Promise<void>
  → Update rows matching condition
```

**Validation (Zod):**
```typescript
// lib/utils/validation.ts
const CreateUserSchema = z.object({
  code: z.string().min(2).max(50),
  firstName: z.string().min(1),
  email: z.string().email(),
  ...
});

// In API route:
const validated = CreateUserSchema.parse(body);  // Throws if invalid
```

---

### 4. Data Storage Layer (Excel Files)

- **Technology:** Apache POI / ExcelJS (read/write .xlsx)
- **Location:** `data/erp-data.xlsx`
- **Structure:** One file per deployment, multiple sheets per file
- **Data Format:** 2D grid (rows + columns) with headers

**Sheets & Schema:**

| Sheet | Columns | Purpose |
|-------|---------|---------|
| `tenants` | id, slug, name, pack, status, timezone, ... | Tenants |
| `users` | id, tenantId, code, email, firstName, ... | People |
| `roles` | id, tenantId, key, title, rank, kind, ... | Role definitions |
| `user_roles` | id, userId, roleId, validFrom, validTo, ... | Role assignments |
| `positions` | id, userId, tenantId, reportsToUserId, ... | Hierarchy nodes |
| `org_units` | id, tenantId, parentId, kind, name, code, ... | Organization units |
| `sessions` | id, tenantId, name, startsOn, endsOn, ... | Academic/fiscal years |
| `audit_events` | id, tenantId, action, entity, before, after, ... | Audit log |

---

## Multi-Tenancy Design

### Addressing

**Current (MVP):**
```
Path: https://myapp.com/greenwood-academy
      ↓
      Next.js rewrites to: /_portal
      ↓
      Tenant slug in header: x-tenant-id: greenwood-academy
      ↓
      API filters by tenant_id
```

**Future (Spring Boot):**
```
Subdomain: https://greenwood.myapp.com
Custom:    https://portal.greenwood.edu
```

### Isolation

**Current (SHARED_SCHEMA in Excel):**
- All tenants in one workbook
- Each row has `tenant_id` column
- API filters by `tenant_id` in memory
- **Security:** Tenant ID not validated (MVP), validated in Spring Boot

**Future:**
- Option 1: SCHEMA_PER_TENANT (Postgres `search_path`)
- Option 2: DB_PER_TENANT (separate databases)
- Config via `erp.tenancy.strategy`

---

## Request/Response Flow

### Example: Create a User

```
1. User fills form in React:
   - Code: "STU001"
   - Name: "Alice Johnson"
   - Email: "alice@school.edu"

2. Form onSubmit() calls:
   fetch('/api/users', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'x-tenant-id': 'greenwood-academy'
     },
     body: JSON.stringify({
       code: 'STU001',
       firstName: 'Alice',
       lastName: 'Johnson',
       email: 'alice@school.edu'
     })
   })

3. Next.js API route: POST /api/users
   a. Extract tenantId from header
   b. Validate input with Zod → CreateUserSchema
   c. Read all users from Excel
   d. Check for duplicates (code, email)
   e. Generate new UUID
   f. Create User object
   g. Append to Excel
   h. Return User JSON + 201 Created

4. Browser receives response:
   {
     "id": "uuid-123",
     "code": "STU001",
     "firstName": "Alice",
     "tenantId": "greenwood-academy",
     "status": "ACTIVE",
     ...
   }

5. React updates local state:
   setUsers([...users, newUser])
   setShowForm(false)
   setSuccess('User created!')

6. UI re-renders with new user in table
```

---

## Type Safety

All data flows use TypeScript interfaces from `lib/types/domain.ts`:

```typescript
interface User {
  id: string;
  tenantId: string;
  code: string;
  email?: string;
  firstName: string;
  lastName: string;
  status: UserStatus;  // 'ACTIVE' | 'ARCHIVED' | ...
  joinedOn: string;    // ISO timestamp
  ...
}
```

**Benefits:**
- IDE autocomplete
- Compile-time type checking (`npm run type-check`)
- Swagger/OpenAPI generation (future)

---

## Error Handling

**Pattern:**

```typescript
try {
  // Validation
  const validated = CreateUserSchema.parse(body);  // throws ZodError
  
  // Business logic
  const users = await excelService.readSheet('users');  // throws file error
  
  // Return success
  return NextResponse.json(user, { status: 201 });
  
} catch (error) {
  // Zod validation error
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  // File system error
  console.error('File read failed:', error);
  return NextResponse.json({ error: 'Failed to read users' }, { status: 500 });
}
```

**HTTP Status Codes:**
- `200` — OK (success, no content change)
- `201` — Created
- `400` — Bad Request (invalid input)
- `404` — Not Found
- `409` — Conflict (duplicate, constraint violation)
- `500` — Server Error

---

## Caching & Performance

**Current (MVP):**
- No caching (everything reads Excel)
- Single Excel file shared by all processes
- Suitable for <10 concurrent users

**Future (Spring Boot + Redis):**
```
GET /api/users
  → Check Redis cache (key: grants:{tenant}:{user}:{gv})
  → If miss, query Postgres
  → Cache in Redis for 5 minutes
  → Return

File Storage:
  Current: ./uploads/ (local disk, MVP-friendly)
```

---

## Scalability Roadmap

| Phase | Storage | Concurrency | Tenants |
|-------|---------|------------|---------|
| **Phase 0** (Current) | Excel | 1-10 | 1-5 |
| **Phase 1** | PostgreSQL | 10-100 | 5-50 |
| **Phase 2** | PostgreSQL + Redis | 100-1000 | 50-500 |
| **Phase 3** (Production) | PG + Redis + CDN | 1000+ | 500+ |

---

## Technology Decisions

### Why Excel for MVP?
✅ Fast to build (no DB setup)
✅ Data is human-readable
✅ Easy to inspect/debug
✅ No schema migrations needed
✅ Works offline

❌ Not concurrent-safe
❌ Not ACID
❌ Limited query flexibility

### Why Next.js?
✅ Full-stack: React + API in one repo
✅ Built-in routing, SSR, API routes
✅ TypeScript out-of-the-box
✅ Fast development
✅ Easy deployment (Vercel, self-hosted)

### Why Zod for validation?
✅ Type-safe runtime validation
✅ Works with TypeScript
✅ Beautiful error messages
✅ Composable schemas

---

## Diagrams

### Component Tree (Portal)

```
App
├── Setup Wizard
│   └── Form (tenant creation)
├── Portal [tenant]
│   ├── Sidebar Navigation
│   ├── Header
│   └── Page Router
│       ├── Dashboard
│       ├── People
│       │   ├── UserList (table)
│       │   ├── CreateUserForm (modal)
│       │   └── UserActions
│       ├── Roles (future)
│       ├── OrgUnits (future)
│       ├── Attendance (future)
│       ├── Leave (future)
│       └── Settings (future)
```

### Data Flow Diagram

```
User Input
    ↓
React Component
    ↓ (fetch)
Next.js API Route
    ↓ (validate)
Zod Schema
    ↓ (pass/fail)
Business Logic
    ↓ (read/write)
Excel Service
    ↓ (file I/O)
erp-data.xlsx
    ↓ (parse)
TypeScript Object
    ↓ (return)
JSON Response
    ↓
React State
    ↓
DOM Update
    ↓
User sees result
```

---

## What Comes Next

### Phase 0.1: Hierarchy
- Position tree (who reports to whom)
- Org chart visualization (drag-to-move)
- Validation (cycle detection)
- Closure table for efficient queries

### Phase 0.2: Permissions
- Role → User assignment
- Role → Capability presets
- User override grants/revokes
- Permission check in API

### Phase 0.3: Core Modules
- Attendance (mark, policy, reports)
- Leave (request, approve, balance)
- Assignments (create, submit, grade)

### Phase 1: Spring Boot Migration
- PostgreSQL schema
- Spring Data JPA
- Spring Security
- Swagger docs
- Dockerize

---

## Useful Links

- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **Next.js Docs:** https://nextjs.org/docs
- **Zod:** https://zod.dev
- **ExcelJS:** https://github.com/exceljs/exceljs
- **Tailwind CSS:** https://tailwindcss.com
- **React Docs:** https://react.dev

---

**Last Updated:** 2026-07-26
**Current Phase:** 0 (MVP - Excel Backend)
