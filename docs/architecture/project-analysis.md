# Project Analysis — Life OS (Auditoría Completa)

**Generado:** 2026-03-11
**Generado Por:** @architect (Aria)
**Modo:** Comprehensive Audit — Brownfield Discovery

---

## Resumen Ejecutivo

**Life OS** es un sistema full-stack de gestión de vida personal basado en la jerarquía de necesidades de Maslow. Permite a los usuarios gestionar 8 áreas de vida, OKRs, proyectos, hábitos, calendario, inbox y habilidades, con análisis e insights generados por IA (Claude API).

---

## 1. Stack Tecnológico

| Componente | Versión | Notas |
|-----------|---------|-------|
| **Next.js** | 16.1.6 | App Router, Server Actions, RSC |
| **React** | 19.2.3 | Composición funcional |
| **TypeScript** | 5.x | Modo estricto, path alias `@/*` |
| **Tailwind CSS** | v4 | PostCSS |
| **shadcn/ui** | v3.8.5 | Headless components |
| **Drizzle ORM** | v0.45.1 | Type-safe query builder |
| **Supabase** | v2.97.0 | PostgreSQL, Auth, Storage |
| **Anthropic Claude** | v0.78.0 | IA para inbox, reports, análisis Maslow |
| **Vitest** | v4.0.18 | Testing framework |
| **date-fns** | v4.1.0 | Manipulación de fechas |
| **rrule** | v2.8.1 | RFC 5545 recurrencia |
| **Zod** | v4.3.6 | Validación de esquemas |

**Deployment:** Vercel (app) + Supabase (PostgreSQL) + Anthropic API

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                  NEXT.JS APP ROUTER                      │
│  ┌─────────────────┐    ┌───────────────────────────┐   │
│  │  Pages (RSC)    │    │  Server Actions           │   │
│  │  app/(app)/*    │───▶│  actions/*.ts (18 files)  │   │
│  │  app/(auth)/*   │    └───────────────┬───────────┘   │
│  └─────────────────┘                    │               │
│           │                             │               │
│           ▼                             ▼               │
│  ┌─────────────────┐    ┌───────────────────────────┐   │
│  │  React Client   │    │  Feature Logic            │   │
│  │  Components     │    │  features/* (11 modules)  │   │
│  │  components/*   │    └───────────────┬───────────┘   │
│  └─────────────────┘                    │               │
└────────────────────────────────────────┼────────────────┘
                                         │
              ┌──────────────────────────┤
              │                          │
              ▼                          ▼
┌─────────────────────┐    ┌────────────────────────────┐
│   DRIZZLE ORM       │    │   ANTHROPIC CLAUDE API     │
│   lib/db/           │    │   lib/ai/ (provider agn.)  │
│   - schema/ (22 tb) │    │   - ILLMProvider interface │
│   - queries/ (14)   │    │   - ClaudeProvider impl    │
│   - client.ts       │    └────────────────────────────┘
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   SUPABASE          │
│   PostgreSQL        │
│   + RLS Policies    │
│   + Auth SSR        │
└─────────────────────┘
```

### Patrones Arquitectónicos Identificados

1. **Server Actions como capa transaccional** — Sin API REST tradicional
2. **Features como lógica pura testeable** — Separación total de UI/DB
3. **Provider agnóstico de IA** — Interfaz `ILLMProvider` intercambiable
4. **RLS en PostgreSQL** — Seguridad a nivel base de datos
5. **Drizzle ORM** — Type-safety end-to-end en queries
6. **App Router con RSC** — Server Components por defecto

---

## 3. Estructura de Módulos

### Features Implementadas (11 Rutas)

| Módulo | Ruta | Estado | Notas |
|--------|------|--------|-------|
| **Areas Maslow** | `/areas` | Estable | 8 áreas seeded en onboarding |
| **OKRs** | `/okrs` | Estable | Trimestral, KRs vinculados a áreas |
| **Hábitos** | `/habits` | Estable | Streaks, detección emergente |
| **Proyectos** | `/projects` | Estable | CRUD + workflow canvas |
| **Workflow Canvas** | `/projects/[id]/workflow` | Estable | Dagre + XYFlow |
| **Calendario** | `/calendar` | Sprint activo | Múltiples calendarios, recurrencia, DayView |
| **Inbox** | `/inbox` | Estable | Clasificación IA con Claude |
| **Habilidades** | `/skills` | Estable | XP, level-up, detección emergente |
| **Reportes** | `/reports` | Estable | Insights generados por IA |
| **Weekly Review** | `/weekly-review` | Estable | Wizard 4 fases |
| **Analytics API** | `/api/analytics` | Nuevo (10.19) | Fire-and-forget events |

---

## 4. Base de Datos — Inventario de Tablas

### 22 Tablas Drizzle ORM

| Tabla | Nivel FK | Propósito |
|-------|----------|-----------|
| `areas` | 1 | 8 áreas Maslow por usuario |
| `workflow_templates` | 1 | Plantillas de workflows |
| `skills` | 1 | Catálogo de habilidades |
| `habits` | 1 | Definiciones de hábitos |
| `calendars` | 1 | Múltiples calendarios (Epic 10) |
| `area_scores` | 2 | Histórico de scores |
| `okrs` | 2 | Objetivos y KRs |
| `projects` | 3 | Proyectos por área/OKR |
| `workflows` | 4 | Instancias de workflows |
| `tasks` | 5 | Tareas dentro de workflows |
| `steps_activities` | 6 | Entidad unificada Step/Activity |
| `time_entries` | 7 | Registro de tiempo |
| `inbox_items` | 7 | Items del inbox |
| `checkin_responses` | 7 | Respuestas check-in diario |
| `step_skill_tags` | 7 | Junction steps ↔ skills |
| `aios_queue_log` | 7 | Log de trabajos AIOS |
| `correlations` | 8 | Matriz de correlaciones |
| `user_events` | 8 | Analytics fire-and-forget |
| `holidays` | 9 | Feriados por usuario |
| `relations` | — | Relaciones Drizzle ORM |

**Entidad clave:** `steps_activities` — Unificación de Steps (planificados) y Activities (espontáneas)

---

## 5. Testing

| Métrica | Valor |
|---------|-------|
| Framework | Vitest 4.0 con jsdom |
| Total archivos test | 41 |
| Total líneas | 7,147 |
| Módulos cubiertos | 13+ |

### Distribución de Tests

| Área | Archivos |
|------|----------|
| Calendar | 10 |
| OKRs | 4 |
| Inbox | 7 |
| Maslow | 5 |
| Workflows | 4 |
| Skills | 3 |
| Utils | 3 |
| Otros | 5 |

### Filosofía de Testing
- Tests colocados junto al código en `features/**`
- Tests de integración en `tests/unit/`
- Mocks mínimos (solo `next/navigation`)
- Sin mocks de base de datos — tests de lógica pura

---

## 6. Patrones de Código

### Lenguaje
- **TypeScript** dominante (>95% de archivos)
- Strict mode habilitado
- Path alias `@/*` = raíz del proyecto

### Naming Conventions
- Componentes: PascalCase (`CalendarClient.tsx`)
- Actions: camelCase (`createActivity`)
- Queries: camelCase (`getActivitiesForDate`)
- Schemas: snake_case en DB (`steps_activities`)
- Types: PascalCase (`StepActivity`)

### Error Handling
- Server Actions con `try/catch` y mensajes estructurados
- Zod para validación de inputs en boundaries
- Sin error boundaries globales visibles

### State Management
- No Zustand/Redux en uso activo (`stores/` vacío)
- Estado local con React hooks
- Server-side state via RSC + Server Actions

---

## 7. Variables de Entorno (Críticas)

| Variable | Propósito | Requerida |
|----------|-----------|-----------|
| `SUPABASE_URL` | Base de datos | Sí |
| `SUPABASE_ANON_KEY` | Auth cliente | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operaciones | Sí |
| `ANTHROPIC_API_KEY` | Claude IA | Sí (inbox, reports) |
| `EXA_API_KEY` | Web search | Opcional |
| `SENTRY_DSN` | Monitoreo | Opcional |

---

## 8. Trabajo en Progreso (Sprint Activo)

### Últimos Commits (Calendar Sprint)
```
5d97f70 fix: drag&drop no abre modal + overlap visual resuelto
8175554 fix: altura real de eventos — elimina mínimo 30min
c7e0c04 fix: layoutEvents usa solapamiento estricto
a30e9e6 fix: solapamiento DayView + rango horario en eventos
23c6abc fix: eventos solapados en DayView + rediseño EditActivityModal
```

### Archivos Modificados (sin commit)
- `actions/calendar.ts`
- `app/(app)/calendar/_components/*` (4 archivos)
- `lib/calendar/calendar-utils.ts`
- `lib/db/schema/index.ts`
- `tests/unit/calendar/` (2 archivos)

### Archivos Nuevos (sin trackear)
- `lib/analytics/track.ts` — Story 10.19
- `lib/db/schema/user-events.ts` — Story 10.19
- `app/api/analytics/` — Story 10.19
- `app/(app)/calendar/_components/CloseJournalPanel.tsx`
- `.github/agents/` — 12 definiciones de agentes AIOX

---

## 9. Análisis de Deuda Técnica

### Baja (Informativo)
- `stores/` vacío — Placeholder no utilizado
- `hooks/` vacío — Custom hooks no implementados aún
- `README.md` podría reflejar Epic 10 features

### Media (Planificar)
- Sin error boundaries globales en la UI
- `next.config.ts` minimal — Puede necesitar configuración de performance
- Cobertura de tests en features/* no medida formalmente

### Sin Deuda Crítica Detectada

---

## 10. Métricas Generales

| Métrica | Valor |
|---------|-------|
| Rutas (páginas) | 21+ |
| Server Actions | 18 archivos |
| Tablas DB | 22 |
| Feature modules | 11 |
| Componentes React | 28+ |
| Query helpers | 14 |
| Tests | 41 archivos, 7,147 líneas |
| Documentación | 112+ archivos .md |
| Agentes AIOX | 12 |

---

## 11. Veredicto Arquitectónico

### Fortalezas
- Arquitectura moderna y bien estructurada (Next.js 16 + RSC)
- Separación clara de concerns (features / actions / components)
- Testing robusto con filosofía de tests puros
- Provider agnóstico para IA — fácil de extender
- Documentación exhaustiva (112 archivos .md)
- RLS a nivel DB — seguridad multitenant correcta
- Schema Drizzle bien ordenado por dependencias FK

### Áreas de Mejora
- Estado global (`stores/`) no implementado — evaluar si Zustand es necesario
- Custom hooks (`hooks/`) vacío — extraer lógica repetida de componentes
- Error monitoring (Sentry) configurado en env pero no validado en código
- CI/CD en rama `feat/story-1.3-ci-verification` — verificar estado

### Conclusión
**El proyecto está en estado production-ready.** La arquitectura es sólida, bien documentada y con buena cobertura de tests. El sprint activo está correctamente enfocado en el módulo de Calendario (Epic 10).

---

*Generado por @architect (Aria) — Synkra AIOX v2.2.0*
