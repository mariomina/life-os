# life-os — Schema Design Notes

> **Generado por:** Dara (@data-engineer)
> **Fecha:** 2026-02-20
> **Para:** @dev (Story 1.4), @qa (QA Gate E1)

---

## Files Creados

| Archivo                               | Propósito                                           |
| ------------------------------------- | --------------------------------------------------- |
| `lib/db/schema/areas.ts`              | 8 áreas Maslow por usuario                          |
| `lib/db/schema/area-scores.ts`        | Historial de scores diarios                         |
| `lib/db/schema/okrs.ts`               | Visión → OKRs → KRs (self-referential)              |
| `lib/db/schema/habits.ts`             | Hábitos con rrule                                   |
| `lib/db/schema/skills.ts`             | Habilidades con tracking de tiempo                  |
| `lib/db/schema/workflow-templates.ts` | 8 templates predefinidos                            |
| `lib/db/schema/projects.ts`           | Proyectos vinculados a Área + KR                    |
| `lib/db/schema/workflows.ts`          | Workflows con canvas React Flow                     |
| `lib/db/schema/tasks.ts`              | Fases de un workflow                                |
| `lib/db/schema/steps-activities.ts`   | **Entidad central** — Steps + Activities unificados |
| `lib/db/schema/time-entries.ts`       | Time tracking start/stop                            |
| `lib/db/schema/inbox-items.ts`        | Inbox con procesamiento IA                          |
| `lib/db/schema/checkin-responses.ts`  | Daily check-in accountability                       |
| `lib/db/schema/step-skill-tags.ts`    | Junction table steps ↔ skills                       |
| `lib/db/schema/correlations.ts`       | Cache de correlaciones (cron nocturno)              |
| `lib/db/schema/relations.ts`          | Drizzle relations para join queries                 |
| `lib/db/schema/index.ts`              | Barrel export (orden de dependencias)               |
| `lib/db/client.ts`                    | Drizzle client (postgres-js + Supabase pooler)      |
| `drizzle.config.ts`                   | Drizzle Kit config                                  |
| `docs/data/rls-policies.sql`          | RLS completo + triggers + FK auth.users             |
| `docs/data/seed-templates.sql`        | 8 workflow templates MVP                            |

---

## Dependencias a Instalar (Story 1.4)

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

---

## Story 1.4 — Checklist de Implementación

### 1. Instalar dependencias

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### 2. Configurar variables de entorno

Añadir a `.env.local`:

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

> **IMPORTANTE:** Usar la URL del **Transaction Pooler** (puerto 6543), no la Direct connection.

### 3. Generar migración inicial

```bash
npx drizzle-kit generate
```

Revisa el SQL generado en `lib/db/migrations/` antes de aplicar.

### 4. Aplicar schema en Supabase

**Opción A (dev):** Push directo

```bash
npx drizzle-kit push
```

**Opción B (prod-safe):** Via Supabase CLI

```bash
supabase db push --db-url "$DATABASE_URL"
```

### 5. Aplicar RLS policies

Ejecutar `docs/data/rls-policies.sql` en el SQL Editor de Supabase Dashboard.

> Incluye: triggers `updated_at`, FKs a `auth.users`, trigger de seed de áreas en signup.

### 6. Aplicar seed de templates

Ejecutar `docs/data/seed-templates.sql` en el SQL Editor de Supabase Dashboard.

### 7. Verificar RLS coverage

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Todas las filas deben tener `rowsecurity = true`.

### 8. Verificar tipos TypeScript

```bash
npx drizzle-kit check
npm run typecheck
```

---

## Decisiones de Diseño Clave

### 1. Steps = Activities (tabla unificada)

- Un `step` planeado tiene `task_id` set y `planned=true`
- Una `activity` espontánea tiene `task_id=null` y `planned=false`
- Ambos son la misma entidad — simplifica queries de correlaciones y reportes

### 2. Sin FK a auth.users en Drizzle

- Drizzle no gestiona cross-schema FKs (`auth.users` está en schema `auth`)
- Las FKs se aplican manualmente en `rls-policies.sql`
- Los campos `user_id` en Drizzle son `uuid().notNull()` sin `.references()`

### 3. step_skill_tags (junction table)

- Evita referencia circular entre `steps_activities` y `skills`
- Permite que una actividad tenga múltiples skills (ej: "Implementar feature" → TypeScript + React)
- El tiempo se acumula en `skills.time_invested_seconds` cuando completa un `time_entry`

### 4. correlations — sin FK polimórfico

- `entity_a_type` + `entity_a_id` es un patrón polimórfico (UUID sin FK)
- Ventaja: soporta correlaciones entre cualquier tipo de entidad sin tabla intermedia
- Riesgo: no hay integridad referencial a nivel DB — el cron job debe validar IDs existentes

### 5. workflow_templates — JSONB para tasks_config

- La estructura de tasks/steps puede evolucionar sin migraciones
- El schema del JSONB está documentado en el JSDoc de `workflow-templates.ts`
- Validar con Zod al leer desde DB (en `lib/db/queries/workflow-templates.ts`)

### 6. area_scores — append-only

- No tiene `updated_at` — una vez registrado un score del día, no se modifica
- Si el score recalcula durante el día, se hace `UPSERT ON CONFLICT (area_id, scored_at)`

---

## Maslow Weights — Referencia

| Nivel | Área              | Grupo   | Multiplicador | Suma acumulada |
| ----- | ----------------- | ------- | ------------- | -------------- |
| 1     | Fisiológica       | D-Needs | 2.0×          | 2.0            |
| 2     | Seguridad         | D-Needs | 2.0×          | 4.0            |
| 3     | Conexión Social   | D-Needs | 1.5×          | 5.5            |
| 4     | Estima            | D-Needs | 1.5×          | 7.0            |
| 5     | Cognitiva         | B-Needs | 1.2×          | 8.2            |
| 6     | Estética          | B-Needs | 1.2×          | 9.4            |
| 7     | Autorrealización  | B-Needs | 1.0×          | 10.4           |
| 8     | Autotrascendencia | B-Needs | 1.0×          | 11.4           |

**Fórmula Life System Health Score:**

```
Score_global = Σ(score_área × multiplicador) / 11.4
```

---

_— Dara, arquitetando dados 🗄️_
_v1.0 · 2026-02-20 · @data-engineer Agent_
