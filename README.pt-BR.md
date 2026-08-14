# L'Mere Studio — Simulador de Encomendas & CMS Multi-Tenant

[![Licença](https://img.shields.io/badge/licen%C3%A7a-Propriet%C3%A1ria-red.svg)](LICENSE)

[English](README.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [Español](README.es.md)

O L'Mere Studio é uma aplicação web white-label e multi-tenant para ateliês de confeitaria e cake designers. O projeto combina um fluxo público de encomendas com um CMS administrativo para catálogo, agenda, identidade visual e gestão de pedidos.

> **Active engineering hardening:** este repositório está passando pelo programa de profissionalização `portfolio/revamp-2026`. Ele é publicado como projeto de engenharia/portfólio e **não possui certificação de produção**. O trabalho atual de integração é preparado em [`portfolio/revamp-2026`](../../tree/portfolio/revamp-2026) antes de qualquer merge final aprovado pelo mantenedor em `master`.

## Estado do repositório

- `master` é a baseline pública/default e não representa certificação de release.
- `portfolio/revamp-2026` concentra o hardening ativo de segurança, CI, banco de dados, acessibilidade, UX, documentação e release.
- Evidências do GitHub Actions precisam ser avaliadas no commit exato em revisão; tornar o repositório público não transforma gates pendentes em PASS.
- Não implante esta baseline com dados reais de clientes ou credenciais de produção sem concluir o hardening e a validação de release restantes.

## Segurança e credenciais

Segredos de produção não devem ser versionados. Arquivos locais de ambiente são ignorados por padrão e `.env.example` contém somente placeholders.

O repositório possui dados determinísticos de seed para desenvolvimento/demonstração. **Todas as identidades, informações de contato e credenciais de demo são sintéticas e destinadas exclusivamente ao desenvolvimento local. Nunca reutilize valores de demo em ambiente público ou de produção.** Configure credenciais e connection strings únicas fora do repositório para qualquer ambiente real.

Nunca execute seeds de desenvolvimento contra um banco de produção.

## Banco de dados / runtime

A baseline atual do código está configurada para **PostgreSQL** via Prisma e lê a conexão em `POSTGRES_PRISMA_URL`. As antigas instruções de SQLite foram removidas porque não correspondem mais ao estado do repositório.

A branch de profissionalização contém o trabalho atual de migrations, banco descartável de CI e validação de segurança. Durante o programa, use o README e `docs/QUALITY.md` de `portfolio/revamp-2026` como referência autoritativa de setup para essa branch.

## Desenvolvimento durante a profissionalização

```bash
git clone https://github.com/Gyliardson/lmere-studio.git
cd lmere-studio
git checkout portfolio/revamp-2026
npm ci
cp .env.example .env
```

Substitua todos os placeholders do `.env` por valores exclusivos de desenvolvimento e siga a documentação da branch para preparar o banco e executar as validações.

## Escopo

A aplicação inclui um simulador público de encomendas em múltiplas etapas e um CMS administrativo isolado por tenant para pedidos, catálogo, agenda, identidade visual e configurações. Segurança adicional, controles de abuso, acessibilidade, mídia reproduzível, validação clean-room e limpeza arquitetural continuam rastreados pelo programa antes da certificação final.

## Mídia

Screenshots e vídeos do repositório são artefatos de portfólio gerados a partir de fluxos de desenvolvimento/demo. Eles não constituem evidência de prontidão para produção. A atualização final de mídia permanece rastreada separadamente.

## Licença

Este repositório é publicamente visível, mas **não é open source**. O código-fonte e os materiais associados continuam sob a [Licença de Software Proprietário — Todos os Direitos Reservados](LICENSE). A visibilidade pública não concede permissão para copiar, redistribuir, hospedar, sublicenciar ou explorar comercialmente o software fora do que for explicitamente autorizado pela licença ou pelo titular dos direitos.
