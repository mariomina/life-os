# life-os PRD — 8. Next Steps

> **Documento:** [PRD Index](./index.md)
> **Sección:** 8 de 8

---

## Secuencia de handoffs

```
✅ COMPLETADO  → @po   *validate-story-draft (PRD) — GO CONDICIONAL
                        Status: v1.1 Ready

✅ COMPLETADO  → @architect  *create-doc architecture
                        ORM: Drizzle ORM ✅
                        Correlaciones: Tiered Insights ✅
                        Output: docs/architecture.md ✅

✅ COMPLETADO  → @data-engineer  *create-schema
                        15 tablas Drizzle ORM
                        RLS policies + seed templates
                        Output: lib/db/schema/ + docs/data/ ✅

✅ COMPLETADO  → @po  *shard-doc docs/prd.md
                        Output: docs/prd/ ✅

EN CURSO       → @po  *shard-doc docs/architecture.md
                        Output: docs/architecture/ (pendiente)

SIGUIENTE      → @sm  *create-next-story
                        Primera story: E1.1 — Setup del proyecto
                        (Next.js 16 + TailAdmin + Tailwind v4 + TypeScript + shadcn/ui)

PARALELO       → @ux-design-expert
                        Flow diagrams: Daily Check-in + Inbox processing
                        Output: docs/ux-flows.md (antes de E5/E6)

POST-E1        → @devops  *setup-github
                        Repo GitHub + Vercel + Supabase project
                        CI/CD pipeline (auto-deploy main + PR previews)
```

## Decisiones pendientes — por agente

| Decisión                               | Agente            | Estado                | Bloquea          |
| -------------------------------------- | ----------------- | --------------------- | ---------------- |
| ORM: Supabase JS vs Drizzle            | @architect        | ✅ Resuelto → Drizzle | —                |
| Correlaciones datos escasos (<14 días) | @data-engineer    | ✅ Resuelto → Tiered  | —                |
| Flow UX Daily Check-in + Inbox         | @ux-design-expert | 🟡 Pendiente          | E5, E6           |
| Diferir E7 (Habilidades) a Phase 2     | Mario (decisión)  | 🟢 Baja urgencia      | Planificación E7 |

## Estado de documentos

| Documento              | Estado                      | Versión |
| ---------------------- | --------------------------- | ------- |
| `docs/brief.md`        | ✅ Completo                 | v1.8    |
| `docs/prd.md`          | ✅ Ready — validado por @po | v1.1    |
| `docs/prd/`            | ✅ Sharded                  | —       |
| `docs/architecture.md` | ✅ Completo                 | v1.0    |
| `docs/architecture/`   | 🔄 Sharding en curso        | —       |
| `lib/db/schema/`       | ✅ Completo (15 tablas)     | v1.0    |
| `docs/data/`           | ✅ Completo                 | v1.0    |
| `docs/ux-flows.md`     | ❌ Pendiente                | —       |
| `docs/stories/`        | ❌ Pendiente                | —       |

## Criterio de éxito del MVP (recordatorio)

El MVP es exitoso si al cabo de 30 días de uso real:

1. El Calendario de life-os reemplaza Google Calendar como única agenda
2. Daily Check-in completado ≥5 días/semana
3. Weekly Review realizado ≥3 semanas consecutivas
4. ≥1 hábito con streak activo ≥14 días
5. Motor correlaciones detectó ≥3 patrones con datos reales
6. Life System Health Score mejoró vs baseline del diagnóstico inicial
