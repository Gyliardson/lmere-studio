# L'Mere Studio documentation

This directory contains the technical documentation behind the concise repository landing page. `README.md` at the repository root is the canonical English overview; deeper implementation, verification, release, and media procedures live here.

## Documentation map

| Area | Document | Purpose |
| --- | --- | --- |
| Architecture | [Architecture boundaries](architecture/ARCHITECTURE.md) | Runtime shape, authority boundaries, admin decomposition, and maintainability decisions. |
| Assurance | [Quality and test gates](assurance/QUALITY.md) | Static, PostgreSQL, browser, security-analysis, and regression evidence. |
| Operations | [Release and clean-room verification](operations/RELEASE.md) | Exact-SHA candidate verification, clean-room sequence, and manual merge boundary. |
| Operations | [Reproducible portfolio media](operations/MEDIA.md) | Deterministic screenshot prerequisites, capture contract, outputs, and review expectations. |
| Languages | [Português](i18n/pt-BR/README.md) · [日本語](i18n/ja/README.md) · [Español](i18n/es/README.md) | Natural-language equivalents of the canonical project overview. |
| Media | [`media/`](media/) | Committed portfolio assets; generated capture output remains governed by the media runbook. |

## Information architecture

```text
docs/
├── README.md
├── architecture/
│   └── ARCHITECTURE.md
├── assurance/
│   └── QUALITY.md
├── operations/
│   ├── RELEASE.md
│   └── MEDIA.md
├── i18n/
│   ├── pt-BR/README.md
│   ├── ja/README.md
│   └── es/README.md
└── media/
    └── portfolio/
```

## Reading paths

For application boundaries, start with [Architecture](architecture/ARCHITECTURE.md), then use [Quality](assurance/QUALITY.md) to see how those contracts are exercised. For candidate/release work, follow [Release and clean-room verification](operations/RELEASE.md). For screenshot generation or refresh work, use [Reproducible portfolio media](operations/MEDIA.md).

## Documentation policy

- GitHub `master` is the source of truth for current repository documentation.
- The root README stays concise and visitor-oriented; operational detail belongs in this documentation tree.
- English remains canonical at the repository root. Portuguese, Japanese, and Spanish overviews preserve semantic equivalence without requiring literal translation.
- Documentation claims should remain bounded to behavior that can be traced to source, schema, tests, workflows, or environment contracts.
- Media binaries are not replaced merely to change documentation structure; refreshes follow the dedicated media workflow and manual review contract.

[Back to the project overview](../README.md)
