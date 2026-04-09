# Phase 1 Task Plan — Forge Core + CLI
# Detailed TDD execution guide for Claude Code

## Overview
10 tasks. Execute in order. Each task: write test → see fail → implement → see pass → security check → commit.
Branch per task: `feat/phase1-task{N}-{name}`.

---

## TASK 1 — Monorepo scaffolding + CI
**Branch:** `feat/phase1-task1-monorepo-init`
**Package:** Root workspace
**Estimated complexity:** Simple

### What to build
- Root `package.json` with pnpm workspace scripts
- `pnpm-workspace.yaml` listing all package directories
- `tsconfig.base.json` (strict TypeScript config)
- `.eslintrc.json` (strict TypeScript ESLint)
- `.prettierrc` (formatting config)
- `vitest.config.ts` (test runner with SQLite isolation)
- `.github/workflows/ci.yml` (test on Node 20 + 22, with Postgres + Redis services)
- `.github/workflows/security.yml` (npm audit + CodeQL)
- `.changeset/config.json` (Changesets versioning)
- `packages/core/` scaffold (empty `src/index.ts`, `package.json`, `tsconfig.json`)
- Same scaffold for all 13 packages + cloud + agent
- `forge.workspace.json` manifest

### Tests to write first
```typescript
// tests/workspace.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

describe('Monorepo structure', () => {
  it('has pnpm-workspace.yaml', () => {
    expect(existsSync('pnpm-workspace.yaml')).toBe(true)
  })
  it('has tsconfig.base.json with strict: true', () => {
    const tsconfig = JSON.parse(readFileSync('tsconfig.base.json', 'utf8'))
    expect(tsconfig.compilerOptions.strict).toBe(true)
  })
  it('has forge.workspace.json', () => {
    const manifest = JSON.parse(readFileSync('forge.workspace.json', 'utf8'))
    expect(manifest.packages.core).toBeTruthy()
  })
  it('has CI workflow', () => {
    expect(existsSync('.github/workflows/ci.yml')).toBe(true)
  })
})
```

### Security checkpoint
- Dependabot config created: `.github/dependabot.yml` with weekly npm + actions updates
- No secrets hardcoded in any config file (checked by grep for common patterns)
- `.gitignore` excludes `.env`, `sites/*/site.json`, `*.sqlite`

### Done state
`pnpm install` succeeds. `pnpm test` runs workspace test. `pnpm lint` passes. `pnpm type-check` passes.

---

## TASK 2 — Schematype definition interface
**Branch:** `feat/phase1-task2-schematype`
**Package:** `packages/core`
**Estimated complexity:** Complex

### What to build
- `packages/core/src/schema/types.ts` — all TypeScript interfaces
- `packages/core/src/schema/fields.ts` — all 24 field type definitions
- `packages/core/src/schema/define.ts` — `defineSchema()` function
- `packages/core/src/schema/validate.ts` — Schematype config validation
- `packages/core/src/schema/registry.ts` — global registry of registered Schemtypes

### Key TypeScript interfaces to define

```typescript
// types.ts
export interface SchematypeConfig<N extends string> {
  name: N
  module: string
  label: string
  label_plural?: string
  titleField: string
  naming: NamingConfig
  isSubmittable?: boolean
  isSingleton?: boolean
  trackChanges?: boolean
  searchFields?: string[]
  fields: FieldDefinition[]
  layout?: LayoutConfig
  permissions: PermissionRule[]
  hooks?: HooksConfig
  workflow?: string
  indexes?: IndexConfig[]
}

export type FieldType =
  | 'Data' | 'LongText' | 'Int' | 'Float' | 'Currency' | 'Percent'
  | 'Date' | 'DateTime' | 'Time' | 'Duration'
  | 'Select' | 'Link' | 'DynamicLink'
  | 'ChildTable' | 'Table'
  | 'Attach' | 'AttachImage'
  | 'Check' | 'AutoName' | 'JSON'
  | 'Color' | 'Barcode' | 'Geolocation'
  | 'Password' | 'Rating' | 'Markdown' | 'Code' | 'HTML' | 'Signature'

export type FieldDefinition = {
  name: string
  type: FieldType
  label?: string
  required?: boolean
  readOnly?: boolean
  hidden?: boolean
  sensitive?: boolean // excluded from logs + API default response
} & FieldTypeOptions[FieldType]  // discriminated union for type-specific options

// ForgeDoc<N> — generated from Schematype fields
export type ForgeDoc<N extends string> = {
  id: string
  name: string
  created_at: Date
  updated_at: Date
  created_by: string
  modified_by: string
  owner: string
  docstatus: 0 | 1 | 2
} & FieldValues<N>  // computed from registered schema's fields
```

### Tests to write first

```typescript
// packages/core/src/schema/__tests__/define.test.ts
import { describe, it, expect } from 'vitest'
import { defineSchema } from '../define'
import { forge } from '../../index'

describe('defineSchema()', () => {
  it('returns a SchematypeDefinition object', () => {
    const schema = defineSchema({
      name: 'TestDoc',
      module: '@test/module',
      titleField: 'title',
      naming: 'autoincrement',
      fields: [
        { name: 'title', type: 'Data', required: true },
        { name: 'amount', type: 'Currency' },
        { name: 'status', type: 'Select', options: ['Draft', 'Active'] },
      ],
      permissions: [],
    })
    expect(schema.name).toBe('TestDoc')
    expect(schema.fields).toHaveLength(3)
  })

  it('validates required fields exist', () => {
    expect(() => defineSchema({
      name: 'Bad',
      // missing module, titleField, naming, fields, permissions
    } as any)).toThrow()
  })

  it('validates field names are unique', () => {
    expect(() => defineSchema({
      name: 'DupFields',
      module: '@test',
      titleField: 'name',
      naming: 'autoincrement',
      fields: [
        { name: 'title', type: 'Data' },
        { name: 'title', type: 'Data' }, // duplicate!
      ],
      permissions: [],
    })).toThrow('Duplicate field name: title')
  })

  it('validates Link fields have a "to" property', () => {
    expect(() => defineSchema({
      name: 'Bad',
      module: '@test',
      titleField: 'id',
      naming: 'autoincrement',
      fields: [{ name: 'customer', type: 'Link' }], // missing "to"
      permissions: [],
    })).toThrow()
  })

  it('validates Select fields have options', () => {
    expect(() => defineSchema({
      name: 'Bad',
      module: '@test',
      titleField: 'id',
      naming: 'autoincrement',
      fields: [{ name: 'status', type: 'Select' }], // missing options
      permissions: [],
    })).toThrow()
  })
})
```

### Security checkpoint
- No `eval()` in codegen paths (checked by grep)
- Zod validator rejects unknown field types (no arbitrary type injection)
- `sensitive: true` field metadata stored correctly (will be used in API response filter)

### Done state
All tests pass. `pnpm type-check` passes. `defineSchema()` is fully typed — TypeScript IntelliSense shows correct types for all field options.

---

## TASK 3 — Drizzle ORM adapters + schema generation
**Branch:** `feat/phase1-task3-drizzle`
**Package:** `packages/core`
**Estimated complexity:** Complex

### What to build
- `packages/core/src/orm/adapters/postgres.ts` — postgres-js adapter
- `packages/core/src/orm/adapters/sqlite.ts` — better-sqlite3 adapter (for tests)
- `packages/core/src/orm/codegen.ts` — `generateDrizzleSchema(schematype)` function
- `packages/core/src/orm/types.ts` — DB adapter interface

### Column type mapping
```
Data        → varchar(255)
LongText    → text
Int         → bigint
Float       → doublePrecision
Currency    → decimal(20, 9)   // NEVER double for money
Percent     → decimal(10, 5)
Date        → date
DateTime    → timestamp with time zone
Time        → time
Select      → varchar(100)
Link        → varchar(255)     // FK to target doc name
Check       → boolean
JSON        → jsonb (pg) / text (sqlite)
Password    → text             // stores bcrypt hash
Color       → varchar(7)
Geolocation → (two columns: _lat decimal(9,6), _lng decimal(9,6))
AutoName    → varchar(255) PRIMARY KEY
```

### Tests to write first

```typescript
// packages/core/src/orm/__tests__/codegen.test.ts
import { describe, it, expect } from 'vitest'
import { generateDrizzleSchema } from '../codegen'
import { defineSchema } from '../../schema/define'

const testSchema = defineSchema({
  name: 'Item',
  module: '@test',
  titleField: 'name',
  naming: 'series:ITEM-{####}',
  fields: [
    { name: 'name', type: 'AutoName' },
    { name: 'description', type: 'LongText' },
    { name: 'price', type: 'Currency', required: true },
    { name: 'qty', type: 'Int' },
    { name: 'category', type: 'Link', to: 'Category' },
    { name: 'is_active', type: 'Check', defaultValue: true },
  ],
  permissions: [],
})

describe('generateDrizzleSchema()', () => {
  it('generates a table with all standard system columns', () => {
    const drizzleTable = generateDrizzleSchema(testSchema)
    // System columns
    expect(drizzleTable.columns).toHaveProperty('id')
    expect(drizzleTable.columns).toHaveProperty('created_at')
    expect(drizzleTable.columns).toHaveProperty('updated_at')
    expect(drizzleTable.columns).toHaveProperty('created_by')
    expect(drizzleTable.columns).toHaveProperty('docstatus')
  })

  it('maps Currency field to decimal(20,9)', () => {
    const drizzleTable = generateDrizzleSchema(testSchema)
    const priceCol = drizzleTable.columns.price
    expect(priceCol.dataType).toBe('decimal')
    expect(priceCol.precision).toBe(20)
    expect(priceCol.scale).toBe(9)
  })

  it('generates a ChildTable as a separate table with parent_id FK', () => {
    const parentSchema = defineSchema({
      name: 'Order',
      module: '@test',
      titleField: 'name',
      naming: 'series:ORD-{####}',
      fields: [
        { name: 'name', type: 'AutoName' },
        { name: 'lines', type: 'ChildTable', schema: 'OrderLine' },
      ],
      permissions: [],
    })
    const tables = generateDrizzleSchema(parentSchema)
    // Should generate both Order and OrderLine tables
    expect(tables.childTables).toContain('OrderLine')
  })
})
```

### Security checkpoint
- SQL injection test: attempt `' OR '1'='1` in all field value positions via Drizzle queries — must fail with parameterization
- Verify no raw string SQL construction anywhere in codegen

---

## TASK 4 — Migration runner
**Branch:** `feat/phase1-task4-migrations`
**Package:** `packages/core`
**Estimated complexity:** Complex

### What to build
- `packages/core/src/migration/differ.ts` — `diffSchemas(current, target)` → changes
- `packages/core/src/migration/generator.ts` — changes → SQL statements
- `packages/core/src/migration/runner.ts` — `runMigrations(db, schemtypes, opts)` function
- `packages/core/src/migration/history.ts` — `_forge_migrations` table management

### Tests to write first

```typescript
// packages/core/src/migration/__tests__/differ.test.ts
import { describe, it, expect } from 'vitest'
import { diffSchemas } from '../differ'

describe('diffSchemas()', () => {
  it('detects new table (schema added)', () => {
    const changes = diffSchemas({ tables: {} }, { tables: { Item: itemTableDef } })
    expect(changes).toContainEqual({ type: 'create_table', name: 'Item' })
  })

  it('detects new column', () => {
    const before = { tables: { Item: { columns: { name: varchar255 } } } }
    const after  = { tables: { Item: { columns: { name: varchar255, price: decimal209 } } } }
    const changes = diffSchemas(before, after)
    expect(changes).toContainEqual({ type: 'add_column', table: 'Item', column: 'price' })
  })

  it('NEVER generates drop_column automatically', () => {
    const before = { tables: { Item: { columns: { name: varchar255, old_col: text } } } }
    const after  = { tables: { Item: { columns: { name: varchar255 } } } }
    const changes = diffSchemas(before, after)
    const drops = changes.filter(c => c.type === 'drop_column')
    expect(drops).toHaveLength(0) // MUST be empty — no auto-drops
  })

  it('generates WARNING for removed columns (not drop)', () => {
    const before = { tables: { Item: { columns: { name: varchar255, old_col: text } } } }
    const after  = { tables: { Item: { columns: { name: varchar255 } } } }
    const changes = diffSchemas(before, after)
    expect(changes).toContainEqual({ type: 'warn_removed_column', table: 'Item', column: 'old_col' })
  })
})

// packages/core/src/migration/__tests__/runner.test.ts
describe('runMigrations()', () => {
  it('executes in a transaction — rolls back on error', async () => {
    const db = createInMemorySQLite()
    // Create a deliberately bad migration in the middle
    await expect(runMigrations(db, badSchemtypes)).rejects.toThrow()
    // Verify partial changes were NOT applied
    const tables = await db.query(`SELECT name FROM sqlite_master WHERE type='table'`)
    expect(tables.map(t => t.name)).not.toContain('PartiallyCreatedTable')
  })

  it('is idempotent — running twice does not re-apply migrations', async () => {
    const db = createInMemorySQLite()
    await runMigrations(db, schemtypes)
    await runMigrations(db, schemtypes) // second run — should be a no-op
    const migrations = await db.query(`SELECT * FROM _forge_migrations`)
    expect(migrations.length).toBe(1) // same migration not duplicated
  })
})
```

### Security checkpoint
- Test that `--prune` without typed confirmation does NOT drop columns
- Test that migration runner refuses to run DDL DROP TABLE/COLUMN without explicit opt-in

---

## TASK 5 — Multi-tenancy runtime
**Branch:** `feat/phase1-task5-multitenancy`
**Package:** `packages/core`
**Estimated complexity:** Complex — CRITICAL

### What to build
- `packages/core/src/tenancy/site-config.ts` — SiteConfig type + schema
- `packages/core/src/tenancy/site-resolver.ts` — host → SiteConfig lookup (Redis → DB)
- `packages/core/src/tenancy/context.ts` — AsyncLocalStorage context + forge.context() API
- `packages/core/src/tenancy/pool-manager.ts` — per-tenant connection pool
- `packages/core/src/tenancy/namespaced-redis.ts` — auto-prefixed Redis wrapper
- `packages/core/src/__tests__/isolation/tenant-isolation.test.ts` — MANDATORY

### Tests to write first — CRITICAL ISOLATION SUITE

```typescript
// packages/core/src/__tests__/isolation/tenant-isolation.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestTenant, forge } from '@forge/core/testing'

describe('CRITICAL: Cross-tenant data isolation', () => {
  let tenant1: TestTenant, tenant2: TestTenant

  beforeEach(async () => {
    tenant1 = await createTestTenant('tenant-1')
    tenant2 = await createTestTenant('tenant-2')
  })

  it('cannot read tenant2 documents from tenant1 context', async () => {
    // Create a doc in tenant2
    await tenant2.runInContext(async () => {
      await forge.saveDoc({ doctype: 'TestDoc', title: 'Tenant2 Secret' })
    })
    // Try to read it from tenant1 context
    await tenant1.runInContext(async () => {
      const docs = await forge.listDocs('TestDoc', {})
      // Must be empty — tenant1 cannot see tenant2's data
      expect(docs).toHaveLength(0)
    })
  })

  it('cannot write to tenant2 DB from tenant1 context', async () => {
    await tenant1.runInContext(async () => {
      // Even if someone tries to pass tenant2's DB connection
      const tenant2Db = tenant2.getDb()
      // forge.db must always return tenant1's connection
      expect(forge.db).toBe(tenant1.getDb())
      expect(forge.db).not.toBe(tenant2Db)
    })
  })

  it('Redis keys are namespaced per tenant', async () => {
    await tenant1.runInContext(async () => {
      await forge.cache.set('test-key', 'tenant1-value')
      // Internal key should be: tenant-1:test-key
    })
    await tenant2.runInContext(async () => {
      const value = await forge.cache.get('test-key')
      // Must return null — tenant2 cannot read tenant1's cache
      expect(value).toBeNull()
    })
  })

  it('BullMQ jobs are namespaced per tenant', async () => {
    const jobNames: string[] = []
    await tenant1.runInContext(async () => {
      await forge.enqueue('default', 'test-job', {})
      const queue = forge.getQueue('default')
      jobNames.push(queue.name) // e.g. 'tenant-1:forge:default'
    })
    await tenant2.runInContext(async () => {
      const queue = forge.getQueue('default')
      // Different queue name
      expect(queue.name).not.toBe(jobNames[0])
    })
  })

  it('WebSocket events are scoped to tenant room', async () => {
    // Test that forge.realtime.emit() sends to {site-id} room only
    const emittedRooms: string[] = []
    mockSocketIo.onEmit((room: string) => emittedRooms.push(room))

    await tenant1.runInContext(async () => {
      forge.realtime.emit('doc_updated', { doctype: 'TestDoc', name: 'TD-001' })
    })
    expect(emittedRooms).toHaveLength(1)
    expect(emittedRooms[0]).toContain('tenant-1') // room name includes tenant id
    expect(emittedRooms[0]).not.toContain('tenant-2')
  })
})
```

### Security checkpoint
- **ALL isolation tests pass — this is a hard blocker**
- AsyncLocalStorage context frozen with `Object.freeze()` after injection
- Connection pool returns error (not wrong connection) when pool exhausted
- Site resolver returns 404 for unknown hosts — must not expose valid host list

---

## TASK 6 — Auth system
**Branch:** `feat/phase1-task6-auth`
**Package:** `packages/core`
**Estimated complexity:** Complex

### What to build
- `packages/core/src/auth/session.ts` — create/validate/invalidate sessions (Lucia Auth)
- `packages/core/src/auth/api-key.ts` — create/validate API keys
- `packages/core/src/auth/rbac.ts` — role assignments + permission checks
- `packages/core/src/auth/brute-force.ts` — Redis-backed lockout
- `packages/core/src/auth/middleware.ts` — Fastify onRequest hook

### Key security tests

```typescript
describe('Session security', () => {
  it('token is 128-bit random hex (not UUID)', async () => {
    const session = await createSession(userId, siteId)
    // UUID has dashes and is 36 chars — our token should be 32 hex chars (128-bit)
    expect(session.token).toMatch(/^[0-9a-f]{32,}$/)
    expect(session.token).not.toMatch(/-/) // no UUID dashes
  })

  it('stored token is bcrypt hash, not plaintext', async () => {
    const session = await createSession(userId, siteId)
    const row = await db.query('SELECT token_hash FROM sessions WHERE id = ?', [session.id])
    expect(row.token_hash).not.toBe(session.token) // never plaintext
    expect(row.token_hash).toMatch(/^\$2[aby]\$/) // bcrypt prefix
  })

  it('brute force: locks after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(validateSession('wrong-token', siteId)).rejects.toThrow('Invalid session')
    }
    // 6th attempt should get lockout error, not generic invalid
    await expect(validateSession('another-wrong', siteId)).rejects.toThrow('Too many attempts')
  })

  it('constant-time comparison (timing attack resistance)', async () => {
    // This is hard to test precisely, but verify bcrypt.compare is used, not ===
    const spy = vi.spyOn(bcrypt, 'compare')
    await validateSession('test-token', siteId).catch(() => {})
    expect(spy).toHaveBeenCalled()
  })
})

describe('API key security', () => {
  it('returns key only once — subsequent reads return null', async () => {
    const { key, id } = await createApiKey(userId, siteId, 'read-write')
    expect(key).toBeTruthy() // returned only at creation
    const retrieved = await getApiKey(id)
    expect(retrieved.key).toBeNull() // never returned again
  })
})
```

---

## TASK 7 — Fastify server + auto-routes
**Branch:** `feat/phase1-task7-server`
**Package:** `packages/core`
**Estimated complexity:** Medium

### Key tests

```typescript
describe('Auto-generated REST routes', () => {
  let client: TestClient

  beforeEach(async () => {
    const site = await createTestSite([testSchema])
    client = createTestClient(site)
  })

  it('GET /api/resource/TestDoc returns paginated list', async () => {
    const res = await client.get('/api/resource/TestDoc')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ data: [], total: 0, page: 1 })
  })

  it('POST /api/resource/TestDoc creates a document', async () => {
    const res = await client.post('/api/resource/TestDoc', { body: { title: 'Hello' } })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.title).toBe('Hello')
  })

  it('returns 403 when user lacks permission', async () => {
    const guestClient = createTestClient(site, { role: 'Guest' })
    const res = await guestClient.post('/api/resource/TestDoc', { body: { title: 'x' } })
    expect(res.statusCode).toBe(403)
  })

  it('returns generic error message (no stack trace) on 500', async () => {
    // Force an error in beforeSave hook
    const res = await client.post('/api/resource/BrokenDoc', { body: {} })
    expect(res.statusCode).toBe(500)
    const body = res.json()
    expect(body.message).toBeTruthy()
    expect(body).not.toHaveProperty('stack') // no stack trace to client
  })

  it('respects rate limiting', async () => {
    // Make 101 unauthenticated requests
    const promises = Array.from({ length: 101 }, () =>
      unauthenticatedClient.get('/api/resource/TestDoc')
    )
    const results = await Promise.all(promises)
    const rateLimited = results.filter(r => r.statusCode === 429)
    expect(rateLimited.length).toBeGreaterThan(0)
  })
})
```

---

## TASK 8 — BullMQ job queues
**Branch:** `feat/phase1-task8-queues`
**Package:** `packages/core`
**Estimated complexity:** Medium

*(Tests and implementation as described in security checklist — queue namespacing, context injection, retry strategy, DLQ)*

---

## TASK 9 — forge-cli Phase 1 commands
**Branch:** `feat/phase1-task9-cli`
**Package:** `packages/cli`
**Estimated complexity:** Medium

### Windows compatibility requirements
- All file paths use `path.join()` — never string concatenation with `/`
- All file operations use Node.js `fs` API — never shell commands
- Commands work in: Command Prompt, PowerShell, Git Bash, WSL
- `forge init` uses `node` not `npx` for sub-commands (avoids PATH issues on Windows)
- `.env` file creation uses cross-platform method

### End-to-end test

```typescript
describe('forge CLI E2E', () => {
  it('full workflow: init → site new → module install → migrate → console exits 0', async () => {
    const workspace = await tmpdir()
    await run(`node ./dist/cli.js init ${workspace}`)
    await run(`node ./dist/cli.js site new test.local`, { cwd: workspace })
    await run(`node ./dist/cli.js migrate --site test.local`, { cwd: workspace })
    // console sends a command and exits
    const result = await run(
      `node ./dist/cli.js console --site test.local --eval "forge.context().site.host"`,
      { cwd: workspace }
    )
    expect(result.stdout).toContain('test.local')
    expect(result.exitCode).toBe(0)
  }, 120_000) // 2 minute timeout for E2E
})
```

---

## TASK 10 — Integration tests + documentation
**Branch:** `feat/phase1-task10-integration`
**Package:** Root + `packages/core`
**Estimated complexity:** Medium

### Integration test: 5 concurrent tenants

```typescript
// tests/integration/concurrent-tenants.test.ts
describe('5 concurrent tenants', () => {
  it('handles 1000 requests across 5 tenants without cross-contamination', async () => {
    const tenants = await Promise.all(
      Array.from({ length: 5 }, (_, i) => createTestTenant(`tenant-${i}`))
    )
    // Create 200 docs per tenant concurrently
    await Promise.all(tenants.flatMap(tenant =>
      Array.from({ length: 200 }, (_, i) =>
        tenant.runInContext(() =>
          forge.saveDoc({ doctype: 'TestDoc', title: `${tenant.name}-doc-${i}` })
        )
      )
    ))
    // Verify each tenant sees only their own docs
    for (const tenant of tenants) {
      await tenant.runInContext(async () => {
        const docs = await forge.listDocs('TestDoc', {})
        expect(docs).toHaveLength(200)
        docs.forEach(doc => expect(doc.title).toContain(tenant.name))
      })
    }
  })
})
```

---

## Execution checklist

After all 10 tasks:
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm type-check` — no TypeScript errors
- [ ] `pnpm lint` — no ESLint errors
- [ ] `pnpm build` — all packages compile
- [ ] Cross-tenant isolation test suite: 100% pass
- [ ] Security checklist (.plan/security-checklist.md Phase 1 section): all items checked
- [ ] README complete for `@forge/core` and `forge-cli`
- [ ] All 10 task branches merged to `develop`
- [ ] `develop` merged to `main` via PR
- [ ] Changeset added and published to npm (alpha tag)
