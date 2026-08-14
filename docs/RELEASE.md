# Release and clean-room verification

This document defines the repository-owned release proof for L'Mere Studio. It does **not** authorize merging `portfolio/revamp-2026` into `master`; the final promotion remains a manual review step.

## What clean-room means here

The verification starts from a fresh checkout with no prepared `node_modules`, generated Prisma client, database schema, seed data, build output or browser installation. A disposable PostgreSQL 16 instance is created separately from production/Neon.

The expected sequence is:

```text
fresh checkout
→ npm ci
→ Prisma generate
→ empty PostgreSQL
→ committed migrations
→ deterministic Tenant A/B fixtures
→ database integration assertions
→ schema validation + unit tests
→ production build
→ application runtime smoke
→ Chromium install
→ isolated Playwright E2E
```

GitHub Actions workflow `.github/workflows/clean-room.yml` executes this sequence in one job so later steps cannot accidentally depend on state from another CI job.

## Required environment

Use Node.js 22+ and PostgreSQL 16 (or a compatible PostgreSQL service). Copy `.env.example` only for local development; never commit real secrets.

Required runtime values:

- `POSTGRES_PRISMA_URL` — PostgreSQL connection used by Prisma tooling and application runtime.
- `ADMIN_SESSION_SECRET` — unique secret material of at least 32 bytes for signed admin sessions.
- `RATE_LIMIT_SECRET` — optional dedicated HMAC key for rate-limit source fingerprints. If absent, the application uses `ADMIN_SESSION_SECRET` with domain separation.

Deployment-specific optional value:

- `RATE_LIMIT_TRUST_X_FORWARDED_FOR=true` only behind a trusted reverse proxy that **overwrites** `X-Forwarded-For`. Vercel uses its deployment-controlled forwarded client address path and does not require this opt-in.

## Local clean-room sequence

The commands below assume a newly created empty database and a valid test-only `.env`.

```bash
npm ci
npm run db:generate
npm run db:migrate
npx prisma db execute --file prisma/ci-seed.sql --config=prisma.config.ts
npm run test:integration:db
npm run db:validate
npm run test:unit
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

For deterministic E2E isolation, CI resets persistent rate-limit fixture state before each spec. Local runs against the same test database should do the same when repeatedly exercising throttling scenarios:

```bash
npx prisma db execute --file prisma/ci-reset-rate-limits.sql --config=prisma.config.ts
```

## Runtime smoke

A release proof must verify that the built application can actually query the disposable database, not merely compile against the schema. The clean-room workflow starts `npm start`, waits for `/api/tenants/ci-tenant-a`, and requires:

- HTTP 200 for the deterministic Tenant A;
- no `adminPasswordHash` in the public response;
- Tenant A deterministic catalog resources present;
- no Tenant B resource leakage;
- HTTP 404 for an unknown tenant.

This mirrors the existing Quality application smoke but keeps the proof in the same clean-room job as migrations and E2E.

## Database bootstrap contract

Committed migrations are canonical for empty-database bootstrap:

```bash
npm run db:migrate
```

`npm run db:push` remains a development-only convenience and is not a production, CI or release bootstrap strategy. CI never requires a live Neon credential.

## Deployment contract

The repository is compatible with ordinary PostgreSQL TCP locally/CI and a Neon PostgreSQL connection in production through `POSTGRES_PRISMA_URL` and `@prisma/adapter-pg`.

A production/preview deployment must provide at least:

- `POSTGRES_PRISMA_URL`;
- `ADMIN_SESSION_SECRET`;
- optionally a distinct `RATE_LIMIT_SECRET`.

External deployment configuration is intentionally not stored as secret material in this repository. A successful Vercel preview proves the application can build/deploy in that environment, but it does not replace Quality, Secret Scan, E2E or clean-room verification.

## GitHub governance

The live repository state must be rechecked immediately before the final `portfolio/revamp-2026 → master` PR.

At the time this release guide was introduced:

- `master` was reported by GitHub as `protected: false`;
- the repository rulesets API returned no rulesets.

Therefore the repository currently relies on process discipline rather than an enforced branch rule to prevent direct writes/premature promotion. Before final certification, prefer a GitHub ruleset/branch-protection policy for `master` that requires pull requests and the relevant exact-head status checks when the account/repository plan supports it. If enforcement cannot be configured through the available plan or tooling, record that limitation explicitly in the final PR and keep the final merge manual.

## Release checklist

Before final certification:

- [ ] clean-room workflow is green on the exact candidate integration SHA;
- [ ] Quality is green on that SHA;
- [ ] full-history Secret Scan is green on that SHA;
- [ ] E2E is green on that SHA;
- [ ] deterministic visual/media evidence has been inspected where applicable;
- [ ] live deployment/environment requirements are documented and no production secret appears in repository history/artifacts;
- [ ] live branch/ruleset state has been rechecked;
- [ ] no open P0/P1 or release blocker remains;
- [ ] integration-vs-`master` diff has received an adversarial final audit;
- [ ] final PR documents residual risks and any manual external steps;
- [ ] final PR remains unmerged for independent/user review.
