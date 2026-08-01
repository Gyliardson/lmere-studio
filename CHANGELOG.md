# Changelog

All notable changes to the L'Mere Studio project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2026-08-01

### Fixed
- **Documentation Video Embeds**: Replaced placeholder user-attachments links with relative `<video>` HTML tags in all multi-language READMEs, ensuring local demo videos render natively without requiring external GitHub uploads.

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
