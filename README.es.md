# life-os

> Sistema personal de gestión de vida con IA — OKRs, hábitos, seguimiento de tiempo, agenda inteligente y revisión semanal

![CI](https://github.com/mariomina/life-os/actions/workflows/ci.yml/badge.svg)
![Tests](https://img.shields.io/badge/tests-678%20pasando-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

[🇺🇸 English version](./README.md)

---

## ¿Qué es life-os?

**life-os** es un sistema de productividad personal full-stack que integra inteligencia artificial para ayudarte a gestionar tu vida con claridad e intención. Conecta tus objetivos a largo plazo (OKRs) con tus hábitos diarios, rastrea el tiempo invertido en proyectos y áreas, procesa tu inbox de forma inteligente y entrega revisiones semanales con insights generados por IA — todo en una interfaz unificada.

Diseñado para quien quiere operar con el rigor de un equipo de alto rendimiento, pero aplicado a su propia vida.

---

## Funcionalidades

| Módulo                  | Descripción                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Áreas de Vida**       | Define los dominios de tu vida (Salud, Carrera, Finanzas, etc.) y monitorea su salud con el modelo de puntuación Maslow                                                                             |
| **OKRs**                | Define Objetivos y Resultados Clave trimestrales vinculados a tus áreas — sigue el progreso con CCR (Completion-to-Commitment Ratio)                                                                |
| **Hábitos**             | Seguimiento diario de hábitos con métricas de consistencia, rachas y análisis de correlaciones                                                                                                      |
| **Proyectos**           | Gestiona proyectos con tareas y pasos vinculados a áreas y OKRs                                                                                                                                     |
| **Calendario y Agenda** | Programa actividades con sugerencias de horarios asistidas por IA según tus patrones de energía                                                                                                     |
| **Inbox**               | Captura cualquier cosa — la IA clasifica los items y los redirige al módulo correcto                                                                                                                |
| **Habilidades**         | Rastrea el desarrollo de habilidades con niveles de progresión, puntos XP y detección de habilidades emergentes                                                                                     |
| **Informes e Insights** | Reportes semanales y periódicos con insights en lenguaje natural generados por Claude — consistencia de hábitos, progreso OKR, análisis de correlaciones y métricas de apalancamiento de agentes IA |
| **Revisión Semanal**    | Wizard guiado de 4 fases (Medir → Analizar → Planificar → Confirmar) para reflexión semanal estructurada                                                                                            |

---

## Stack Tecnológico

| Capa              | Tecnología                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Framework**     | [Next.js 16](https://nextjs.org/) (App Router, Server Actions, RSC)                                                |
| **UI**            | [React 19](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Base de datos** | [Supabase](https://supabase.com/) (PostgreSQL) + [Drizzle ORM](https://orm.drizzle.team/)                          |
| **Autenticación** | [Supabase Auth](https://supabase.com/docs/guides/auth) (server-side, SSR)                                          |
| **IA**            | [Anthropic Claude](https://www.anthropic.com/) via `@anthropic-ai/sdk` (insights + clasificación de inbox)         |
| **Lenguaje**      | [TypeScript 5](https://www.typescriptlang.org/) (modo estricto)                                                    |
| **Testing**       | [Vitest](https://vitest.dev/) — 678 tests                                                                          |
| **Deploy**        | [Vercel](https://vercel.com/)                                                                                      |

---

## Arquitectura

```
app/                    Next.js App Router (páginas, layouts, rutas API)
├── (app)/              Rutas autenticadas
│   ├── dashboard/      Dashboard principal con resumen de salud por área
│   ├── areas/          Gestión de áreas de vida
│   ├── okrs/           Seguimiento de OKRs
│   ├── habits/         Tracker de hábitos
│   ├── projects/       Gestión de proyectos y tareas
│   ├── calendar/       Vista de calendario y agenda
│   ├── inbox/          Captura y procesamiento del inbox
│   ├── skills/         Progresión de habilidades
│   ├── reports/        Analítica e insights con IA
│   └── weekly-review/  Wizard de revisión semanal guiado
├── (auth)/             Páginas de autenticación (login, registro)
actions/                Server Actions de Next.js (capa de lógica de negocio)
features/               Lógica de negocio pura (funciones de dominio + tests)
├── maslow/             Puntuación de salud de áreas (modelo Maslow)
├── reports/            Cálculos de informes (hábitos, OKRs, correlaciones, leverage)
├── correlations/       Motor de correlaciones estadísticas
└── skills/             Nivel de habilidades + detección emergente
lib/
├── db/                 Drizzle ORM schema + queries
├── supabase/           Cliente Supabase (server + browser)
└── llm/                Abstracción de proveedor LLM (ILLMProvider + ClaudeProvider)
components/             Componentes React compartidos (shadcn/ui + custom)
types/                  Definiciones de tipos TypeScript
supabase/               Migraciones de base de datos
docs/
├── prd.md              Documento de Requisitos del Producto
├── architecture.md     Visión general de arquitectura
├── prd/                Secciones del PRD por épica
└── architecture/       Registros de decisiones de arquitectura
```

---

## Inicio Rápido

### Prerrequisitos

- Node.js 18+
- Un proyecto en [Supabase](https://supabase.com/)
- (Opcional) Una [API key de Anthropic](https://console.anthropic.com/) para funciones de IA

### Configuración

```bash
# 1. Clonar el repositorio
git clone https://github.com/mariomina/life-os.git
cd life-os

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase

# 4. Aplicar migraciones de base de datos
npx supabase db push

# 5. Iniciar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) para ver la app.

---

## Variables de Entorno

| Variable                        | Requerida | Descripción                                                                           |
| ------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Sí        | URL de tu proyecto Supabase                                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí        | Clave anónima (pública) de Supabase                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Sí        | Clave de rol de servicio (solo server-side)                                           |
| `ANTHROPIC_API_KEY`             | No        | API key de Anthropic para insights IA (usa mensajes estáticos si no está configurada) |
| `NEXT_PUBLIC_LLM_PROVIDER`      | No        | Proveedor LLM: `claude` o `mock` (por defecto: `mock`)                                |

---

## Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Verificación de tipos
npm run typecheck

# Linting
npm run lint
```

El proyecto cuenta con **678 tests** que cubren toda la lógica de negocio, casos borde y cálculos de dominio.

---

## Deploy

### Vercel (recomendado)

1. Haz push a GitHub
2. Importa el repositorio en [Vercel](https://vercel.com/new)
3. Añade las variables de entorno en el dashboard de Vercel
4. Despliega

### Base de datos

Ejecuta las migraciones de Supabase contra tu base de datos de producción:

```bash
npx supabase db push --linked
```

---

## Licencia

MIT
