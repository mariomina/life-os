# life-os Product Requirements Document (PRD)

> **Generado por:** Morgan (Strategist) — @pm Agent
> **Fecha:** 2026-02-19
> **Estado:** v1.1 — Ready ✅
> **Validado por:** Pax (@po) — 2026-02-20
> **Basado en:** docs/brief.md v1.7 (Atlas — 2026-02-18)

---

## Change Log

| Fecha      | Versión | Descripción                                                                                                                                                                        | Autor        |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-02-19 | 0.1     | PRD inicial — basado en Brief v1.5                                                                                                                                                 | Morgan (@pm) |
| 2026-02-20 | 0.2     | FR1/FR2 actualizados con modelo Maslow D-Needs/B-Needs + multiplicadores de peso. FR17/FR18/FR19 agregados. Sección 4 Technical Assumptions completada.                            | Morgan (@pm) |
| 2026-02-20 | 0.3     | Arquitectura IA definida: score=código puro, calendarización=API directa+contexto, templates=predefinidas, correlaciones=estadístico. Integración vía API SDK (no MCP en MVP).     | Morgan (@pm) |
| 2026-02-20 | 0.4     | Librerías UI cerradas: big-calendar + TailAdmin + React Flow. NFR5 actualizado. Epic List definida (E1-E8).                                                                        | Morgan (@pm) |
| 2026-02-20 | 0.5     | Modelo unificado Steps=Activities (executor_type). FR5b/5c/5d/20/21 agregados. Templates AIOS-modeled, Squads de agentes, Visual Workflow Builder. Epic Details completos (E1-E8). | Morgan (@pm) |
| 2026-02-20 | 1.0     | PRD completo. Secciones 7 (Checklist Results — 87% completitud, READY para @po) y 8 (Next Steps) finalizadas.                                                                      | Morgan (@pm) |
| 2026-02-20 | 1.1     | Validación @po GO CONDICIONAL aplicada: Story 1.6 (testing framework Vitest+RTL) añadida a E1. FR22 (modo manual fallback IA) añadido. Status actualizado a Ready.                 | Pax (@po)    |

---

## 1. Goals and Background Context

### Goals

- Construir un sistema operativo personal de gestión de vida en producción (Vercel + Supabase) con despliegue continuo desde GitHub
- Reemplazar Google Calendar + Notion + app de hábitos + time tracking manual con una sola herramienta coherente
- Conectar estrategia de largo plazo (Visión 5Y → OKRs) con ejecución diaria (Calendario como contrato)
- Automatizar el 100% del progreso de KRs — cero ingreso manual de avance
- Activar el motor de correlaciones para detectar qué actividades potencian y qué daña el enfoque del usuario
- Lograr Life System Health Score ≥ 70% al cierre del mes 1 de uso real
- Calendar Commitment Rate (CCR) ≥ 80% — lo que entra al calendario, se hace
- Detectar al menos 3 correlaciones de impacto en el primer mes con datos reales

### Background Context

life-os surge del problema de la inconsistencia personal: el usuario conoce los frameworks de productividad (11 integrados en el sistema), tiene ambición estratégica, pero el puente entre la planificación y la ejecución diaria no existe como producto coherente. El resultado histórico es planificación que no aterriza, tiempo que se evapora sin evidencia, y herramientas fragmentadas (Google Calendar, Notion, apps de hábitos, time tracking manual) que generan datos desconectados sin ningún mecanismo para detectar qué está funcionando.

La solución es un sistema que opere bajo la filosofía **"planear de arriba hacia abajo, ejecutar de abajo hacia arriba, optimizar con datos"** — donde el Calendario no es una agenda sino un contrato, el Inbox es procesado por IA con 1-click para calendarizar, y el motor de correlaciones cierra el loop entre ejecución y optimización del sistema.

---

## 2. Requirements

### Functional Requirements

- **FR1:** El sistema debe generar un diagnóstico inicial con score % (0-100%) por cada una de las 8 Áreas de Vida Maslow, organizadas en **D-Needs** (niveles 1-4, carencia — déficit motiva) y **B-Needs** (niveles 5-8, crecimiento — motivación intrínseca), vía archivos psicométricos (upload/paste) o cuestionario científico validado por área. El **Life System Health Score** global se calcula como promedio ponderado usando multiplicadores por nivel: 2.0× (niveles 1-2 — Fisiológica + Seguridad), 1.5× (niveles 3-4 — Conexión Social + Estima), 1.2× (niveles 5-6 — Cognitiva + Estética), 1.0× (niveles 7-8 — Autorrealización + Autotrascendencia).
- **FR2:** El sistema debe mantener 8 Áreas de Vida con score % individual, agrupadas visualmente en D-Needs (1-4) y B-Needs (5-8). El Life System Health Score global es el promedio ponderado de los 8 scores de área (según multiplicadores FR1). Cada área muestra tendencia (mejorando/deteriorando) y el sistema emite alerta crítica automática si un área de nivel 1-2 lleva >7 días sin actividad registrada, o alerta warning para cualquier área >7 días sin actividad.
- **FR3:** El sistema debe soportar jerarquía OKR: Visión 5 años (narrativa) → máximo 3 OKRs anuales activos → KRs trimestrales (Q1/Q2/Q3/Q4) por OKR.
- **FR4:** El progreso de KRs debe calcularse 100% automáticamente: KRs _time-based_ desde `time_entries` vinculados; KRs _outcome-based_ por confirmación de hito — cero ingreso manual.
- **FR5:** El sistema debe soportar **Proyectos** como vehículos de ejecución de KRs. Cada proyecto contiene **Workflows** (flujos de trabajo), cada workflow contiene **Tasks** (fases), cada task contiene **Steps** (unidades verificables). Steps y Activities son la misma entidad con campo `executor_type: human | ai | mixed` — un step planeado ejecutado se convierte en activity (fact). Activities espontáneas (no planeadas) existen sin workflow padre pero siempre vinculadas a un Área.
- **FR5b:** Cada step/activity debe tener: `executor_type` (human/ai/mixed), `verification_criteria` (cómo se verifica que está done), `ai_agent` (qué agente AIOS ejecuta si es ai), `planned` (true/false). Steps de tipo `ai` se envían a la cola de ejecución AIOS automáticamente. Steps de tipo `human` se calendarizan automáticamente.
- **FR5c:** El sistema debe soportar **Templates de Workflow** predefinidos (mínimo 8 en MVP) seleccionables al crear un proyecto. Templates modelados como AIOS workflows (YAML/JSON): pre-populan tasks, steps, executor_types y squad sugerido. Categorías: Personal Development, Product Launch, Health Sprint, Learning, Content Creation, Financial Review, Habit Building, Custom.
- **FR5d:** El sistema debe soportar **Squads de agentes** asignables a workflows. Un squad es un conjunto predefinido de agentes AIOS asignados a un workflow según su tipo. Steps tipo `ai` heredan el agente del squad asignado al workflow. Squads predefinidos en MVP: Dev Squad (@architect+@dev+@qa+@devops), Research Squad (@analyst+@pm), Personal Coach (@analyst).
- **FR6:** Los Hábitos deben generar eventos recurrentes automáticos en el Calendario usando calendarios automáticos con reglas `rrule` (RFC 5545).
- **FR7:** El sistema debe soportar registro de Habilidades con nivel (Beginner/Intermediate/Advanced/Expert) y tiempo invertido calculado automáticamente desde `time_entries`.
- **FR8:** El Calendario debe incluir 5 vistas operativas: Año, Mes, Semana, Día y Agenda — con Time Budget diario y semanal visible (horas comprometidas vs. disponibles).
- **FR9:** El sistema debe implementar time tracking con start/stop explícito, pausas con razón registrada y cálculo automático de duración real total.
- **FR10:** El sistema debe implementar un Daily Check-in no omitible al abrir la app: accountability sobre actividades del día anterior, máximo 5-7 items por sesión con paginación, opción de bulk confirm para calendarios automáticos.
- **FR11:** El Inbox debe soportar captura en texto libre y procesamiento IA: clasificación de tipo, detección de ventanas de tiempo libre en el calendario, propuesta de bloque con confirmación 1-click.
- **FR12:** El sistema debe implementar Weekly Review guiado con 4 fases: Medir (métricas automáticas) → Analizar (insights IA + correlaciones) → Planificar (inbox + backlog) → Confirmar (semana comprometida).
- **FR13:** El sistema debe generar reportes automáticos: Time by Area, Time by Project, Habit Consistency, Calendar Commitment Rate (CCR), OKR Progress y Area Health Trend.
- **FR14:** El motor de correlaciones debe analizar `time_entries`, `checkin_responses` y `habit_completions` para detectar patrones estadísticos (Pearson/Spearman) y presentar insights en lenguaje natural con umbral mínimo de 14 días de datos.
- **FR15:** La arquitectura de IA debe ser agnóstica de proveedor via interfaz `ILLMProvider` (Claude / OpenAI / Gemini) configurable por variables de entorno sin modificar lógica de negocio.
- **FR16:** El sistema debe implementar autenticación de usuario vía Supabase Auth (magic link o email/password).
- **FR17:** El sistema debe implementar validación soft jerárquica: bloquear la creación de OKRs vinculados a áreas de nivel 7-8 (B-Needs avanzados) si algún área de nivel 1-2 (D-Needs críticos) tiene score <50% por más de 14 días consecutivos. Mostrar mensaje explicativo indicando la carencia bloqueante y su score actual.
- **FR18:** El sistema debe generar alertas automáticas de desbalance: (a) área nivel 1-2 sin actividad >7 días → alerta crítica persistente en Home, (b) >80% del tiempo total invertido concentrado en 1-2 áreas durante >14 días → alerta de desbalance sistémico, (c) área nivel 1-2 con score <50% por >14 días → alerta de crisis con activación del bloqueo soft de B-Needs (FR17).
- **FR19:** El sistema debe generar sugerencias automáticas de balanceo priorizando D-Needs (niveles 1-4) sobre B-Needs (niveles 5-8) en las recomendaciones del Home y Weekly Review. Si las condiciones de contexto prerrequisito (libertad/autonomía, transparencia/verdad, ambiente eupsíquico, desafío adecuado) están comprometidas, el sistema alerta al usuario como condición previa antes de planificar nuevos OKRs.
- **FR20:** El sistema debe implementar un **Visual Workflow Builder** — canvas interactivo estilo n8n para crear y editar workflows visualmente. Nodos arrastrables representan Tasks (rectángulos) y Steps (círculos coloreados por executor_type: azul=human, púrpura=ai, mixto=degradado). Flechas muestran dependencias y secuencia. Squad asignado visible en nodos AI. Status de ejecución en tiempo real sobre cada nodo. **Librería:** React Flow / XY Flow (`@xyflow/react`, MIT). MVP: builder funcional básico. Phase 2: canvas completo con mini-map, zoom, exportar como AIOS YAML.
- **FR21:** El sistema debe generar un **Agent Leverage Report** como parte de Informes: % steps ejecutados por IA vs humano, AI Accuracy Rate (steps IA que pasaron verificación sin corrección), ratio de apalancamiento (horas IA equivalentes / horas humano), ROI por tipo de executor, top workflows por leverage. Umbral mínimo: 14 días de datos.
- **FR22:** El sistema debe soportar un **modo de procesamiento manual explícito** como fallback cuando los proveedores de IA no estén disponibles o el usuario lo prefiera. En el Inbox, si `ILLMProvider` falla (timeout, error de proveedor, límite de cuota) o está deshabilitado vía configuración, el usuario puede clasificar y calendarizar items manualmente sin degradación del flujo principal. El sistema NO debe bloquear flujos críticos (Daily Check-in, Inbox, Calendario) por dependencia de IA. Los flujos de IA deben mostrar estado visible (processing / error / disabled) con fallback graceful a modo manual. (Relacionado con FR11, FR15)

### Non-Functional Requirements

- **NFR1:** Stack técnico obligatorio: Next.js 16.1.6 + React 19 + TypeScript + Tailwind CSS 4 + Supabase (PostgreSQL + Auth + RLS + Realtime) + Vercel.
- **NFR2:** Todas las tablas de Supabase deben tener Row Level Security (RLS) habilitado — ninguna tabla de datos de usuario sin RLS.
- **NFR3:** CI/CD automático desde GitHub `main` → Vercel production; PR previews habilitados — time to deploy < 5 minutos.
- **NFR4:** El sistema debe operar dentro del free tier de Vercel y Supabase (≤ 500MB DB) durante MVP single-user — $0 de infraestructura.
- **NFR5:** El Calendario DEBE implementarse usando `big-calendar` (github.com/lramos33/big-calendar, MIT) como base UI — prohibido construir desde cero. Adaptaciones requeridas: migración Tailwind v3→v4, integración de `rrule` como librería separada para recurrencia. El layout general del sistema usa `TailAdmin` (github.com/TailAdmin/free-nextjs-admin-dashboard, MIT) como base para sidebar, dashboard y charts.
- **NFR6:** Los eventos recurrentes deben calcularse on-the-fly con `rrule` — solo persistir ocurrencias pasadas/presentes en DB, no pre-generar ocurrencias futuras.
- **NFR7:** El time tracking activo debe actualizarse en tiempo real vía Supabase Realtime — latencia máxima de UI < 1 segundo para timer en curso.
- **NFR8:** El motor de correlaciones corre como background job (Supabase Edge Function o cron) una vez por noche — no en tiempo real.
- **NFR9:** Arquitectura feature-based dentro de Next.js App Router: `/app/(features)/calendar`, `/app/(features)/okrs`, etc.
- **NFR10:** MVP es single-user — no requiere multi-tenancy. Auth existe para protección de datos, no para gestión de roles.

---

## 3. User Interface Design Goals

### Overall UX Vision

life-os es una **app de ejecución, no de planificación**. La UI prioriza el _hacer_ sobre el _organizar_. El usuario llega a la app para saber qué ejecuta hoy, iniciar un timer, confirmar lo que hizo ayer, y capturar lo que está en su cabeza — todo con la mínima fricción posible. El Daily Check-in y el Calendario son el corazón de la interfaz; todo lo demás (OKRs, Áreas, Proyectos) existe para dar contexto a ese núcleo de ejecución.

### Key Interaction Paradigms

- **1-click execution:** Timer start/stop, Daily Check-in confirm, Inbox process → cada acción crítica en un solo tap
- **Time Budget siempre visible:** En vista Día y Semana — "X horas comprometidas / Y disponibles" — para planificación honesta
- **Progressive disclosure macro→micro:** Año → Mes → Semana → Día (drill-down natural, nunca saltar niveles)
- **Calendario como contrato visual:** Las actividades del día se ven como compromisos, no sugerencias
- **Notificaciones de contexto mínimas:** Banner de Daily Check-in pendiente en Home (persistente hasta completarse), alerta de Inbox acumulado > 7 días, alerta de área sin actividad > 7 días

### Core Screens and Views

1. **Home — Execution Space** — Dashboard diario: Life System Health, Time Budget del día, actividades de hoy, hábitos pendientes, banner de check-in, acceso rápido al Inbox
2. **Onboarding / Perfil & Diagnóstico** — Flujo inicial: upload psicométrico o cuestionario científico por área → scores iniciales
3. **Áreas de Vida** — Score % por área, tendencia, tiempo invertido, acceso a OKRs vinculados
4. **OKRs** — Visión 5Y → OKRs anuales → KRs trimestrales con progreso automático visual
5. **Proyectos** — Lista de proyectos activos con milestones y actividades
6. **Hábitos** — Streaks, consistencia, calendarios automáticos activos
7. **Habilidades** — Skills activas, nivel, tiempo invertido acumulado
8. **Calendario — Vista Año** — Grid 365 días con indicador visual por día (heatmap)
9. **Calendario — Vista Mes** — Grid mensual con indicador por día
10. **Calendario — Vista Semana** — 7 columnas + Time Budget semanal
11. **Calendario — Vista Día** — Timeline por horas, botones de acción directa, Time Budget diario
12. **Calendario — Agenda** — Lista cronológica de próximos compromisos
13. **Inbox** — Captura rápida + cola de items con sugerencias IA + procesamiento manual
14. **Weekly Review** — Flujo guiado 4 fases: Medir → Analizar → Planificar → Confirmar
15. **Informes & Analytics** — Time by Area/Project, CCR, Habit Consistency, OKR Progress, Correlaciones

### Accessibility

WCAG AA — MVP es single-user pero se aplican buenas prácticas base: contraste mínimo, navegación por teclado, labels semánticos.

### Branding

No definido en el brief. UI limpia y funcional, dark mode nativo (usuario técnico). Palette sobria con acentos de color por área Maslow para diferenciación visual. Decisión final delegada al `@ux-design-expert`.

### Target Device and Platforms

**Web Desktop-first** — optimizada para pantallas ≥ 1280px. Responsive pero no mobile-first. Mobile app (React Native) es post-MVP (Phase 2).

---

## 4. Technical Assumptions

### Stack Tecnológico Confirmado

| Layer              | Tecnología                                  | Versión     | Notas                                                                                             |
| ------------------ | ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| Frontend           | Next.js + React                             | 16.1.6 / 19 | App Router, SSR                                                                                   |
| Lenguaje           | TypeScript                                  | Latest      | Strict mode                                                                                       |
| Estilos            | Tailwind CSS                                | 4           | Dark mode nativo                                                                                  |
| Base de datos      | Supabase (PostgreSQL)                       | Cloud       | Auth + RLS + Realtime                                                                             |
| ORM / Client       | Supabase JS Client                          | —           | Sin Drizzle en MVP                                                                                |
| Estado global      | Zustand                                     | —           | —                                                                                                 |
| Calendario UI      | **big-calendar** (lramos33/big-calendar)    | —           | MIT, 5 vistas exactas, shadcn/ui. Adaptar: Tailwind v3→v4 + integrar rrule separado               |
| Layout / Dashboard | **TailAdmin** (free-nextjs-admin-dashboard) | v2.2.2      | MIT, Next.js 16 + React 19 + Tailwind v4 nativo. Base para sidebar, Home, Informes                |
| Workflow Builder   | **React Flow / XY Flow** (`@xyflow/react`)  | v12         | MIT, 11.5k dependents, canvas interactivo estilo n8n, nodos/edges customizables, drag&drop nativo |
| Recurrencia        | rrule (RFC 5545)                            | —           | On-the-fly, sin pre-generar futuras                                                               |
| Charts             | Recharts o Nivo                             | —           | Para Informes                                                                                     |
| Deploy             | Vercel                                      | —           | Free tier, CI/CD desde GitHub                                                                     |
| IA                 | Multi-proveedor (ILLMProvider)              | —           | Claude / OpenAI / Gemini vía env vars                                                             |

### Sistema de Scoring — Modelo Maslow

**Estructura de Áreas:**

```
D-Needs (Necesidades de Carencia) — déficit motiva, satisfacción elimina tensión:
  Nivel 1 — Fisiológica:     sueño, nutrición, movimiento, hidratación, descanso
  Nivel 2 — Seguridad:       salud, finanzas, empleo, vivienda, orden
  Nivel 3 — Conexión Social: familia, pareja, amigos, comunidad, intimidad
  Nivel 4 — Estima:          logros, reconocimiento, autoeficacia, autonomía

B-Needs (Necesidades de Crecimiento) — motivación intrínseca, nunca se agotan:
  Nivel 5 — Cognitiva:       aprendizaje, creatividad, pensamiento crítico
  Nivel 6 — Estética:        arte, naturaleza, orden, expresión creativa
  Nivel 7 — Autorrealización: propósito, misión, crecimiento, valores propios
  Nivel 8 — Autotrascendencia: legado, servicio, causa mayor, conexión espiritual

Condiciones de Contexto (prerrequisitos ambientales):
  Libertad/Autonomía · Transparencia/Verdad · Ambiente Eupsíquico · Desafío Adecuado
```

**Multiplicadores de Peso (Life System Health Score):**

| Grupo             | Niveles | Multiplicador | Justificación                                  |
| ----------------- | ------- | ------------- | ---------------------------------------------- |
| D-Needs críticos  | 1-2     | 2.0×          | Base de supervivencia — bloquean todo lo demás |
| D-Needs sociales  | 3-4     | 1.5×          | Necesidades de conexión y reconocimiento       |
| B-Needs tempranos | 5-6     | 1.2×          | Crecimiento cognitivo y estético               |
| B-Needs avanzados | 7-8     | 1.0×          | Autorrealización y trascendencia               |

**Cálculo del Life System Health Score:**

```
Score_global = Σ(score_área × multiplicador_nivel) / Σ(multiplicadores)
Suma de pesos normalizados: (2+2+1.5+1.5+1.2+1.2+1+1) = 11.4
```

**Reglas de Validación y Alertas:**

| Regla            | Condición                             | Acción                                               |
| ---------------- | ------------------------------------- | ---------------------------------------------------- |
| Crisis D-Need    | Nivel 1-2 score <50% por >14 días     | Bloquear soft OKRs nivel 7-8 (FR17)                  |
| Abandono crítico | Área nivel 1-2 sin actividad >7 días  | Alerta crítica persistente en Home (FR18a)           |
| Desbalance       | >80% tiempo en 1-2 áreas por >14 días | Alerta de desbalance sistémico (FR18b)               |
| Balanceo         | D-Need descuidada                     | Sugerencia automática en Home + Weekly Review (FR19) |

### Arquitectura de IA — Multi-Proveedor

- Interfaz `ILLMProvider` con implementaciones intercambiables (Claude / OpenAI / Gemini)
- Proveedor activo configurado via variables de entorno — sin modificar lógica de negocio
- MVP: Claude Haiku como implementación concreta inicial (velocidad + costo)
- 5 casos de uso: diagnóstico inicial, inbox processing, correlaciones, weekly review, alertas de balanceo

### Motor de Correlaciones

- **Inputs:** `time_entries`, `checkin_responses`, `habit_completions`, `area_scores`
- **Método:** Pearson/Spearman para MVP — umbral mínimo 14 días de datos
- **Ejecución:** background job nocturno (Supabase Edge Function o cron)
- **Output:** insights en lenguaje natural en Informes y Weekly Review

### Arquitectura de Código

- Feature-based dentro de Next.js App Router: `/app/(features)/calendar`, `/app/(features)/okrs`, etc.
- API: Next.js Server Actions + Supabase RLS (sin API layer separado en MVP)
- Realtime: Supabase Realtime solo para timer activo (latencia <1s)

### Deployment & Operations

- CI/CD: GitHub `main` → Vercel production (auto-deploy); PR previews habilitados
- Budget MVP: $0 — Vercel free tier + Supabase free tier (≤500MB DB)
- Single-user: sin multi-tenancy en MVP

### Arquitectura de IA — Decisiones Cerradas

**Patrón unificador MVP:** La IA **propone**, el código **ejecuta** — siempre con confirmación del usuario.

| Función                     | Quién calcula                             | Rol de la IA                                   | Decisión   |
| --------------------------- | ----------------------------------------- | ---------------------------------------------- | ---------- |
| Score por área + global     | **Código puro** (SQL + álgebra)           | Interpreta el resultado en lenguaje natural    | ✅ Cerrada |
| Calendarización (Inbox)     | **API directa con contexto inyectado**    | Clasifica intención + propone bloque de tiempo | ✅ Cerrada |
| Templates de proyectos      | **Predefinidas en DB** (5-8 tipos)        | Sugiere cuál usar según descripción/OKR        | ✅ Cerrada |
| Motor de correlaciones      | **Código estadístico** (Pearson/Spearman) | Interpreta patrones en lenguaje natural        | ✅ Cerrada |
| Integración con proveedores | **API directa vía SDK** (no MCP en MVP)   | —                                              | ✅ Cerrada |

**Flujo de calendarización IA (Inbox → Calendario):**

```
Server Action prepara contexto:
  - Texto libre del inbox
  - OKRs activos del usuario
  - Huecos libres del calendario (próximos 7 días)
      ↓
LLM (ILLMProvider) devuelve:
  - Clasificación del item (tarea/evento/proyecto/hábito/idea)
  - Área sugerida + alineación con OKR
  - Propuesta de bloque: fecha + hora + duración
      ↓
Usuario confirma con 1-click
      ↓
Código crea el evento en DB (sin intervención adicional de IA)
```

**Nota:** Agentes con herramientas (multi-step, autónomos) quedan para Phase 2.

### Decisiones Críticas Pendientes

| Decisión                    | Opciones                             | Impacto  | Responsable       |
| --------------------------- | ------------------------------------ | -------- | ----------------- |
| ORM                         | Supabase JS directo vs Drizzle ORM   | Moderado | ⚠️ @architect     |
| Correlaciones datos escasos | Pearson simple vs método alternativo | Moderado | ⚠️ @data-engineer |

---

## 5. Epic List

| #   | Epic                              | Módulos                       | Dependencias   | Prioridad  |
| --- | --------------------------------- | ----------------------------- | -------------- | ---------- |
| E1  | Foundation & Auth                 | Setup, DB Schema, CI/CD, Auth | —              | 🔴 CRÍTICA |
| E2  | Perfil & Diagnóstico              | Módulo 0                      | E1             | 🔴 Alta    |
| E3  | Áreas de Vida & OKRs              | Módulos 1-2                   | E1, E2         | 🔴 Alta    |
| E4  | Proyectos, Hábitos & Milestones   | Módulo 3                      | E1, E3         | 🟡 Alta    |
| E5  | Calendario & Time Tracking        | Módulo 5                      | E1, E3, E4     | 🔴 CRÍTICA |
| E6  | Inbox & IA Calendarización        | Módulo 6                      | E1, E5         | 🟡 Alta    |
| E7  | Habilidades                       | Módulo 4                      | E1, E3         | 🟢 Media   |
| E8  | Informes & Motor de Correlaciones | Módulo 7                      | E1, E5 + todos | 🟢 Media   |

**Orden de ejecución:**

```
E1 → E2 → E3 ─┬─→ E4 → E5 → E6
               └─→ E7          └→ E8
```

---

## 6. Epic Details

### E1 — Foundation & Auth

**Goal:** Infraestructura base funcional — Next.js + TailAdmin corriendo en Vercel, DB schema completo en Supabase con RLS, Auth operativa, CI/CD automático desde GitHub.

| Story | Título                                                                                | Executor            |
| ----- | ------------------------------------------------------------------------------------- | ------------------- |
| 1.1   | Setup proyecto (Next.js 16 + TailAdmin + Tailwind v4 + TypeScript + shadcn/ui)        | Human + AI          |
| 1.2   | Configuración Supabase (proyecto, Auth magic link/email, RLS base)                    | Human + AI          |
| 1.3   | CI/CD GitHub → Vercel (auto-deploy main + PR previews)                                | AI (@devops)        |
| 1.4   | DB Schema completo (activities, workflows, tasks, steps, areas, okrs, habits, skills) | AI (@data-engineer) |
| 1.5   | Layout base con TailAdmin (sidebar, navbar, routing App Router, dark mode)            | AI (@dev)           |
| 1.6   | Setup testing framework (Vitest + React Testing Library + configuración base E2E)     | AI (@dev)           |

---

### E2 — Perfil & Diagnóstico

**Goal:** El usuario obtiene su diagnóstico inicial de las 8 áreas Maslow (D-Needs/B-Needs) con scoring ponderado como baseline del sistema.

| Story | Título                                                                                      | Executor   |
| ----- | ------------------------------------------------------------------------------------------- | ---------- |
| 2.1   | Onboarding: flujo inicial post-login + selección de vía diagnóstico                         | Human + AI |
| 2.2   | Cuestionario científico por área (5-8 preguntas × 8 áreas, bases validadas)                 | AI (@dev)  |
| 2.3   | Upload/paste archivos psicométricos + análisis ILLMProvider                                 | AI (@dev)  |
| 2.4   | Cálculo de scores por área + Life System Health Score (código puro, multiplicadores Maslow) | AI (@dev)  |
| 2.5   | Vista Perfil: scores D-Needs/B-Needs, tendencia, resumen diagnóstico                        | AI (@dev)  |

---

### E3 — Áreas de Vida & OKRs

**Goal:** Gestión completa de áreas con scoring ponderado, alertas jerárquicas, y jerarquía OKR con progreso 100% automático. Incluye OKR Impact Score para selección óptima.

| Story | Título                                                                              | Executor  |
| ----- | ----------------------------------------------------------------------------------- | --------- |
| 3.1   | Vista Áreas: scores D-Needs/B-Needs, tendencia, tiempo invertido                    | AI (@dev) |
| 3.2   | Alertas: área nivel 1-2 >7 días sin actividad, desbalance >80% concentración        | AI (@dev) |
| 3.3   | Validación jerárquica: bloqueo soft OKR 7-8 si crisis nivel 1-2 (<50% por >14 días) | AI (@dev) |
| 3.4   | OKR Impact Score: cálculo de impacto en salud global por OKR candidato              | AI (@dev) |
| 3.5   | Visión 5 años (narrativa) + OKRs anuales (máx 3 — Buffett 5/25)                     | AI (@dev) |
| 3.6   | KRs trimestrales (Q1-Q4): time-based + outcome-based                                | AI (@dev) |
| 3.7   | Progreso automático KRs desde activities completadas + confirmación de hitos        | AI (@dev) |

---

### E4 — Proyectos, Workflows, Templates & Squads

**Goal:** El usuario puede crear proyectos con workflows visuales (React Flow), seleccionar templates AIOS-modeled, asignar squads de agentes, y ver steps ejecutados por IA vs humano.

| Story | Título                                                                                          | Executor                                          |
| ----- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------- |
| 4.1   | CRUD Proyectos (vinculados a Área + KR opcional)                                                | AI (@dev)                                         |
| 4.2   | Visual Workflow Builder — React Flow canvas básico (nodos Task + Step, executor_type coloreado) | AI (@dev)                                         |
| 4.3   | Templates de Workflow (8 predefinidos: Dev, Health Sprint, Learning, etc.) — AIOS-modeled       | AI (@dev)                                         |
| 4.4   | Squads de agentes (Dev Squad, Research Squad, Personal Coach) asignables a workflows            | AI (@dev)                                         |
| 4.5   | Steps tipo `ai` → cola AIOS automática                                                          | Steps tipo `human` → calendarizan automáticamente | AI (@dev) |
| 4.6   | CRUD Hábitos + generación de activities recurrentes (rrule) + detección emergente               | AI (@dev)                                         |
| 4.7   | Daily Check-in: accountability activities del día anterior (máx 5-7 items, bulk confirm)        | AI (@dev)                                         |

---

### E5 — Calendario & Time Tracking _(CRÍTICA)_

**Goal:** El calendario es el corazón de ejecución. 5 vistas sobre big-calendar, Time Budget visible, time tracking con start/stop/pausas y Realtime activo.

| Story | Título                                                                     | Executor  |
| ----- | -------------------------------------------------------------------------- | --------- |
| 5.1   | Integración big-calendar: adaptar Tailwind v3→v4 + configuración base      | AI (@dev) |
| 5.2   | Vista Día: timeline por horas + Time Budget + botones acción directa       | AI (@dev) |
| 5.3   | Vista Semana: 7 columnas + Time Budget semanal                             | AI (@dev) |
| 5.4   | Vista Mes: grid mensual con indicador por día                              | AI (@dev) |
| 5.5   | Vista Año: heatmap 365 días con drill-down a vista Día                     | AI (@dev) |
| 5.6   | Vista Agenda: lista cronológica de próximos compromisos                    | AI (@dev) |
| 5.7   | CRUD Eventos y Tareas (manual + recurrente con rrule)                      | AI (@dev) |
| 5.8   | Time tracking: start/stop explícito, pausas con razón, duración automática | AI (@dev) |
| 5.9   | Supabase Realtime para timer activo (latencia <1s)                         | AI (@dev) |

---

### E6 — Inbox & IA Calendarización

**Goal:** El usuario captura cualquier idea en texto libre y la IA propone cuándo ejecutarla con confirmación 1-click. Detección de proyectos emergentes desde inbox.

| Story | Título                                                                        | Executor  |
| ----- | ----------------------------------------------------------------------------- | --------- |
| 6.1   | Captura rápida Inbox (texto libre, shortcut global, desde Home)               | AI (@dev) |
| 6.2   | Pipeline IA: clasificación + área/OKR sugerido + detección huecos calendario  | AI (@dev) |
| 6.3   | Propuesta de slot + confirmación 1-click → activity creada                    | AI (@dev) |
| 6.4   | Detección de proyecto emergente: "Esto parece un workflow ¿crear proyecto X?" | AI (@dev) |
| 6.5   | Procesamiento manual (sin IA) + alerta inbox acumulado >7 días                | AI (@dev) |

---

### E7 — Habilidades

**Goal:** El usuario registra skills y el sistema detecta automáticamente skills emergentes desde el patrón de activities.

| Story | Título                                                                     | Executor  |
| ----- | -------------------------------------------------------------------------- | --------- |
| 7.1   | CRUD Habilidades (nombre, nivel Beginner→Expert, área/OKR vinculado)       | AI (@dev) |
| 7.2   | Tiempo invertido automático desde activities con skill_id                  | AI (@dev) |
| 7.3   | Detección emergente: "Has invertido 50h en TypeScript — ¿registrar skill?" | AI (@dev) |
| 7.4   | Vista progreso por skill (nivel + tiempo acumulado + tendencia)            | AI (@dev) |

---

### E8 — Informes, Correlaciones & Agent Leverage

**Goal:** El usuario ve métricas automáticas de su sistema, el motor detecta patrones invisibles (bucles, leverage points, bottlenecks), y un Agent Leverage Report muestra el ROI de los agentes IA.

| Story | Título                                                                                    | Executor            |
| ----- | ----------------------------------------------------------------------------------------- | ------------------- |
| 8.1   | Time by Area + Time by Project (semana/mes/trimestre)                                     | AI (@dev)           |
| 8.2   | Habit Consistency + CCR + OKR Progress + Area Health Trend                                | AI (@dev)           |
| 8.3   | Motor correlaciones: background job nocturno, Pearson/Spearman, umbral 14 días            | AI (@data-engineer) |
| 8.4   | Detección avanzada: bucles autodestructivos, puntos de apalancamiento, cuellos de botella | AI (@data-engineer) |
| 8.5   | Hábitos inconscientes detectados desde patterns de activities                             | AI (@dev)           |
| 8.6   | Insights en lenguaje natural (ILLMProvider) en Informes + Weekly Review                   | AI (@dev)           |
| 8.7   | Agent Leverage Report: % IA vs humano, AI Accuracy Rate, ROI por executor_type            | AI (@dev)           |
| 8.8   | Weekly Review guiado (4 fases: Medir→Analizar→Planificar→Confirmar)                       | AI (@dev)           |

---

## 7. Checklist Results

> Ejecutado por Morgan (@pm) contra PM Requirements Checklist — 2026-02-20

### Resumen Ejecutivo

| Métrica                       | Resultado                                                   |
| ----------------------------- | ----------------------------------------------------------- |
| **Completitud PRD**           | 87%                                                         |
| **Alcance MVP**               | AMBICIOSO (8 módulos, 1 desarrollador + AIOS — justificado) |
| **Readiness para @architect** | ✅ NEARLY READY — 2 decisiones abiertas                     |
| **Readiness para @po**        | ✅ READY para validación                                    |

### Análisis por Categoría

| Categoría                        | Estado     | Issues Críticos                                                                 |
| -------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| 1. Problem Definition & Context  | ✅ PASS    | —                                                                               |
| 2. MVP Scope Definition          | ⚠️ PARTIAL | Scope ambicioso para 1 dev; E7 (Skills) candidata a deferirse                   |
| 3. User Experience Requirements  | ⚠️ PARTIAL | Faltan diagramas de flujo; flows del Daily Check-in y Inbox sin detallar en PRD |
| 4. Functional Requirements       | ✅ PASS    | FR5 muy denso — considerar dividir en historias granulares                      |
| 5. Non-Functional Requirements   | ✅ PASS    | Sin política de backup explícita (acepto defaults Supabase)                     |
| 6. Epic & Story Structure        | ✅ PASS    | ACs por story delegados a @sm — correcto                                        |
| 7. Technical Guidance            | ✅ PASS    | 2 decisiones abiertas para @architect (ORM + correlaciones)                     |
| 8. Cross-Functional Requirements | ⚠️ PARTIAL | Retención de datos no definida; backup implícito en Supabase                    |
| 9. Clarity & Communication       | ✅ PASS    | Sin diagramas visuales en PRD (aceptable en esta fase)                          |

### Issues por Prioridad

**BLOQUEADORES (deben resolverse antes de que @architect proceda):**

- 🔴 **ORM:** Supabase JS directo vs Drizzle ORM — impacta diseño del schema
- 🔴 **Correlaciones con datos escasos:** Método estadístico para <14 días de datos

**HIGH (deben resolverse antes del desarrollo):**

- 🟡 **Flujos UX críticos:** Daily Check-in y Inbox processing necesitan flow diagrams detallados antes de E5/E6 — delegar a @ux-design-expert
- 🟡 **MVP scope E7:** Habilidades tiene menor impacto inmediato — evaluar diferir a Phase 2 si hay presión de tiempo

**MEDIUM:**

- 🟠 **Política de retención de datos:** Definir cuánto tiempo se guardan activities, correlaciones, checkin_responses
- 🟠 **FR5 granularidad:** Dividir en FRs más atómicos durante creación de historias (@sm)

**LOW:**

- 🔵 Agregar diagrama de arquitectura de módulos al PRD (disponible en brief — referenciar)
- 🔵 Definir estrategia de backup explícita (Supabase free tier tiene point-in-time recovery)

### Evaluación de Scope MVP

```
E1 Foundation & Auth    → ✅ ESENCIAL — no se puede recortar
E2 Perfil & Diagnóstico → ✅ ESENCIAL — baseline del sistema
E3 Áreas & OKRs         → ✅ ESENCIAL — core del sistema
E4 Workflows & Templates→ ✅ ESENCIAL — ejecución del sistema
E5 Calendario           → ✅ ESENCIAL — corazón de ejecución
E6 Inbox & IA           → ✅ ESENCIAL — diferenciador clave
E7 Habilidades          → ⚠️ CANDIDATA A DIFERIR si hay presión de tiempo
E8 Informes & Correlaciones → ✅ ESENCIAL — cierra el loop, es diferenciador
```

### Riesgos Técnicos Identificados

| Riesgo                                                         | Probabilidad | Impacto | Mitigación                                                       |
| -------------------------------------------------------------- | ------------ | ------- | ---------------------------------------------------------------- |
| Calendario (big-calendar + rrule) más complejo de lo esperado  | Alta         | Alto    | E5 como épica dedicada, empezar con MVP de vistas                |
| Motor correlaciones sin datos suficientes (primeras 2 semanas) | Alta         | Medio   | UI diseñada para maximizar Daily Check-in desde día 1            |
| Visual Workflow Builder (React Flow) complejidad UI            | Media        | Medio   | MVP básico (lista drag&drop), canvas completo en Phase 2         |
| Steps tipo 'ai' requieren integración AIOS funcional           | Media        | Alto    | E4 define la interfaz; implementación AIOS puede ser stub en MVP |
| Scope total ambicioso para single developer                    | Alta         | Alto    | AIOS mitiga velocidad; E7 diferible                              |

### Decisión Final

**✅ READY PARA @po VALIDATION** con las siguientes condiciones:

1. @architect resuelve ORM y método de correlaciones antes de Story 1.4 (DB Schema)
2. @ux-design-expert crea flow diagrams de Daily Check-in e Inbox antes de E5/E6
3. Evaluar diferir E7 (Habilidades) al inicio de la ejecución de E5

---

## 8. Next Steps

### Secuencia de handoffs inmediatos

```
AHORA         → @po   *validate-story-draft (PRD)
                       Validación 10-point checklist
                       Decisión: GO / NO-GO

POST-VALIDACIÓN → @architect  *create-doc architecture
                       Resolver: ORM + método correlaciones
                       Diseño: componentes, integraciones, DB schema detallado
                       Output: docs/architecture.md

PARALELO      → @ux-design-expert
                       Flow diagrams: Daily Check-in + Inbox processing
                       Output: docs/ux-flows.md (antes de E5/E6)

POST-ARQUITECTURA → @po  *shard-doc docs/prd.md
                       Sharding del PRD en docs/prd/
                       Sharding del architecture en docs/architecture/

POST-SHARDING → @sm  *create-next-story
                       Primera story: E1.1 — Setup del proyecto
                       (Next.js 16 + TailAdmin + Tailwind v4 + TypeScript + shadcn/ui)

POST-E1       → @devops  *setup-github
                       Repo GitHub + Vercel + Supabase project
                       CI/CD pipeline (auto-deploy main + PR previews)
```

### Decisiones pendientes — por agente

| Decisión                               | Agente            | Urgencia | Bloquea               |
| -------------------------------------- | ----------------- | -------- | --------------------- |
| ORM: Supabase JS vs Drizzle            | @architect        | 🔴 ALTA  | Story 1.4 (DB Schema) |
| Correlaciones datos escasos (<14 días) | @data-engineer    | 🟡 MEDIA | Story 8.3             |
| Flow UX Daily Check-in + Inbox         | @ux-design-expert | 🟡 MEDIA | E5, E6                |
| Diferir E7 (Habilidades) a Phase 2     | Mario (decisión)  | 🟢 BAJA  | Planificación E7      |

### Estado de documentos

| Documento              | Estado                      | Versión |
| ---------------------- | --------------------------- | ------- |
| `docs/brief.md`        | ✅ Completo                 | v1.7    |
| `docs/prd.md`          | ✅ Ready — validado por @po | v1.1    |
| `docs/architecture.md` | ❌ Pendiente                | —       |
| `docs/ux-flows.md`     | ❌ Pendiente                | —       |
| `docs/stories/`        | ❌ Pendiente                | —       |

### Criterio de éxito del MVP (recordatorio)

El MVP es exitoso si al cabo de 30 días de uso real:

1. El Calendario de life-os reemplaza Google Calendar como única agenda
2. Daily Check-in completado ≥5 días/semana
3. Weekly Review realizado ≥3 semanas consecutivas
4. ≥1 hábito con streak activo ≥14 días
5. Motor correlaciones detectó ≥3 patrones con datos reales
6. Life System Health Score mejoró vs baseline del diagnóstico inicial

---

_— Morgan, planejando o futuro 📊_
_v1.1 · 2026-02-20 · Validado: Pax (@po) · AIOS PM Agent_
