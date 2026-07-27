# Hoichoi Finance App

Operational finance platform for hoichoi's finance team and department heads,
built from `hoichoi_finance_app_plan_New.xlsx`.

This repository is the **Phase 0 scaffold + first vertical slice**. It ships the
foundation (auth, RBAC, audit log, PostgreSQL) plus two working modules:

- **Vendor Master** — single source of truth for vendors, with role-masked bank
  details, document uploads, duplicate PAN/GSTIN/bank detection, and a full
  audit trail.
- **VRF (Vendor Registration Form)** — tokenized public form for vendors to
  self-register, with a finance review → approve/reject/request-edits queue.
  Approval auto-creates the Vendor Master record (code `V-YYYY-####`).

Later modules (PO, budgeting, payments, reconciliation, timesheets,
amortization, AI/analytics) and external integrations (Zoho Books, payment
gateways, PAN/GST verification, ClickHouse) are intentionally **not** built yet.
Their extension points are stubbed and clearly marked (see
`lib/gov-verification.ts`, `lib/email.ts`, `lib/storage.ts`).

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma 7 +
PostgreSQL (via the `pg` driver adapter) · NextAuth v5 (credentials).

## Local setup

Prerequisites: Node 20+, Docker (for local Postgres).

```bash
# 1. Install dependencies
npm install

# 2. Copy env and adjust if needed
cp .env.example .env

# 3. Start Postgres (host port 5433 to avoid clashing with other local DBs)
docker compose up -d

# 4. Apply the schema and generate the Prisma client
npx prisma migrate dev

# 5. Seed the initial users
npx prisma db seed

# 6. Run the dev server (http://localhost:3001)
npm run dev
```

### Seeded users (local dev)

All use the password from `SEED_ADMIN_PASSWORD` in `.env` (default `ChangeMe123!`).

| Email | Role | Can do |
|---|---|---|
| `admin@hoichoi.tv` | `ADMIN_IT` | Edit Vendor Master; view-only on VRF |
| `finance@hoichoi.tv` | `FINANCE_TEAM` | Invite vendors, review VRF, edit vendors |
| `cfo@hoichoi.tv` | `FINANCE_HEAD_CFO` | Approve/reject VRF submissions |

## RBAC

`lib/rbac.ts` encodes the Module Access Matrix from the plan's "User Roles"
sheet verbatim. `can*()` helpers are the single source of truth used by page
guards (`lib/require-access.ts`), server actions, and UI visibility.

## Notable paths

- `prisma/schema.prisma` — data model (User, Vendor, VendorDocument,
  VrfSubmission, VrfDocument, AuditLog)
- `auth.ts` / `auth.config.ts` / `proxy.ts` — NextAuth + edge-safe middleware
- `app/vendors/` — Vendor Master module
- `app/vrf-review/` — finance-facing VRF queue and review
- `app/vrf/[token]/` — public vendor registration form
- `lib/audit.ts` — audit log writer
- `lib/storage.ts` + `app/api/files/[...path]/` — auth-gated document storage
  (documents live outside `/public` and are served only to permitted roles)

## Scripts

- `npm run dev` — dev server on port 3001
- `npm run build` — production build
- `npm run db:seed` — run the seed script
- `npx prisma studio` — inspect the database
