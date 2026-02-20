# Architecture — 8. Database Schema (High-Level)

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 8 de 17

> **Delegado a @data-engineer (Dara):** El DDL completo (CREATE TABLE, índices, RLS policies, triggers, migraciones Drizzle) fue creado por @data-engineer en `lib/db/schema/` y `docs/data/`.

---

## 8.1 Decisiones de Schema que @architect define

| Decisión                                  | Elección                                                      | Razón                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| UUID vs BIGINT para PKs                   | UUID (`gen_random_uuid()`)                                    | RLS de Supabase funciona mejor con UUIDs; sin colisiones cross-tabla                             |
| `steps` vs `activities`                   | Tabla única `steps_activities`                                | Modelo unificado (FR5) — campo `planned` distingue steps planeados de actividades espontáneas    |
| `areas` — estáticas o por usuario         | Tabla `areas` con `user_id` + `maslow_level` (1-8 prefijados) | Usuario personaliza nombres pero los 8 niveles son fijos. Permite scores históricos por usuario. |
| JSON vs columnas para config de templates | JSONB para `tasks_config` en `workflow_templates`             | Estructura flexible sin migraciones cada vez que evoluciona un template                          |
| Correlaciones — calcular o cachear        | Cachear en tabla `correlations`                               | El cálculo es costoso (Pearson sobre 90 días). Se invalida en cada cron nocturno.                |
| RLS                                       | **Todas las tablas con RLS**                                  | NFR2 — sin excepción. `user_id = auth.uid()` en todas las policies                               |

## 8.2 Índices Mínimos Requeridos

Estos índices son obligatorios por performance (implementados por @data-engineer):

- `steps_activities(user_id, scheduled_at)` — queries del calendario
- `time_entries(user_id, started_at, is_active)` — timer activo + reportes
- `area_scores(area_id, scored_at DESC)` — tendencia histórica
- `correlations(user_id, computed_at DESC)` — última correlación por usuario
- `inbox_items(user_id, status)` — cola de inbox pendiente
- `checkin_responses(user_id, checkin_date)` — check-in diario

## 8.3 Drizzle Schema Entry Point

```typescript
// lib/db/schema/index.ts — barrel export de todos los schemas
export * from './areas'
export * from './area-scores'
export * from './okrs'
export * from './habits'
export * from './skills'
export * from './workflow-templates'
export * from './projects'
export * from './workflows'
export * from './tasks'
export * from './steps-activities'
export * from './time-entries'
export * from './inbox-items'
export * from './checkin-responses'
export * from './step-skill-tags'
export * from './correlations'
export * from './relations'
```

## 8.4 Archivos de Schema Implementados

Ver `docs/data/schema-notes.md` para el checklist de implementación completo.

| Archivo                        | Estado                                  |
| ------------------------------ | --------------------------------------- |
| `lib/db/schema/` (15 tablas)   | ✅ Creado por @data-engineer            |
| `lib/db/client.ts`             | ✅ Drizzle client + Supabase connection |
| `drizzle.config.ts`            | ✅ Drizzle Kit config                   |
| `docs/data/rls-policies.sql`   | ✅ RLS + triggers + FK auth.users       |
| `docs/data/seed-templates.sql` | ✅ 8 workflow templates MVP             |
