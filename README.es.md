# L'Mere Studio — Simulador de Pedidos & CMS Multi-Tenant

[![Licencia](https://img.shields.io/badge/licencia-Propietaria-red.svg)](LICENSE)

[English](README.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [Español](README.es.md)

L'Mere Studio es una aplicación web white-label y multi-tenant para pastelerías artesanales y diseñadores de pasteles. Combina un flujo público de pedidos con un CMS administrativo para catálogo, agenda, identidad visual y gestión de pedidos.

> **Active engineering hardening:** este repositorio está pasando por el programa de profesionalización `portfolio/revamp-2026`. Se publica como proyecto de ingeniería/portafolio y **no está certificado para producción**. El trabajo de integración actual se prepara en [`portfolio/revamp-2026`](../../tree/portfolio/revamp-2026) antes de cualquier merge final aprobado por el mantenedor hacia `master`.

## Estado del repositorio

- `master` es la baseline pública/default y no representa una certificación de release.
- `portfolio/revamp-2026` contiene el hardening activo de seguridad, CI, base de datos, accesibilidad, UX, documentación y release.
- La evidencia de GitHub Actions debe evaluarse sobre el commit exacto bajo revisión; hacer público el repositorio no convierte gates pendientes en PASS.
- No despliegue esta baseline con datos reales de clientes o credenciales de producción antes de completar el hardening y la validación de release restantes.

## Seguridad y credenciales

Los secretos de producción no deben versionarse. Los archivos locales de entorno se ignoran por defecto y `.env.example` contiene únicamente placeholders.

El repositorio incluye datos deterministas para desarrollo/demo. **Todas las identidades, datos de contacto y credenciales de demostración son sintéticos y exclusivos para desarrollo local. Nunca reutilice valores de demo en un entorno público o de producción.** Configure credenciales y cadenas de conexión únicas fuera del repositorio para cada entorno real.

Nunca ejecute seeds de desarrollo contra una base de datos de producción.

## Base de datos / runtime

La baseline actual del código está configurada para **PostgreSQL** mediante Prisma y obtiene su conexión desde `POSTGRES_PRISMA_URL`. Las antiguas instrucciones de SQLite se retiraron porque ya no describen el estado del repositorio.

La rama de profesionalización contiene el trabajo actual de migraciones, base de datos desechable de CI y validación de seguridad. Durante el programa, utilice el README y `docs/QUALITY.md` de `portfolio/revamp-2026` como referencia autoritativa de configuración para esa rama.

## Desarrollo durante la profesionalización

```bash
git clone https://github.com/Gyliardson/lmere-studio.git
cd lmere-studio
git checkout portfolio/revamp-2026
npm ci
cp .env.example .env
```

Reemplace todos los placeholders de `.env` con valores exclusivos de desarrollo y siga la documentación de la rama para preparar la base de datos y ejecutar las validaciones.

## Alcance

La aplicación incluye un simulador público de pedidos en varias etapas y un CMS administrativo aislado por tenant para pedidos, catálogo, agenda, identidad visual y configuración. Seguridad adicional, controles de abuso, accesibilidad, medios reproducibles, validación clean-room y limpieza arquitectónica continúan rastreados por el programa antes de la certificación final.

## Medios

Las capturas y videos del repositorio son artefactos de portafolio generados a partir de flujos de desarrollo/demo. No constituyen evidencia de preparación para producción. La actualización final de medios se mantiene como trabajo separado del programa.

## Licencia

Este repositorio es públicamente visible, pero **no es open source**. El código fuente y los materiales asociados siguen sujetos a la [Licencia de Software Propietario — Todos los Derechos Reservados](LICENSE). La visibilidad pública no concede permiso para copiar, redistribuir, alojar, sublicenciar o explotar comercialmente el software salvo autorización explícita de la licencia o del titular de los derechos.
