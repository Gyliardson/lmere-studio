# L'Mere Studio — Multi-Tenant Cake Order Simulator & CMS

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)

[English](README.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [Español](README.es.md)

L'Mere Studio is a white-label, multi-tenant web application for artisan bakeries and cake designers. It combines a public cake-order flow with an administrative CMS for catalog, scheduling, branding, and order management.

> **Active engineering hardening:** this repository is undergoing the `portfolio/revamp-2026` professionalization program. The project is published as an engineering/portfolio project and is **not production-certified**. Current integration work is prepared on [`portfolio/revamp-2026`](../../tree/portfolio/revamp-2026) before any maintainer-approved final merge into `master`.

## Repository status

- `master` is the public default baseline and is not a release certification.
- `portfolio/revamp-2026` contains the active security, CI, database, accessibility, UX, documentation, and release-hardening work.
- GitHub Actions evidence must be evaluated on the exact commit being reviewed; repository visibility is not evidence that a release gate passed.
- Do not deploy this baseline with real customer data or production credentials without completing the remaining hardening and release validation.

## Security and credentials

Production secrets do not belong in Git. Local environment files are ignored by default; `.env.example` contains placeholders only.

The repository includes deterministic development/demo seed data. **All demo identities, contact details, and credentials are synthetic and local-development-only. Never reuse demo values in a public or production deployment.** Configure unique credentials and connection strings outside the repository for every real environment.

Do not point development seed scripts at a production database.

## Database/runtime baseline

The current source baseline is configured for **PostgreSQL** through Prisma and reads its database connection from `POSTGRES_PRISMA_URL`. Historical SQLite setup instructions have been retired because they no longer describe the repository state.

The professionalization branch contains the current migration, disposable-CI database, and security-validation work. During the hardening program, use the README and quality documentation on `portfolio/revamp-2026` as the authoritative development setup for that branch.

## Development during professionalization

```bash
git clone https://github.com/Gyliardson/lmere-studio.git
cd lmere-studio
git checkout portfolio/revamp-2026
npm ci
cp .env.example .env
```

Replace all placeholders in your local `.env` with development-only values, then follow the branch README and `docs/QUALITY.md` on `portfolio/revamp-2026` for database setup and validation commands.

## Project scope

The application includes a public multi-step order simulator and a tenant-scoped administrative CMS covering orders, menu/catalog data, schedule controls, branding, and feature configuration. Security, abuse controls, accessibility, reproducible media, clean-room validation, and architecture cleanup remain tracked by the active professionalization program until final certification.

## Media

Repository screenshots and demonstration media are portfolio artifacts generated from development/demo flows. They are not evidence of production readiness. Media refresh work is tracked separately by the professionalization program.

## License

This repository is publicly visible but **not open source**. The source code and associated materials remain under the [Proprietary Software License — All Rights Reserved](LICENSE). Public visibility does not grant permission to copy, redistribute, host, sublicense, or commercially use the software except where the license or copyright owner explicitly permits it.
