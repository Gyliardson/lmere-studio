# Changelog

All notable changes to the L'Mere Studio project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
