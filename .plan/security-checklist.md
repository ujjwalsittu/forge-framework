# Forge Framework — Security Checklist
# Every item must be checked before marking a task complete.

## Universal Checks (every task, every commit)

- [ ] No `eval()` or `new Function()` anywhere in added/modified code
- [ ] No SQL string interpolation — Drizzle parameterized queries only
- [ ] No hardcoded secrets, passwords, or API keys in code or config files
- [ ] No `console.log` with sensitive data (use `logger` with `redact` config)
- [ ] No `any` TypeScript type — use `unknown` + type guards
- [ ] All external input (HTTP body, query params, headers, file uploads) validated with Zod
- [ ] No unhandled promise rejections — all async errors caught
- [ ] pnpm audit shows no high/critical vulnerabilities in added dependencies

---

## Phase 1 Security Checkpoints

### Task 2 — Schematype interface
- [ ] Zod validators reject all invalid field configurations (not just valid ones)
- [ ] Field type 'Password' generates a hash-only column — never plaintext
- [ ] Field type 'Sensitive' fields are redacted from all Pino log output
- [ ] defineSchema() is a pure function — no side effects, no IO

### Task 3 — Drizzle adapters
- [ ] SQL injection test: attempt `'; DROP TABLE users; --` in every field type — must fail
- [ ] No raw SQL string construction anywhere — only Drizzle's query builder
- [ ] SQLite adapter enforces the same constraints as Postgres adapter
- [ ] All column types have explicit length limits (no unbounded VARCHAR)

### Task 4 — Migration runner
- [ ] Migrations NEVER auto-drop columns — verified with unit test
- [ ] `--prune` flag requires: typed site name confirmation + `--confirm` flag
- [ ] Migrations are executed in a DB transaction — test that partial failure rolls back
- [ ] Migration history in `_forge_migrations` table prevents re-running same migration
- [ ] Dry-run mode reads but never writes — verified by mocking DB connection

### Task 5 — Multi-tenancy runtime
- [ ] CRITICAL: Cross-tenant isolation test suite passes 100%
  - [ ] Cannot read another tenant's documents via forge.getDoc()
  - [ ] Cannot write to another tenant's DB via forge.saveDoc()
  - [ ] Cannot access another tenant's Redis keys (attempt to access unprefixed key throws)
  - [ ] Cannot enqueue jobs in another tenant's queue
  - [ ] Cannot receive another tenant's WebSocket events
- [ ] AsyncLocalStorage context is frozen (Object.freeze) after injection
- [ ] Site resolver returns 404 for unknown hosts — never 500
- [ ] Redis site config cache invalidated correctly on site.json update
- [ ] Connection pool never returns a connection from a different tenant

### Task 6 — Auth system
- [ ] Session token: 128-bit random (crypto.randomBytes(16).toString('hex')) — NOT uuid()
- [ ] Session stored as bcrypt hash (10 rounds) in DB — never plaintext
- [ ] Session cookie: httpOnly=true, sameSite='strict', secure=true (in production)
- [ ] API keys: bcrypt stored, never returned by API after creation (null the field before response)
- [ ] Brute force protection: 5 auth failures → 15-minute lockout (Redis-backed counter)
- [ ] Session invalidated on: password change, explicit logout, admin revocation
- [ ] Test: expired sessions return 401, not 500
- [ ] Test: tampered session tokens are rejected
- [ ] Test: timing attack resistance — verify constant-time comparison for API key validation

### Task 7 — Fastify server + routes
- [ ] @fastify/helmet installed and configured with strict CSP
- [ ] @fastify/rate-limit: 100/min unauthenticated, 1000/min authenticated, 10/min on /auth/*
- [ ] CORS: explicit whitelist in .env — no `origin: '*'` in production
- [ ] Request body size limit: 10MB (configurable, never unlimited)
- [ ] All error responses: generic message to client, full detail to Pino logger only
- [ ] Stack traces NEVER sent to client (Fastify errorHandler strips them)
- [ ] All routes require authentication by default — explicit `{ auth: false }` to opt-out
- [ ] Permission check before every DB operation — test that unauthorized requests return 403

### Task 8 — BullMQ queues
- [ ] Queue names contain site-id prefix — verified unit test
- [ ] Job data never contains raw DB credentials
- [ ] Worker crash does not affect HTTP server (separate process isolation test)
- [ ] Job context snapshot validated before use — invalid snapshots fail loudly
- [ ] Sensitive fields in job data redacted from BullMQ logs
- [ ] Dead-letter queue for failed jobs — test that after 3 retries, job goes to DLQ

### Task 9 — forge-cli
- [ ] `forge site drop` requires `--confirm` AND typed site name — cannot be bypassed
- [ ] No secrets printed to stdout (DB passwords, API keys masked as ***)
- [ ] Docker Compose template uses random generated passwords (not hardcoded defaults)
- [ ] CLI works on: macOS, Linux, Windows (no Unix-specific path.sep or shell syntax)
- [ ] forge init creates a .gitignore that excludes .env, sites/*/site.json

---

## Phase 2 Security Checkpoints

### forge-ui components
- [ ] No dangerouslySetInnerHTML anywhere
- [ ] Rich text editor (LongText/Markdown fields): DOMPurify sanitization on render
- [ ] No user-controlled URLs in href/src without validation (prevent javascript: URLs)
- [ ] File upload component: MIME type validated client-side (magic bytes not just extension)
- [ ] Accessibility: no autofocus on modal open that traps keyboard users unexpectedly

### @forge/desk
- [ ] Field-level hidden fields never rendered in DOM (not just CSS display:none)
- [ ] No sensitive field values in HTML data attributes
- [ ] CSRF protection on all mutating operations (Fastify CSRF plugin)
- [ ] No session token in URL parameters (only httpOnly cookies)

---

## Phase 3 Security Checkpoints

### @forge/permissions
- [ ] Permission check is O(1) lookup after cache warm — no N+1 DB queries per field
- [ ] `if_condition` ABAC expressions executed in isolated-vm sandbox
- [ ] No way to escape the sandbox via __proto__ or constructor manipulation
- [ ] permissionQuery output is a Drizzle SQL fragment — never raw string interpolation

### @forge/workflow
- [ ] Workflow condition expressions in isolated-vm (same as ABAC)
- [ ] Email actions cannot send to arbitrary addresses — only field values from the document
- [ ] Workflow transitions cannot call external URLs (no HTTP in workflow actions without explicit integration hook)

### @forge/print
- [ ] Handlebars template context is sandboxed — no access to Node.js `process`, `fs`, `require`
- [ ] Puppeteer runs in sandbox mode (`--no-sandbox` is NOT acceptable in production)
- [ ] PDF generation timeout: 30 seconds — never hangs indefinitely
- [ ] Generated PDFs do not embed JavaScript
- [ ] Print format templates cannot include `<script>` tags — stripped before rendering

### @forge/reports
- [ ] QueryReport uses a read-only DB user (separate Postgres user with SELECT-only permission)
- [ ] Query execution timeout: 30 seconds
- [ ] LIMIT enforced on all queries: max 50,000 rows
- [ ] No DDL/DML statements allowed in query (checked by static analysis before execution)
- [ ] Script reports executed in isolated-vm — no file system or network access

---

## Phase 4 Security Checkpoints

### @forge/erp
- [ ] All monetary calculations use Decimal.js — ESLint rule enforced
- [ ] Double-entry validation: journal entry debit total === credit total — throws if not balanced
- [ ] Financial records cannot be deleted if they have GL entries — checked in beforeDelete hook
- [ ] Submitted documents cannot be modified — docstatus check in beforeSave
- [ ] PAN/Aadhaar/bank account fields marked sensitive — excluded from API responses by default

### @forge/hr
- [ ] Payroll calculations use Decimal.js
- [ ] Tax computations use official formula from IT Act — test with known salary examples
- [ ] Employee bank details (account number, IFSC) are sensitive fields — never logged
- [ ] Payroll run is idempotent — running the same period twice should not create duplicate payslips

---

## Phase 5 Security Checkpoints

### forge-agent
- [ ] Every request verified via HMAC-SHA256 — test that invalid signatures return 401
- [ ] HMAC secret rotation works without restart
- [ ] No direct shell execution from API (no `exec()`) — all operations via Node.js APIs
- [ ] Backup archives encrypted before upload (AES-256-GCM)
- [ ] Agent port (7777) not exposed publicly — behind firewall, accessible only from control plane IP
- [ ] All agent operations logged with source IP and timestamp

### forge-cloud
- [ ] Tenant provisioning is idempotent — safe to retry on failure
- [ ] Cloud provider API keys stored encrypted in DB (not plaintext)
- [ ] Payment webhook signatures verified (Razorpay + Stripe)
- [ ] Marketplace app security scan must pass before publish (npm audit --audit-level=high)
- [ ] Customer data never leaves their designated region unless explicitly migrated
