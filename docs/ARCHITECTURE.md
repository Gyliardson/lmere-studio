# Architecture boundaries

This document records the repository's maintainability boundaries. It is intentionally small: the goal is to make ownership and authority clear without introducing a framework around a compact Next.js application.

## Runtime shape

```text
Next.js route entries
  -> public storefront / authenticated admin client
  -> API routes
  -> server-side validation, authorization and business rules
  -> Prisma
  -> PostgreSQL
```

The browser is never the authority for tenant identity, persisted pricing, availability, deposit amounts or cross-resource ownership. Those decisions remain in the API/domain layer and PostgreSQL constraints/transactions.

## Admin client decomposition

`src/app/admin/page.tsx` is the thin App Router entry. It delegates the client application to `AdminApp.tsx`.

`AdminApp.tsx` owns only application-shell concerns:

- session restoration, login and logout;
- current tenant presentation data returned by the authenticated session;
- desktop/mobile navigation;
- the transient toast surface;
- selecting and composing the active admin section.

Feature modules own their local UI state and calls to the already-protected admin API surface:

- `orders/AdminOrdersSection.tsx` — order list/filtering, detail dialog and status workflow;
- `menu/AdminMenuSection.tsx` — size, flavor and add-on CRUD/forms;
- `calendar/AdminCalendarSection.tsx` — weekly schedule and blocked dates;
- `settings/AdminSettingsSections.tsx` — branding, feature/deposit/capacity/lead-time settings and tenant custom-field configuration;
- `components/AdminControls.tsx` — complex interaction primitives reused by multiple admin modules: modal focus management, confirmation dialog, currency/select controls and bounded image input.

These modules are UI boundaries, not security boundaries. They do not replace server-side session verification, tenant scoping, ownership checks, validation or database constraints.

## State-management decision

The admin remains deliberately React-local. No Redux/Zustand store, generic repository layer, dependency-injection container or custom component framework is introduced because the current cross-section coordination requirement is limited to authenticated tenant context, navigation and toast feedback.

A heavier abstraction should only be reconsidered if future features create demonstrated shared-state or orchestration pressure that local state and focused hooks cannot represent cleanly.

## API/domain authority

Protected admin routes derive tenant identity from the verified admin session. Request-provided tenant IDs are not trusted as authorization.

Public order creation resolves active tenant/catalog resources server-side, validates canonical tenant custom-field answers, business dates and capacity, recalculates financial values, and persists inside the established PostgreSQL transaction/idempotency contract. Historical order meaning is preserved through server-created snapshots rather than reconstructed from mutable current catalog/custom-field configuration.

Database migrations and deterministic two-tenant fixtures are part of the reproducibility boundary. CI must continue to prove empty-database migration, fixture bootstrap, integration assertions, application smoke and browser regressions after architecture-only refactors.

## Verification expectations

Moving code between modules is considered behavior-preserving only when the existing risk-focused gates remain green. In particular:

- lint, typecheck, unit tests, Prisma validation and production build;
- production dependency audit, full-history secret scan and CodeQL JavaScript/TypeScript SAST with auditable SARIF;
- disposable PostgreSQL migration/seed/integration/application smoke;
- authenticated Tenant A/Tenant B isolation and CRUD/invariant regressions;
- admin session restore/logout/revocation behavior;
- Playwright desktop/mobile, representative axe scans, keyboard, focus, dialog and combobox regressions;
- clean-room installation/build/start/health/test sequence.

Architecture refactors must not weaken these gates to accommodate file movement.
