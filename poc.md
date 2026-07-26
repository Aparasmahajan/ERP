# ERP Portal — Proof of Concept & Build Specification (v2)

**Working name:** ERP (placeholder — rename freely)
**Stack:** Java 21 + Spring Boot 3.3 (configurable modular monolith) · PostgreSQL 16 · Next.js 15 (App Router, TypeScript) · Redis · S3-compatible object store
**Verticals:** Institutions (schools / colleges) **and** Organisations (offices / businesses) — one engine, **two distinct role catalogues**
**Supersedes:** `archive/poc-v1.md`

**What changed in v2**
1. "Supervisor" and "Team Lead" are gone as product-facing words. Each vertical now ships its **own named role catalogue** — *Department Head*, *Class Coordinator*, *Registrar*, *Manager*, *Team Lead*, *Head of People* — with dignified, real-world titles (§3).
2. RBAC is no longer one generic ladder with cosmetic labels. There are **two role packs**, each with its own ranks, defaults, power presets and approval routing (§3.2, §3.3).
3. The hierarchy is now **arbitrary-depth and rank-independent**: a Team Lead can have many members, a member can have members under them, a lead can report to another lead. §4 introduces the position tree, the closure table, and **capability-seeking escalation** — the mechanic that makes deep and irregular chains work day to day.
4. New §13 is a dedicated register of **hierarchy edge cases** — the everyday messes: skip-level approvals, dotted-line managers, a supervisor without approval power, cycles, orphaned sub-trees, span-of-control, mid-approval re-orgs.

Read §3 and §4 first. Everything else hangs off them.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Principles and non-negotiables](#2-principles-and-non-negotiables)
3. [Role catalogues — two verticals, two ladders](#3-role-catalogues--two-verticals-two-ladders)
4. [The hierarchy engine — arbitrary depth, any shape](#4-the-hierarchy-engine--arbitrary-depth-any-shape)
5. [The permission model — countable powers](#5-the-permission-model--countable-powers)
6. [Tenancy, routing and the portal shell](#6-tenancy-routing-and-the-portal-shell)
7. [Domain model](#7-domain-model)
8. [Module catalogue](#8-module-catalogue)
9. [Backend architecture — Spring Boot](#9-backend-architecture--spring-boot)
10. [Frontend architecture — Next.js](#10-frontend-architecture--nextjs)
11. [Screen inventory by role](#11-screen-inventory-by-role)
12. [Excel → ERP migration path](#12-excel--erp-migration-path)
13. [Hierarchy edge cases — the day-to-day register](#13-hierarchy-edge-cases--the-day-to-day-register)
14. [Other scenarios and edge cases](#14-other-scenarios-and-edge-cases)
15. [Build phases, step by step](#15-build-phases-step-by-step)
16. [Non-functional requirements](#16-non-functional-requirements)
17. [Testing strategy](#17-testing-strategy)
18. [Decisions log and open questions](#18-decisions-log-and-open-questions)
19. [Appendix A — capability catalogue](#appendix-a--capability-catalogue)
20. [Appendix B — API surface](#appendix-b--api-surface)
21. [Appendix C — configuration reference](#appendix-c--configuration-reference)
22. [Appendix D — seed data for the demo](#appendix-d--seed-data-for-the-demo)

---

## 1. Executive summary

A **multi-tenant ERP platform**. One operator (*Platform Operator*) provisions independent portals. Each portal is owned by an **Institution Head** or a **Managing Director**, who models their own organisation: which role catalogue, how deep the chain of command runs, which modules are on, and — the heart of the product — **which countable powers each role and each individual person holds**.

Three ideas carry the whole system:

| Idea | One line |
|---|---|
| **Two role catalogues** | A school is not an office. Each vertical gets real titles, real defaults, real routing — not one ladder with renamed rungs (§3). |
| **Position tree ≠ role rank** | Who you report to and how senior you are are *different facts*. Any depth, any shape: leads under leads, members with members under them (§4). |
| **Countable powers** | Roles are bundles; the authoritative grant lives on the person. Grant or revoke one power for one individual without inventing a new role (§5). |

Everything else — attendance, leave, assignments, marks, payroll, projects — is a module plugged into those three.

---

## 2. Principles and non-negotiables

| # | Principle | Consequence in code |
|---|---|---|
| P1 | Every query is tenant-scoped. | Hibernate filter on `tenant_id` per request + Postgres RLS as a second net. No repository accepts a tenant id from the client. |
| P2 | Deny by default. | No capability → 403. New capabilities ship unassigned. |
| P3 | You cannot delegate what you do not hold. | Delegatee's grant ⊆ granter's *delegable* grant, always checked server-side. |
| P4 | Authority flows down the **position tree**, not down a rank number. | Reach is computed from the closure table, so irregular shapes work (§4.3). |
| P5 | Capabilities are a closed enum in code. | `Capability` enum; DB stores names; unknown names ignored on read, rejected on write. |
| P6 | Configuration is data; code is generic. | No `if (vertical == SCHOOL)` in business logic. Verticals are catalogue rows, presets and flags. |
| P7 | Every change to a person's record is audited. | Append-only `audit_event`: who, what, before, after, from where, on whose behalf. |
| P8 | The UI mirrors security, never decides it. | Frontend hides for clarity; the API re-checks for safety. Every endpoint has a 403-without-capability test. |
| P9 | Time is explicit. | `timestamptz` UTC everywhere; every tenant has an IANA timezone; attendance and leave dates computed in tenant time. |
| P10 | Soft-delete people; never orphan work. | `status` + `archived_at`; nobody can be archived while holding live responsibilities without a reassignment (§13.7). |
| P11 | Idempotent writes. | `Idempotency-Key` on all mutations; attendance marking and imports are safe to retry. |
| P12 | No dead ends. | Every 403, empty state and blocked action explains itself in the tenant's own vocabulary (§10.2). |

---

## 3. Role catalogues — two verticals, two ladders

### 3.1 Why two catalogues instead of relabelling one

v1 used one ladder with a label pack. It reads fine on a slide and badly in practice: a Registrar is not "a Sub-Admin called Registrar" — she has a different power preset, sits beside the Vice Principal rather than under her, and appears in different approval chains. So the product ships **two role packs**. A tenant picks one at provisioning (or `HYBRID` for a campus with a business arm), then edits freely.

A role pack is **seed data**, not code: rows in `role` + `role_grant` + `approval_flow`. Adding a third pack later (hospital, NGO, retail chain) is a migration file, not a release.

### 3.2 Institution pack — schools, colleges, universities

| Rank | Role | Real-world title | Typical reach | Signature powers |
|---:|---|---|---|---|
| 0 | `PLATFORM_OPERATOR` | Platform Operator | all tenants | provision portals, plans, break-glass |
| 1 | `INSTITUTION_HEAD` | Principal / Director | whole institution | everything; owns the powers matrix |
| 2 | `DEPUTY_HEAD` | Vice Principal / Dean | whole institution | everything except platform + payroll writes |
| 2 | `REGISTRAR` | Registrar / Academic Officer | whole institution | admissions, enrolment, sessions, timetable, records |
| 2 | `EXAMINATION_OFFICER` | Controller of Examinations | whole institution | exams, seating, results publication, revaluation |
| 2 | `ACCOUNTS_OFFICER` | Accounts Officer / Bursar | whole institution | fee structures, invoices, waivers, refunds |
| 3 | `DEPARTMENT_HEAD` | Head of Department (HOD) | own department sub-tree | faculty allocation, marks moderation, leave approval, delegation to coordinators |
| 4 | `PROGRAMME_COORDINATOR` | Programme / Year Coordinator | one programme or year | timetable within programme, cross-class reporting |
| 4 | `CLASS_COORDINATOR` | Class Teacher / Class Coordinator | own class | attendance, class leave approval, guardian contact, conduct notes |
| 4 | `FACULTY` | Faculty / Subject Teacher | subjects they teach | subject attendance, assignments, marks entry |
| 5 | `STUDENT_MENTOR` | Student Mentor / Prefect | a named group of juniors | peer group visibility, group assignment lead, no approvals unless granted |
| 6 | `STUDENT` | Student | self | mark own attendance, submit work, request leave |
| — | `GUARDIAN` | Parent / Guardian *(satellite)* | linked wards | view ward record, pay fees, request ward leave if enabled |
| — | `LIBRARIAN` | Librarian *(satellite)* | library | catalogue, issues, fines |
| — | `WARDEN` | Hostel Warden *(satellite)* | hostel residents | hostel attendance, night roll-call, gate passes |
| — | `COUNSELLOR` | Counsellor *(satellite)* | referred students | confidential notes, restricted visibility |
| — | `LAB_TECHNICIAN` | Lab Technician *(satellite)* | labs | lab assets, practical attendance support |
| — | `TRANSPORT_OFFICER` | Transport In-charge *(satellite)* | routes | route roster, boarding attendance |
| — | `ALUMNUS` | Alumnus *(satellite)* | own past record | read-only transcript |
| — | `EXTERNAL_EXAMINER` | External Examiner *(satellite)* | assigned papers only | time-boxed marks entry, nothing else |

A Class Coordinator is normally also Faculty — two roles on one person, powers union, scopes resolved per capability (§5.4).

### 3.3 Organisation pack — offices, businesses

| Rank | Role | Real-world title | Typical reach | Signature powers |
|---:|---|---|---|---|
| 0 | `PLATFORM_OPERATOR` | Platform Operator | all tenants | provision portals, plans, break-glass |
| 1 | `MANAGING_DIRECTOR` | Owner / Managing Director | whole company | everything; owns the powers matrix |
| 2 | `OPERATIONS_DIRECTOR` | COO / Operations Director | whole company | all operational modules, delegation |
| 2 | `HEAD_OF_PEOPLE` | Head of People / HR Head | whole company | hiring, onboarding, leave policy, attendance policy, documents |
| 2 | `FINANCE_CONTROLLER` | Finance Controller | whole company | payroll runs, salary structures, reimbursements |
| 2 | `IT_ADMINISTRATOR` | IT Administrator | whole company | accounts, devices, integrations, API keys — deliberately *no* HR data |
| 3 | `DEPARTMENT_MANAGER` | Manager / Department Manager | own department sub-tree | approvals, hiring requests, performance, delegation to leads |
| 4 | `TEAM_LEAD` | Team Lead / Tech Lead | own team, any depth below | attendance, leave approval, timesheet approval, task assignment |
| 5 | `SENIOR_MEMBER` | Senior Engineer / Senior Associate | own reports (may be several) | mentoring, timesheet review, may hold approvals if granted |
| 6 | `MEMBER` | Employee / Associate | self | check-in, leave, timesheet, expenses |
| — | `RECRUITER` | Recruiter *(satellite)* | pipelines | jobs, candidates, interviews |
| — | `PAYROLL_OFFICER` | Payroll Officer *(satellite)* | payroll only | runs, payslips, statutory reports |
| — | `FACILITIES_OFFICER` | Facilities Officer *(satellite)* | sites | assets, seating, visitor log |
| — | `CONTRACTOR` | Contractor *(satellite)* | own tasks | timesheet, limited visibility, hard end date |
| — | `CLIENT_VIEWER` | Client *(satellite)* | one project | read-only project status |
| — | `AUDITOR` | Auditor *(satellite)* | read-only, time-boxed | audit log, reports, no writes |

`SENIOR_MEMBER` exists specifically because of the requirement *"under one user in an office there can also be multiple users"* — an individual contributor who mentors two juniors is not a manager and should not be forced into a manager role to get two reports. See §4.2.

### 3.4 What a role actually is

```
role
  id, tenant_id
  key                    -- stable machine key (catalogue key or custom)
  title                  -- what this tenant calls it, editable
  pack                   -- INSTITUTION | ORGANISATION | CUSTOM
  rank                   -- 0..9, seniority for tie-breaking and ceilings (NOT reach)
  kind                   -- LINE (in the chain of command) | STAFF (satellite specialist)
                         -- | EXTERNAL (time-boxed outsider)
  system                 -- catalogue roles: retitle yes, delete no
  may_hold_reports       -- can a holder sit above others in the position tree?
  max_delegable_rank     -- how far down this role may grant (default rank + 1)
  power_preset_id        -- the bundle applied at creation
  color, icon, sort_order
```

- Ranks may repeat (four rank-2 officers in the Institution pack). Rank is a **ceiling and a tie-breaker**, never the reach — reach comes from §4.
- `kind = STAFF` means "beside the ladder": a Librarian outranks nobody and is outranked by nobody, but holds a sharp, narrow set of powers.
- `kind = EXTERNAL` forces a mandatory `valid_to` on every assignment and hides the holder from internal directories.
- A tenant may add custom roles at any rank (cap 25, configurable) — *Sports Coordinator*, *NAAC Coordinator*, *Placement Officer*, *Shift Supervisor*, *Regional Head*, *Franchise Owner*.
- One person may hold several roles (Faculty + Class Coordinator + acting HOD). Powers union; scope per capability takes the widest, then gets narrowed by position reach.

---

## 4. The hierarchy engine — arbitrary depth, any shape

### 4.1 The requirement, stated precisely

> Under one Team Lead there can be multiple members. Under one member there can also be multiple members. Handle the day-to-day cases this creates.

So the chain of command is **not** a fixed five-level ladder. It is a general tree of arbitrary depth in which a node's role rank does not determine its position. Three consequences the design must absorb:

1. A person's supervisor may hold **the same rank** as them (Senior Member over Member; Team Lead over Team Lead on a sub-squad).
2. A person's supervisor may **lack the power** the situation needs (a Senior Member with two reports cannot approve leave). Requests must not dead-end.
3. Re-orgs happen weekly. Moving a node must move its whole sub-tree, re-route live approvals, and never orphan anyone.

### 4.2 Two independent facts

```
role rank      →  how senior you are            →  ceilings, tie-breaks, defaults
position tree  →  who you are responsible for   →  reach, routing, visibility
```

```
position
  user_id, tenant_id            -- one primary position per person per session
  reports_to_user_id?           -- null only for the tenant root (Head / MD)
  org_unit_id                   -- department / team the position belongs to
  title_override?               -- "Tech Lead, Payments" — display only
  span_hint?                    -- expected number of reports, for span-of-control warnings
  session_id, valid_from, valid_to
  UNIQUE (user_id, session_id) WHERE valid_to IS NULL

position_link                   -- secondary / dotted lines, many per person
  user_id, linked_to_user_id
  kind    -- PROJECT_MANAGER | FUNCTIONAL_LEAD | MENTOR | DEPUTY_FOR
           -- | ACADEMIC_ADVISOR | GUARDIAN_OF
  weight  -- 0..1, used when two lines both claim an approval (§13.3)
  valid_from, valid_to
```

A Senior Member with two juniors is simply a position node with two children. No role change, no fake promotion. `role.may_hold_reports` gates whether the UI offers it (`MEMBER` = false by default, `SENIOR_MEMBER` = true, and an Institution Head can flip either).

### 4.3 Reach: the closure table

Transitive "who is under me" must be one indexed query, not recursion per request.

```
position_closure                 -- maintained by trigger on position writes
  ancestor_id, descendant_id, depth, session_id
  PRIMARY KEY (ancestor_id, descendant_id, session_id)
```

- Depth 1 = direct reports; depth ≥ 1 = full downline.
- `org_unit` keeps a Postgres `ltree` path in parallel, so unit-based scopes (`ORG_UNIT_SUBTREE`) are equally cheap.
- Rebuilt incrementally on move (delete old ancestor pairs for the moved sub-tree, insert new ones) inside one transaction; a nightly consistency job re-verifies and alerts on drift.
- Cycle prevention: before a move, assert the new parent is not in the moved node's own descendant set → `HIERARCHY_CYCLE`.

### 4.4 Scopes, redefined around the tree

```
enum Scope {
  SELF,                 // just me
  DIRECT_REPORTS,       // closure depth = 1
  DOWNLINE,             // closure depth >= 1  — any depth, the workhorse
  DOWNLINE_LIMITED,     // closure depth <= n  (n stored with the grant)
  TEAM,                 // cohorts/teams I lead + subjects I teach
  ORG_UNIT,             // my unit
  ORG_UNIT_SUBTREE,     // my unit + descendants  (Department Head reach)
  COHORT,               // one named class/team (temporary invigilator, stand-in)
  CUSTOM_SET,           // explicit user list
  TENANT                // everyone
}
```

`DOWNLINE` is what makes deep chains work: a Manager four levels above still reaches everyone beneath, without anyone enumerating the levels. `DOWNLINE_LIMITED(1)` is how you give a Senior Member reach over only their own two juniors and no further.

### 4.5 Capability-seeking escalation — the key mechanic

The rule that stops requests dead-ending when the immediate supervisor lacks the power:

```
resolveApprover(request, rule):
  1. start at the requester's position
  2. walk up primary reports_to, step by step, up to settings.max_escalation_hops (default 6)
  3. at each ancestor, test: effective(capability) AND inScope(scope, requester) AND ancestor is active
  4. first match wins → that person is the approver; every skipped node is recorded
     in approval_step.skipped_via[] with the reason (NO_CAPABILITY | INACTIVE | ON_LEAVE | IS_REQUESTER)
  5. no match within the hop limit → route to the role named in
     approval_flow.fallback (default: the rank-2 administrative officer for that domain)
  6. still nothing → park as NEEDS_ROUTING on the Head's desk with a red banner;
     never silently dropped, never auto-approved
```

Approval rules available to the flow builder:

| Rule | Resolves to |
|---|---|
| `PRIMARY_SUPERVISOR` | immediate `reports_to`, **only** if they hold the capability |
| `NEAREST_CAPABLE_SUPERVISOR` | the walk-up above — the sane default |
| `CLASS_COORDINATOR_OF_REQUESTER` | primary leader of the requester's class |
| `SUBJECT_FACULTY` | the faculty for a named subject |
| `ORG_UNIT_HEAD` | `head_user_id` of the requester's unit, else nearest ancestor unit's head |
| `ROLE` | anyone holding a named role (queue, first to act wins) |
| `SPECIFIC_USER` | a named person (with a mandatory stand-in) |
| `PROJECT_MANAGER` | via `position_link(kind=PROJECT_MANAGER)` |
| `ALL_OF` / `ANY_OF` | parallel steps — all must approve, or any one |
| `SKIP_IF_SAME_PERSON` | modifier: collapse a step when it resolves to the requester |

Escalation on inaction is separate and additive: `escalateAfterHours: 48 → onEscalate: NEXT_CAPABLE_ANCESTOR | ROLE | NOTIFY_ONLY`.

### 4.6 Delegation across an irregular tree

`GrantService.assign()` enforces, in order:

1. **Reach rule.** The target must be in the actor's `DOWNLINE`, or in their `ORG_UNIT_SUBTREE`, or in an explicit `CUSTOM_SET` the actor was given. Not in reach → `SCOPE_VIOLATION` (404 if the actor cannot even see the person, so ids don't leak).
2. **Rank ceiling.** `target.maxRank ≥ actor.rank` — you may grant to equals **only if they are in your downline** (this is what legitimises Senior Member → Member), never upward. Peer grants outside the downline require `iam.grant.assign_peer`, off by default.
3. **Subset rule.** `granted ⊆ { c ∈ actor.effective : grant[c].can_delegate }`.
4. **Scope-narrowing rule.** `granted.scope ⊆ min(actor.grant[c].delegable_scope_max, actor.grant[c].scope)`. A Department Head with `ORG_UNIT_SUBTREE` may hand a Class Coordinator `TEAM`, never `TENANT`.
5. **Chain rule.** `can_delegate` passes on only if the actor's own grant allows it; total depth capped by `settings.max_delegation_depth` (default 3).
6. **Preset floor.** `capability.minRank` blocks absurdities (a Student holding `payroll.run.execute`). An Institution Head may override with typed confirmation, audited as `POLICY_OVERRIDE`.
7. **Revocation cascade.** Revoking marks every downstream grant of that capability `INHERITED_REVOKED` and recomputes effective sets in a background job. The UI shows the impact list ("affects 14 people") **before** committing.
8. **Visibility rule.** Powers the actor does not hold are absent from the grant UI, not merely disabled — unless `settings.show_ungrantable_powers = true`, which shows them greyed as "not available to you" so the ceiling is legible.
9. **Self-protection.** Nobody revokes their own `iam.*`; the last rank-1 holder cannot be archived or demoted.

---

## 5. The permission model — countable powers

### 5.1 Five sieves

An action is allowed only if it survives all five.

```
L1  PLATFORM PLAN     is this module in the tenant's plan?              (Platform Operator)
L2  TENANT FLAGS      did the Head switch the module/feature on?        (Head / Deputy)
L3  ROLE PRESET       does the person's role bundle include it?         (Head, delegated)
L4  PERSON OVERRIDE   was it granted or revoked for this individual?    (Head, HR, Registrar, delegated)
L5  REACH + POLICY    is the target inside their reach (§4.4), and does
                      the module's own policy allow it right now?       (module config)
```

```
effective(cap) = enabled(cap)
                 AND ( override[cap] == GRANT
                       OR (roleBundleHas(cap) AND override[cap] != REVOKE) )

allowed(cap, target) = effective(cap) AND inReach(scopeOf(cap), target) AND policyOk(cap, target)
```

`REVOKE` on a person always beats any role grant — that is "the Head can take one power away from one individual".

### 5.2 Powers are countable and grouped

**132 capabilities across 21 modules** ([Appendix A](#appendix-a--capability-catalogue)), presented as **Power Packs** so nobody ticks 132 boxes. Each capability carries metadata:

```java
LEAVE_REQUEST_APPROVE("leave.request.approve", Module.LEAVE,
    /*defaultScope*/ Scope.DOWNLINE, /*minRank*/ 5, /*delegableByDefault*/ true,
    /*dangerous*/ false, "Approve or reject leave"),
ATTENDANCE_SELF_MARK("attendance.self.mark", Module.ATTENDANCE,
    Scope.SELF, 6, false, false, "Mark own attendance"),
PAYROLL_SALARY_READ("payroll.salary.read", Module.PAYROLL,
    Scope.TENANT, 2, false, /*dangerous*/ true, "See salary figures"),
```

`minRank 5` on leave approval is deliberate: a Senior Member *may* hold it. `dangerous` powers demand typed confirmation and notify the Head.

### 5.3 Power presets per pack

Each role in each pack ships a preset — the starting bundle, editable per tenant, versioned so a preset change can optionally be replayed onto existing holders ("apply to all 40 Class Coordinators?" with an impact list).

| Role | Preset headline | Powers |
|---|---:|---|
| Institution Head / Managing Director | everything | 132 |
| Deputy Head / Operations Director | everything but platform + salary writes | 118 |
| Registrar | records, enrolment, timetable, sessions | 41 |
| Examination Officer | exams, results, revaluation | 19 |
| Accounts Officer | fees, invoices, waivers | 14 |
| Head of People | hiring, leave policy, attendance policy, documents, onboarding | 47 |
| Finance Controller | payroll, expenses, reimbursements | 22 |
| IT Administrator | accounts, integrations, API keys, devices | 16 |
| Department Head / Manager | approvals, oversight, moderation, delegation | 38 |
| Programme Coordinator | timetable + reporting within programme | 17 |
| Class Coordinator | attendance, class leave, guardian contact, conduct | 21 |
| Faculty | subject attendance, assignments, marks | 18 |
| Team Lead | attendance, leave, timesheets, task assignment | 24 |
| Senior Member | mentoring, timesheet review, own downline visibility | 11 |
| Student / Member | self-service only | 9 |
| Guardian | ward visibility (per-link toggles) | 6 |

### 5.4 Two roles, one person

Powers union. Scope per capability = widest of the role grants, then narrowed by position reach, then narrowed again by any person-level override. Example: a Faculty member who is also acting HOD gets `marks.entry.write @ TEAM` from Faculty and `@ ORG_UNIT_SUBTREE` from the acting role — effective `ORG_UNIT_SUBTREE`, but only while the acting assignment's `valid_to` holds, and if the Head has revoked `marks.publish` from him personally, that stays revoked.

### 5.5 Worked scenarios

**W1 — Self-marking turned off for one class.** The Head sets `attendance.policy.self_marking = OFF` for `BCA-Y1-B`. L2 blocks `attendance.self.mark` for its students: the button disappears, `POST /attendance/self` returns `403 CAPABILITY_DISABLED_BY_POLICY`, and the explain panel reads *"Self check-in is off for your class — set by the Principal on 12 Jul. Your Class Coordinator marks attendance."* Faculty proxy marking is untouched. Nothing retroactive.

**W2 — Department Head lends read-only marks to a Class Coordinator.** He holds `marks.entry.write @ ORG_UNIT_SUBTREE (delegable, max scope TEAM)` and `marks.report.read @ ORG_UNIT_SUBTREE`. He grants her `marks.report.read @ TEAM` only. She now sees the Marks nav item, opens her class's sheet read-only, sees nobody else's class, and cannot pass it on.

**W3 — HR restricts which leave types a person may pick.** `leave_type.visibility` supports `ALL | ROLE_IN | UNIT_IN | COHORT_IN | USER_IN | GENDER_IN | AFTER_TENURE_DAYS(n) | RANK_AT_MOST(n)`. Maternity = `GENDER_IN[F] + AFTER_TENURE_DAYS(180)`; Comp-off = `ROLE_IN[MEMBER, SENIOR_MEMBER, TEAM_LEAD]`; Sabbatical = `USER_IN[…]`. `GET /leave/types/available` returns only permitted types with live balances; the POST re-validates → `422 LEAVE_TYPE_NOT_AVAILABLE`.

**W4 — A member reports to a Senior Member who cannot approve leave.** `NEAREST_CAPABLE_SUPERVISOR` walks up: Senior Member (no `leave.request.approve` → skipped, recorded), Team Lead (holds it, requester in `DOWNLINE` → approver). The member's timeline shows *"Pending with Team Lead — your mentor cannot approve leave"*; the Senior Member sees it as **FYI, not actionable**. If the Manager later grants the Senior Member the power scoped `DOWNLINE_LIMITED(1)`, the next request stops one hop earlier automatically.

**W5 — Head grants one extra power to one Team Lead.** Priya gets a person-level `GRANT` of `timetable.slot.manage @ TEAM`, reason *"exam week"*, `expires_at` in 10 days. Her chip reads `Team Lead + 1`. The other 40 leads are unaffected; a nightly job expires it and notifies both parties.

**W6 — Five-deep chain in an office.** MD → Operations Director → Manager (Engineering) → Team Lead (Platform) → Senior Member → 2 Members. The Manager's `DOWNLINE` reach covers all of them in one query. A leave request from a Member routes Senior Member (skipped) → Team Lead (approves). A policy change by the Manager reaches everyone below without listing levels. The MD's dashboard rolls up by unit, not by depth.

---

## 6. Tenancy, routing and the portal shell

### 6.1 Addressing (the tenant chooses)

- **Path context:** `myappdomain.com/{slug}` → `myappdomain.com/greenwood` (default, no DNS work)
- **Subdomain:** `{slug}.myappdomain.com` (opt-in; wildcard DNS + TLS)
- **Custom domain:** `portal.greenwood.edu` (Phase 7; CNAME + ACME automation)

Reserved slugs: `api admin app www static assets auth login health docs status super platform cdn mail`. Rules: `^[a-z][a-z0-9-]{2,31}$`, no leading/trailing/double hyphen, case-insensitive uniqueness, 24 h reservation during onboarding.

### 6.2 Request → tenant → person

```
1. Next.js middleware: host + first path segment → tenantSlug → rewrite
   /greenwood/attendance → /_portal/attendance   (slug in header + cookie)
2. Every API call: X-Tenant-Slug + JWT (carries tid, uid, gv = grant version)
3. Spring filter chain:
   TenantResolutionFilter  slug → tenant (60 s cache); 404 unknown, 423 suspended
   JwtAuthFilter           validate; assert jwt.tid == tenant.id else 401 TENANT_MISMATCH
   TenantContextFilter     bind context, enable Hibernate filter, set Postgres app.tenant_id for RLS
   PermissionInterceptor   load effective powers + reach (Redis, keyed by gv)
```

Cookies are namespaced per slug (`sess_greenwood`), so two portals stay open in two tabs.

### 6.3 Isolation strategy — one property

| Mode | How | When |
|---|---|---|
| `SHARED_SCHEMA` (default) | `tenant_id` + Hibernate `@Filter` + RLS | PoC and most tenants |
| `SCHEMA_PER_TENANT` | `MultiTenantConnectionProvider` switching `search_path` | enterprise separation |
| `DB_PER_TENANT` | routing DataSource | regulated / on-prem |

`erp.tenancy.strategy=shared_schema|schema|database`. Repositories never change.

### 6.4 What a tenant carries

```
tenant
  id, slug, name, legal_name
  pack (INSTITUTION | ORGANISATION | HYBRID | CUSTOM)
  status (PROVISIONING | ACTIVE | SUSPENDED | READ_ONLY | ARCHIVED)
  addressing (PATH | SUBDOMAIN | CUSTOM_DOMAIN), custom_domain
  timezone, locale, currency, week_start, fiscal_year_start, date_format
  plan_id, seat_limit, storage_limit_mb, feature_overrides jsonb
  branding jsonb, vocabulary jsonb          -- per-tenant retitling on top of the pack
  isolation_mode, data_region
  created_by, activated_at, trial_ends_at
```

---

## 7. Domain model

### 7.1 Core

```
user            id, tenant_id, code (roll/employee no), email?, phone?, first_name, last_name,
                display_name, gender?, dob?, photo_key?, status (INVITED|ACTIVE|SUSPENDED|ARCHIVED),
                joined_on, left_on?, password_hash (argon2id), mfa_secret?, last_login_at,
                failed_attempts, locked_until, custom_fields jsonb
                UNIQUE (tenant_id, lower(email)) WHERE status <> 'ARCHIVED'; UNIQUE (tenant_id, code)
user_role       user_id, role_id, valid_from, valid_to, is_acting, assigned_by
role            §3.4
role_grant      role_id, capability, scope, scope_depth?, can_delegate, delegable_scope_max
user_grant      user_id, capability, mode (GRANT|REVOKE), scope, scope_depth?, can_delegate,
                granted_by, reason, expires_at, source (MANUAL|IMPORT|PRESET|SYSTEM)
position        §4.2      position_link   §4.2      position_closure   §4.3
org_unit        id, tenant_id, parent_id, kind (FACULTY|DEPARTMENT|PROGRAMME|DIVISION|TEAM|BRANCH|CUSTOM),
                name, code, head_user_id?, path ltree, sort_order
cohort          id, tenant_id, org_unit_id, session_id, kind (CLASS|SECTION|BATCH|SQUAD),
                name, year?, semester?, capacity?, primary_leader_user_id?
subject         id, tenant_id, code, name, credits?, kind (THEORY|LAB|ELECTIVE|PROJECT|SKILL)
cohort_subject  cohort_id, subject_id, session_id, hours_per_week, is_elective
enrolment       user_id, cohort_id, subject_id?, session_id, status (ENROLLED|DROPPED|COMPLETED)
teaching        user_id, subject_id, cohort_id, session_id, is_primary, valid_from, valid_to
session         id, tenant_id, name ("2026-27"), starts_on, ends_on, is_current
term            id, session_id, name ("Sem 3" / "Q2"), starts_on, ends_on
holiday_calendar id, tenant_id, name, applies_to (TENANT|UNIT|COHORT), rules jsonb
approval_flow   id, tenant_id, domain, config jsonb (§4.5)
audit_event     id, tenant_id, actor_id, on_behalf_of?, action, entity, entity_id,
                before jsonb, after jsonb, ip, ua, request_id, at
file_object     id, tenant_id, key, filename, mime, bytes, sha256, uploaded_by, scan_state,
                owner_entity, owner_id, visibility
setting         tenant_id, namespace, key, value jsonb, updated_by, updated_at
notification    id, tenant_id, user_id, channel, template, payload, state, sent_at, read_at
```

The many-to-many the brief asks for — **person ↔ subject ↔ class(year, semester)** — is `enrolment` for students and `teaching` for faculty, both keyed by `session_id` so 2025-26 never mixes with 2026-27. Many faculty ↔ many students falls out of `teaching(subject, cohort)`: every teacher of that subject to that class reaches those students, and nobody else does.

### 7.2 Relationship sketch

```
tenant ─┬─< user ─┬─< user_role >── role ──< role_grant
        │         ├─< user_grant
        │         ├─< position ──< position_closure        (arbitrary depth, §4)
        │         ├─< position_link                        (dotted lines)
        │         ├─< enrolment >── cohort ──< cohort_subject >── subject
        │         ├─< teaching  >──┘
        │         └─< attendance_record, leave_request, submission, timesheet_entry, …
        ├─< org_unit (ltree tree)
        ├─< session ──< term
        └─< setting, approval_flow, audit_event, file_object, notification
```

---

## 8. Module catalogue

Each module declares **entities · powers · screens · rules · edge cases**, is switchable per plan and per tenant, and reads its vocabulary from the pack.

### 8.1 Identity & Provisioning (shared)

**Screens:** People list (filter by role, unit, class/team, status, power, *depth in tree*), Create-person wizard, Person detail with **Powers** tab and **Position** tab, Roles & Powers matrix, Org chart builder (drag to re-parent), Bulk import, Invitation tracker, Reassignment wizard.

**Create-person wizard (5 steps)**
1. **Identity** — name, code (auto-next roll/employee number), email/phone, photo
2. **Placement** — role(s); **reports to** (searchable, defaults to the creator; validated against `may_hold_reports` and cycles); org unit; class/team; live preview of the resulting chain
3. **Vertical extras** — *Institution:* year, semester, subjects (multi), guardian links. *Organisation:* designation, shift, cost centre, joining date, probation end
4. **Powers** — role preset pre-ticked, plus only the packs the creator may delegate; live counter (`Team Lead · 24 of 132`); scope selector per power (including `DOWNLINE_LIMITED` depth); optional `expires_at`
5. **Access** — invite by email/SMS/link, temporary password, force MFA, welcome note

**Rules:** the creator's reach and rank cap everything (§4.6); a seat is consumed (over limit → block with upgrade prompt); invites expire in 7 days, resend ≤ 3/hour, single-use.

### 8.2 Attendance (shared — the flagship configurable module)

```
attendance_policy    scope (TENANT|UNIT|COHORT|ROLE|USER), precedence,
                     self_marking (ON|OFF|WINDOW_ONLY), window_start, window_end, grace_minutes,
                     methods jsonb (SELF_BUTTON|QR|GEO|BIOMETRIC_IMPORT|CODE|BLE),
                     geofence {lat,lng,radius_m}, allowed_ips cidr[], require_photo,
                     allow_backdate_days, lock_after_days, min_percent_required,
                     half_day_rules, session_mode (DAY|PERIOD|SHIFT)
attendance_session   id, cohort_id?, subject_id?, marker_id?, date, period?, shift?,
                     state (OPEN|SUBMITTED|LOCKED|AMENDED)
attendance_record    session_id, user_id, status (PRESENT|ABSENT|LATE|HALF_DAY|EXCUSED|LEAVE|
                     HOLIDAY|ON_DUTY), marked_by, method, marked_at, device_hash, geo, note,
                     amended_by?, amended_at?, previous_status?
regularisation       user_id, date, reason, evidence_file?, state, decided_by, decided_at
```

Policy precedence `USER > COHORT > ROLE > UNIT > TENANT`, with an **explain payload** so anyone can see *why* they can or cannot mark.

**Behaviours:** self-mark once per session inside the window (geofence rejects accuracy > 100 m; optional selfie, hashed) · proxy marking by anyone with `attendance.other.mark` in reach — keyboard grid (P/A/L), mark-all-present then flip exceptions, autosave, offline queue · toggle-off removes the button immediately (SSE flag push + API guard), existing records stand · locking after `lock_after_days`, amendments keep `previous_status` and write audit · approved leave auto-writes `LEAVE`, holidays write `HOLIDAY`, neither editable by faculty · reports: register, monthly %, defaulters below `min_percent_required`, subject shortfall, biometric-vs-manual variance, late trend, muster roll.

**Edge cases:** double marking (idempotency + unique `(session_id, user_id)`) · faculty marks then student self-marks (`ALREADY_MARKED_BY_STAFF`) · DST and timezone shifts (windows in tenant tz) · night shift spanning midnight (attributed to shift start date) · mid-month enrolment (only dates ≥ `valid_from`) · a student in two classes (period attendance keyed by subject, day attendance by primary class) · network loss in class (IndexedDB queue, replayed with original `marked_at`, flagged `DELAYED_SYNC`) · skewed device clock (server time authoritative, client time kept for forensics) · half-day plus leave same date (leave wins, `HALF_DAY_LEAVE`) · holiday declared after marking (job rewrites to `HOLIDAY`, prior values in audit, markers notified).

### 8.3 Leave & Absence (shared)

```
leave_type      code, label, unit (DAY|HALF_DAY|HOUR), paid, accrual (NONE|MONTHLY|YEARLY|ON_JOIN),
                accrual_rate, max_balance, carry_forward_max, encashable, min_notice_days,
                max_consecutive, requires_evidence, visibility jsonb (§5.5 W3), sandwich_rule,
                allow_negative_balance, blackout_dates, applies_to_pack, color
leave_balance   user_id, leave_type_id, session_id, opening, accrued, used, pending, adjusted, closing
leave_request   user_id, leave_type_id, from_date, to_date, part_day?, days_computed, reason,
                evidence_file?, state (DRAFT|SUBMITTED|IN_REVIEW|APPROVED|REJECTED|CANCELLED|
                WITHDRAWN|NEEDS_ROUTING), current_step, applied_at, decided_at
approval_step   request_id, step_no, approver_user_id?, approver_rule jsonb, state, comment,
                acted_at, skipped_via jsonb[], escalated_from?, delegated_from?
```

Chains are configuration (§4.5). Institution default for a student: `NEAREST_CAPABLE_SUPERVISOR` (usually the Class Coordinator) → `ORG_UNIT_HEAD` when `days > 3` → `ROLE[REGISTRAR]` when `days > 15 || overlapsExams`. Organisation default: `NEAREST_CAPABLE_SUPERVISOR` → `ORG_UNIT_HEAD` when `days > 5` → `ROLE[HEAD_OF_PEOPLE]` when `days > 15 || unpaid`.

**Edge cases:** requester is the approver (step collapses, logged) · approver away (their stand-in, else next capable ancestor) · overlapping requests · sandwich rule on Fri+Mon · retroactive leave after attendance locked (needs `attendance.other.amend`, generates amendment) · balance turns negative between apply and approve (re-checked at approval) · cancellation before start (restore balance and attendance) or mid-leave (pro-rate) · leave crossing session boundary (split, balances per session) · a leave type hidden while a request is pending (request continues; type vanishes for new ones) · company holiday declared over approved leave (refund, notify).

### 8.4 Assignments — submission & tracking (Institution)

```
assignment_task    subject_id, cohort_ids[], created_by, title, brief_md, attachments[],
                   type (INDIVIDUAL|GROUP|PROJECT|QUIZ_UPLOAD), max_marks, weightage, rubric_id?,
                   published_at?, due_at, tz, late_policy (BLOCK|ALLOW_FLAGGED|PENALTY_PER_DAY),
                   penalty_percent_per_day, grace_minutes, max_attempts, allowed_file_types[],
                   max_file_mb, plagiarism_check, peer_review, visibility, state
submission         task_id, user_id, group_id?, attempt_no, files[], text_body?, link?,
                   submitted_at, is_late, late_days, state (NOT_STARTED|DRAFT|SUBMITTED|RESUBMITTED|
                   GRADED|RETURNED_FOR_REVISION|EXCUSED|MISSING), plagiarism_score?, due_override?
grade              submission_id, marks, rubric_scores jsonb, grade_letter?, feedback_md,
                   feedback_files[], graded_by, graded_at, moderated_by?, published_at?
rubric             criteria[{name, weight, levels[{label, points, descriptor}]}]
group              task_id, name, members[], leader_user_id
extension_request  submission_id, user_id, requested_until, reason, state, decided_by
```

**Flows** — *author:* Faculty drafts, attaches, picks only classes they teach, sets due date in tenant tz, rubric, publish (scheduled publish supported) · *submit:* student uploads (resumable, virus-scanned), saves drafts, resubmits until due if attempts allow, sees a countdown · *grade:* inbox filtered `ungraded / late / missing / flagged`, rubric grid, inline PDF preview, batch feedback, return for revision, publish · *track:* per-task completion bar, per-student history, class heatmap, defaulters, on-time trend, faculty workload, HOD roll-up.

**Edge cases:** submission at the exact due second (server clock, `<= due_at + grace`) · tab closed mid-upload (resumable; orphan parts GC'd in 24 h) · oversize/wrong-type/zero-byte files (precise messages) · identical file hash across students (`POSSIBLE_DUPLICATE` flag) · group member drops the course (submission stands, member marked withdrawn) · student unenrolled after submitting (retained, excluded from live stats) · faculty leaves (tasks transferred by the reassignment wizard, `created_by` preserved) · classes merged after publication (submissions follow students) · grading after publish (needs `assignment.submission.reopen`, students notified, old grade kept) · plagiarism service down (accepted, score `PENDING`, retried) · extension for one student (`due_override`, not a task edit) · marks scale changed after grading (blocked, re-moderation required) · student submitting from another timezone (deadlines in tenant tz with a local-time hint).

### 8.5 Marks, gradebook & report cards (Institution)

`assessment (QUIZ|MIDTERM|FINAL|PRACTICAL|INTERNAL|PROJECT), mark_entry, grade_scale, weighting_scheme, report_card, result_publication, moderation_log, revaluation_request`.
Internal + external weightage per subject; absolute or relative scales per programme; moderation window before publish; PDF report cards including attendance % and remarks; supplementary attempts with `best_of`; publication is explicit, audited, reversible within 24 h.
**Edge cases:** marks > max (blocked) · absent (`AB`) distinct from zero · subject dropped mid-term · grace marks in a separate audited field · rank ties (shared rank, next skipped, configurable) · incomplete exam set (`PROVISIONAL` card) · revaluation after publication (new card version, both retained).

### 8.6 Timetable & scheduling (Institution)

`period_template, timetable_slot, room, substitution, faculty_load, timetable_version`.
Clash detection on faculty, room and class; per-day and per-week load caps; lab blocks as multi-period atoms; substitution suggests free, qualified faculty; publishing generates attendance sessions.
**Edge cases:** substitution creating a new clash · slot subject not in `cohort_subject` (warn) · exam-day and half-day overlays · recurring vs one-off changes · slot edited after attendance was marked (retained, flagged `SLOT_CHANGED`).

### 8.7 Fees & invoices (Institution)

`fee_head, fee_structure, invoice, invoice_line, payment, waiver, discount, fine, refund, gateway_txn, receipt`.
Instalments, late fines with grace, sibling/staff-ward concessions, scholarship waivers with approval, partial payments, reconciliation, configurable dues blocking (report card / hall ticket / library — **never** attendance).
**Edge cases:** webhook delivered twice (idempotent by txn id) · payment succeeded, callback lost (reconciliation job) · refund after session close · structure edited after issue (future invoices only; existing need explicit re-issue) · student leaves mid-year (pro-rata + refund flow).

### 8.8 Exams & seating (Institution)

`exam, exam_schedule, hall, seat_plan, invigilation_duty, hall_ticket, script_tracking`.
Seating avoids same-subject neighbours; invigilator rotation avoids own subject and own class; hall tickets optionally gated on dues and attendance %.
**Edge cases:** shared-elective clash across programmes · hall lost after publication (re-plan with a diff view and targeted notices) · debarred student (blocked at hall-ticket issue, with reason).

### 8.9 Guardian portal (Institution)

`guardian_link (student_id, guardian_id, relation, is_primary, can_view_marks, can_view_attendance, can_approve_leave, can_pay_fees, can_contact_staff)`.
Read-only by default; per-link toggles. One guardian ↔ many wards; one ward ↔ many guardians.
**Edge cases:** separated parents with different visibility (per-link flags, never shared credentials) · a guardian who is also staff (one account, two roles, context switcher) · guardian of a graduated student (access ends at `left_on + grace_days`) · guardian requesting leave for a ward (only if `can_approve_leave` and the module flag are both on).

### 8.10 Library, assets, notices, hostel, transport (Institution)

`library_item, copy, issue, reservation, fine` · `asset, asset_issue, maintenance_log` · `notice, notice_target, acknowledgement` · `hostel_room, resident, gate_pass, night_rollcall` · `route, stop, boarding_record`.
**Edge cases:** issue limits by role · overdue blocks new issues · lost-item replacement · a notice targeted at a class someone joins later (visible from join date unless `backfill=true`) · mandatory-notice acknowledgement tracking · gate pass overlapping class hours (warn the Class Coordinator).

### 8.11 Attendance/shifts, leave, payroll (Organisation)

Attendance and Leave are the same modules with organisation defaults, plus `shift, roster, shift_swap_request, overtime_record, biometric_import_batch` and `salary_structure, salary_component, payroll_run, payslip, loan, advance, reimbursement, tax_declaration, statutory_report`.
Salary is read-restricted: `payroll.salary.read` is dangerous, fields encrypted at rest, masked in lists. Notably **no** `DOWNLINE`-scoped payslip power exists — a manager cannot be handed reports' salaries by scope alone.
**Edge cases:** payroll run with unapproved attendance (blocked with a checklist) · mid-month joiner/leaver pro-ration · retro revision (arrears line) · re-run after finalisation (reversal + new run, both retained) · shift swap crossing a pay period.

### 8.12 Projects, timesheets, performance, hiring, expenses, documents (Organisation)

`project, milestone, task, task_assignment, timesheet_entry, timesheet_period` · `review_cycle, goal, kpi, self_review, manager_review, peer_review, calibration` · `job_requisition, candidate, application, interview, feedback, offer, onboarding_checklist` · `expense_policy, expense_claim, claim_line, receipt, reimbursement_batch` · `document, document_version, policy_acknowledgement, share_rule`.
**Edge cases:** timesheet week overlapping approved leave (leave hours auto-filled, locked) · review cycle where the manager changed mid-cycle (both contribute, weighted by tenure) · an internal candidate (visibility hidden from their current manager if configured) · foreign-currency claim (rate snapshot at submission) · duplicate receipt by hash.

### 8.13 Platform console (Platform Operator)

`tenant, plan, plan_feature, subscription, impersonation_session, platform_audit, announcement, feature_flag, usage_metric, job_run, error_report`.
**Edge cases:** suspending a tenant mid-session (read-only banner, then logout on next write) · tenant deletion (30-day window, export bundle, purge certificate) · an import that would exceed the seat limit (whole batch rejected, never partial).

### 8.14 Inventory & Billing (Retail / Shops) — NEW

**Core Entities**

```
product                id, tenant_id, sku, barcode, name, description, category, 
                       unit_price, cost_price, reorder_level, shelf_life_days, status
inventory_stock        product_id, location_id, quantity_on_hand, reserved, available,
                       last_recount_at, recount_variance, session_id
stock_movement         id, product_id, location_id, type (PURCHASE|SALE|RETURN|ADJUSTMENT|
                       DAMAGE|TRANSFER), quantity, reason, reference_doc, created_by, 
                       moved_at, movement_batch_id, settled
billing_transaction    id, cashier_user_id, location_id, bill_no, bill_date, amount,
                       payment_method (CASH|CARD|UPI|CHEQUE|CREDIT), state (DRAFT|COMPLETED|
                       VOIDED|REFUNDED), customer_id?, created_at
bill_line              transaction_id, line_no, product_id, quantity_sold, unit_price, 
                       discount_percent, amount, movement_id  -- links to stock_movement for tracking
stock_transfer         id, from_location_id, to_location_id, created_by, approved_by?,
                       state (DRAFT|APPROVED|REJECTED|IN_TRANSIT|RECEIVED), transfer_date,
                       transfer_lines[{product_id, quantity, received_qty?}]
```

**Permission Model — Fine-Grained per Role & Individual**

The five-sieve model applies strictly:
- **L1 PLAN:** Is inventory module enabled for this tenant's plan?
- **L2 TENANT FLAGS:** Can this location do billing? Can stock adjustments be made?
- **L3 ROLE PRESET:** Does the role bundle include `billing.transaction.create` or `inventory.stock.adjust`?
- **L4 PERSON OVERRIDE:** Was `billing.transaction.create` explicitly granted or revoked for this user?
- **L5 REACH + POLICY:** Can this user see/write to this location? Is there a daily transaction limit?

**Powers Catalogue — Inventory & Billing (21 capabilities)**

```
inventory.product.*         TENANT 1  (create, read, update, delete products)
inventory.stock.read        LOCATION  (view stock levels per location)
inventory.stock.adjust      LOCATION  2  (write-off, damage, expiry)
inventory.transfer.*        TENANT    (inter-location transfers, approval)
inventory.recount           LOCATION  (periodic physical count, variance logging)

billing.transaction.create  LOCATION  2  (create & complete bills)  ⚠ gated capability
billing.transaction.void    LOCATION  1  (void completed bills, needs approval if > limit)
billing.transaction.refund  LOCATION  2  (issue refunds, logs reason)
billing.discount.apply      LOCATION  3  (apply discounts on the fly)
billing.transaction.read    LOCATION  (view bills, own and others)

inventory.report.sales      LOCATION  (sales summary, product mix, trend)
inventory.report.stock      LOCATION  (stock levels, aging, fast/slow movers)
inventory.supplier.*        TENANT    (manage reorder, PO, supplier ledger)
inventory.barcode.scan      LOCATION  (mark stock via barcode/QR in billing flow)
```

**Capabilities & Delegation Rules**

- **`billing.transaction.create`** is **gated**: a shop worker gets this only if the admin grants it.
  - Once granted, they can create bills in their assigned location(s).
  - The UI shows "Billing" tab only if `effective('billing.transaction.create')` is true.
  - A Team Lead (manager) can delegate `billing.transaction.create` to Team Members **if they hold it themselves** (§4.6 subset rule).

- **`inventory.stock.adjust`** requires **reach**: the user must be able to see the location. A district manager holding `DOWNLINE` reach can adjust stock in any branch under them; a branch manager cannot adjust outside their own unit.

- **`billing.transaction.void`** is rank-gated: only Manager and above by default (configurable per tenant). Grantable to lower ranks only with written override (`POLICY_OVERRIDE` audited).

**Billing & Stock Tracking Flow**

```
1. Cashier scans product (barcode/QR) or searches
   - UI checks effective('billing.transaction.create') + location in reach → display price & stock
   - If stock = 0 → "Out of stock" warning; can still add (backorder flag)

2. Add to bill (qty, unit price [changeable if effective('billing.discount.apply')], discount %)
   - Live total, GST calculation (configurable per region)
   - Customer info optional (for loyalty program)

3. Payment method selected
   - CASH: count in register
   - CARD/UPI: gateway integration
   - CHEQUE: reference, post-dated if configured
   - CREDIT: only if customer has credit limit (invoice_ledger link)

4. Complete Bill
   - Bill gets unique number (date + seq, or custom format per tenant)
   - Stock moves: quantity_sold + tax = 1 stock_movement per line
   - Movement linked to bill_line for traceability
   - Audit writes: who, when, amount, payment method, location

5. For Returns:
   - Refund option: qty × unit_price, reason logged, stock_movement RETURN issued
   - If > refund_limit: needs manager approval (rule chain §4.5)

6. Void/Cancel (before payment):
   - Cancels stock_movements (quantity += moved qty)
   - Audit log: reason, voided_by, timestamp
```

**Excel & Reporting — Sold Items Tracking**

The system exports daily/weekly to Excel (configurable frequency):

```
Sheet: Transactions (Daily)
  Bill No | Date | Cashier | Location | Amount | Payment | Status | Voided?

Sheet: Sales Detail (Line-level)
  Bill No | Product | Category | Qty Sold | Unit Price | Discount % | Amount | Timestamp

Sheet: Stock Movement
  Date | Product | SKU | Location | Type (SALE|RETURN|ADJUSTMENT) | Qty | Reference | By Whom | Timestamp

Sheet: Inventory Status
  Product | SKU | Location | Qty On Hand | Reserved | Available | Last Count | Variance
```

**Admin-Configurable Features** (can be turned on/off per store)

Each feature below can be enabled or disabled by the admin in **Settings → Inventory & Billing Features**. When disabled, the feature is hidden from the UI and cannot be used.

#### **Core Features** (usually always enabled)
1. **Basic Billing** — Create bills, collect payment (cash/card), print receipt. Always on.
2. **Stock Tracking** — See how many items you have, mark items sold. Always on.

#### **Scanning & Speed**
3. **📱 Barcode Scanning** ✅ 
   - **What:** Cashier scans product barcode instead of typing
   - **Why:** Faster, fewer mistakes, works on phone/tablet
   - **Cost:** Free; you need a barcode scanner (₹500-2000)
   - **On/Off:** Let staff scan, or require manual entry

#### **Alerts & Reminders**
4. **⚠️ Low Stock Warnings**
   - **What:** Alert when you're running out (e.g., "Milk: only 3 left")
   - **Why:** Never stock-out; reorder in time
   - **Who sees:** Store manager + owner
   - **Can turn off:** Yes (if you manage stock manually)

5. **📧 Daily Sales Recap**
   - **What:** Summary at 9 PM: "Today: ₹45,000 sales, 180 items sold, 2 refunds"
   - **Why:** Know how the day went without asking staff
   - **Gets:** Text or email summary
   - **Can turn off:** Yes

6. **🔔 Expiry Date Alerts** (for groceries/pharmacy)
   - **What:** Alert 3 days before milk/medicine expires
   - **Why:** Sell before expiry; don't waste money
   - **Can turn off:** Yes (if no perishables)

#### **Customer Features**
7. **👥 Loyalty Program**
   - **What:** Customers earn points per purchase; redeem for discounts
   - **Why:** Repeat customers spend more
   - **Example:** "₹100 spent = 10 points; 100 points = ₹100 off next time"
   - **Can turn off:** Yes (if you don't want loyalty tracking)

8. **💳 Buy on Credit**
   - **What:** Allow trusted customers to "owe you" (like a tab)
   - **Why:** Convenience for regulars; helps cash flow (if they pay later)
   - **Example:** "Arjun owes ₹5000; due next Friday"
   - **Safeguard:** Set credit limits per customer
   - **Can turn off:** Yes (cash-only mode)

9. **📱 Digital Receipt**
   - **What:** Send receipt via SMS/email/WhatsApp instead of printing
   - **Why:** Eco-friendly, customer keeps receipt easily, reduces paper
   - **Can turn off:** Yes (print-only)

#### **Inventory & Stock**
10. **📦 Inter-Store Transfers**
    - **What:** If store A is out of milk, transfer from store B
    - **Why:** Use network efficiently; never disappoint customer
    - **How:** Request → approve → delivered (tracked)
    - **Can turn off:** Yes (single-store; no transfers needed)

11. **🔄 Stock Reconciliation**
    - **What:** Periodic physical count (e.g., weekly) vs. system
    - **Why:** Catch theft, mistakes, or losses
    - **Variance:** If 10 missing, reason logged (damaged? stolen? miscounted?)
    - **Can turn off:** Yes (if you never recount)

12. **🗓️ Expiry Date Management**
    - **What:** Track when products expire; auto-remove at expiry
    - **Why:** For perishables (food, medicine), don't sell expired items
    - **Can turn off:** Yes (only if non-perishables)

#### **Staff Management**
13. **⭐ Staff Performance Tracking**
    - **What:** See each cashier's stats: transactions, speed, refund rate
    - **Why:** Identify top performers, spot issues early
    - **Info shown:** "Arjun: 120 bills/shift, 2 refunds" vs "Raj: 95 bills, 5 refunds"
    - **Can turn off:** Yes (privacy; only see totals)

14. **🎯 Cashier Bonus Tracker**
    - **What:** Set targets (e.g., "100 bills/day = ₹500 bonus") and track
    - **Why:** Motivate staff; increase sales
    - **Can turn off:** Yes (no bonuses)

#### **Data & Reports**
15. **📊 Daily Sales Report**
    - **What:** Every day: total ₹, units sold, top products, cash vs. card split
    - **Why:** Track business health; spot trends
    - **Format:** Email/SMS or view in app
    - **Can turn off:** Yes

16. **📈 Product Analytics**
    - **What:** Which products sell most, margins, profit per product
    - **Why:** Know what's profitable; phase out losers
    - **Example:** "Coffee: 25% margin. Juice: 8% margin → consider replacing"
    - **Can turn off:** Yes

17. **🔍 Customer Insights**
    - **What:** See patterns: "Mrs. Sharma buys every Friday" or "Arjun spends ₹500/week"
    - **Why:** Personalize service; offer relevant deals
    - **Can turn off:** Yes

#### **Smart Suggestions**
18. **💡 Reorder Suggestions**
    - **What:** System suggests "Order 50 Milk by Friday based on sales pace"
    - **Why:** Never stock-out; optimize order timing
    - **Can turn off:** Yes (manual ordering)

19. **🎁 Bundle Deal Ideas**
    - **What:** "Milk + bread combo sells 60% of the time → offer combo discount"
    - **Why:** Increase basket size; move slow items
    - **Can turn off:** Yes

20. **💰 Smart Pricing Hints**
    - **What:** "Chips not selling; try ₹5 off to clear stock"
    - **Why:** Maximize profit; clear slow-moving items
    - **Can turn off:** Yes

#### **Connectivity & Resilience**
21. **📵 Offline Billing**
    - **What:** If internet is down, cashier can still create bills; they sync when online
    - **Why:** Never stop sales because WiFi died
    - **Can turn off:** Yes (always-online mode)

22. **☁️ Auto Cloud Backup**
    - **What:** All bills automatically backed up to cloud every hour
    - **Why:** Never lose data if register crashes
    - **Can turn off:** No (security; always on)

#### **Admin Control Panel**

**Settings → Inventory & Billing Features**

```
┌─ CORE (always on)
├─ Basic Billing ............................ ✓ ON
├─ Stock Tracking ........................... ✓ ON
│
├─ SCANNING & SPEED
├─ Barcode Scanning ......................... ✓ ON  / OFF
│
├─ ALERTS & REMINDERS
├─ Low Stock Warnings ....................... ✓ ON  / OFF
├─ Daily Sales Recap ........................ ✓ ON  / OFF
├─ Expiry Date Alerts ....................... ✗ OFF / ON
│
├─ CUSTOMER FEATURES
├─ Loyalty Program .......................... ✓ ON  / OFF
├─ Buy on Credit ............................ ✓ ON  / OFF
│   ├─ Max credit limit per customer: ₹10000
│   └─ Payment due reminder: 3 days before due
├─ Digital Receipt .......................... ✓ ON  / OFF
│
├─ INVENTORY & STOCK
├─ Inter-Store Transfers ................... ✗ OFF / ON
├─ Stock Reconciliation ..................... ✓ ON  / OFF
├─ Expiry Date Management ................... ✓ ON  / OFF
│
├─ STAFF MANAGEMENT
├─ Staff Performance Tracking ............... ✓ ON  / OFF
├─ Cashier Bonus Tracker .................... ✗ OFF / ON
│   └─ Set bonus rule: "100 bills = ₹500"
│
├─ DATA & REPORTS
├─ Daily Sales Report ....................... ✓ ON  / OFF
├─ Product Analytics ........................ ✓ ON  / OFF
├─ Customer Insights ........................ ✗ OFF / ON
│
├─ SMART SUGGESTIONS
├─ Reorder Suggestions ...................... ✓ ON  / OFF
├─ Bundle Deal Ideas ........................ ✗ OFF / ON
├─ Smart Pricing Hints ...................... ✗ OFF / ON
│
└─ CONNECTIVITY
  ├─ Offline Billing ........................ ✓ ON  / OFF
  └─ Auto Cloud Backup ..................... ✓ ON (always)
```

---

**How Features Work Together** (examples)

| Scenario | Features Used |
|---|---|
| Morning, milk is low | Low Stock Warning + Reorder Suggestion → order 50 by noon |
| Evening, customer wants credit | Buy on Credit enabled → set limit ₹5000 → track when due |
| End of day | Daily Sales Recap + Product Analytics → see what sold, margins |
| Weekly recount | Stock Reconciliation → verify system matches shelves → log variance |
| Loyal customer returns | Loyalty Program + Customer Insights → "Welcome back! You have 50 points" |
| Barcode data | Barcode Scanning → faster billing → better staff analytics |
| Internet down | Offline Billing → bills created locally → sync when online → no lost sales |

---

## 9. Backend architecture — Spring Boot

### 9.1 Configurable modular monolith

```
com.example.erp
├─ platform/       tenancy, provisioning, plans, impersonation
├─ iam/            auth, people, roles, capabilities, grants, delegation, audit
├─ hierarchy/      positions, closure table, reach resolver, approver resolver   ← new in v2
├─ org/            units, cohorts, subjects, sessions, enrolment, teaching
├─ attendance/     leave/
├─ academics/      assignments, marks, timetable, exams, fees
├─ workforce/      payroll, projects, timesheets, performance, hiring, expenses
├─ content/        notices, documents, files
├─ reporting/      report registry, exports, schedules
├─ integration/    webhooks, biometric import, gateways, email/SMS
├─ shared/         problem model, pagination, jsonb + ltree converters, clock, ids
└─ config/         security, jpa, tenancy filters, openapi, actuator, jobs
```

Each module: `api/` · `domain/` · `repo/` · `service/` · `policy/` · `config/` behind `@ConditionalOnProperty("erp.module.<name>.enabled")`.

### 9.2 The two services everything calls

```java
public interface PermissionService {
  boolean has(Capability cap);
  boolean has(Capability cap, TargetRef target);
  void    require(Capability cap, TargetRef target);      // throws → problem+json
  Set<Capability> effective(UUID userId);
  ScopeGrant scopeOf(Capability cap);
  <T> Specification<T> reachFilter(Capability cap, Class<T> root);   // pushes reach into SQL
}

public interface HierarchyService {                        // new in v2
  Optional<UUID> supervisorOf(UUID userId);
  List<UUID> directReports(UUID userId);
  List<UUID> downline(UUID userId, Integer maxDepth);      // closure table, one query
  List<UUID> ancestorChain(UUID userId);                   // ordered, for escalation walks
  boolean isInDownline(UUID actor, UUID target, Integer maxDepth);
  MoveResult move(UUID userId, UUID newSupervisorId);      // validates cycles, rebuilds closure
  Optional<UUID> nearestCapable(UUID requesterId, Capability cap, int maxHops);
  SpanReport spanOfControl(UUID unitId);                   // for the warnings in §13.5
}
```

`reachFilter` is why list endpoints are safe *and* fast: `GET /users` for a Manager joins `position_closure` and returns only their downline — filtered in SQL, not checked after fetch.

Guards read declaratively at the call site:

```java
@PostMapping("/cohorts/{cohortId}/attendance")
@RequiresCapability(value = ATTENDANCE_OTHER_MARK, targetType = COHORT, targetParam = "cohortId")
public AttendanceSessionDto mark(@PathVariable UUID cohortId, @Valid @RequestBody MarkRequest body) { … }
```

**Grant cache:** `effective(userId)` cached in Redis under `grants:{tenant}:{user}:{gv}`. Any write to roles, grants, flags, positions or teaching bumps `tenant.grant_version`; JWTs carry `gv`, so a revocation or a re-org takes effect within one request rather than one token lifetime.

### 9.3 Configurability mechanisms

| Need | Mechanism |
|---|---|
| Module on/off per deployment | `erp.module.*.enabled` + `@ConditionalOnProperty` |
| Module on/off per tenant | `plan_feature` + `tenant.feature_overrides` (L1/L2) |
| Behaviour knobs | `setting` rows (namespace + key + jsonb), typed accessors, code defaults |
| Approval routing | `approval_flow` config interpreted by the rule engine (§4.5) |
| Role catalogues | seed rows per pack (§3.2, §3.3) |
| Vocabulary | `tenant.vocabulary` jsonb over the pack's titles + i18n bundles |
| Extra fields | `custom_field_def` + `custom_fields jsonb` with JSON-schema validation |
| Extra roles / powers | data, not code |
| Hierarchy shape | `position` rows — no level constants anywhere |
| Isolation | `erp.tenancy.strategy` |
| Numbering | `sequence_def` per tenant (`GW/2026/{seq:0000}`) |

### 9.4 Cross-cutting

RFC 9457 `problem+json` with a fixed code taxonomy (`CAPABILITY_MISSING`, `CAPABILITY_DISABLED_BY_POLICY`, `SCOPE_VIOLATION`, `RANK_CEILING_VIOLATION`, `HIERARCHY_CYCLE`, `NO_CAPABLE_APPROVER`, `SEAT_LIMIT_EXCEEDED`, `ALREADY_MARKED`, `WINDOW_CLOSED`, `BALANCE_INSUFFICIENT`, `LATE_SUBMISSION_BLOCKED`, `LAST_HEAD_PROTECTED`, …) so the UI renders a precise sentence per code · Flyway migrations including RLS policies · Spring Scheduler + `job_run` table (attendance rollup, accrual, escalation sweep, grant recompute, closure verification, defaulter digests, file GC, plagiarism retry), all tenant-loop-safe and resumable · presigned uploads with async virus scan and signed, capability-authorised downloads · notification templates with channel preferences, quiet hours and digests · `@Auditable` with redacted before/after snapshots in a monthly-partitioned append-only table · Micrometer + OpenTelemetry with `tenantId/userId/requestId` in structured logs · springdoc OpenAPI that also emits the capability catalogue the frontend consumes.

---

## 10. Frontend architecture — Next.js

### 10.1 Structure

```
app/
  (platform)/operator/…                     Platform console
  [tenantSlug]/
    (auth)/login, forgot, invite/[token]
    (portal)/
      layout.tsx                            shell: nav from powers + pack vocabulary
      page.tsx                              role-aware dashboard
      people/…                              list, new (wizard), [id] (powers, position tabs)
      roles/…                               Roles & Powers matrix, role detail, presets
      org/…                                 org chart (drag re-parent), units, classes/teams, subjects
      attendance/…                          today, mark/[cohortId], mine, policy, reports
      leave/…                               mine, inbox, types, balances, calendar
      assignments/…                         list, new, [id]/submissions, [id]/grade
      marks/ timetable/ fees/ exams/ library/ notices/ hostel/ transport/
      projects/ timesheets/ performance/ hiring/ expenses/ payroll/ documents/
      settings/…                            branding, modules, policies, flows, integrations, audit
  api/…                                     BFF handlers (token refresh, file proxy)
components/  ui/ (design-system wrappers) · patterns/ (DataTable, Wizard, PowerPicker, ScopePicker,
             OrgChart, ApprovalTimeline, AttendanceGrid, PermissionExplain, ImpactPreview, EmptyState)
lib/         typed client from OpenAPI, can(), useCapabilities(), useVocabulary(), reach helpers, zod
middleware.ts  tenant + auth resolution, rewrites, locale
```

### 10.2 Power-aware, vocabulary-aware UI

```ts
const me = await getSession();      // powers, scopes, reach summary, vocabulary, module flags
if (!can(me, 'attendance.other.mark')) notFound();

const { can, scopeOf } = useCapabilities();
const t = useVocabulary();          // t('role.DEPARTMENT_HEAD') → "HOD" or the tenant's retitle
{can('leave.request.approve') && <ApproveButton scope={scopeOf('leave.request.approve')} />}
```

- **Nav is generated** from powers × module flags — no hardcoded menu, no empty sections.
- **`<PermissionExplain>`** turns a problem code into a plain sentence naming the layer that blocked it and who set it. This is the answer to "can they even see the option": hidden by default, explainable on demand.
- **`<ApprovalTimeline>`** renders skipped hops honestly — *"Mentor (cannot approve leave) → Team Lead · pending"* — so deep chains are legible instead of mysterious.
- **`<OrgChart>`** is the hierarchy editor: drag to re-parent, live cycle validation, span-of-control warnings, a diff summary before saving, and an impact list of re-routed approvals.
- **Optimistic-but-verified** mutations everywhere; rollback with the server's own message.
- **Offline-tolerant** attendance via IndexedDB + background sync.
- **Industry design system** throughout: blueprint-framed cards with registration marks, Barlow Condensed headings over Barlow, steel accent, thin-stroke Lucide icons, `.table` / `.field` / `.seg` patterns, accent `:focus-visible` ring.
- **Responsive:** desktop-dense for admin surfaces (matrix, grid, org chart); mobile-first for the four things end users do on a phone — mark attendance, apply for leave, submit work, read notices. Hit targets ≥ 44 px.
- **Accessibility:** keyboard-complete attendance grid, aria-live autosave, never colour-only status.

---

## 11. Screen inventory by role

| Role | Lands on | Owns |
|---|---|---|
| **Platform Operator** | Tenants, seats, jobs, errors | Provision wizard, plans & features, impersonation, platform audit, usage, announcements, health |
| **Institution Head / Managing Director** | Portal health: headcount, attendance today, pending approvals, module adoption, unassigned-position alerts | Everything + Roles & Powers matrix, module switchboard, policies, approval flows, branding, sessions, org chart, audit, import, reports |
| **Deputy Head / Operations Director** | Operations board | Same as above minus platform and salary writes |
| **Registrar / Head of People** | Queue: joiners, pending leaves, attendance gaps, records to fix | Provisioning, leave types & balances, attendance policy, timetable or rosters, documents, notices, reports |
| **Examination Officer / Finance Controller** | Domain board | Exams, seating, results, revaluation · or payroll runs, payslips, reimbursements |
| **Department Head / Manager** | Department board: downline attendance %, approvals, workload, span warnings | Downline list (any depth), approvals inbox, attendance oversight and amendments, marks moderation or performance reviews, substitutions, **delegate powers downward** |
| **Programme Coordinator** | Programme board | Cross-class reporting, programme timetable |
| **Class Coordinator / Team Lead** | Today: my classes or shifts, to-grade count, my approvals | Attendance grid, roster, assignments author + grade, marks entry, leave approvals (downline), notices to class/team, guardian contacts, timesheet approvals |
| **Faculty** | My subjects | Subject attendance, assignments, marks entry |
| **Student Mentor / Senior Member** | My group | Group visibility (`DOWNLINE_LIMITED(1)`), timesheet review, mentoring notes, approvals only if granted |
| **Student / Member** | My day: check-in, timetable, due work, balances, notices | Mark my attendance, my history, apply/track leave, assignments + submit + feedback, my marks or payslips, my timesheet, profile |
| **Guardian** | Ward summary | Ward attendance, marks, assignments, fees, notices; leave request for ward if enabled |

**Demo path (12 clicks).** Platform Operator provisions *Greenwood* (Institution pack) → Head turns self-marking **ON** for `BCA-Y1-A`, **OFF** for `BCA-Y1-B` → Head creates a Department Head with delegable powers → HOD creates a Class Coordinator, granting *mark attendance @ TEAM* + *approve leave @ DOWNLINE* → Coordinator creates students, one of them a **Student Mentor with two juniors under them** → Mentor's junior applies for leave; the timeline shows the mentor skipped for lack of power and the Coordinator approving → student self-marks in A, sees the explain panel in B → submits an assignment, Faculty grades it → HOD sees the roll-up → Head revokes one power from the Coordinator and her UI changes on the next request → switch to *Northwind* (Organisation pack) to show the five-deep office chain and the same engine.

---

## 12. Excel → ERP migration path

Today's data lives in spreadsheets, so import is a module, not a script.

1. **Download a template** per entity, pre-filled with this tenant's own roles, units and classes as dropdowns — People, **Reporting lines**, Enrolments, Subjects, Teaching allocations, Attendance history, Leave balances, Marks.
2. **Upload** `.xlsx` / `.csv` (Apache POI streaming; 50 k rows target).
3. **Map columns** — auto-match by header similarity, remembered per tenant.
4. **Dry run** — full validation, downloadable error report (row, column, code, message, suggested fix). Nothing written.
5. **Resolve** — per-entity duplicate strategy (`SKIP | UPDATE | CREATE_NEW | FAIL`), matched on `code`, then `email`, then fuzzy name (fuzzy always needs human confirmation).
6. **Commit** — chunked, transactional per chunk, progress stream, resumable batch.
7. **Reversible** — undoable for 7 days via `import_batch_id`.

**Hierarchy-specific import cases:** the reporting-line sheet is imported **after** people, in two passes (create nodes, then link) so forward references work · a cycle in the sheet (A→B→C→A) is reported with the full path and the batch is rejected · a supervisor named but absent from the file (offer "create as placeholder, mark for review") · two roots (only one allowed; the second is reported) · a person listed under someone whose role has `may_hold_reports = false` (warn, offer to flip the role flag once) · a 12-deep chain (accepted; a warning notes the escalation hop limit is 6) · a person appearing twice with different supervisors (rejected, both rows cited).

**General import cases:** merged cells and multi-row headers (rejected with guidance) · Excel serial dates vs strings · roll numbers losing leading zeros · trailing and non-breaking spaces · duplicate emails within one file · a row referencing a class that doesn't exist (offer to create) · one person as both faculty and guardian · attendance history that violates current policy (accepted, flagged `HISTORIC_IMPORT`, exempt from window checks) · files over 20 MB (chunked) · a batch that would exceed the seat limit (rejected before commit).

---

## 13. Hierarchy edge cases — the day-to-day register

The cases that break naive "five fixed levels" implementations. Each is a test in the delegation matrix suite (§17).

### 13.1 Depth and shape

| # | Situation | Expected behaviour |
|---|---|---|
| H1 | Team Lead has 30 direct reports | Allowed; span-of-control warning at > `settings.span_warn_threshold` (default 15) on the org chart and in the Head's weekly digest. Never blocked. |
| H2 | Senior Member has 2 Members under them | Allowed because `role.may_hold_reports = true`. They get `DOWNLINE_LIMITED(1)` visibility only; approvals only if explicitly granted. |
| H3 | A Member is given a report | Blocked with `ROLE_CANNOT_HOLD_REPORTS` and a one-click offer: "promote to Senior Member" or "allow reports for this role" (audited). |
| H4 | Team Lead reports to another Team Lead (sub-squad) | Allowed — equal rank in a downline is legal. Reach and delegation work off the closure table, so nothing special is needed. |
| H5 | Chain 9 levels deep | Works. `DOWNLINE` is one closure query. Escalation walks at most `max_escalation_hops` (6) before falling back to the domain officer, so a request never wanders forever. |
| H6 | Two people both report to nobody | Rejected: exactly one root per tenant per session. The second must be parented (or made a `STAFF`-kind satellite, which sits outside the tree). |
| H7 | Someone is moved under their own subordinate | `HIERARCHY_CYCLE`, with the offending path shown. |
| H8 | A whole department is re-parented | One move; closure rebuilt for the sub-tree in one transaction; affected people notified; live approvals re-resolved (H14). |
| H9 | `STAFF`-kind role (Librarian, Recruiter) has no supervisor | Allowed: staff roles are outside the line tree. They still need an `org_unit` for reporting, and their approvals route to the unit head. |
| H10 | Matrix reporting: functional lead **and** project manager | Primary line = `position.reports_to`; secondary via `position_link`. Approval flows name which line decides per domain (leave → primary; timesheet → project manager). Both see the person in *their* lists, clearly labelled. |
| H11 | A person reports to someone in a different org unit | Allowed and common (dotted lines). Unit-scoped powers still follow the unit; downline-scoped powers follow the tree. Both facts are shown on the Position tab so nobody is surprised. |

### 13.2 The supervisor who cannot act

| # | Situation | Expected behaviour |
|---|---|---|
| H12 | Immediate supervisor lacks the needed power | `NEAREST_CAPABLE_SUPERVISOR` walks up; skipped hops recorded and displayed as *"Mentor (cannot approve leave)"*. |
| H13 | Nobody in the chain holds the power | Route to `approval_flow.fallback` (domain officer); if that too is empty, park as `NEEDS_ROUTING` on the Head's desk with a red banner. **Never auto-approve, never drop.** |
| H14 | The resolved approver changes because of a re-org mid-request | Pending steps are re-resolved by a job; the old approver loses the action and sees *"re-routed to X"*; the requester is notified once, not twice. |
| H15 | Supervisor is the requester (a lead applying for their own leave) | The step collapses (`SKIP_IF_SAME_PERSON`), logged as `SELF_APPROVAL_SKIPPED`, and the next capable ancestor decides. |
| H16 | Supervisor is on approved leave | Their configured stand-in (`position_link kind=DEPUTY_FOR`) acts; if none, the next capable ancestor, after `escalateAfterHours`. |
| H17 | Supervisor is suspended or archived mid-flight | Treated as incapable immediately; re-resolved on the next evaluation; the archive action itself is blocked until the reassignment wizard has run (§13.7). |
| H18 | Two capable ancestors at the same hop (dual reporting) | `position_link.weight` decides; ties fall to the primary line; if still tied, both are notified and the first to act wins (recorded as a race). |

### 13.3 Reach and visibility

| # | Situation | Expected behaviour |
|---|---|---|
| H19 | A Manager wants a list of everyone beneath, 5 levels down | `DOWNLINE` on `people.user.read`; one closure join; paginated; depth column shown. |
| H20 | A Senior Member tries to open a peer's record | 404 (not 403) — outside reach, so the id must not be confirmed. |
| H21 | A person holds two roles with different reaches | Widest scope per capability, then narrowed by position reach; a person-level `REVOKE` still wins. |
| H22 | A Class Coordinator also teaches another class's subject | Class powers scope to their own class; subject powers scope to the classes they teach. Two reaches, no bleed. |
| H23 | Someone must see one specific person outside their reach (an investigation) | `CUSTOM_SET` scope, mandatory reason, expiry required, audited, visible to the Head. |
| H24 | Downline of an archived node | Descendants are re-parented by the reassignment wizard before archiving completes; no orphans can exist. |

### 13.4 Delegation across odd shapes

| # | Situation | Expected behaviour |
|---|---|---|
| H25 | Equal-rank grant inside the downline (Senior Member → Member) | Allowed (§4.6 rule 2). |
| H26 | Equal-rank grant outside the downline (peer to peer) | Blocked unless `iam.grant.assign_peer` is held; off by default. |
| H27 | Granting upward | Always blocked, `RANK_CEILING_VIOLATION`. |
| H28 | A granter loses the power they delegated | Downstream grants are marked `INHERITED_REVOKED` by the cascade job; the affected people are notified; the Head sees the list. |
| H29 | Delegation chain deeper than the cap | Blocked with the tenant's configured maximum and a link to the setting. |
| H30 | A grant that would exceed the delegatee's `capability.minRank` | Blocked; Head-only override with typed confirmation, audited as `POLICY_OVERRIDE`. |

### 13.5 Everyday operations

| # | Situation | Expected behaviour |
|---|---|---|
| H31 | New joiner with no supervisor chosen | Defaults to the creator; flagged `POSITION_REVIEW` on the Head's dashboard until confirmed. |
| H32 | Promotion (Member → Team Lead) | Old `user_role` gets `valid_to`, new one `valid_from`; position may stay or move; historic records keep the role held at the time (audit stores an effective-grant hash per action). |
| H33 | Acting / temporary charge while the HOD is away | `user_role(is_acting = true, valid_to = …)` plus a `DEPUTY_FOR` link; powers appear and expire automatically; the UI badges the person as *Acting*. |
| H34 | Two people swap positions | Applied in one transaction so no moment exists where a team has no lead. |
| H35 | A team is left with no lead | Dashboards show a red "unassigned" state; approvals route to the unit head; a weekly digest nags the Head. |
| H36 | A person is on two teams | One primary position (drives approvals) plus `position_link` for the second (drives visibility and project timesheets). |
| H37 | Span-of-control drift after a re-org | Nightly job recomputes spans, flags outliers on the org chart, and lists depth > 8 chains for review. |
| H38 | Session rollover (new academic or fiscal year) | Positions are cloned into the new session; the Head gets a diff to confirm; last year's tree is frozen and remains readable for audit. |
| H39 | A contractor's end date passes | Position and role auto-expire, sessions revoked, downline (if any) re-parented to their supervisor, access ends the same night. |
| H40 | Someone must not see their own supervisor's data | Reach is strictly downward; upward visibility is never implied. Only `TENANT`-scoped powers see sideways or up. |

### 13.6 Attendance and leave inside deep chains

| # | Situation | Expected behaviour |
|---|---|---|
| H41 | A Senior Member marks attendance for their two juniors | Allowed only with `attendance.other.mark @ DOWNLINE_LIMITED(1)`; the grid shows exactly two rows. |
| H42 | Both a Team Lead and a Senior Member mark the same person | First write wins; the second gets `ALREADY_MARKED` with the marker's name; an amendment needs `attendance.other.amend`. |
| H43 | Leave overlapping the requester's own approval duties | Warned at apply time: *"3 requests will need your stand-in"*; the stand-in is required before submission if `settings.require_standin_on_leave` is on. |
| H44 | A whole team applies for the same day | Approver sees a bulk view with a coverage warning (*"7 of 9 absent"*) and can approve or reject as a batch, with per-person reasons preserved. |
| H45 | Attendance policy set at a node applies to a sub-tree | Policy scope `UNIT` cascades down `ltree`; `USER` and `COHORT` still override it (precedence in §8.2). |

### 13.7 Reassignment wizard (used everywhere above)

Triggered on archive, role change, position move or contract end. It refuses to finish while anything is unassigned, and covers, in one screen with one successor picker per line:

1. **Approvals in flight** — re-route or bulk-decide
2. **Direct reports** — re-parent to a chosen node (default: the leaver's own supervisor)
3. **Teaching allocations / project tasks** — transfer, preserving `created_by` history
4. **Owned records** — assignments authored, notices published, assets issued
5. **Stand-in links** — anyone who named the leaver as deputy
6. **Scheduled items** — future timetable slots, interviews, reviews

Output: a summary the Head can read, an audit trail, and notifications to everyone affected. Nothing is ever silently reassigned.

---

## 14. Other scenarios and edge cases

### 14.1 Powers

Power granted with `expires_at` (nightly expiry, both parties notified, audited `AUTO_EXPIRED`) · a capability removed from the product (unknown names ignored on read, grants archived by migration, listed in release notes) · a role preset edited after 40 people hold it (optional replay with impact list; person-level overrides survive) · the last rank-1 holder self-archiving (`LAST_HEAD_PROTECTED`) · two officers editing the same policy (optimistic lock + diff view) · a person with zero powers logging in (minimal profile + "your access is being set up", not a broken shell) · Platform Operator writing during impersonation (allowed only if tenant policy permits, stamped `on_behalf_of`, banner visible, Head notified).

### 14.2 Tenancy and data

Cross-tenant id guessing (404, never 403) · one email in two tenants (independent accounts; optional linked-identity switcher in Phase 7) · tenant suspended mid-session (read-only banner, writes 423) · slug renamed (old slug 301s for 90 days) · timezone changed (derived views recomputed, attendance-window warning) · session rollover (structure cloned, balances carried, old assignments archived, history immutable) · storage limit hit mid-upload (413 with plan prompt) · seat limit hit mid-import (batch rejected).

### 14.3 Reliability

Idempotency keys on all writes · exactly-once webhook handling by external id · jobs resumable from a per-tenant cursor · orphan file GC · email provider down (queue, retry, dead-letter) · Redis down (permission service falls back to DB, metric + degraded log) · Postgres failover (pool retry, read-only banner) · clock skew (server time authoritative).

### 14.4 The 09:00 problem

Everyone self-marks in the same three minutes. Mitigations: staggered per-tenant windows, single-row insert guarded by a unique constraint (no read-modify-write), Redis token bucket per user, queue-and-ack UI (*"recorded — syncing"*), and a load test that must sustain 5 000 marks/minute per tenant at p95 < 400 ms.

---

## 15. Build phases, step by step

One developer; halve with two. Every phase ends demoable with an exit checklist.

### Phase 0 — Foundations (3–4 days)
1. `spring init` — web, security, validation, JPA, Flyway, Postgres, Redis, actuator, springdoc, testcontainers.
2. Docker Compose: Postgres, Redis, MinIO, Mailpit.
3. `V1__core.sql` — tenant, user, role, role_grant, user_grant, user_role, setting, audit_event, file_object.
4. Shared kernel — UUIDv7, `Clock` bean, jsonb + ltree converters, `Problem` model, pagination DTOs, `BaseEntity`.
5. `create-next-app` (TS, App Router), Industry tokens wired, `middleware.ts` tenant rewrite, login shell.
6. CI — build + test both apps, lint, container image.

*Exit:* `/api/health` behind tenant resolution; `/{slug}/login` renders with tenant branding; migrations run in CI.

### Phase 1 — Tenancy & Auth (4–5 days)
1. Tenant CRUD + provisioning wizard with **pack selection**; slug validation and reservation.
2. `TenantResolutionFilter`, Hibernate filter, RLS policies, request-scoped `TenantContext`.
3. Auth — argon2id, JWT access 15 min + rotating refresh 7 d in httpOnly SameSite cookies, refresh-reuse detection, logout-all, lockout with backoff, password policy, forgot/reset, invite acceptance, optional TOTP.
4. `GET /api/me` — person, roles, effective powers + scopes, reach summary, module flags, vocabulary, branding.
5. Frontend — login, invite accept, shell with power-generated nav.

*Exit:* two tenants on two different packs; cross-tenant access provably impossible (401 `TENANT_MISMATCH` **and** RLS blocks a raw query).

### Phase 2 — Role packs, powers, delegation (5–7 days)
1. `Capability` enum + metadata + generated JSON catalogue for the frontend.
2. Seed both role packs with presets (§3.2, §3.3, §5.3); role CRUD, retitling, custom roles, `kind`, `may_hold_reports`.
3. `role_grant` + `user_grant` writes with all nine delegation rules (§4.6), full audit.
4. `PermissionService` — `has`, `require`, `effective`, `scopeOf`, `reachFilter`; Redis cache keyed by `grant_version`.
5. `@RequiresCapability` aspect + problem responses; `AbstractCapabilityIT` that every controller test extends.
6. Frontend — **Roles & Powers matrix** (roles × packs, tri-state cells: none / granted / granted+delegable, scope chip per cell), **PowerPicker** in the wizard, person **Powers tab** with override rows and reasons, revocation-impact preview, `<PermissionExplain>`.

*Exit:* Head → officer → Department Head → Class Coordinator/Team Lead → member chain created through the UI on both packs; each step provably unable to exceed its granter; revoking one power from one person changes their UI on the next request.

### Phase 3 — Hierarchy engine (4–5 days) ← *new in v2*
1. `position`, `position_link`, `position_closure` + maintenance triggers; cycle guard; move operation.
2. `HierarchyService` (§9.2) with `downline`, `ancestorChain`, `nearestCapable`, `spanOfControl`.
3. Approver resolver + the rule engine of §4.5; `NEEDS_ROUTING` state; escalation sweep job.
4. `reachFilter` wired into every list endpoint; `DOWNLINE_LIMITED` depth support.
5. Frontend — **`<OrgChart>`** with drag re-parent, cycle validation, span warnings, save-diff, re-route impact list; Position tab; `<ApprovalTimeline>` showing skipped hops.
6. Tests for every case in §13.1–13.4.

*Exit:* a 9-deep office chain and a Senior-Member-with-two-juniors both work; a leave request from the deepest node routes correctly past an incapable mentor; a department re-parent re-routes live approvals.

### Phase 4 — Org structure & people (4–5 days)
Units (ltree), classes/teams, subjects, sessions, terms, holiday calendars · enrolment and teaching with validity windows · people list with reach-filtered queries, saved views, bulk actions · the five-step wizard for both packs · Excel import for people, **reporting lines**, enrolments · reassignment wizard (§13.7).

*Exit:* a 300-student college and a 120-person company both stand up from spreadsheets — including their reporting lines — in under 10 minutes.

### Phase 5 — Attendance + Leave + Assignments (8–10 days)
Policy resolution with precedence + explain payload · self-mark (window, geofence, method, idempotency) and proxy grid (bulk upsert) · sessions from timetable or roster; locking and amendments · reports · leave types with visibility, accrual job, lifecycle, configured chains with capability-seeking escalation and stand-ins · assignments author → publish → submit → grade → track, late policy and extensions · notices with targeting and acknowledgement · frontend for all of it, offline-tolerant grid included.

*Exit:* the §11 demo path runs on seeded data, including the self-marking toggle changing a student's screen, the explain panel, and the skipped-mentor timeline.

### Phase 6 — Institution depth (7–9 days)
Marks, moderation, report cards · timetable with clash detection and substitutions · exams and seating · fees and invoices · guardian portal · hostel, transport, library.
*Exit:* a term-end report card PDF from real marks + attendance; a published timetable generating attendance sessions.

### Phase 7 — Organisation depth (7–9 days)
Shifts, rosters, overtime, biometric import · payroll structures and runs with masked salary access · projects, tasks, timesheets · performance cycles · expenses · documents with acknowledgement tracking · recruitment.
*Exit:* a payroll run blocked by unapproved attendance, then completed, payslips visible only to the right people.

### Phase 8 — Configuration & extensibility (5–6 days)
Custom fields · custom role/preset library · **approval-flow builder UI** · numbering sequences · branding and email templates · subdomain and custom domain with ACME · webhooks and scoped API keys · tenant data export bundle.

### Phase 9 — Reporting, notifications, hardening (5–6 days)
Report registry with scheduled PDF/XLSX exports · per-role dashboard widgets · notification preferences, digests, quiet hours · rate limiting, webhook signing · load test (the 09:00 storm) · backup/restore drill · OWASP ASVS L2 pass · accessibility audit.

### Phase 10 — Launch (3–4 days)
Demo tenant generator for both packs · onboarding checklist per pack · in-app tour · role playbooks · runbooks (suspend, export, key rotation) · pilot with one college and one office.

**Total:** ≈ 11–13 weeks solo. **Phases 0–5 ≈ 5–6 weeks** is the complete, defensible PoC.

---

## 16. Non-functional requirements

**Performance** — p95 < 300 ms reads, < 500 ms writes at 200 concurrent users per tenant · attendance grid for 120 people < 1 s · `downline` on a 5 000-person tree < 50 ms (closure table + index) · exports async above 5 000 rows · keyset pagination everywhere · N+1 queries are bugs (query-count assertions in tests).

**Security** — argon2id · JWT rotation with reuse detection · optional TOTP, enforceable for rank ≤ 2 · RLS as defence in depth · field-level encryption for salary, bank, health and guardian contact · signed short-lived file URLs · virus scanning · rate limits per IP, user and tenant · CSP, HSTS, no inline scripts · OWASP ASVS L2 checklist · impersonation needs a reason, expires in 30 min, always audited, optional tenant consent · secrets in a vault, rotated quarterly · dependency and container scanning in CI.

**Privacy** — data-subject export and erasure (erasure anonymises, keeps aggregates) · minor-data handling with guardian consent flags · configurable retention per entity · immutable exportable audit log · per-tenant data region.

**Operations** — nightly logical backup + PITR, monthly restore drill · zero-downtime deploys (expand/contract migrations) · feature flags on risky paths · alerting on 5xx rate, job lag, queue depth, auth failures, closure-table drift.

---

## 17. Testing strategy

| Layer | What | Tooling |
|---|---|---|
| Unit | permission truth table (capability × scope × in/out of reach), leave day maths, attendance precedence, payroll formulas | JUnit 5, AssertJ |
| Hierarchy | closure maintenance on insert/move/delete, cycle rejection, `nearestCapable` walks, span reports | JUnit 5 + property tests on random trees |
| Delegation matrix | generated tests over (granter rank, target rank, in/out of downline, capability, scope) asserting allow/deny against §4.6 | parameterised JUnit |
| Contract | every controller: 200 with power, 403 without, 404 cross-tenant and out-of-reach | MockMvc + `AbstractCapabilityIT` |
| Integration | real Postgres/Redis/MinIO, RLS enforcement, migrations forward and back | Testcontainers |
| Data | importer fixtures for every malformed case in §12 | fixture files in repo |
| E2E | the §11 demo path on both packs, plus the toggle-off and skipped-mentor scenarios | Playwright |
| A11y | axe on every route, keyboard-only pass on grid and org chart | Playwright + axe |
| Load | 09:00 self-mark storm, 5 000-submission grading inbox, 5 000-node downline query | k6 |
| Security | replay every request as every role, dependency scan | custom harness + Trivy |

**Definition of done per feature:** capability declared · guard on every endpoint · reach filter on every list · audit on every mutation · problem codes mapped to UI copy · empty/error/loading states designed · both packs' vocabulary checked · mobile layout checked · tests in every applicable row.

---

## 18. Decisions log and open questions

| # | Decision | Why |
|---|---|---|
| D1 | Capability-based authz; roles are bundles | The requirement is per-person grant and revoke; RBAC alone forces role explosion |
| D2 | **Two role packs, not one relabelled ladder** | A Registrar is not "a Sub-Admin with a nicer name" — different preset, different routing, different neighbours |
| D3 | **Position tree separate from role rank** | Leads under leads and members with members are normal; a level number cannot express them |
| D4 | **Closure table for reach** | `DOWNLINE` must be one indexed query at any depth |
| D5 | **Capability-seeking escalation** | The only honest answer to "my supervisor can't approve this" |
| D6 | Modular monolith, not microservices | One developer, tenant-wide transactions; extraction stays possible |
| D7 | Shared schema + RLS by default, other modes configurable | Cheapest correct default with an enterprise escape hatch |
| D8 | Approval chains as configuration | Every organisation wants a different chain |
| D9 | Grant version in the JWT | Revocations and re-orgs must bite immediately |
| D10 | Hide ungrantable powers by default, explain on demand | Matches "can they even see the option" while staying learnable |
| D11 | Ranks may repeat; `kind = STAFF` sits outside the tree | Four rank-2 officers, and a Librarian who reports to nobody |

**Open questions for you**

1. Should a student ever see another student's record (group work, class ranking)? Default: only group members.
2. Cap on custom roles per tenant — 25 enough?
3. Payroll: real statutory compliance (PF / ESI / TDS for India?) or generic components in v1?
4. Office attendance granularity: day, shift, or per-project hours?
5. Guardian logins in the PoC, or Phase 6?
6. Should the Platform Operator ever see tenant *data*, or only metadata plus consented impersonation?
7. Fees: which gateway, and is offline (cash / cheque) recording needed on day one?
8. Max hierarchy depth to support in the UI — the org chart is comfortable to about 8 levels; deeper needs a different visualisation.
9. Languages beyond English? RTL?

---

## Appendix A — capability catalogue

Format: `key` · default scope · min rank · delegable by default · ⚠ dangerous. **132 total.**

**IAM (16)** `iam.role.read` TENANT 2 ✓ · `iam.role.create` TENANT 1 ✓ · `iam.role.update` TENANT 1 ✓ · `iam.role.delete` TENANT 1 ✗ ⚠ · `iam.grant.read` TENANT 2 ✓ · `iam.grant.assign` DOWNLINE 2 ✓ ⚠ · `iam.grant.revoke` DOWNLINE 2 ✓ ⚠ · `iam.grant.assign_peer` TENANT 1 ✗ ⚠ · `iam.delegation.configure` TENANT 1 ✗ ⚠ · `iam.impersonate` TENANT 0 ✗ ⚠ · `iam.session.revoke` TENANT 1 ✓ · `iam.mfa.enforce` TENANT 1 ✓ · `iam.password.policy` TENANT 1 ✗ · `iam.apikey.manage` TENANT 1 ✗ ⚠ · `audit.log.read` TENANT 1 ✓ · `audit.export` TENANT 1 ✗

**People (12)** `people.user.read` DOWNLINE 5 ✓ · `people.user.read_contact` DOWNLINE 4 ✓ · `people.user.create` DOWNLINE 2 ✓ · `people.user.update` DOWNLINE 2 ✓ · `people.user.archive` DOWNLINE 2 ✓ ⚠ · `people.user.reset_password` DOWNLINE 3 ✓ · `people.user.assign_role` DOWNLINE 2 ✓ ⚠ · `people.user.export` DOWNLINE 2 ✓ ⚠ · `people.user.impersonate_in_tenant` TENANT 1 ✗ ⚠ · `people.guardian.manage` TENANT 2 ✓ · `people.invite.send` DOWNLINE 3 ✓ · `people.custom_field.manage` TENANT 1 ✗

**Hierarchy (6, new in v2)** `hierarchy.read` DOWNLINE 5 ✓ · `hierarchy.position.assign` DOWNLINE 3 ✓ · `hierarchy.position.move` ORG_UNIT_SUBTREE 2 ✓ ⚠ · `hierarchy.link.manage` ORG_UNIT_SUBTREE 3 ✓ · `hierarchy.standin.set` DOWNLINE 4 ✓ · `hierarchy.chart.manage` TENANT 1 ✗

**Org (9)** `org.unit.read` TENANT 5 ✓ · `org.unit.manage` TENANT 2 ✓ · `org.cohort.read` ORG_UNIT_SUBTREE 5 ✓ · `org.cohort.manage` ORG_UNIT_SUBTREE 2 ✓ · `org.subject.manage` TENANT 2 ✓ · `org.enrolment.manage` ORG_UNIT_SUBTREE 3 ✓ · `org.teaching.manage` ORG_UNIT_SUBTREE 2 ✓ · `org.session.manage` TENANT 1 ✗ · `org.holiday.manage` TENANT 2 ✓

**Attendance (13)** `attendance.self.mark` SELF 6 ✗ · `attendance.self.read` SELF 6 ✗ · `attendance.other.mark` TEAM 5 ✓ · `attendance.other.read` DOWNLINE 5 ✓ · `attendance.other.amend` TEAM 4 ✓ ⚠ · `attendance.record.lock` ORG_UNIT 3 ✓ · `attendance.record.unlock` ORG_UNIT 2 ✗ ⚠ · `attendance.policy.read` TENANT 5 ✓ · `attendance.policy.manage` ORG_UNIT_SUBTREE 2 ✓ · `attendance.regularise.request` SELF 6 ✗ · `attendance.regularise.approve` DOWNLINE 4 ✓ · `attendance.report.read` ORG_UNIT_SUBTREE 3 ✓ · `attendance.import.biometric` TENANT 2 ✓

**Leave (12)** `leave.request.create` SELF 6 ✗ · `leave.request.create_for_other` DOWNLINE 3 ✓ · `leave.request.create_for_ward` CUSTOM_SET 7 ✗ · `leave.request.cancel` SELF 6 ✗ · `leave.request.read_others` DOWNLINE 5 ✓ · `leave.request.approve` DOWNLINE 5 ✓ · `leave.request.reject` DOWNLINE 5 ✓ · `leave.request.override` ORG_UNIT_SUBTREE 2 ✓ ⚠ · `leave.type.manage` TENANT 2 ✓ · `leave.type.visibility.manage` TENANT 2 ✓ · `leave.balance.read_others` DOWNLINE 5 ✓ · `leave.balance.adjust` TENANT 2 ✓ ⚠

**Assignments (11)** `assignment.task.read` TEAM 6 ✗ · `assignment.task.create` TEAM 4 ✓ · `assignment.task.update` TEAM 4 ✓ · `assignment.task.publish` TEAM 4 ✓ · `assignment.task.delete` TEAM 3 ✓ ⚠ · `assignment.submission.create` SELF 6 ✗ · `assignment.submission.withdraw` SELF 6 ✗ · `assignment.submission.read_others` TEAM 4 ✓ · `assignment.submission.grade` TEAM 4 ✓ · `assignment.submission.reopen` TEAM 3 ✓ · `assignment.extension.approve` TEAM 4 ✓

**Marks (8)** `marks.entry.read` TEAM 6 · `marks.entry.write` TEAM 4 · `marks.moderate` ORG_UNIT_SUBTREE 3 · `marks.publish` ORG_UNIT 2 ⚠ · `marks.scale.manage` TENANT 2 · `report_card.generate` ORG_UNIT 3 · `report_card.read_own` SELF 6 · `revaluation.decide` ORG_UNIT 2

**Timetable (5)** `timetable.read` TEAM 6 · `timetable.slot.manage` ORG_UNIT_SUBTREE 3 · `timetable.substitute.assign` ORG_UNIT 3 · `timetable.publish` ORG_UNIT 2 · `timetable.room.manage` TENANT 2

**Exams (5)** `exam.schedule.manage` TENANT 2 · `exam.seating.manage` TENANT 2 · `exam.invigilation.assign` TENANT 2 · `exam.hallticket.issue` TENANT 2 · `exam.debar.decide` TENANT 1 ⚠

**Fees (7)** `fees.structure.manage` TENANT 2 ⚠ · `fees.invoice.create` TENANT 3 · `fees.payment.record` TENANT 3 · `fees.waiver.approve` TENANT 2 ⚠ · `fees.refund.approve` TENANT 1 ⚠ · `fees.report.read` TENANT 2 · `fees.own.read` SELF 6

**Payroll (7)** `payroll.structure.manage` TENANT 2 ⚠ · `payroll.salary.read` TENANT 2 ⚠ · `payroll.salary.write` TENANT 1 ⚠ · `payroll.run.execute` TENANT 2 ⚠ · `payroll.run.reverse` TENANT 1 ⚠ · `payroll.payslip.read_all` TENANT 2 ⚠ · `payroll.payslip.read_own` SELF 6

**Work (10)** `project.read` TEAM 6 · `project.manage` ORG_UNIT 3 · `task.assign` DOWNLINE 5 · `timesheet.submit` SELF 6 · `timesheet.approve` DOWNLINE 5 · `timesheet.report.read` ORG_UNIT_SUBTREE 3 · `review.cycle.manage` TENANT 2 · `review.write` DIRECT_REPORTS 5 · `review.read_reports` ORG_UNIT_SUBTREE 3 · `goal.approve` DIRECT_REPORTS 5

**Hiring (5)** `hiring.job.manage` TENANT 2 · `hiring.candidate.read` TENANT 3 · `hiring.interview.schedule` TENANT 3 · `hiring.feedback.write` TENANT 4 · `hiring.offer.approve` TENANT 1 ⚠

**Expenses (4)** `expense.claim.create` SELF 6 · `expense.claim.approve` DOWNLINE 5 · `expense.reimburse` TENANT 2 ⚠ · `expense.policy.manage` TENANT 2

**Assets, library, hostel, transport (8)** `asset.read` TENANT 5 · `asset.issue` TENANT 3 · `asset.audit` TENANT 2 · `library.item.manage` TENANT 3 · `library.issue` TENANT 4 · `library.fine.waive` TENANT 3 · `hostel.rollcall.manage` CUSTOM_SET 3 · `transport.boarding.manage` CUSTOM_SET 3

**Content & documents (6)** `notice.read` SELF 6 · `notice.create` ORG_UNIT_SUBTREE 3 · `notice.publish_all` TENANT 2 · `doc.upload` TENANT 3 · `doc.read_restricted` TENANT 2 ⚠ · `doc.acknowledgement.track` TENANT 2

**Reporting & settings (10)** `report.run` ORG_UNIT_SUBTREE 3 · `report.export` ORG_UNIT_SUBTREE 3 ⚠ · `report.schedule` TENANT 2 · `data.import` TENANT 2 ⚠ · `data.bulk_edit` TENANT 1 ⚠ · `data.export_tenant` TENANT 1 ⚠ · `settings.branding` TENANT 1 · `settings.module_flags` TENANT 1 ⚠ · `settings.policy_manage` TENANT 1 · `settings.integration` TENANT 1 ⚠

---

## Appendix B — API surface

Base `/api` · tenant via `X-Tenant-Slug` + JWT `tid` · keyset pagination (`?cursor=&limit=&sort=`) · `Idempotency-Key` on mutations.

```
POST /auth/login · /auth/refresh · /auth/logout · /auth/forgot · /auth/reset · /auth/invite/accept
GET|PATCH /me            POST /me/mfa

# Platform
GET|POST /platform/tenants          PATCH /platform/tenants/{id}
POST /platform/tenants/{id}/suspend · /impersonate
GET|POST /platform/plans            GET /platform/audit · /platform/usage

# IAM & powers
GET|POST /roles          PATCH|DELETE /roles/{id}      GET /role-packs
GET /capabilities                                  # catalogue + packs + metadata
GET|PUT /roles/{id}/grants                         POST /roles/{id}/grants:replay
GET /users/{id}/grants   POST /users/{id}/grants    DELETE /users/{id}/grants/{cap}
POST /users/{id}/grants/preview-impact
GET /audit?entity=&actor=&from=&to=

# Hierarchy (new in v2)
GET  /hierarchy/chart?unitId=&depth=
GET  /hierarchy/{userId}/supervisor · /direct-reports · /downline?maxDepth= · /ancestors
POST /hierarchy/{userId}/move            { newSupervisorId, effectiveFrom }
POST /hierarchy/{userId}/links           { kind, linkedToUserId, weight, validTo }
POST /hierarchy/{userId}/standin         { deputyUserId, from, to }
GET  /hierarchy/span-report?unitId=
POST /hierarchy/validate                 { moves[] }   # dry-run: cycles, spans, re-routed approvals

# People & org
GET|POST /users          GET|PATCH /users/{id}     POST /users/{id}/archive
POST /users/{id}/reset-password · /users/{id}/reassign
GET|POST /org/units · /org/cohorts · /org/subjects · /org/sessions
POST /org/enrolments · /org/teaching
POST /import/{entity}/upload · /import/{batch}/dry-run · /commit · /undo

# Attendance
GET /attendance/policy/effective?cohortId=       PUT /attendance/policy
POST /attendance/self                            GET /attendance/me?from=&to=
GET|POST /attendance/sessions                    POST /attendance/sessions/{id}/records:bulk
POST /attendance/sessions/{id}/lock              PATCH /attendance/records/{id}
POST /attendance/regularisations · /{id}/decide  GET /attendance/reports/{kind}

# Leave
GET|POST /leave/types      GET /leave/types/available
GET /leave/balances?userId=          POST /leave/balances/adjust
GET|POST /leave/requests             POST /leave/requests/{id}/submit · /decide · /cancel
GET /leave/inbox                     GET /leave/needs-routing          # H13 queue

# Assignments
GET|POST /assignments      PATCH /assignments/{id}      POST /assignments/{id}/publish
GET /assignments/{id}/submissions    POST /assignments/{id}/submissions
POST /submissions/{id}/grade · /return · /extension
GET /assignments/{id}/tracking

# Same shape for the rest
/marks /report-cards /timetable /exams /fees /payroll /projects /timesheets /reviews
/hiring /expenses /assets /library /hostel /transport /notices /documents /reports /settings /files
```

---

## Appendix C — configuration reference

```yaml
erp:
  tenancy:
    strategy: shared_schema        # shared_schema | schema | database
    addressing: path               # path | subdomain | both
    reserved-slugs: [api, admin, app, www, auth, static, super, platform]
  security:
    access-token-ttl: 15m
    refresh-token-ttl: 7d
    password: { min-length: 10, require-mixed-case: true, breach-check: true }
    lockout: { max-attempts: 5, base-delay: 30s }
    mfa: { available: true, enforce-at-or-above-rank: 2 }
    impersonation: { enabled: true, max-duration: 30m, require-reason: true,
                     require-tenant-consent: false }
  hierarchy:
    max-depth: 12                  # hard stop; UI comfortable to 8
    max-escalation-hops: 6
    span-warn-threshold: 15
    require-standin-on-leave: true
    allow-equal-rank-supervision: true      # Senior Member over Member
    single-root-per-session: true
  iam:
    max-delegation-depth: 3
    show-ungrantable-powers: false
    max-custom-roles: 25
    preset-replay-requires-confirmation: true
  module:
    attendance: { enabled: true }
    leave: { enabled: true }
    assignments: { enabled: true }
    marks: { enabled: false }
    timetable: { enabled: false }
    fees: { enabled: false }
    payroll: { enabled: false }
    projects: { enabled: false }
    # one flag per module; tenant overrides live in tenant.feature_overrides
  attendance:
    default-self-marking: true
    default-window: { start: "08:30", end: "10:00" }
    default-lock-after-days: 7
    max-backdate-days: 3
  files:
    max-upload-mb: 50
    allowed-types: [pdf, docx, xlsx, png, jpg, zip, ipynb, java, py]
    virus-scan: true
  limits:
    rate-per-user-per-minute: 120
    rate-per-tenant-per-minute: 6000
```

---

## Appendix D — seed data for the demo

### Tenant A — `greenwood` · Institution pack

**Vocabulary overrides:** `DEPARTMENT_HEAD` → "HOD", `CLASS_COORDINATOR` → "Class Teacher".
**Units:** Faculty of Science → Dept of Computer Applications → Programme BCA → classes `BCA-Y1-A`, `BCA-Y1-B`, `BCA-Y2-A`.
**Subjects:** Programming Fundamentals, Data Structures, DBMS, Mathematics-II, Communication Skills.
**People:** 1 Institution Head · 1 Registrar · 1 Examination Officer · 2 Department Heads · 1 Programme Coordinator · 6 Class Coordinators (4 also Faculty) · 3 Faculty-only · 90 Students · 3 **Student Mentors, each with 4 juniors under them** · 40 Guardians · 1 Librarian · 1 Warden.
**Hierarchy showcase:** Head → HOD (CS) → Programme Coordinator → Class Coordinator `Y1-A` → Student Mentor → 4 students — **six levels, with rank-5 supervising rank-6**.
**Config:** self-marking **ON** for `BCA-Y1-A` (08:30–09:15, geofence 150 m), **OFF** for `BCA-Y1-B`. Leave types: Casual (all), Medical (evidence), Sports On-Duty (`ROLE_IN[STUDENT]`, chain adds HOD).
**Content:** 3 published assignments (one overdue with a late submission, one with an approved extension, one ungraded), 2 notices, a week of attendance history, one leave request sitting in `NEEDS_ROUTING` to demo H13.

### Tenant B — `northwind` · Organisation pack

**Units:** Operations → Engineering → teams `Platform`, `Mobile`; Sales → `Inside Sales`.
**People:** 1 Managing Director · 1 Operations Director · 1 Head of People · 1 Finance Controller · 1 IT Administrator · 3 Department Managers · 5 Team Leads · 4 **Senior Members with 2–3 reports each** · 60 Members · 2 Contractors (hard end dates) · 1 Auditor (time-boxed).
**Hierarchy showcase:** MD → Operations Director → Manager (Engineering) → Team Lead (Platform) → Team Lead (Payments sub-squad, **equal rank**) → Senior Member → 2 Members — **seven levels**, exercising H4, H2 and H12 in one chain.
**Config:** shifts (General 09:30–18:30, Night 22:00–06:30 crossing midnight), HQ geofence, a sample biometric import batch. Leave types: Casual, Sick, Earned (accrual 1.5/month), Comp-off (`ROLE_IN[MEMBER, SENIOR_MEMBER, TEAM_LEAD]`), Maternity (`GENDER_IN[F] + AFTER_TENURE_DAYS 180`), Loss of Pay.
**Content:** 12 leave requests across every state, 2 escalated past 48 h, 1 re-routed by a re-org (H14), one timesheet week overlapping approved leave, one payroll run blocked by unapproved attendance.

**Demo accounts** — password `Demo@2026`, MFA off:
`operator@platform` · `principal@greenwood` · `registrar@greenwood` · `hod.cs@greenwood` · `coordinator.bca@greenwood` · `classteacher.y1a@greenwood` · `faculty.ds@greenwood` · `mentor1@greenwood` · `student1@greenwood` · `guardian1@greenwood` · `md@northwind` · `people@northwind` · `manager.eng@northwind` · `lead.platform@northwind` · `lead.payments@northwind` · `senior1@northwind` · `member1@northwind`

---

*End of document. Suggested next step: answer the nine open questions in §18, then I generate the Phase 0–3 skeleton — Spring Boot module layout, Flyway migrations including `position_closure` and its triggers, the `Capability` enum with both role packs seeded, `PermissionService` + `HierarchyService`, and the two screens that sell this model: the Roles & Powers matrix and the drag-to-re-parent org chart.*
