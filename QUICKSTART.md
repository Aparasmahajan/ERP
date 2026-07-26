# Quick Start Guide

## Installation & Setup (5 minutes)

### 1. Install Dependencies

```bash
cd "c:\Users\parmahaj\Documents\New folder\ERP"
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open browser: **http://localhost:3000**

### 3. Initialize Your First Tenant

1. Click **"Initialize Tenant"** button on home page
2. Enter tenant name: `Greenwood Academy`
3. Select pack: `INSTITUTION`
4. Click **"Create Tenant"**
5. You'll be redirected to `/portal/greenwood-academy`

### 4. Create Your First User

On the **People Management** page (`/portal/greenwood-academy/people`):

1. Click **"+ Add User"**
2. Fill in:
   - **Code:** `PRIN001`
   - **First Name:** `John`
   - **Last Name:** `Smith`
   - **Email:** `john.smith@greenwood.edu`
3. Click **"Create User"**

### 5. View Dashboard

The dashboard at `/portal/greenwood-academy` shows:
- Total Users
- Active Users
- Total Roles (seeded from Institution pack)
- Quick action links

---

## Project Structure

```
ERP/
├── app/                          # Next.js app directory
│   ├── api/setup                 # Tenant initialization API
│   ├── api/users                 # User CRUD APIs
│   ├── api/roles                 # Role CRUD APIs
│   ├── portal/[tenant]/          # Multi-tenant portal
│   ├── setup/                    # Tenant setup wizard UI
│   └── page.tsx                  # Home page
├── lib/
│   ├── types/domain.ts           # All entity types
│   ├── excel/excelService.ts     # Excel read/write
│   ├── seeds/roleSeeds.ts        # Institution & Org roles
│   └── utils/validation.ts       # Zod schemas
├── data/
│   └── erp-data.xlsx             # Auto-created Excel "database"
└── README.md / QUICKSTART.md
```

---

## API Examples

### Create a Tenant

```bash
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Greenwood Academy",
    "pack": "INSTITUTION"
  }'
```

### List Users (for a tenant)

```bash
curl http://localhost:3000/api/users \
  -H "x-tenant-id: greenwood-academy"
```

### Create a User

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: greenwood-academy" \
  -d '{
    "code": "STU001",
    "firstName": "Alice",
    "lastName": "Johnson",
    "email": "alice@greenwood.edu"
  }'
```

### Get All Roles (for a tenant)

```bash
curl "http://localhost:3000/api/roles?pack=INSTITUTION" \
  -H "x-tenant-id: greenwood-academy"
```

---

## Excel Database

Data is stored in **`data/erp-data.xlsx`** with sheets:

| Sheet | Contains |
|-------|----------|
| `tenants` | Organizations/institutions |
| `users` | People (name, code, email, status) |
| `roles` | Role definitions (title, rank, kind) |
| `user_roles` | Role assignments (user → role) |
| `positions` | Hierarchy (who reports to whom) |
| `org_units` | Organization structure (departments, teams) |
| `sessions` | Academic/fiscal years |
| `audit_events` | Change log |

You can open this file with Excel, LibreOffice, or Google Sheets to inspect data.

---

## Next: What to Build

After exploring the MVP, work on these in order:

### Phase 0.1: Hierarchy & Roles
- [ ] **Role Assignment UI** — Assign roles to users
- [ ] **Org Units Management** — Create departments/teams
- [ ] **Position Tree** — Set up reporting relationships (who reports to whom)
- [ ] **Org Chart Viewer** — Visualize the hierarchy

### Phase 0.2: Permissions
- [ ] **Role Catalog UI** — View/edit Institution and Organisation role packs
- [ ] **Powers Matrix** — Show which roles have which capabilities
- [ ] **Grant UI** — Manually grant/revoke powers for individual users

### Phase 0.3: Core Modules
- [ ] **Attendance** (§8.2) — Mark attendance, set policies
- [ ] **Leave** (§8.3) — Request leave, approve, track balances
- [ ] **Assignments** (§8.4, Institution only) — Create, submit, grade

### Phase 0.4: Excel Bulk Import
- [ ] **Import Template Generator** — Download template.xlsx
- [ ] **Dry-Run Validator** — Validate without writing
- [ ] **Conflict Resolver** — Handle duplicates, missing refs
- [ ] **Reversible Import** — Undo last import

---

## Development Tips

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Build
```bash
npm run build
```

### View Excel File
- Windows: `start data\erp-data.xlsx`
- Mac: `open data/erp-data.xlsx`
- Online: Download and open in Google Sheets

### Debug Logs
```bash
DEBUG=erp:* npm run dev
```

---

## Common Tasks

### Add a New API Endpoint

1. Create file: `app/api/{module}/route.ts`
2. Implement `GET`, `POST`, `PUT`, `DELETE` handlers
3. Use `excelService.readSheet()` / `excelService.writeSheet()`
4. Validate with Zod schema
5. Return `NextResponse.json()`

Example:
```typescript
import { excelService } from '@/lib/excel/excelService';
import { MyEntity } from '@/lib/types/domain';

export async function GET(request: NextRequest) {
  const data = await excelService.readSheet<MyEntity>('my_sheet');
  return NextResponse.json({ data });
}
```

### Add a New Page

1. Create file: `app/portal/[tenant]/{feature}/page.tsx`
2. Use 'use client' for interactivity
3. Get tenant from `useParams()`
4. Fetch from `/api/{module}` with `x-tenant-id` header
5. Render UI with form/table/chart

### Add a New Type

1. Add to `lib/types/domain.ts`
2. Add to Excel sheet headers in `api/setup/route.ts`
3. Create Zod validation in `lib/utils/validation.ts`
4. Use in API routes

### Modify Excel Sheet Schema

1. Add/remove headers in `api/setup/route.ts`
2. Delete `data/erp-data.xlsx` (it will be recreated)
3. Restart dev server
4. Re-initialize tenants

---

## Troubleshooting

### "Excel file locked" error
- Close any open Excel/Sheets files
- Or: delete `data/erp-data.xlsx` and restart

### "x-tenant-id header missing"
- Ensure API call includes: `-H "x-tenant-id: greenwood-academy"`
- Or: pass as path param if you change routing

### "Failed to load users" in UI
- Open browser console (F12)
- Check Network tab for 404 or 500 errors
- Verify tenant slug matches a real tenant

### Port 3000 already in use
```bash
npm run dev -- -p 3001
```

---

## Next Resources

- **Full Spec:** [poc.md](./poc.md)
- **Progress Tracker:** [completed.md](./completed.md)
- **Types & Models:** [lib/types/domain.ts](./lib/types/domain.ts)
- **Seed Data:** [lib/seeds/roleSeeds.ts](./lib/seeds/roleSeeds.ts)

---

## Questions?

Refer to `README.md` for detailed docs and `poc.md` for the full specification.

Happy building! 🚀
