# Quality and test gates

The portfolio professionalization branch uses reproducible automated gates rather than manual confidence.

## Local static checks

Use Node.js 22 or newer, install the locked dependencies, generate Prisma Client, and run `npm run quality`.

The quality command covers ESLint, TypeScript typechecking, risk-focused unit tests, Prisma validation, and the production build. The GitHub Actions Quality workflow additionally performs dependency auditing and database/application smoke verification.

## PostgreSQL integration

CI provisions PostgreSQL 16 without using live Neon credentials. It verifies an empty database can receive the committed migrations, deterministic Tenant A and Tenant B fixtures, database integration assertions, and a production application start that queries the disposable database.

The relevant test fixtures are `prisma/ci-seed.sql` and `prisma/ci-integration.sql`.

## Browser E2E

Playwright is intentionally separate from demo/media capture. After preparing the test database and production build, run `npm run test:e2e`.

`playwright.config.ts` defines deterministic desktop and mobile Chromium projects, `pt-BR` locale, the `America/Sao_Paulo` timezone, and retained trace/screenshot/video evidence on failures.

Current browser smoke coverage proves that the deterministic Tenant A storefront loads without Tenant B fixture leakage, a missing tenant reaches the expected error state, and critical storefront landmarks/primary action are exposed through accessible roles on desktop and mobile.

The accessibility smoke is a foundation check, not a claim of complete WCAG certification. Deeper keyboard, focus, contrast, dialog, and automated axe coverage belongs to subsequent UI/accessibility work.

## Security gates

The Quality workflow blocks high/critical production dependency audit findings. A separate read-only Gitleaks workflow scans pull-request changes for secrets. Application authorization and tenant isolation remain behavior-level concerns and must be proved by dedicated tests.

## Failure policy

Do not remove meaningful tests, suppress relevant lint rules, loosen authorization, or mark failures flaky merely to make CI green. Diagnose the first real cause, preserve useful evidence, and fix the underlying implementation or test assumption.
