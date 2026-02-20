# life-os PRD — 4. Technical Assumptions

> **Documento:** [PRD Index](./index.md)
> **Sección:** 4 de 8

---

## Stack Tecnológico Confirmado

| Layer              | Tecnología                                  | Versión     | Notas                                                                                             |
| ------------------ | ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| Frontend           | Next.js + React                             | 16.1.6 / 19 | App Router, SSR                                                                                   |
| Lenguaje           | TypeScript                                  | Latest      | Strict mode                                                                                       |
| Estilos            | Tailwind CSS                                | 4           | Dark mode nativo                                                                                  |
| Base de datos      | Supabase (PostgreSQL)                       | Cloud       | Auth + RLS + Realtime                                                                             |
| ORM / Client       | Drizzle ORM                                 | —           | Resuelto por @architect — type-safe, migrations                                                   |
| Estado global      | Zustand                                     | —           | —                                                                                                 |
| Calendario UI      | **big-calendar** (lramos33/big-calendar)    | —           | MIT, 5 vistas exactas, shadcn/ui. Adaptar: Tailwind v3→v4 + integrar rrule separado               |
| Layout / Dashboard | **TailAdmin** (free-nextjs-admin-dashboard) | v2.2.2      | MIT, Next.js 16 + React 19 + Tailwind v4 nativo. Base para sidebar, Home, Informes                |
| Workflow Builder   | **React Flow / XY Flow** (`@xyflow/react`)  | v12         | MIT, 11.5k dependents, canvas interactivo estilo n8n, nodos/edges customizables, drag&drop nativo |
| Recurrencia        | rrule (RFC 5545)                            | —           | On-the-fly, sin pre-generar futuras                                                               |
| Charts             | ApexCharts (TailAdmin)                      | —           | Para Informes — incluido en TailAdmin                                                             |
| Testing            | Vitest + React Testing Library              | —           | Unit + integration. E2E en Phase 2                                                                |
| Deploy             | Vercel                                      | —           | Free tier, CI/CD desde GitHub                                                                     |
| IA                 | Multi-proveedor (ILLMProvider)              | —           | Claude / OpenAI / Gemini vía env vars                                                             |

## Sistema de Scoring — Modelo Maslow

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

## Arquitectura de IA — Multi-Proveedor

- Interfaz `ILLMProvider` con implementaciones intercambiables (Claude / OpenAI / Gemini)
- Proveedor activo configurado via variables de entorno — sin modificar lógica de negocio
- MVP: Claude Haiku como implementación concreta inicial (velocidad + costo)
- 5 casos de uso: diagnóstico inicial, inbox processing, correlaciones, weekly review, alertas de balanceo

## Motor de Correlaciones

- **Inputs:** `time_entries`, `checkin_responses`, `habit_completions`, `area_scores`
- **Método:** Tiered Insights — Gathering (<7d) · Provisional (7-13d) · Full (≥14d Pearson/Spearman)
- **Ejecución:** background job nocturno (Supabase Edge Function, 03:00 UTC)
- **Output:** insights en lenguaje natural en Informes y Weekly Review

## Arquitectura de Código

- Feature-based dentro de Next.js App Router: `/app/(features)/calendar`, `/app/(features)/okrs`, etc.
- API: Next.js Server Actions + RLS (sin API layer separado en MVP)
- Realtime: Supabase Realtime solo para timer activo (latencia <1s)

## Deployment & Operations

- CI/CD: GitHub `main` → Vercel production (auto-deploy); PR previews habilitados
- Budget MVP: $0 — Vercel free tier + Supabase free tier (≤500MB DB)
- Single-user: sin multi-tenancy en MVP

## Arquitectura de IA — Decisiones Cerradas

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

## Decisiones Críticas — Estado Final

| Decisión                    | Estado      | Solución                                                                      |
| --------------------------- | ----------- | ----------------------------------------------------------------------------- |
| ORM                         | ✅ Resuelto | **Drizzle ORM** — type-safe, migrations, queries complejas para correlaciones |
| Correlaciones datos escasos | ✅ Resuelto | **Tiered Insights** — Gathering (<7d) · Provisional (7-13d) · Full (≥14d)     |
