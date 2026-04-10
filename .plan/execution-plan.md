# Phase 1 Execution Plan — Forge Core + CLI

> Generated 2026-04-09. This is the authoritative execution plan for Phase 1.
> Each task follows TDD: write test (RED) → implement (GREEN) → security check → commit.

---

## Dependency Graph

```
Task 1: Monorepo scaffolding ──┐
                                ├─→ Task 2: Schematype interface ──┐
                                │                                   ├─→ Task 3: Drizzle ORM ──┐
                                │                                   │                          ├─→ Task 4: Migration runner
                                │                                   │                          │
                                │                                   │                          ├─→ Task 5: Multi-tenancy ──┐
                                │                                   │                          │                           │
                                │                                   │                          │   ┌───────────────────────┘
                                │                                   │                          │   │
                                │                                   │                          ├───┴─→ Task 6: Auth ──┐
                                │                                   │                          │                      │
                                │                                   │                          │   ┌──────────────────┘
                                │                                   │                          │   │
                                │                                   │                          ├───┴─→ Task 7: Server + routes ──┐
                                │                                   │                          │                                │
                                │                                   │                          ├─→ Task 8: BullMQ queues ───────┤
                                │                                   │                          │                                │
                                └───────────────────────────────────┴──────────────────────────┴─→ Task 9: CLI ─────────────────┤
                                                                                                                               │
                                                                                                   Task 10: Integration ◄──────┘
```

**Critical path:** 1 → 2 → 3 → 5 → 6 → 7 → 10
**Parallelizable (after Task 3):** Task 4 and Task 5 are independent. Task 8 is independent of Tasks 6-7.

---

## Current Scaffold State (Task 1 Audit)

| File | Status | Gap |
|------|--------|-----|
| `package.json` | ✅ Complete | — |
| `pnpm-workspace.yaml` | ✅ Complete | — |
| `tsconfig.base.json` | ✅ Complete (strict: true) | — |
| `.eslintrc.json` | ✅ Complete | Missing `no-eval`, `no-restricted-imports` rules |
| `.prettierrc` | ✅ Complete | — |
| `vitest.config.ts` | ✅ Complete | — |
| `.changeset/config.json` | ✅ Complete | — |
| `forge.workspace.json` | ✅ Complete | — |
| `.gitignore` | ✅ Complete | Missing `sites/*/site.json` exclusion |
| `.github/workflows/ci.yml` | ❌ Stub | Only `name: CI` — needs full workflow |
| `.github/workflows/security.yml` | ✅ Complete | — |
| `.github/dependabot.yml` | ❌ Missing | Required by Task 1 security checkpoint |
| `docker-compose.yml` | ❌ Stub | Only comment line |
| `.env.example` | ⚠️ Exists | Need to verify contents |
| 13 package dirs | ✅ Scaffolded | Empty src/index.ts stubs |
| `tests/workspace.test.ts` | ❌ Missing | Task 1 TDD test |

---

## TASK 1 — Monorepo scaffolding completion + CI

**Branch:** `feat/phase1-task1-monorepo-init`
**Status:** ~80% done. Need to fill gaps and add tests.

### Files to create/modify

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `tests/workspace.test.ts` | TDD test for monorepo structure |
| MODIFY | `.github/workflows/ci.yml` | Full CI: Node 20+22, Postgres+Redis services, test+lint+type-check |
| CREATE | `.github/dependabot.yml` | Weekly npm + actions updates |
| MODIFY | `docker-compose.yml` | Dev services: Postgres 15 + Redis 7 + MinIO |
| MODIFY | `.eslintrc.json` | Add `no-eval`, `no-restricted-imports` for `@forge/*` cross-imports |
| MODIFY | `.gitignore` | Add `sites/*/site.json` |
| VERIFY | `.env.example` | Ensure template has all needed vars |

### Test first (RED)
```
tests/workspace.test.ts
  - has pnpm-workspace.yaml
  - has tsconfig.base.json with strict: true
  - has forge.workspace.json with all 13 packages
  - has CI workflow with node 20+22 matrix
  - has dependabot.yml
  - .gitignore excludes .env and sites/*/site.json
```

### Green condition
`pnpm test` passes. `pnpm lint` passes. `pnpm type-check` passes.

### Security checkpoint
- [x] No secrets in config files
- [ ] `.github/dependabot.yml` created
- [ ] `.gitignore` excludes `.env`, `sites/*/site.json`, `*.sqlite`

---

## TASK 2 — Schematype definition interface

**Branch:** `feat/phase1-task2-schematype`
**Package:** `packages/core`
**Depends on:** Task 1

### Files to create

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `packages/core/src/schema/__tests__/define.test.ts` | TDD tests |
| CREATE | `packages/core/src/schema/__tests__/fields.test.ts` | Field type validation tests |
| CREATE | `packages/core/src/schema/types.ts` | All TS interfaces: `SchematypeConfig`, `FieldDefinition`, `FieldType`, `ForgeDoc<N>`, `PermissionRule`, `NamingConfig`, `LayoutConfig`, `HooksConfig`, `IndexConfig` |
| CREATE | `packages/core/src/schema/fields.ts` | All 24 field type definitions + type-specific option interfaces + discriminated union |
| CREATE | `packages/core/src/schema/define.ts` | `defineSchema()` function + Zod validation of config |
| CREATE | `packages/core/src/schema/validate.ts` | Schematype config validator (Zod): required props, unique field names, Link→to, Select→options, ChildTable→schema |
| CREATE | `packages/core/src/schema/registry.ts` | `SchemaRegistry` class: register/get/list/has schemas |
| MODIFY | `packages/core/src/index.ts` | Re-export `defineSchema`, `SchemaRegistry` |
| MODIFY | `packages/core/package.json` | Add `zod` dependency |

### Key function signatures
```typescript
// define.ts
export function defineSchema<N extends string>(config: SchematypeConfig<N>): SchematypeDefinition<N>

// validate.ts
export function validateSchemaConfig(config: unknown): SchematypeConfig<string>  // throws on invalid

// registry.ts
export class SchemaRegistry {
  register(schema: SchematypeDefinition<string>): void
  get<N extends string>(name: N): SchematypeDefinition<N> | undefined
  list(): ReadonlyArray<SchematypeDefinition<string>>
  has(name: string): boolean
}
```

### Test first (RED) — `define.test.ts`
```
defineSchema()
  ✓ returns a SchematypeDefinition object with correct name + fields
  ✓ throws when required props missing (name, module, titleField, naming, fields, permissions)
  ✓ throws on duplicate field names: "Duplicate field name: title"
  ✓ throws when Link field missing "to" property
  ✓ throws when Select field missing "options"
  ✓ throws when ChildTable field missing "schema"
  ✓ accepts all 24 field types without error
  ✓ freezes returned definition (immutability)
  ✓ validates naming config format (series pattern, field ref, etc.)
```

### Test first (RED) — `fields.test.ts`
```
Field type validation
  ✓ Data field accepts maxLength, minLength, pattern
  ✓ Currency field maps to Decimal (never number)
  ✓ Password field is always marked sensitive
  ✓ Geolocation generates two sub-fields (_lat, _lng)
  ✓ rejects unknown field type
```

### Green condition
All tests pass. `defineSchema()` fully typed — TS IntelliSense shows correct per-field-type options.

### Security checkpoint
- [ ] No `eval()` in any code path
- [ ] Zod rejects unknown field types (no arbitrary type injection)
- [ ] `sensitive: true` metadata stored (will filter in API layer later)
- [ ] `defineSchema()` is pure — no IO, no side effects

---

## TASK 3 — Drizzle ORM adapters + schema generation

**Branch:** `feat/phase1-task3-drizzle`
**Package:** `packages/core`
**Depends on:** Task 2

### Files to create

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `packages/core/src/orm/__tests__/codegen.test.ts` | TDD tests |
| CREATE | `packages/core/src/orm/types.ts` | `DbAdapter` interface, column type mappings |
| CREATE | `packages/core/src/orm/codegen.ts` | `generateDrizzleSchema(schematype)` → Drizzle table def |
| CREATE | `packages/core/src/orm/column-map.ts` | FieldType → Drizzle column type mapping (24 types) |
| CREATE | `packages/core/src/orm/adapters/postgres.ts` | postgres-js adapter factory |
| CREATE | `packages/core/src/orm/adapters/sqlite.ts` | better-sqlite3 adapter (for tests) |
| MODIFY | `packages/core/package.json` | Add `drizzle-orm`, `postgres`, `better-sqlite3`, `@types/better-sqlite3` |

### Key column mappings (from spec)
```
Data        → varchar(255)          Currency    → decimal(20, 9)
LongText    → text                  Percent     → decimal(10, 5)
Int         → bigint                Date        → date
Float       → doublePrecision       DateTime    → timestamp with tz
Select      → varchar(100)          Link        → varchar(255)
Check       → boolean               JSON        → jsonb (pg) / text (sqlite)
Password    → text (bcrypt hash)    Color       → varchar(7)
Geolocation → 2 cols: _lat decimal(9,6), _lng decimal(9,6)
AutoName    → varchar(255) PK
```

### Key function signatures
```typescript
// codegen.ts
export function generateDrizzleSchema(
  schema: SchematypeDefinition<string>,
  dialect: 'postgres' | 'sqlite'
): DrizzleTableResult

interface DrizzleTableResult {
  table: PgTable | SQLiteTable
  columns: Record<string, ColumnDef>
  childTables: string[]        // ChildTable field → separate table names
  systemColumns: string[]      // id, created_at, updated_at, etc.
}

// column-map.ts
export function mapFieldToColumn(field: FieldDefinition, dialect: 'postgres' | 'sqlite'): ColumnDef
```

### Test first (RED)
```
generateDrizzleSchema()
  ✓ generates table with all system columns (id, created_at, updated_at, created_by, modified_by, owner, docstatus)
  ✓ maps Currency to decimal(20,9) — NEVER floating point
  ✓ maps Int to bigint
  ✓ maps Check to boolean with default
  ✓ maps Geolocation to two decimal columns (_lat, _lng)
  ✓ maps JSON to jsonb for postgres, text for sqlite
  ✓ generates ChildTable as separate table with parent_id FK + idx column
  ✓ AutoName field becomes varchar(255) primary key
  ✓ required fields get .notNull() constraint
  ✓ Link field generates varchar(255) (FK reference stored as name string)

SQL injection safety
  ✓ table/column names are sanitized (no special chars)
  ✓ no raw SQL string construction in codegen output
```

### Green condition
All tests pass. Both Postgres and SQLite column mappings verified.

### Security checkpoint
- [ ] SQL injection test: `'; DROP TABLE users; --` in field names → rejected
- [ ] No raw SQL string construction — only Drizzle query builder
- [ ] SQLite adapter enforces same constraints as Postgres
- [ ] All column types have explicit length limits

---

## TASK 4 — Migration runner

**Branch:** `feat/phase1-task4-migrations`
**Package:** `packages/core`
**Depends on:** Task 3

### Files to create

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `packages/core/src/migration/__tests__/differ.test.ts` | Schema diff tests |
| CREATE | `packages/core/src/migration/__tests__/runner.test.ts` | Migration runner tests |
| CREATE | `packages/core/src/migration/types.ts` | `SchemaChange`, `MigrationRecord` types |
| CREATE | `packages/core/src/migration/differ.ts` | `diffSchemas(current, target)` → `SchemaChange[]` |
| CREATE | `packages/core/src/migration/generator.ts` | `SchemaChange[]` → SQL statements |
| CREATE | `packages/core/src/migration/runner.ts` | `runMigrations(db, schematypes, opts)` — transactional executor |
| CREATE | `packages/core/src/migration/history.ts` | `_forge_migrations` table: record, check, idempotency |

### Key function signatures
```typescript
// differ.ts
export function diffSchemas(current: DatabaseSnapshot, target: DatabaseSnapshot): SchemaChange[]
// CRITICAL: never returns { type: 'drop_column' } unless opts.prune === true

// runner.ts
export async function runMigrations(
  db: DrizzleDb,
  schematypes: SchematypeDefinition<string>[],
  opts?: { dryRun?: boolean; prune?: boolean; confirmSiteName?: string }
): Promise<MigrationResult>
// prune requires confirmSiteName to match actual site name
```

### Test first (RED)
```
diffSchemas()
  ✓ detects new table (schema added)
  ✓ detects new column (field added)
  ✓ detects column type change (safe cast)
  ✓ NEVER generates drop_column automatically
  ✓ generates warn_removed_column for removed fields
  ✓ with prune=true + confirmSiteName match: generates drop_column

runMigrations()
  ✓ executes in transaction — rolls back on error (partial changes NOT applied)
  ✓ is idempotent — running twice doesn't re-apply
  ✓ records migration in _forge_migrations table with hash + timestamp
  ✓ dry-run mode returns SQL without executing
  ✓ prune without confirmSiteName throws error
```

### Green condition
All tests pass. Migration runner proven safe against data loss.

### Security checkpoint
- [ ] `--prune` requires typed site name confirmation
- [ ] Migrations execute in DB transaction (rollback tested)
- [ ] Migration history prevents re-runs
- [ ] Dry-run never writes (verified by mock)

---

## TASK 5 — Multi-tenancy runtime

**Branch:** `feat/phase1-task5-multitenancy`
**Package:** `packages/core`
**Depends on:** Task 3
**CRITICAL TASK — tenant isolation is non-negotiable**

### Files to create

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `packages/core/src/__tests__/isolation/tenant-isolation.test.ts` | **MANDATORY** isolation suite |
| CREATE | `packages/core/src/tenancy/__tests__/context.test.ts` | Context API tests |
| CREATE | `packages/core/src/tenancy/__tests__/site-resolver.test.ts` | Resolver tests |
| CREATE | `packages/core/src/tenancy/types.ts` | `SiteConfig`, `SiteContext`, `ForgeContext` types |
| CREATE | `packages/core/src/tenancy/site-config.ts` | Zod schema for site config + loader |
| CREATE | `packages/core/src/tenancy/site-resolver.ts` | Host → SiteConfig lookup (Redis cache → DB fallback) |
| CREATE | `packages/core/src/tenancy/context.ts` | `AsyncLocalStorage` context + `forge.context()` / `forge.db` / `forge.user` / `forge.site` API |
| CREATE | `packages/core/src/tenancy/pool-manager.ts` | Per-tenant connection pool: min 2, max by plan (5/15/50) |
| CREATE | `packages/core/src/tenancy/namespaced-redis.ts` | Auto-prefixed Redis wrapper: `{site-id}:{key}` |
| CREATE | `packages/core/src/testing/helpers.ts` | `createTestSite()`, `createTestTenant()` test utilities |
| MODIFY | `packages/core/package.json` | Add `ioredis` |

### Key function signatures
```typescript
// context.ts
const storage = new AsyncLocalStorage<SiteContext>()

export const forge = {
  context(): SiteContext          // throws if outside request/job scope
  get db(): DrizzleDb             // shorthand for context().db
  get user(): UserContext          // shorthand for context().user
  get site(): SiteConfig           // shorthand for context().site
  get cache(): NamespacedRedis     // shorthand for context().redis
  hasModule(pkg: string): boolean
  flag(key: string): boolean
}

export function runInSiteContext<T>(site: SiteConfig, fn: () => T | Promise<T>): Promise<T>

// pool-manager.ts
export class PoolManager {
  get(siteId: string): DrizzleDb   // returns pooled connection, creates if needed
  close(siteId: string): void
  closeAll(): void
}

// namespaced-redis.ts
export class NamespacedRedis {
  constructor(client: Redis, namespace: string)
  get(key: string): Promise<string | null>     // actual key: {namespace}:{key}
  set(key: string, value: string, ttlMs?: number): Promise<void>
  del(key: string): Promise<void>
  // Raw client NEVER exposed to application code
}
```

### Test first (RED) — CRITICAL ISOLATION SUITE
```
CRITICAL: Cross-tenant data isolation
  ✓ cannot read tenant2 documents from tenant1 context
  ✓ cannot write to tenant2 DB from tenant1 context
  ✓ forge.db always returns current tenant's connection (never another tenant's)
  ✓ Redis keys are namespaced per tenant (tenant1 can't read tenant2's cache)
  ✓ forge.context() outside request scope throws descriptive error
  ✓ AsyncLocalStorage context is frozen after injection (Object.freeze)
  ✓ PoolManager never returns connection from different tenant

Site resolver
  ✓ resolves known host to SiteConfig
  ✓ returns null/404 for unknown host (never 500, never leaks valid hosts)
  ✓ caches result in Redis with 60s TTL
  ✓ cache invalidation works on site config update
```

### Green condition
**ALL isolation tests pass — 100% mandatory.** Context API works. Pool manager returns correct per-tenant connections.

### Security checkpoint
- [ ] **ALL isolation tests pass** — hard blocker
- [ ] AsyncLocalStorage context frozen with `Object.freeze()`
- [ ] Connection pool returns error (not wrong connection) when exhausted
- [ ] Site resolver returns 404 for unknown hosts — never exposes valid host list
- [ ] Redis site config cache invalidated on config change
- [ ] NamespacedRedis never exposes raw ioredis client

---

## TASK 6 — Auth system

**Branch:** `feat/phase1-task6-auth`
**Package:** `packages/core`
**Depends on:** Task 5 (needs tenant context for per-tenant session storage)

### Files to create

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `packages/core/src/auth/__tests__/session.test.ts` | Session security tests |
| CREATE | `packages/core/src/auth/__tests__/api-key.test.ts` | API key tests |
| CREATE | `packages/core/src/auth/__tests__/rbac.test.ts` | RBAC tests |
| CREATE | `packages/core/src/auth/__tests__/brute-force.test.ts` | Lockout tests |
| CREATE | `packages/core/src/auth/types.ts` | `Session`, `ApiKey`, `UserContext`, `Role` types |
| CREATE | `packages/core/src/auth/session.ts` | Create/validate/invalidate sessions |
| CREATE | `packages/core/src/auth/api-key.ts` | Create/validate API keys (bcrypt, never return plaintext) |
| CREATE | `packages/core/src/auth/rbac.ts` | Role assignment + `forge.permissions.check()` |
| CREATE | `packages/core/src/auth/brute-force.ts` | Redis-backed failed attempt counter + 15-min lockout |
| CREATE | `packages/core/src/auth/middleware.ts` | Fastify `onRequest` hook: validate session/API key, set `forge.user` |
| MODIFY | `packages/core/package.json` | Add `bcrypt`, `@types/bcrypt` (or `bcryptjs` for Windows compat) |

### Key function signatures
```typescript
// session.ts
export async function createSession(userId: string, siteId: string): Promise<{ id: string; token: string }>
// token = crypto.randomBytes(16).toString('hex') — 128-bit, NOT uuid
// stored as bcrypt(token, 10) in DB

export async function validateSession(token: string, siteId: string): Promise<UserContext>
// uses bcrypt.compare (constant-time) — NOT === comparison

export async function invalidateSession(sessionId: string): Promise<void>

// api-key.ts
export async function createApiKey(
  userId: string, siteId: string, scope: 'read' | 'read-write' | 'full'
): Promise<{ id: string; key: string }>
// key returned ONCE at creation, then never again

export async function validateApiKey(key: string, siteId: string): Promise<UserContext>

// rbac.ts
export function checkPermission(
  user: UserContext, action: PermAction, schematype: string, doc?: unknown
): boolean
```

### DECISION NEEDED: bcrypt vs bcryptjs
> `bcrypt` (native C++ addon) requires node-gyp + build tools on Windows.
> `bcryptjs` is pure JS, ~30% slower but zero native deps.
> **Recommendation:** Use `bcryptjs` for dev portability. Benchmark in prod to decide if native `bcrypt` is needed. Both use same algorithm + hash format.
> **Awaiting your decision.**

### Test first (RED)
```
Session security
  ✓ token is 128-bit random hex (not UUID, no dashes)
  ✓ stored token is bcrypt hash, not plaintext ($2b$ prefix)
  ✓ validateSession uses bcrypt.compare (timing attack resistance)
  ✓ expired sessions return 401
  ✓ tampered tokens are rejected
  ✓ session invalidated on password change
  ✓ session cookie: httpOnly=true, sameSite='strict', secure in production

API key security
  ✓ key returned only once at creation — subsequent reads return null
  ✓ stored as bcrypt hash
  ✓ scope enforcement: read-only key cannot write

Brute force protection
  ✓ locks after 5 failed attempts for 15 minutes
  ✓ lockout is per-user, not global
  ✓ successful login resets counter

RBAC
  ✓ Administrator role has all permissions
  ✓ Guest role has no write permissions by default
  ✓ if_owner restricts to document owner
  ✓ most permissive rule wins when user has multiple roles
```

### Green condition
All auth tests pass. Sessions are bcrypt-stored. Brute force protection works.

### Security checkpoint
- [ ] 128-bit random token (not UUID)
- [ ] bcrypt(10 rounds) for storage
- [ ] httpOnly + sameSite + secure cookie
- [ ] API keys never returned after creation
- [ ] Brute force lockout: 5 fails → 15-min lock
- [ ] Constant-time comparison via bcrypt.compare

---

## TASK 7 — Fastify server + auto-routes

**Branch:** `feat/phase1-task7-server`
**Package:** `packages/core`
**Depends on:** Task 6 (auth middleware), Task 3 (ORM for CRUD routes)

### Files to create

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `packages/core/src/server/__tests__/routes.test.ts` | REST API tests |
| CREATE | `packages/core/src/server/__tests__/security.test.ts` | Security header + rate limit tests |
| CREATE | `packages/core/src/server/app.ts` | Fastify instance factory + plugin registration |
| CREATE | `packages/core/src/server/plugins/tenant.ts` | onRequest: resolve site, inject context |
| CREATE | `packages/core/src/server/plugins/auth.ts` | onRequest: validate session/key, set user |
| CREATE | `packages/core/src/server/plugins/error-handler.ts` | Error serializer: generic to client, full to Pino |
| CREATE | `packages/core/src/server/routes/resource.ts` | Auto-generated CRUD: GET/POST/PUT/DELETE `/api/resource/{Name}` |
| CREATE | `packages/core/src/server/routes/method.ts` | `POST /api/method/{path}` for whitelisted functions |
| CREATE | `packages/core/src/logger.ts` | Pino logger with redact config (password, api_key, db_url, token, secret) |
| MODIFY | `packages/core/package.json` | Add `fastify`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/jwt`, `@fastify/multipart`, `pino` |

### Key function signatures
```typescript
// app.ts
export async function createForgeServer(opts?: ServerOptions): Promise<FastifyInstance>

// routes/resource.ts
export function registerResourceRoutes(
  app: FastifyInstance,
  registry: SchemaRegistry
): void
// Generates: GET, POST, GET/:name, PUT/:name, DELETE/:name, POST/:name/submit, POST/:name/cancel

// Response envelope (from spec)
interface ApiResponse<T> {
  data: T | null
  message?: string
  errors?: Array<{ field: string; message: string }>
}
```

### Test first (RED)
```
Auto-generated REST routes
  ✓ GET /api/resource/TestDoc returns { data: [], total: 0, page: 1 }
  ✓ POST /api/resource/TestDoc creates document, returns 201
  ✓ GET /api/resource/TestDoc/:name returns single doc
  ✓ PUT /api/resource/TestDoc/:name updates document
  ✓ DELETE /api/resource/TestDoc/:name returns 200
  ✓ returns 403 when user lacks permission
  ✓ returns 404 for non-existent schematype
  ✓ returns generic error (no stack trace) on 500
  ✓ response body matches { data, message?, errors? } envelope

Security
  ✓ @fastify/helmet sets HSTS, X-Content-Type-Options, X-Frame-Options
  ✓ rate limit: 429 after 100 unauthenticated requests
  ✓ request body size limited to 10MB
  ✓ all routes require auth by default
  ✓ sensitive fields excluded from response when user lacks field permission
  ✓ Pino redacts password, api_key, db_url, token, secret from logs
```

### Green condition
All route tests pass. Security headers verified. Rate limiting works.

### Security checkpoint
- [ ] @fastify/helmet with strict CSP
- [ ] Rate limiting: 100/1000/10 per tier
- [ ] CORS: explicit whitelist, no `origin: '*'`
- [ ] Body size limit: 10MB
- [ ] Generic error to client, full detail to Pino only
- [ ] All routes auth-required by default
- [ ] Permission check before every DB operation

---

## TASK 8 — BullMQ job queues

**Branch:** `feat/phase1-task8-queues`
**Package:** `packages/core`
**Depends on:** Task 5 (tenant context for queue namespacing)

### Files to create

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `packages/core/src/queue/__tests__/queue.test.ts` | Queue tests |
| CREATE | `packages/core/src/queue/types.ts` | `JobPayload`, `QueuePriority` types |
| CREATE | `packages/core/src/queue/manager.ts` | `QueueManager`: create/get namespaced queues per tenant |
| CREATE | `packages/core/src/queue/worker.ts` | Worker factory with context restoration from job snapshot |
| CREATE | `packages/core/src/queue/enqueue.ts` | `forge.enqueue()` implementation |
| MODIFY | `packages/core/package.json` | Add `bullmq` |

### Key function signatures
```typescript
// manager.ts
export class QueueManager {
  getQueue(siteId: string, priority: 'high' | 'default' | 'low'): Queue
  // Queue name: {siteId}:forge:{priority}
}

// enqueue.ts
export async function enqueue(
  priority: 'high' | 'default' | 'low',
  jobName: string,
  data: unknown
): Promise<Job>
// Automatically captures SiteContext snapshot + user ID
// Retry: exponential backoff 1s, 5s, 30s — max 3 attempts — then DLQ

// worker.ts
export function createWorker(
  priority: 'high' | 'default' | 'low',
  handlers: Record<string, JobHandler>
): Worker
// Restores SiteContext from job payload before calling handler
```

### Test first (RED)
```
Queue management
  ✓ queue names contain site-id prefix: "tenant-1:forge:default"
  ✓ different tenants get different queues
  ✓ enqueue captures site context snapshot in job data
  ✓ worker restores site context before processing
  ✓ after 3 failed retries, job moves to DLQ
  ✓ job data never contains raw DB credentials
  ✓ expired/invalid context snapshot in job → job fails loudly
```

### Green condition
All queue tests pass. Tenant isolation for queues proven.

### Security checkpoint
- [ ] Queue names contain site-id prefix
- [ ] Job data never contains DB credentials
- [ ] Context snapshot validated before use
- [ ] Sensitive fields redacted from BullMQ logs
- [ ] DLQ captures failed jobs after 3 retries

---

## TASK 9 — forge-cli Phase 1 commands

**Branch:** `feat/phase1-task9-cli`
**Package:** `packages/cli`
**Depends on:** Tasks 3, 4, 5 (uses ORM, migrations, tenancy)

### Files to create

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `packages/cli/src/__tests__/cli.test.ts` | CLI command tests |
| CREATE | `packages/cli/src/__tests__/init.test.ts` | `forge init` E2E test |
| CREATE | `packages/cli/src/index.ts` | CLI entry point (Commander.js program) |
| CREATE | `packages/cli/src/commands/init.ts` | `forge init <name>` — scaffold workspace |
| CREATE | `packages/cli/src/commands/start.ts` | `forge start` — dev server |
| CREATE | `packages/cli/src/commands/build.ts` | `forge build` — production build |
| CREATE | `packages/cli/src/commands/site-new.ts` | `forge site new <host>` — provision tenant |
| CREATE | `packages/cli/src/commands/site-list.ts` | `forge site list` |
| CREATE | `packages/cli/src/commands/site-drop.ts` | `forge site drop <host> --confirm` |
| CREATE | `packages/cli/src/commands/migrate.ts` | `forge migrate [--site] [--dry-run] [--prune]` |
| CREATE | `packages/cli/src/commands/console.ts` | `forge console` — REPL |
| CREATE | `packages/cli/src/commands/doctor.ts` | `forge doctor` — health check |
| CREATE | `packages/cli/src/utils/paths.ts` | Cross-platform path utilities (path.join, never `/`) |
| MODIFY | `packages/cli/package.json` | Add `commander`, `inquirer`, `chalk`, `ora`, `cli-table3` |

### Windows compatibility (from spec)
- All paths via `path.join()` — never string concatenation with `/`
- All file ops via Node.js `fs` API — never shell commands
- Works in: CMD, PowerShell, Git Bash, WSL

### Test first (RED)
```
forge init
  ✓ creates workspace directory with expected structure
  ✓ package.json has correct workspace scripts
  ✓ .gitignore excludes .env, sites/*/site.json
  ✓ works on Windows paths (backslashes)

forge site new
  ✓ creates site directory with site.json
  ✓ site.json contains required config fields

forge site drop
  ✓ requires --confirm flag (exits with error without it)
  ✓ requires typed site name confirmation

forge migrate
  ✓ --dry-run shows SQL without executing
  ✓ --prune requires --confirm + site name

forge doctor
  ✓ checks Node version >= 20
  ✓ reports missing services gracefully
```

### Green condition
CLI tests pass. `forge init` creates valid workspace. All commands handle Windows paths.

### Security checkpoint
- [ ] `forge site drop` requires `--confirm` AND typed site name
- [ ] No secrets printed to stdout (passwords masked as `***`)
- [ ] Docker Compose uses generated random passwords (not hardcoded)
- [ ] Cross-platform: no Unix-specific path.sep or shell syntax

---

## TASK 10 — Integration tests + documentation

**Branch:** `feat/phase1-task10-integration`
**Package:** Root + `packages/core`
**Depends on:** All previous tasks (7, 8, 9)

### Files to create

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `tests/integration/tenant-isolation.test.ts` | 5-concurrent-tenant test |
| CREATE | `tests/integration/full-lifecycle.test.ts` | Create site → define schema → migrate → CRUD → auth |
| CREATE | `packages/core/README.md` | @forge/core documentation |
| CREATE | `packages/cli/README.md` | forge-cli documentation |
| MODIFY | `.plan/progress.md` | Phase 1 completion status |

### Test first (RED)
```
5 concurrent tenants
  ✓ 1000 requests across 5 tenants without cross-contamination
  ✓ each tenant sees only their own documents (200 each)
  ✓ concurrent writes don't corrupt tenant isolation

Full lifecycle
  ✓ define schema → generate Drizzle table → run migration → CRUD via REST API
  ✓ auth: login → session → authenticated request → logout
  ✓ permission: admin can write, guest cannot
  ✓ hook lifecycle: beforeSave fires, afterSave fires
```

### Green condition
All integration tests pass. 5-tenant concurrency test proves isolation at scale.

### Security checkpoint
- [ ] Integration tests cover: auth + permissions + tenant isolation + API security
- [ ] No test credentials leaked into committed code
- [ ] All Phase 1 security checklist items verified

---

## DECISION NEEDED — Summary

| # | Decision | Recommendation | Impact |
|---|----------|----------------|--------|
| 1 | **bcrypt vs bcryptjs** | `bcryptjs` (pure JS, zero native deps, Windows-friendly) | Task 6 — auth |
| 2 | **Session store: Lucia Auth vs custom?** | Custom (simpler, spec already defines the model — Lucia adds complexity for what we need) | Task 6 — auth |
| 3 | **Drizzle schema generation: runtime or build-time?** | Runtime (schemas loaded at startup, tables generated dynamically per tenant's installed modules) | Task 3 — ORM |
| 4 | **SQLite in-memory for ALL unit tests?** | Yes — fast, isolated, no Docker needed for unit tests. Postgres only for integration tests. | Tasks 3-10 |
| 5 | **BullMQ testing: mock or real Redis?** | Mock (`ioredis-mock`) for unit tests. Real Redis (testcontainers) for integration tests only. | Task 8 |

---

## Estimated File Count

| Task | New files | Modified files |
|------|-----------|----------------|
| 1 | 3 | 4 |
| 2 | 7 | 2 |
| 3 | 6 | 1 |
| 4 | 6 | 0 |
| 5 | 9 | 1 |
| 6 | 9 | 1 |
| 7 | 9 | 1 |
| 8 | 5 | 1 |
| 9 | 13 | 1 |
| 10 | 4 | 1 |
| **Total** | **71** | **13** |
