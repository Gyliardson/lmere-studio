# Release and clean-room verification

This document defines the durable repository-owned release and verification contract for future changes targeting `master`. PR #27 completed the historical professionalization promotion to `master`; this guide governs later candidates and does not authorize any merge. Final merge remains an explicit maintainer decision.

## Exact-SHA release principle

Release evidence belongs to an immutable candidate commit, not merely to a branch or pull request name. After the last intended commit, capture the full candidate SHA and evaluate required checks on that exact SHA. Any subsequent file or commit change creates a new candidate and invalidates check/review conclusions tied to the previous SHA.

A successful run from an earlier SHA must not be used as evidence for a later candidate. External deployment status, when available, is recorded separately and does not replace repository-owned gates.

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

External deployment configuration is intentionally not stored as secret material in this repository. A successful Vercel preview proves the application can build/deploy in that environment, but it does not replace Quality, full-history Secret Scan, E2E, Clean Room or CodeQL verification.

## Media evidence contract

Documentation media must use the reproducible path documented in `docs/MEDIA.md`. Generated capture output and the curated `docs/media/portfolio/` subset are the current visual-evidence surfaces. When a change affects those surfaces, deterministic capture must remain reproducible and the resulting evidence must be manually inspected before publication.

Media evidence is supplemental to behavioral verification: a successful capture does not replace functional, security, database or clean-room gates.

## GitHub governance and merge policy

Future release candidates are proposed through pull requests targeting `master`. Immediately before certification, revalidate the live base ref, pull-request head SHA and applicable workflow results so that review evidence cannot silently drift from the candidate being considered.

Repository branch protection/rulesets are governance controls outside application correctness. Their live state may be rechecked at release time, but absence or configuration changes must not be treated as permission to bypass the exact-SHA verification contract.

Merge is always a manual maintainer decision. Automated checks certify evidence; they do not authorize merge by themselves.

## Candidate release checklist

Before a maintainer considers merge:

- [ ] the full candidate SHA was captured after the final intended commit;
- [ ] all repository-owned workflows applicable to the pull request are green on that exact candidate SHA;
- [ ] Quality is green on that SHA;
- [ ] full-history Secret Scan is green on that SHA;
- [ ] E2E is green on that SHA;
- [ ] CodeQL JavaScript/TypeScript analysis completed on that SHA and post-processed SARIF has no unresolved material P0/P1 finding;
- [ ] Clean Room is green on that SHA;
- [ ] Media Capture is green on that SHA when the workflow is applicable, and deterministic visual evidence has been inspected where relevant;
- [ ] live deployment/environment requirements are documented and no production secret appears in repository history/artifacts;
- [ ] any observed Vercel preview/status is recorded separately for the same candidate SHA;
- [ ] no open P0/P1 or release blocker remains;
- [ ] the final candidate-vs-`master` diff has received review appropriate to its change risk;
- [ ] residual P2 items, if any, are documented without expanding the release scope;
- [ ] the pull request remains unmerged until explicit maintainer authorization.

## Post-merge exact-master proof

A future merge does not complete release verification by itself. Capture the new full `master` SHA produced by the merge and require every repository-owned workflow configured for `push` to `master` to complete successfully on that exact SHA before branch/ref cleanup or retirement of an integration branch begins.

With the current workflow topology, that post-merge proof consists of Quality, E2E, Secret Scan, Clean Room and CodeQL. Media Capture is pull-request/manual only and is therefore not required as a `push`-to-`master` gate. If Vercel publishes a deployment status for the new `master` SHA, record it separately; it does not substitute for repository-owned checks.
