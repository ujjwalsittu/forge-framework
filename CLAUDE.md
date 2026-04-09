# Forge Framework — Project Context

> This file is auto-loaded by Claude Code at every session start.
> Claude-Mem also captures session summaries — check injected context above.

---

## What This Is

Forge is a metadata-driven, modular application platform in Node.js/TypeScript — the Node.js successor to Frappe Framework. The `Schematype` (a TypeScript file in git) defines everything about a data entity: database table, REST API, GraphQL type, form layout, permissions, hooks, and TypeScript SDK. You write it once; Forge generates everything else.

**The big difference from Frappe:** every module is an independent npm package. `@forge/hr` never forces `@forge/erp`. No Python. No pip. No MariaDB. 3 commands to a running site.

---

## Critical Design Constraints — Read These First

1. **Zero forced dependencies.** `@forge/*` packages MUST NOT directly import each other. Cross-module integration ONLY via `peerDependencies` in `package.json`. The CLI warns on unmet peers — never auto-installs. Enforced by ESLint rule `no-restricted-imports`.

2. **TypeScript everywhere.** No `any`. No `@ts-ignore`. No JavaScript files in `src/`. No untyped external imports without `@types/`. Enforced by `tsconfig.json: "strict": true, "noImplicitAny": true`.

3. **Tenant isolation is non-negotiable.** Cross-tenant data access MUST throw at the ORM layer. Every Redis key MUST be prefixed `{site-id}:`. Proven by automated test suite in `packages/core/src/__tests__/isolation/`. CI fails if isolation tests fail.

4. **No floating point for money.** All currency calculations use `Decimal.js`. Never `Number`. Never `parseFloat`. Enforced by ESLint rule for `packages/erp` and `packages/hr`.

5. **Migrations never destroy data.** The migration runner NEVER auto-drops columns or tables. Removal requires explicit `--prune` flag with typed confirmation. Enforced in migration runner code + documented in error messages.

6. **Schematypes are files, not rows.** Never store Schematype definitions in the database. They live in `schemas/` directories, committed to git. The DB only has the data those schemas define.

7. **Security checkpoints are blocking.** Every task in `.plan/phase-1-tasks.md` has a security checkpoint. That checkpoint MUST pass before committing. Non-negotiable.

8. **Tests first (TDD).** Write the failing test, see it fail, then implement, then see it pass. Never commit code without a corresponding test.

---

## Repository Structure

```
forge-framework/                    ← pnpm monorepo (MIT)
├── packages/
│   ├── core/                       → @forge/core (Schematype engine, multi-tenancy, ORM, queues, auth)
│   │   ├── src/
│   │   │   ├── schema/             → defineSchema(), field types, Zod + Drizzle + TS codegen
│   │   │   ├── tenancy/            → Site resolver, AsyncLocalStorage context, connection pool
│   │   │   ├── orm/                → Drizzle adapters (postgres-js, better-sqlite3)
│   │   │   ├── auth/               → Lucia sessions, API key system, RBAC
│   │   │   ├── queue/              → BullMQ integration, 3 priority queues
│   │   │   ├── server/             → Fastify instance, plugins, auto-routes
│   │   │   ├── migration/          → Schema diff algorithm, migration runner
│   │   │   ├── hooks/              → Event bus, lifecycle hook registry
│   │   │   └── __tests__/
│   │   │       └── isolation/      → Cross-tenant isolation tests (MANDATORY 100%)
│   ├── cli/                        → forge-cli (Commander.js, cross-platform)
│   ├── desk/                       → @forge/desk (React SPA admin UI, optional)
│   ├── ui/                         → forge-ui (React + Tailwind component library)
│   ├── permissions/                → @forge/permissions (RBAC + ABAC + field-level)
│   ├── workflow/                   → @forge/workflow (XState state machine builder)
│   ├── print/                      → @forge/print (Handlebars + Puppeteer PDF)
│   ├── reports/                    → @forge/reports (query + script reports)
│   ├── erp/                        → @forge/erp (accounts, inventory, sales, purchase)
│   ├── hr/                         → @forge/hr (payroll, attendance, leaves — STANDALONE)
│   ├── crm/                        → @forge/crm (leads, pipeline, email)
│   ├── helpdesk/                   → @forge/helpdesk (tickets, SLAs, knowledge base)
│   └── mfg/                        → @forge/mfg (BOM, work orders, shop floor)
├── apps/                           → Custom app packages (user-created)
│   └── example-app/
│       ├── schemas/                → Schematype .ts files
│       ├── hooks/                  → beforeSave, afterSubmit etc.
│       ├── routes/                 → Custom Fastify routes
│       └── desk/                   → React overrides for Desk UI
├── cloud/                          → forge-cloud AGPL control plane (subtree of forge-cloud repo)
├── agent/                          → forge-agent MIT server agent (subtree of forge-agent repo)
├── sites/                          → Per-tenant configs (DO NOT COMMIT .env or passwords here)
│   └── dev.local/
│       ├── site.json               → DB URL, modules, flags (gitignored for sensitive sites)
│       └── files/                  → Local file uploads (dev only, use S3 in prod)
├── scripts/                        → Build and setup scripts
├── docs/                           → Documentation source
├── tests/                          → Cross-package integration tests
│   └── integration/
│       └── tenant-isolation.test.ts
├── .plan/                          → Claude Code execution plans (committed to git)
│   ├── phase-1-tasks.md
│   ├── execution-plan.md           → Generated by Claude after reading spec
│   └── progress.md                 → Updated by Claude at end of each session
├── forge.workspace.json            → Workspace manifest
├── docker-compose.yml              → Dev services (Postgres + Redis + MinIO)
├── .env.example                    → Environment variable template
├── forge-platform.json             → Full platform specification (the spec Claude reads)
└── CLAUDE.md                       → This file
```

---

## Current Build Phase

| Phase | Name | Status |
|-------|------|--------|
| **1** | **Forge Core + CLI** | **🔴 In progress** |
| 2 | Desk UI + forge-ui | ⚪ Not started |
| 3 | Permissions + Workflow + Print + Reports | ⚪ Not started |
| 4 | First-party apps (ERP, HR, CRM, Helpdesk) | ⚪ Not started |
| 5 | Forge Cloud + Marketplace | ⚪ Not started |

See `.plan/phase-1-tasks.md` for Phase 1 task breakdown.
See `.plan/execution-plan.md` for the generated execution plan (created in first session).
See `.plan/progress.md` for last session's progress notes.

---

## Key TypeScript Types and APIs

```typescript
// Schematype definition
import { defineSchema } from '@forge/core'
export default defineSchema({
  name: 'Invoice',
  module: '@forge/erp',
  fields: [
    { name: 'id', type: 'AutoName' },
    { name: 'customer', type: 'Link', to: 'Customer', required: true },
    { name: 'amount', type: 'Currency', required: true },
    { name: 'status', type: 'Select', options: ['Draft', 'Submitted', 'Paid', 'Cancelled'] },
  ],
  permissions: [
    { role: 'Accountant', read: true, write: true, create: true, submit: true },
    { role: 'Sales Rep', read: true, create: true, if_owner: true },
  ],
  hooks: {
    beforeSave: './hooks/invoice.beforeSave',
    afterSubmit: './hooks/invoice.afterSubmit',
  }
})

// Generated TypeScript type (auto, never hand-write):
// type InvoiceDoc = ForgeDoc<'Invoice'>
// → { id: string, customer: string, amount: Decimal, status: 'Draft' | 'Submitted' | ... }

// Context API (available anywhere in a request/job)
import { forge } from '@forge/core'
const ctx  = forge.context()   // SiteContext — synchronous
const db   = forge.db          // Drizzle connection for THIS tenant only
const user = forge.user        // { id, name, email, roles }
const site = forge.site        // { name, host, currency, timezone, ... }

// ORM — always tenant-scoped, never manually pass tenant ID
const invoice = await forge.getDoc('Invoice', 'INV-2025-0001')
await forge.saveDoc({ doctype: 'Invoice', customer: 'ACME', amount: new Decimal('1000.00') })
const list = await forge.listDocs('Invoice', { filters: [['status', '=', 'Draft']], limit: 20 })

// Background job — context snapshot is automatically included
await forge.enqueue('default', 'send-invoice-email', { invoiceId: 'INV-001' })

// Module check
if (forge.hasModule('@forge/erp')) {
  // Create GL entry only if ERP is installed
}

// Permission check
await forge.requirePermission('write', 'Invoice') // throws if denied
const canSubmit = forge.permissions.check(user, 'submit', 'Invoice')

// Validation error (in validate hook)
throw new forge.ValidationError('amount', 'Amount must be greater than zero')
```

---

## Code Style Rules

- **No `console.log`** — use `import { logger } from '@forge/core'` → `logger.info({ invoiceId }, 'Invoice saved')`
- **No `any`** — use `unknown` + type guards, or generate proper types
- **All async errors handled** — no unhandled promise rejections. Use `try/catch` or `.catch()`.
- **Decimal for money** — `new Decimal('1000.00')` not `1000.00`. Operations: `.add()`, `.mul()`, `.div()`, `.toFixed(2)`
- **Zod for validation** — validate all external input with Zod before processing
- **Conventional Commits** — `feat(core): description`, `fix(cli): description`, `test(hr): description`
- **No magic numbers** — define constants: `const MAX_RETRY_ATTEMPTS = 3`
- **Explicit return types** on all exported functions: `async function saveDoc(...): Promise<ForgeDoc<N>>`
- **Imports sorted** — external packages first, then `@forge/*`, then relative
- **No barrel files** — import directly from the module file, not `index.ts` re-exports for internal use
- **Test file naming** — `{name}.test.ts` in `__tests__/` adjacent to the source file

---

## Testing Conventions

```typescript
// CORRECT test structure
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestSite } from '@forge/core/testing'

describe('Invoice schema', () => {
  let site: TestSite

  beforeEach(async () => {
    // Each test gets ISOLATED in-memory SQLite DB — no state leakage
    site = await createTestSite()
  })

  it('saves a valid invoice', async () => {
    const invoice = await site.forge.saveDoc({
      doctype: 'Invoice',
      customer: 'ACME',
      amount: new Decimal('1000.00'),
    })
    expect(invoice.id).toMatch(/^INV-/)
    expect(invoice.status).toBe('Draft')
  })

  it('throws ValidationError when amount is zero', async () => {
    await expect(
      site.forge.saveDoc({ doctype: 'Invoice', customer: 'ACME', amount: new Decimal('0') })
    ).rejects.toThrow(forge.ValidationError)
  })
})
```

---

## Security Checkpoint Template

Before committing any task, verify ALL of these for that task:

```
☐ No eval() or new Function() calls
☐ All external input validated with Zod before processing
☐ No SQL string interpolation — parameterized queries only
☐ Secrets not logged (pino redact config covers: password, api_key, db_url, token, secret)
☐ bcrypt used for password/API key storage (never MD5/SHA1/SHA256)
☐ Rate limiting applied to any new public endpoint
☐ Permission check before any data operation
☐ Cross-tenant: can I query another tenant's data through this code path? (answer must be NO)
☐ No hardcoded credentials (checked by git-secrets / trufflehog in CI)
☐ HTTPS-only in production (enforced by HSTS header)
☐ File uploads: type-validated + size-limited
```

---

## Claude-Mem Memory Notes

Claude-Mem is active. At session start:
- Check injected context for last completed task and pending items
- Use `search("schematype engine")` to recall prior implementation decisions
- Use `timeline(days=7)` to see what was worked on this week
- Each session summary is saved automatically — check "Suggested next steps" in the injected context

Save progress explicitly at end of session:
```
Save session summary to .plan/progress.md with:
- Tasks completed this session (with file paths)
- Current task status and exact stopping point
- Decisions made (with rationale)
- Immediate next step when resuming
```
