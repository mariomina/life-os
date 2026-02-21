# DB Schema — life-os (Story 1.4)

> **Generado por:** @data-engineer (Dara)
> **Fecha:** 2026-02-21
> **Estado:** Post Story 1.4 — 15 tablas, índices de performance, FK a auth.users, CHECK constraints, 8 seeds de sistema

---

## 1. Jerarquía de Datos

```
auth.users (Supabase Auth)
└── areas (8 por usuario — niveles Maslow 1-8)
    ├── area_scores (histórico diario de score 0-100)
    ├── okrs (Vision → Annual → Key Result)
    │   └── projects (vinculados a un KR opcional)
    │       └── workflows (uno o más por proyecto)
    │           └── tasks (fases del workflow, ordenadas)
    │               └── steps_activities (pasos planificados)
    │                   ├── time_entries (sesiones de trabajo)
    │                   ├── checkin_responses (check-in diario)
    │                   └── step_skill_tags → skills
    ├── habits (hábitos recurrentes via rrule)
    │   └── steps_activities (occurrencias de hábito)
    ├── skills (habilidades del usuario)
    └── correlations (insights del motor de correlaciones)

workflow_templates (is_system=true → seeds del sistema)
└── projects / workflows (templateId referencia opcional)

inbox_items (cola de captura — procesado por IA)
```

---

## 2. Diagrama ER (Texto)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         auth.users (Supabase)                       │
│  id (UUID PK)                                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ FK user_id → auth.users(id) ON DELETE CASCADE
                               │ (todas las tablas públicas con user_id)
          ┌────────────────────┼──────────────────────────────┐
          │                    │                              │
          ▼                    ▼                              ▼
    ┌───────────┐       ┌─────────────┐              ┌──────────────┐
    │   areas   │       │    okrs     │              │    habits    │
    │ user_id   │◄──────│ area_id?    │              │ user_id      │
    │ maslow 1-8│       │ parent_id?  │◄─self        │ area_id?     │
    │ score 0-100│      │ type        │              │ rrule        │
    └─────┬─────┘       └─────┬───────┘              └──────┬───────┘
          │                   │                             │
          │              ┌────▼──────┐                      │
          │              │ projects  │                      │
          │◄─────────────│ area_id?  │                      │
          │              │ okr_id?   │                      │
          │              └────┬──────┘                      │
          │                   │                             │
          │              ┌────▼──────┐                      │
          │              │ workflows │                      │
          │              │ project_id│                      │
          │              └────┬──────┘                      │
          │                   │                             │
          │              ┌────▼──────┐                      │
          │              │  tasks    │                      │
          │              │workflow_id│                      │
          │              └────┬──────┘                      │
          │                   │                             │
          └───────────────────┼─────────────────────────────┘
                              ▼
                   ┌──────────────────────┐
                   │   steps_activities   │
                   │ task_id? (null=espon)│
                   │ area_id (always set) │
                   │ habit_id? (rrule gen)│
                   └──────┬───────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
       ┌────────────┐ ┌──────────┐ ┌────────────────┐
       │time_entries│ │checkin_  │ │step_skill_tags │
       │step_act_id │ │responses │ │step_act_id     │
       │started_at  │ │step_act_id│ │skill_id ──────►│ skills
       └────────────┘ └──────────┘ └────────────────┘

                   ┌──────────────────────┐
                   │    correlations      │
                   │ user_id              │
                   │ entity_a/b (poly)    │
                   │ is_active            │
                   └──────────────────────┘

                   ┌──────────────────────┐
                   │   inbox_items        │
                   │ user_id              │
                   │ status (pending→done)│
                   │ step_activity_id?    │
                   └──────────────────────┘

                   ┌──────────────────────┐
                   │  workflow_templates  │
                   │ user_id? (null=sys)  │
                   │ is_system=true/false │
                   │ tasks_config (JSONB) │
                   └──────────────────────┘
```

---

## 3. Tablas — Descripción y Campos Clave

### 3.1 `areas`
8 áreas fijas por usuario (niveles Maslow). Se crean en onboarding y son semi-estáticas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | — |
| `user_id` | UUID NOT NULL | FK → auth.users ON DELETE CASCADE |
| `maslow_level` | INT NOT NULL | 1-8 (CHECK constraint) |
| `group` | TEXT | `d_needs` (1-4) \| `b_needs` (5-8) |
| `name` | TEXT | Nombre personalizado por el usuario |
| `default_name` | TEXT | Nombre del sistema (inmutable) |
| `weight_multiplier` | NUMERIC(3,1) | Peso en fórmula LSHS: 2.0, 1.5, 1.2, 1.0 |
| `current_score` | INT DEFAULT 0 | Score 0-100 (CHECK constraint), cacheado |
| `last_activity_at` | TIMESTAMPTZ | Última actividad registrada |

**CHECK constraints:** `maslow_level BETWEEN 1 AND 8`, `current_score BETWEEN 0 AND 100`

### 3.2 `area_scores`
Histórico diario del score por área. Permite tendencias a lo largo del tiempo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `area_id` | UUID FK → areas ON DELETE CASCADE | — |
| `user_id` | UUID FK → auth.users ON DELETE CASCADE | Redundante para queries directas |
| `score` | INT | Score del día (0-100) |
| `scored_at` | DATE | Fecha del score |

**Unique:** `(area_id, scored_at)`

### 3.3 `okrs`
OKRs jerárquicos: Vision (5Y) → Annual → Key Result. Auto-referencial via `parent_id`.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `type` | TEXT | `vision` \| `annual` \| `key_result` |
| `parent_id` | UUID FK → okrs(id) ON DELETE CASCADE | null para Vision root |
| `area_id` | UUID FK → areas ON DELETE SET NULL | Área relacionada |
| `progress` | INT DEFAULT 0 | 0-100 auto-calculado (CHECK constraint) |
| `kr_type` | TEXT | `time_based` \| `outcome_based` \| `milestone` |

**CHECK constraint:** `progress BETWEEN 0 AND 100`

### 3.4 `habits`
Hábitos recurrentes definidos con rrule (RFC 5545). Generan `steps_activities` al ejecutarse.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `rrule` | TEXT NOT NULL | Ej: `"FREQ=DAILY;BYHOUR=7;BYMINUTE=0"` |
| `is_active` | BOOL DEFAULT true | Hábitos inactivos no generan occurrencias |
| `streak_current` | INT | Racha actual en días |
| `streak_best` | INT | Mejor racha histórica |

### 3.5 `skills`
Habilidades del usuario. Detectadas automáticamente por IA o añadidas manualmente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `level` | TEXT | `beginner` \| `intermediate` \| `advanced` \| `expert` |
| `time_invested_seconds` | INT | Tiempo total invertido (acumulado) |
| `auto_detected` | BOOL | true = detectada por IA al completar steps |

**Unique:** `(user_id, name)`

### 3.6 `workflow_templates`
Templates del sistema (8 MVP) y templates custom por usuario.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user_id` | UUID nullable | null para templates de sistema |
| `category` | TEXT | `personal_development` \| `product_launch` \| ... \| `custom` |
| `tasks_config` | JSONB NOT NULL | Array de tasks con steps anidados (ver §5) |
| `is_system` | BOOL DEFAULT true | true = inmutable, seeded |
| `squad_type` | TEXT | Squad AIOS asignado: `dev` \| `research` \| `coach` \| `none` |

### 3.7 `projects`
Vehículos de ejecución vinculados a un KR opcional y un área opcional.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `area_id` | UUID FK → areas ON DELETE SET NULL | — |
| `okr_id` | UUID FK → okrs ON DELETE SET NULL | Key Result vinculado |
| `template_id` | UUID FK → workflow_templates ON DELETE SET NULL | Template origen |
| `status` | TEXT | `active` \| `completed` \| `archived` \| `paused` |

### 3.8 `workflows`
Workflows dentro de proyectos. Contienen el estado del Visual Workflow Builder (React Flow).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `project_id` | UUID FK → projects ON DELETE CASCADE | null = workflow standalone |
| `squad_type` | TEXT | Squad AIOS: `dev` \| `research` \| `coach` \| `none` |
| `canvas_data` | JSONB nullable | Estado del React Flow: `{ nodes, edges }` |
| `status` | TEXT | `active` \| `completed` \| `archived` |

### 3.9 `tasks`
Fases ordenadas dentro de un workflow. Cada task contiene steps/activities.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `workflow_id` | UUID FK → workflows ON DELETE CASCADE | — |
| `order` | INT DEFAULT 0 | 0-based ordering dentro del workflow |
| `status` | TEXT | `pending` \| `in_progress` \| `completed` \| `skipped` |

### 3.10 `steps_activities`
Entidad unificada de Steps (planificados) y Activities (espontáneas). Campo `planned` distingue el tipo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `task_id` | UUID FK → tasks ON DELETE SET NULL | null para actividades espontáneas |
| `area_id` | UUID FK → areas ON DELETE SET NULL | Siempre requerida |
| `habit_id` | UUID FK → habits ON DELETE SET NULL | Set si generada por un hábito |
| `executor_type` | TEXT | `human` \| `ai` \| `mixed` |
| `planned` | BOOL | true=step de workflow, false=actividad espontánea |
| `ai_agent` | TEXT | Ej: `@dev`, `@analyst` cuando executor_type='ai' |
| `scheduled_at` | TIMESTAMPTZ | Para calendario |
| `status` | TEXT | `pending` \| `in_progress` \| `completed` \| `skipped` \| `cancelled` |

### 3.11 `time_entries`
Sesiones de trabajo (timer) vinculadas a un step/activity.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `step_activity_id` | UUID FK → steps_activities ON DELETE CASCADE | — |
| `started_at` | TIMESTAMPTZ NOT NULL | Inicio del timer |
| `ended_at` | TIMESTAMPTZ | null si timer activo |
| `duration_seconds` | INT | Calculado al detener |
| `is_active` | BOOL | true = timer corriendo actualmente |

### 3.12 `inbox_items`
Cola de captura rápida. La IA clasifica y sugiere dónde enrutar cada item.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `raw_text` | TEXT NOT NULL | Input libre del usuario |
| `status` | TEXT | `pending` \| `classified` \| `scheduled` \| `rejected` |
| `ai_classification` | TEXT | Categoría detectada por IA |
| `ai_suggested_area_id` | UUID FK → areas ON DELETE SET NULL | — |
| `ai_suggested_slot` | TIMESTAMPTZ | Slot propuesto en calendario |
| `step_activity_id` | UUID FK → steps_activities | Set cuando se convierte en actividad |

### 3.13 `checkin_responses`
Respuestas del check-in diario vinculadas a una step_activity.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `step_activity_id` | UUID FK → steps_activities ON DELETE CASCADE | — |
| `checkin_date` | DATE NOT NULL | Fecha del check-in |
| `energy_level` | INT | 1-5 Likert scale (CHECK constraint) |
| `status` | TEXT | `completed` \| `skipped` |

**Unique:** `(step_activity_id, checkin_date)`
**CHECK constraint:** `energy_level BETWEEN 1 AND 5`

### 3.14 `step_skill_tags`
Tabla de unión N:M entre steps_activities y skills. Evita FK circular.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `step_activity_id` | UUID FK → steps_activities ON DELETE CASCADE | — |
| `skill_id` | UUID FK → skills ON DELETE CASCADE | — |
| `user_id` | UUID FK → auth.users ON DELETE CASCADE | Para queries directas |

**Unique:** `(step_activity_id, skill_id)`

### 3.15 `correlations`
Cache de resultados del motor de correlaciones (computed nightly via Edge Function cron).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `tier` | TEXT | `gathering` (<7d) \| `provisional` (7-13d) \| `full` (≥14d) |
| `type` | TEXT | `positive` \| `negative` \| `destructive_loop` \| `leverage_point` \| `bottleneck` |
| `confidence` | NUMERIC(4,3) | 0-1, null en tier gathering |
| `entity_a_type` / `entity_b_type` | TEXT | Patrón polimórfico: `area` \| `habit` \| `project` |
| `correlation_value` | NUMERIC(5,4) | Pearson/Spearman -1 a 1 |
| `is_active` | BOOL | false = superseded por run más reciente |
| `description_nl` | TEXT | Insight en lenguaje natural (generado por LLM) |

---

## 4. Estrategia de Índices

### Índices de Performance (Story 1.4)

| Tabla | Índice | Columnas | Propósito |
|-------|--------|----------|-----------|
| `areas` | `areas_user_id_idx` | `(user_id)` | Dashboard: todas las áreas de un usuario |
| `areas` | `areas_user_maslow_idx` | `(user_id, maslow_level)` | Scoring Maslow ordenado |
| `okrs` | `okrs_user_status_idx` | `(user_id, status)` | Dashboard OKR por estado |
| `okrs` | `okrs_user_type_idx` | `(user_id, type)` | Filtrar por nivel (vision/annual/kr) |
| `okrs` | `okrs_parent_id_idx` | `(parent_id)` | Traversal jerárquico |
| `habits` | `habits_user_active_idx` | `(user_id, is_active)` | Lista de hábitos activos |
| `habits` | `habits_user_area_idx` | `(user_id, area_id)` | Hábitos por área |
| `projects` | `projects_user_status_idx` | `(user_id, status)` | Lista de proyectos por estado |
| `projects` | `projects_user_area_idx` | `(user_id, area_id)` | Proyectos por área |
| `workflows` | `workflows_project_id_idx` | `(project_id)` | Workflows de un proyecto |
| `workflows` | `workflows_user_status_idx` | `(user_id, status)` | Dashboard de workflows |
| `tasks` | `tasks_workflow_order_idx` | `(workflow_id, order)` | Tareas ordenadas de un workflow |
| `tasks` | `tasks_user_status_idx` | `(user_id, status)` | Vista cross-workflow por estado |

### Índices Pre-existentes (Story 1.2)

| Tabla | Índice | Tipo | Propósito |
|-------|--------|------|-----------|
| `skills` | `skills_user_id_name_idx` | UNIQUE | Nombre único por usuario |
| `area_scores` | `area_scores_area_id_scored_at_idx` | UNIQUE | Un score por área por día |
| `steps_activities` | `steps_activities_user_scheduled_idx` | INDEX | Queries de calendario |
| `steps_activities` | `steps_activities_user_status_idx` | INDEX | Check-in diario |
| `steps_activities` | `steps_activities_area_id_idx` | INDEX | Salud de área |
| `time_entries` | `time_entries_user_active_idx` | INDEX | Timer activo |
| `time_entries` | `time_entries_user_started_at_idx` | INDEX | Reportes de tiempo |
| `time_entries` | `time_entries_step_activity_id_idx` | INDEX | Sessions por actividad |
| `inbox_items` | `inbox_items_user_status_idx` | INDEX | Cola de inbox pendiente |
| `inbox_items` | `inbox_items_user_created_at_idx` | INDEX | Timeline de inbox |
| `checkin_responses` | `checkin_responses_activity_date_idx` | UNIQUE | Un check-in por día por actividad |
| `checkin_responses` | `checkin_responses_user_date_idx` | INDEX | Check-in diario del usuario |
| `step_skill_tags` | `step_skill_tags_step_skill_idx` | UNIQUE | No duplicados |
| `step_skill_tags` | `step_skill_tags_skill_id_idx` | INDEX | Actividades por skill |
| `correlations` | `correlations_user_active_computed_idx` | INDEX | Correlaciones activas recientes |

---

## 5. JSONB: Estructura de `tasks_config`

Campo JSONB en `workflow_templates`. Define las tasks y steps del template.

```typescript
type TaskConfig = {
  title: string        // Nombre de la fase/task
  order: number        // 0-based ordering
  steps: Array<{
    title: string
    executor_type: 'human' | 'ai' | 'mixed'
    ai_agent?: string  // '@dev' | '@analyst' | '@pm' | '@qa' | '@devops' | '@architect'
  }>
}

// tasks_config es un array de TaskConfig
type TasksConfig = TaskConfig[]
```

**Ejemplo:**
```json
[
  {
    "title": "Diagnóstico",
    "order": 0,
    "steps": [
      { "title": "Evaluar estado actual", "executor_type": "human" },
      { "title": "Analizar correlaciones", "executor_type": "ai", "ai_agent": "@analyst" }
    ]
  }
]
```

---

## 6. FK → auth.users y RLS

### 6.1 Foreign Keys a auth.users

Todas las tablas con `user_id` tienen FK explícita `→ auth.users(id) ON DELETE CASCADE`.
Aplicadas via SQL migration (Drizzle no puede referenciar el schema `auth` directamente).

Tablas con FK a auth.users: `areas`, `area_scores`, `okrs`, `habits`, `skills`, `workflow_templates` (user_id nullable), `projects`, `workflows`, `tasks`, `steps_activities`, `time_entries`, `inbox_items`, `checkin_responses`, `step_skill_tags`, `correlations`.

**`workflow_templates`:** `user_id` es nullable — null para templates del sistema. La FK solo verifica valores NOT NULL, por lo que NULL pasa el check correctamente.

### 6.2 RLS Policies

Todas las tablas tienen RLS habilitado. Policy estándar:
```sql
-- SELECT: solo filas propias
USING (user_id = auth.uid())

-- INSERT/UPDATE/DELETE: solo recursos propios
WITH CHECK (user_id = auth.uid())
```

Ver `supabase/rls-policies.sql` para las policies completas.

---

## 7. Seeds del Sistema

8 templates MVP con `is_system=true`, `user_id=null`. Aplicados via `supabase/seeds/workflow-templates.sql`.

| ID (últimos 4 chars) | Nombre | Categoría | Squad |
|---------------------|--------|-----------|-------|
| `...1111` | Desarrollo Personal | `personal_development` | `coach` |
| `...2222` | Lanzamiento de Producto | `product_launch` | `dev` |
| `...3333` | Sprint de Salud | `health_sprint` | `coach` |
| `...4444` | Aprendizaje de Habilidad | `learning` | `research` |
| `...5555` | Creación de Contenido | `content_creation` | `research` |
| `...6666` | Revisión Financiera | `financial_review` | `coach` |
| `...7777` | Construcción de Hábito | `habit_building` | `coach` |
| `...8888` | Plantilla Personalizada | `custom` | `none` |

---

## 8. CHECK Constraints

| Tabla | Constraint | Regla |
|-------|-----------|-------|
| `areas` | `areas_maslow_level_check` | `maslow_level BETWEEN 1 AND 8` |
| `areas` | `areas_current_score_check` | `current_score BETWEEN 0 AND 100` |
| `okrs` | `okrs_progress_check` | `progress BETWEEN 0 AND 100` |
| `checkin_responses` | `checkin_responses_energy_level_check` | `energy_level BETWEEN 1 AND 5` |

---

## 9. Archivos de Referencia

| Archivo | Propósito |
|---------|-----------|
| `lib/db/schema/` | 15 archivos Drizzle ORM TypeScript |
| `lib/db/client.ts` | Drizzle client + conexión Supabase |
| `lib/db/migrations/0000_married_marten_broadcloak.sql` | Migration generada por drizzle-kit |
| `supabase/migrations/add_auth_fk_and_constraints.sql` | FK auth.users + CHECK constraints |
| `supabase/seeds/workflow-templates.sql` | 8 templates MVP (idempotente) |
| `docs/architecture/database-schema.md` | Decisiones de arquitectura (@architect) |

---

*— Dara, arquitetando dados 🗄️*
