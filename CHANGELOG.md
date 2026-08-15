# Changelog

All notable changes to the L'Mere Studio project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — Portfolio professionalization

### Added
- **Reproducible quality gates**: GitHub Actions for lint, typecheck, unit tests, production dependency audit, Prisma validation, production build, disposable PostgreSQL integration/application smoke, Playwright E2E, full-history secret scanning and clean-room verification.
- **CodeQL SAST evidence**: JavaScript/TypeScript `security-and-quality` analysis with least-privilege permissions, completed SARIF processing and a short-retention post-processed SARIF artifact for audit.
- **PostgreSQL migration baseline**: committed migrations, deterministic Tenant A/Tenant B CI fixtures and real PostgreSQL integration assertions.
- **Server-authoritative order flow**: catalog/date/capacity validation, pricing/deposit recalculation, serializable persistence, bounded retries and tenant-scoped idempotency.
- **Canonical tenant custom fields**: tenant-owned text/select/number fields flow from authenticated admin configuration through storefront validation, server-side persistence snapshots, admin history and confirmed WhatsApp handoff.
- **Admin security model**: expiry-bound HMAC-signed HttpOnly sessions, persisted session-generation revocation, server-derived tenant identity, ownership checks and negative cross-tenant tests.
- **Persistent abuse controls**: privacy-preserving PostgreSQL-backed rate limiting for admin login and public order creation.
- **Bounded image-reference contract**: PNG/JPEG/WEBP Data URLs up to 2 MiB plus bounded credential-free HTTPS references, enforced at browser and API boundaries.
- **Bounded public order text**: server-owned limits for customer name, cake message and observations, with boundary tests and responsive long-content coverage.
- **Accessibility/robustness regressions**: desktop/mobile keyboard, focus, dialog, combobox, reduced-motion, responsive overflow, representative axe scans and state coverage.
- **Baseline response hardening**: anti-MIME-sniffing, clickjacking denial, strict-origin referrer policy and restrictive camera/microphone/geolocation permissions policy.
- **Release documentation**: architecture, quality, media and clean-room/release contracts under `docs/`.

### Changed
- **Database/runtime**: replaced the historical SQLite runtime with PostgreSQL/Neon-compatible `@prisma/adapter-pg` and canonical `POSTGRES_PRISMA_URL` configuration.
- **Admin architecture**: decomposed the former monolithic admin page into an authenticated shell plus focused orders, menu, calendar, settings and shared-control modules.
- **Storefront handoff**: WhatsApp handoff now follows confirmed server persistence/pricing rather than treating browser calculations as authoritative.
- **Documentation media**: replaced the historical video/FFmpeg and screenshot corpus with a deterministic Playwright capture pipeline and four curated portfolio images.
- **README state**: reconciled EN/PT-BR/ES/JA documentation with the implemented stack, security model, test strategy and manual release-promotion contract.
- **Public-repository hygiene**: preserved explicit local-secret/private-key ignore rules and proprietary wording compatible with publicly visible source.
- **Demo seed safety**: destructive synthetic demo seeding now fails closed in production, requires explicit opt-in and no longer prints the demo password value.

### Security
- Admin password hashes are omitted at Prisma query/update boundaries for public tenant and admin-settings responses rather than loaded and stripped afterward.
- Customer-controlled tenant/resource identifiers are not trusted for protected admin authorization.
- Logout advances the persisted tenant session generation so captured pre-logout admin tokens are rejected across protected API families.
- Public order pricing, deposit, active catalog membership, business dates and capacity are revalidated server-side.
- External reference images are never fetched server-side; direct-browser privacy implications are documented and privileged admin rendering is constrained.
- Public/admin persisted text and image inputs have explicit application-level bounds instead of relying on hosting-layer body limits.

### Removed
- SQLite drift and obsolete database bootstrap assumptions.
- Legacy video-generation scripts, prerecorded demo assets and superseded `docs/screenshots/` evidence.
- Dormant delivery-step behavior claims; the legacy flag is normalized disabled until a real delivery flow exists.

> Historical entries below describe the repository at the time each version was released. Later `Unreleased` changes intentionally supersede some older implementation details such as SQLite and the legacy video pipeline.

## [1.2.0] - 2026-08-02

### Added
- **Shadow Color Support**: Added `shadowColor` to tenants and theme presets, allowing customized glow and shadow effects distinct from primary and secondary colors.
- **Phone Formatting**: Added robust Brazilian phone number formatting (`formatPhoneBR`) and validation (`isValidPhoneBR`) utilities.
- **RGB Color Utilities**: Added `hexToRgb` utility to support dynamic CSS `rgba()` variable generation for brand shadow opacity and borders.

### Changed
- **Prisma Client Instantiation**: Improved Prisma client initialization in development environments to prevent connection exhaustion during hot-reloads.
- **Dynamic CSS Variables**: Upgraded `globals.css` to consume RGB values of tenant colors, enabling fine-grained opacity control for shadows, scrollbars, and hover states.
- **API Error Handling**: Refactored `PUT /api/admin/settings` error handling for better logging and type safety (`error instanceof Error`).
- **Simulator Client**: Refactored component structure in Simulator Client to integrate new phone formatting utilities.

## [1.1.2] - 2026-08-01

### Fixed
- **Documentation Video Embeds**: Replaced placeholder user-attachments links with relative `<video>` HTML tags in all multi-language READMEs, ensuring local demo videos render natively without requiring external GitHub uploads.
- **Architecture Mermaid Diagrams**: Replaced skewed graph layouts with professional, centered `flowchart TD` diagrams following strict `mermaid-diagram-expert` standards, custom `classDef` color palettes, and rank constraint links.

## [1.1.1] - 2026-08-01

### Added
- **Automated Media Generation**: Added a Playwright and FFmpeg pipeline (`scripts/record-demo.js` and `scripts/build-media.py`) for automated E2E testing recording, generating precise Mobile and Desktop demonstration videos with subtitles and background music.
- **Documentation Media Gallery**: Updated multi-language READMEs with the new separated video demos and a comprehensive screenshot gallery for the Mobile Customer Flow and the Desktop Admin Flow.

## [1.1.0] - 2026-08-01
- **Dynamic Theme & Brand Color Engine**: Replaced build-time Tailwind color tokens with runtime `:root` CSS custom properties and `@theme inline` utilities, allowing instant preset switching and real-time color customizers.
- **Custom Select Component (`CustomSelect`)**: Replaced native browser dropdowns in the Admin CMS with dark glassmorphism popovers with active state checkmarks and smooth transitions.
- **Custom Confirm Modal (`ConfirmModal`)**: Replaced native browser `confirm()` popups with styled dark glassmorphism confirmation dialogs.
- **Enhanced Date Blocking UX**: Added 1-click quick-preset buttons ("Hoje", "Amanhã") for rapid date blocking in the Admin Calendar.
- **Image Fallback Engine for Addons**: Added fallback icon containers (`Sparkles`) in both Simulator and Admin CMS so text-only addons render with the same visual harmony as photo addons.

### Changed
- **Admin Mobile UX Overhaul**: Redesigned Order Management cards, status filters, and drawer navigation for seamless usability on mobile devices (375px+).
- **Grid Alignment Fixes**: Aligned "Sabor Especial" checkbox height (46px) and label baselines with "Valor Adicional" input boxes across all edit modals.
- **Payload Sanitization**: Added strict field whitelist sanitization on `PUT /api/admin/menu` and `PUT /api/admin/settings` endpoints to eliminate Prisma relation mutation errors.
- **Grammar & Accent Corrections**: Corrected 100% of Portuguese accents (`Ateliê`, `Cardápio`, `Configurações`, `Observações`, `Preço`, `Subtotal`, `Informações`, `Indisponível`) across all UI strings, toast messages, and API error envelopes.

## [1.0.0] - 2026-08-01

### Added
- **Multi-Tenant Architecture**: Dynamic routing via `/[slug]`, multi-tenant isolation, and customizable branding per bakery.
- **5-Step Public Simulator**:
  - Interactive calendar with blocked dates validation and minimum advance notice rules.
  - Cake size and servings selector with dynamic weight and price calculations.
  - Dough, filling, and add-on builder with multi-selection support and special item badges.
  - Custom detail inputs including cake plaque message, extra instructions, and reference image URL.
  - Real-time order summary with deposit calculation (50% signal / 100% full / quote-only) and instant PIX key copying.
  - Direct WhatsApp order message integration formatted with full order breakdown.
- **Admin CMS Dashboard (`/admin`)**:
  - Secure authentication endpoint with bcrypt password hashing.
  - Order Management panel with status filtering (Pending, Confirmed, Completed, Cancelled).
  - Menu Manager CRUD for cake sizes, flavors (massas e recheios), and add-ons.
  - Calendar Control interface for blocking and unblocking specific dates.
  - Brand & Styling Editor for updating logos, banners, contact details, PIX keys, and custom CSS color themes.
  - Feature Flags configuration panel for toggling photo uploads, delivery steps, and deposit modes.
- **Design System & Aesthetics**:
  - Dark mode glassmorphism UI with smooth CSS animations.
  - Zero-emoji design policy enforced across UI and documentation using SVG / Lucide icons.
  - Responsive layouts optimized for mobile (375px) and desktop viewports.
- **Database & Backend**:
  - Next.js 16 (App Router) with React 19 and TypeScript.
  - Prisma 7 ORM with SQLite driver adapter (`@prisma/adapter-better-sqlite3`).
  - Automated seeding script (`prisma/seed.js`) generating demo tenant "Doce Arte Confeitaria".
