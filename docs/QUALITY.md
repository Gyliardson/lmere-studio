# Quality and test gates

The portfolio professionalization branch uses reproducible automated gates rather than manual confidence.

## Local static checks

Use Node.js 22 or newer, install the locked dependencies, generate Prisma Client, and run `npm run quality`.

The quality command covers ESLint, TypeScript typechecking, risk-focused unit tests, Prisma validation, and the production build. GitHub Actions additionally performs dependency auditing and database/application smoke verification.

## PostgreSQL integration

CI provisions PostgreSQL 16 without live Neon credentials. It verifies an empty database can receive committed migrations, deterministic Tenant A and Tenant B fixtures, database integration assertions, and a production application start against the disposable database.

The relevant fixtures are `prisma/ci-seed.sql` and `prisma/ci-integration.sql`.

## Browser E2E

Playwright is separate from demo/media capture. After preparing the test database and production build, run `npm run test:e2e`.

`playwright.config.ts` defines deterministic desktop and mobile Chromium projects, `pt-BR` locale, the `America/Sao_Paulo` timezone, and retained trace/screenshot/video evidence on failures.

Current coverage includes storefront loading, missing-tenant behavior, baseline accessible roles, protected-admin unauthenticated paths, real synthetic admin login, signed Tenant A != Tenant B isolation through the Next.js admin APIs, and the `/admin` browser session lifecycle. Cross-tenant tests verify that request-controlled tenant identifiers cannot redirect tested reads and that foreign menu, blocked-date, and order mutations are rejected. Browser lifecycle tests exercise signed-session restoration after reload and server-backed logout persistence across a subsequent reload on desktop and mobile.

The accessibility smoke is a foundation check, not a claim of complete WCAG certification. Deeper keyboard, focus, contrast, dialog, and axe coverage belongs to later UI/accessibility work.

## Public order integrity

Public order creation is server-authoritative. `/api/orders` resolves active catalog resources within the submitted tenant, recalculates subtotal and deposit from persisted data, enforces filling limits, validates blocked/closed/lead-time/capacity rules, and persists the order inside a serializable transaction. Tenant-scoped idempotency keys protect one submit/retry window from duplicate persistence without treating a later intentional identical order as a replay.

The storefront labels browser calculations as estimates until the POST succeeds. During submission it disables the WhatsApp action, exposes an accessible `submitting`, `confirmed`, or structured `error` status, and opens at most one handoff for the in-flight attempt. The confirmed status and WhatsApp message use the server-returned order ID and financial values. Phone shape is validated in both the browser and server, while lead-time uses the `America/Sao_Paulo` business calendar and the tenant-configured `minLeadDays`.

PostgreSQL/API/browser coverage includes manipulated client pricing, cross-tenant/stale catalog IDs, inactive/invalid catalog paths, filling limits, deposit modes, blocked dates, closed weekdays, lead time, capacity, concurrent submissions, idempotent retries, later intentional identical submissions, invalid phones, one-POST/one-handoff double-submit behavior, and recoverable server rejection feedback.

## Security gates

The Quality workflow blocks high/critical production dependency findings. A separate read-only Gitleaks workflow scans pull-request changes for secrets.

Admin authentication uses an expiry-bound signed HttpOnly cookie, and protected admin routes derive tenant identity from the verified session. Unit and PostgreSQL-backed E2E tests cover malformed/tampered/expired sessions, unauthenticated requests, valid synthetic login, authenticated tenant isolation, browser session restoration, and server-backed logout. Production session cookies are required to be `Secure`, `HttpOnly`, and `SameSite=Strict` and are scoped to `/api/admin`.

Sensitive public writes are additionally throttled at the application boundary using two dimensions. Admin login has a broad 24-attempt/15-minute source ceiling plus an 8-attempt/15-minute source+tenant ceiling. Public order creation has a broad 60-attempt/10-minute source ceiling plus a 30-attempt/10-minute source+tenant ceiling. The broader ceiling prevents tenant cycling from becoming a bypass, while the narrower tenant dimension avoids one tenant unnecessarily consuming another tenant's normal allowance.

Buckets live in PostgreSQL rather than process memory, so enforcement survives ephemeral/serverless app instances. Counter increments use a single database upsert and remain atomic under concurrent requests. Source addresses are HMAC-fingerprinted before persistence; raw IP addresses are not stored in rate-limit rows. Vercel's deployment-controlled forwarded client header is preferred. Other production reverse proxies must explicitly opt in to trusting `X-Forwarded-For` only when they overwrite that header themselves. Limited requests return HTTP 429, `Retry-After`, and rate-limit metadata headers. Fixed-window boundary bursts remain a documented proportional limitation.

Focused E2E coverage proves repeated invalid logins against Tenant A are bounded while the same source can still access Tenant B below the broader source ceiling. A concurrent 40-request order burst for Tenant A must admit exactly the configured first 30 attempts and return 429 for the remainder, while Tenant B and an independent source remain unaffected below the broader ceiling.

## Failure policy

Do not remove meaningful tests, suppress relevant lint rules, loosen authorization, or mark failures flaky merely to make CI green. Diagnose the first real cause, preserve useful evidence, and fix the implementation or test assumption.
