# L'Mere Studio - Simulador de Pedidos de Pasteles & CMS Multi-Tenant

[![Versión](https://img.shields.io/badge/versi%C3%B3n-1.1.2-purple.svg)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.12-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.3.0-darkblue.svg)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Licencia](https://img.shields.io/badge/Licencia-Propietaria-red.svg)](LICENSE)

[English](README.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [Español](README.es.md)

L'Mere Studio es una aplicación Web Multi-Tenant Marca Blanca diseñada para pastelerías artesanales, reposterías y diseñadores de pasteles. Proporciona un Simulador de Pedidos interactivo en 5 pasos para clientes y un Panel de Administración CMS autoservicio para los propietarios.

---

## Demostración

### Simulador Público de Pedidos (Flujo Móvil)
<video src="./assets/lmere-studio-mobile-demo.mp4" controls="controls" muted="muted" width="100%"></video>

### Panel de Administración CMS (Flujo de Escritorio)
<video src="./assets/lmere-studio-desktop-demo.mp4" controls="controls" muted="muted" width="100%"></video>

## Capturas de Pantalla

<details>
<summary>Haz clic para ver la Galería</summary>
<br>

**Flujo del Cliente (Móvil)**
| Calendario y Tienda | Tamaño y Porciones | Sabores y Detalles |
| :---: | :---: | :---: |
| <img src="assets/01-mobile-storefront.png" width="250"> | <img src="assets/03-mobile-size-selected.png" width="250"> | <img src="assets/04-mobile-flavors-selected.png" width="250"> |

**Panel de Administración (Escritorio)**
| Kanban de Pedidos | Editor de Menú | Personalización de Marca |
| :---: | :---: | :---: |
| <img src="assets/08-desktop-admin-orders-kanban.png" width="250"> | <img src="assets/09-desktop-admin-menu.png" width="250"> | <img src="assets/11-desktop-admin-branding.png" width="250"> |

</details>

---

## Funcionalidades Principales

### Simulador Público de Pedidos (`/[slug]`)
- **Paso 1: Calendario del Evento**: Selección interactiva de fecha con validación automática de días bloqueados y tiempo mínimo de anticipación.
- **Paso 2: Tamaño y Porciones**: Recomendación de peso y porciones (Mini, Pequeño, Mediano, Grande) con precio base.
- **Paso 3: Masas, Rellenos y Adicionales**: Selección modular de masa, rellenos (únicos o múltiples), recargos por sabores especiales y complementos opcionales (toppers, empaques).
- **Paso 4: Detalles de Personalización**: Mensaje para la placa del pastel, instrucciones especiales y enlace de foto de referencia.
- **Paso 5: Resumen y Finalización**: Desglose de precios en tiempo real, cálculo automático de depósito (50%, 100% o solo cotización), copia de clave PIX en 1 clic y envío directo a WhatsApp.

### Panel de Administración CMS (`/admin`)
- **Gestión de Pedidos**: Control de estado tipo Kanban (Pendiente, Confirmado, Completado, Cancelado).
- **Gestión del Menú**: CRUD completo para tamaños de pasteles, masas, rellenos, adicionales y precios.
- **Control de Agenda**: Bloqueo y desbloqueo de fechas específicas en el calendario.
- **Personalización de Marca**: Configuración visual en tiempo real de logos, banners, colores principales y temas de fondo.
- **Configuraciones (Feature Flags)**: Interruptores para subir fotos, opciones de entrega y modos de pago de depósito.

---

## Arquitectura del Sistema

```mermaid
flowchart TD
    Customer(["Cliente"])
    Owner(["Repostero / Admin"])

    subgraph Frontend["Capa Frontend (Next.js 16 App Router)"]
        direction TD
        Simulator["Simulador Público de Pedidos"]
        CMS["Panel CMS Administrativo"]
        
        S1["1. Calendario"]
        S2["2. Tamaño y Porciones"]
        S3["3. Sabores y Extras"]
        S4["4. Detalles y Personalización"]
        S5["5. Resumen y WhatsApp"]

        M1["Kanban de Pedidos"]
        M2["Gestión de Menú"]
        M3["Control de Agenda"]
        M4["Personalizador de Marca"]
        M5["Configuraciones (Flags)"]

        Simulator --> S1
        Simulator --> S2
        Simulator --> S3
        Simulator --> S4
        Simulator --> S5

        CMS --> M1
        CMS --> M2
        CMS --> M3
        CMS --> M4
        CMS --> M5
    end

    subgraph Backend["Capa Backend y Datos"]
        direction TD
        APIPub["Rutas API Públicas"]
        APIAdm["Rutas API Admin"]
        ORM["Prisma 7 ORM"]
        DB[("Base de Datos SQLite")]

        APIPub ~~~ APIAdm
        APIPub --> ORM
        APIAdm --> ORM
        ORM --> DB
    end

    Customer -->|"Accede a /[slug]"| Simulator
    Owner -->|"Accede a /admin"| CMS

    Simulator --> APIPub
    CMS --> APIAdm

    classDef actor fill:#1e293b,stroke:#475569,color:#ffffff;
    classDef fe fill:#4f46e5,stroke:#3730a3,color:#ffffff;
    classDef be fill:#0f766e,stroke:#115e59,color:#ffffff;
    classDef db fill:#0369a1,stroke:#075985,color:#ffffff;

    class Customer,Owner actor;
    class Simulator,CMS,S1,S2,S3,S4,S5,M1,M2,M3,M4,M5 fe;
    class APIPub,APIAdm,ORM be;
    class DB db;
```

---

## Tecnologías Utilizadas

| Dominio | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Interfaz y Estilos | React 19, Tailwind CSS v4, Diseño Glassmorphism |
| Iconos | Lucide React (Sin emojis en toda la app) |
| Base de Datos | Prisma 7 ORM con `@prisma/adapter-better-sqlite3` |
| Seguridad | Encriptación Bcrypt |
| Lenguaje | TypeScript 5 (Modo Estricto) |

---

## Instalación y Configuración

### Requisitos previos
- Node.js 20.x o superior
- npm 10.x o superior

### Pasos de Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/usuario/lmere-studio.git
   cd lmere-studio
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```

4. Ejecutar la base de datos y el script de carga inicial:
   ```bash
   npx prisma db push --config=prisma.config.ts
   npm run db:seed
   ```

5. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

6. Abrir en el navegador:
   - **Simulador Público**: `http://localhost:3000/doce-arte`
   - **Panel de Admin**: `http://localhost:3000/admin` (Credenciales: Identificador: `doce-arte`, Contraseña: `admin123`)

---

## Licencia

Este software está protegido por una **Licencia Propietaria (Todos los Derechos Reservados)**. El uso comercial, redistribución o copia de código sin autorización previa está estrictamente prohibido. Consulte el archivo [LICENSE](LICENSE) para más información.
