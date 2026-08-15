# Quality and test gates

The portfolio professionalization branch uses reproducible automated gates rather than manual confidence.

## Local static checks

Use Node.js 22 or newer, install the locked dependencies, generate Prisma Client, and run `npm run quality`.

The quality command covers ESLint, TypeScript typechecking, risk-focused unit tests, Prisma validation, and the production build. GitHub Actions additionally performs dependency auditing and database/application smoke verification.

## PostgreSQL integration

CI provisions PostgreSQL 16 without live Neon credentials. It verifies an empty database can receive committed migrations, deterministic Tenant A and Tenant B fixtures, database integration assertions, and a production application start against the disposable database. A separate synthetic session tenant isolates stateful logout/revocation regressions from the Tenant A/B domain fixtures. Dedicated `ci-custom-a` / `ci-custom-b` tenants isolate custom-field contract tests from the historical baseline fixtures.

The relevant fixtures are `prisma/ci-seed.sql` and `prisma/ci-integration.sql`.

## Browser E2E

Playwright is separate from demo/media capture. After preparing the test database and production build, run `npm run test:e2e`.

`playwright.config.ts` defines deterministic desktop and mobile Chromium projects, `pt-BR` locale, the `America/Sao_Paulo` timezone, and retained trace/screenshot/video evidence on failures.

Current coverage includes storefront loading, missing-tenant behavior, protected-admin unauthenticated paths, real synthetic admin login, signed Tenant A != Tenant B isolation through the Next.js admin APIs, and the `/admin` browser session lifecycle. Cross-tenant tests verify that request-controlled tenant identifiers cannot redirect tested reads and that foreign menu, blocked-date, order, and tenant-custom-field mutations are rejected. Browser lifecycle tests exercise signed-session restoration after reload, server-backed logout, replay rejection for a captured pre-logout token across protected admin API families, and successful issuance/use of a fresh session after revocation.

The accessibility/UX suite additionally exercises visible keyboard focus, reduced-motion behavior, semantic storefront progress and selections, accessible submission busy/error feedback, responsive overflow checks, authenticated admin keyboard traversal, modal/drawer Escape handling with focus trapping/restoration, custom combobox keyboard navigation, keyboard-reachable image upload controls, recoverable admin loader failures, canonical `America/Sao_Paulo` quick dates, and server-enforced critical white-label contrast. Deterministic desktop/mobile screenshots are emitted as review evidence for representative storefront and authenticated admin sections.

The E2E workflow also installs an exact `axe-core@4.12.1` browser runtime only for the browser-test job. Representative loaded, summary and error storefront states plus authenticated admin and edit-dialog states are scanned on desktop/mobile, and serious or critical axe violations fail that surface. Axe is intentionally supplemental: behavior-specific keyboard/focus/dialog/overflow tests remain independent requirements, and these automated checks are not a claim of complete WCAG conformance or a substitute for manual visual review.

## Tenant custom fields

Tenant-defined custom fields are a real white-label feature rather than metadata that the storefront ignores. The canonical definition source is the relational `Tenant.customFields` / `CustomField` model, which gives each field a stable ID and tenant ownership. The historical `featuresConfig.custom_fields` key is retained only as a read-compatible legacy shape and is normalized to an empty effective value so the application never has two active sources of truth. The equally dormant `enable_delivery_step` flag is normalized to `false`; no delivery step is advertised without an implemented product behavior.

The authenticated `/api/admin/custom-fields` boundary derives tenant identity only from the signed session and validates field count, label/type, required state, select options, duplicate labels, ownership on update/delete, and unknown keys. The public tenant endpoint publishes only the validated canonical definitions owned by that tenant.

The storefront renders text, select and number controls with programmatic labels and required-state gating. It sends only a stable-ID-to-value answer map. `/api/orders` reloads the current definitions for that tenant, rejects missing required values, forged/cross-tenant IDs, invalid select choices, invalid numbers and oversized text before persistence, and snapshots the validated `{ id, label, type, value }` tuples into the order `selectionSnapshot`. That snapshot, rather than mutable current configuration, is what the authenticated admin order detail and confirmed WhatsApp handoff use. Renaming or deleting a field later therefore does not rewrite historical order meaning.

Dedicated unit and PostgreSQL-backed Playwright coverage exercises definition validation, Tenant A != Tenant B field exposure, session-scoped admin CRUD, rejected invalid/forged answers with unchanged order counts, persisted historical snapshots, required browser controls, responsive storefront summary and the server-confirmed WhatsApp message.

## Public order integrity

Public order creation is server-authoritative. `/api/orders` resolves active catalog resources within the submitted tenant, recalculates subtotal and deposit from persisted data, enforces filling limits, validates blocked/closed/lead-time/capacity rules, validates current tenant custom-field answers, and persists the order inside a serializable transaction. Tenant-scoped idempotency keys protect one submit/retry window from duplicate persistence without treating a later intentional identical order as a replay.

Public customer free text also has an explicit application contract rather than inheriting hosting-layer body limits: customer names are limited to 120 characters, cake messages to 200, and order details/observations to 2000. The shared constants are browser-safe, but `/api/orders` remains authoritative and returns structured HTTP 422 responses before transaction/persistence when a boundary is exceeded. Browser submission performs the same check for earlier recoverable feedback.

The storefront labels browser calculations as estimates until the POST succeeds. During submission it disables the WhatsApp action, exposes an accessible `submitting`, `confirmed`, or structured `error` status, and opens at most one handoff for the in-flight attempt. The confirmed status and WhatsApp message use the server-returned order ID, financial values and validated custom-field snapshot. Phone shape is validated in both the browser and server, while lead-time uses the `America/Sao_Paulo` business calendar and the tenant-configured `minLeadDays`.

PostgreSQL/API/browser coverage includes manipulated client pricing, cross-tenant/stale catalog IDs, inactive/invalid catalog paths, filling limits, deposit modes, blocked dates, closed weekdays, lead time, capacity, concurrent submissions, idempotent retries, later intentional identical submissions, invalid phones, bounded customer text, custom-field negative paths, one-POST/one-handoff double-submit behavior, and recoverable server rejection feedback. Long-but-valid customer text is also exercised through responsive summary rendering and the confirmed WhatsApp handoff.

## Reference image contract

Reference images and tenant-managed catalog/branding images use one bounded validation contract across browser and server boundaries.

- embedded images are limited to PNG, JPEG or WEBP;
- embedded payloads are limited to 2 MiB decoded size;
- external references are limited to 2048 characters, must use HTTPS and cannot embed URL credentials;
- storefront and admin upload controls reject invalid MIME/size metadata before constructing a `FileReader`, so oversized files are not needlessly converted into larger base64 strings in browser memory;
- URL fields keep incomplete/invalid input as a local draft and expose recoverable inline feedback instead of committing it into persisted/application image state;
- API persistence paths revalidate the same contract rather than trusting browser validation;
- external image previews use `referrerPolicy="no-referrer"` where the URL can originate from customer-controlled reference data.

Browser regressions instrument `FileReader` to prove unsupported/oversized files are rejected before `readAsDataURL`, and API regressions verify invalid references do not leave persisted orders/settings/catalog records behind.

Allowing an external HTTPS image URL still means the viewing browser connects directly to that host, which can observe normal network metadata such as the viewer IP address and user agent. The application does not fetch these URLs server-side, so this is not an SSRF path. The authenticated admin document additionally restricts image sources with an admin-specific CSP so persisted external references are not automatically requested from that privileged browser surface.

## Security gates

The Quality workflow blocks high/critical production dependency findings. A separate read-only Gitleaks workflow scans full reachable Git history for secrets.

Admin authentication uses an expiry-bound signed HttpOnly cookie, and protected admin routes derive tenant identity from a session that is both cryptographically valid and checked against a server-stored tenant session generation. Logout atomically advances that generation before clearing the current browser cookie, invalidating previously copied tokens from the prior generation across protected admin routes. This intentionally revokes all concurrently issued admin sessions for that tenant; a subsequent successful login receives a token bound to the new generation. Unit and PostgreSQL-backed E2E tests cover malformed/tampered/expired sessions, unauthenticated requests, valid synthetic login, authenticated tenant isolation, browser session restoration, captured-token replay after logout, and fresh login after revocation. Production session cookies are required to be `Secure`, `HttpOnly`, and `SameSite=Strict` and are scoped to `/api/admin`.

The Next.js boundary also emits baseline browser hardening headers for every route: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy` for camera, microphone and geolocation. Playwright verifies those headers on representative public and admin surfaces. The authenticated admin document also carries a narrowly scoped image-source CSP; a broad application-wide CSP is deliberately not asserted without a nonce-aware Next.js policy.

Sensitive public writes are additionally throttled at the application boundary using two dimensions. Admin login has a broad 24-attempt/15-minute source ceiling plus an 8-attempt/15-minute source+tenant ceiling. Public order creation has a broad 60-attempt/10-minute source ceiling plus a 30-attempt/10-minute source+tenant ceiling. The broader ceiling prevents tenant cycling from becoming a bypass, while the narrower tenant dimension avoids one tenant unnecessarily consuming another tenant's normal allowance.

Buckets live in PostgreSQL rather than process memory, so enforcement survives ephemeral/serverless app instances. Counter increments use a single database upsert and remain atomic under concurrent requests. Source addresses are HMAC-fingerprinted before persistence; raw IP addresses are not stored in rate-limit rows. Vercel's deployment-controlled forwarded client header is preferred. Other production reverse proxies must explicitly opt in to trusting `X-Forwarded-For` only when they overwrite that header themselves. Limited requests return HTTP 429, `Retry-After`, and rate-limit metadata headers. Fixed-window boundary bursts remain a documented proportional limitation.

Focused E2E coverage proves repeated invalid logins against Tenant A are bounded while the same source can still access Tenant B below the broader source ceiling. A concurrent 40-request order burst for Tenant A must admit exactly the configured first 30 attempts and return 429 for the remainder, while Tenant B and an independent source remain unaffected below the broader ceiling.

## Failure policy

Do not remove meaningful tests, suppress relevant lint rules, loosen authorization, or mark failures flaky merely to make CI green. Diagnose the first real cause, preserve useful evidence, and fix the implementation or test assumption.
