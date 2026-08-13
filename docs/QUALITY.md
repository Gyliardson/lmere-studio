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

Current coverage includes storefront loading, missing-tenant behavior, baseline accessible roles, protected-admin unauthenticated paths, real synthetic admin login, and signed Tenant A != Tenant B isolation through the Next.js admin APIs. Cross-tenant tests verify that request-controlled tenant identifiers cannot redirect tested reads and that foreign menu, blocked-date, and order mutations are rejected.

The accessibility smoke is a foundation check, not a claim of complete WCAG certification. Deeper keyboard, focus, contrast, dialog, and axe coverage belongs to later UI/accessibility work.

## Security gates

The Quality workflow blocks high/critical production dependency findings. A separate read-only Gitleaks workflow scans pull-request changes for secrets.

Admin authentication uses an expiry-bound signed HttpOnly cookie, and protected admin routes derive tenant identity from the verified session. Unit and PostgreSQL-backed E2E tests cover malformed/tampered/expired sessions, unauthenticated requests, valid synthetic login, and authenticated tenant isolation.

The remaining #2 gap is client lifecycle behavior in `/admin`: restoring an existing valid session after refresh and invoking the server logout endpoint from the UI. Public order server-authority is tracked separately in #3 and is not implied by admin isolation tests.

## Failure policy

Do not remove meaningful tests, suppress relevant lint rules, loosen authorization, or mark failures flaky merely to make CI green. Diagnose the first real cause, preserve useful evidence, and fix the implementation or test assumption.
