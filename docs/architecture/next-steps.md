# Architecture — 17. Next Steps

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 17 de 17

---

## Handoffs

```
✅ COMPLETADO → @data-engineer (Dara)
                 Inputs: §4 (Data Models), §8 (Schema), §12 (naming conventions)
                 Output: lib/db/schema/*.ts + docs/data/ + drizzle.config.ts

✅ COMPLETADO → @po (Pax)
                 Task: *shard-doc docs/prd.md → docs/prd/ ✅
                 Task: *shard-doc docs/architecture.md → docs/architecture/ ✅

SIGUIENTE    → @sm (River)
                 Task: *create-next-story → Story 1.1
                 Título: Setup proyecto (Next.js 16 + TailAdmin + Tailwind v4 + TypeScript + shadcn/ui)
                 Contexto: Usar docs/prd/epic-details.md (E1) + docs/architecture/source-tree.md

PARALELO     → @ux-design-expert (Uma)
                 Inputs: docs/prd/ui-design-goals.md + docs/prd/epic-details.md (E5/E6)
                 Task: Flow diagrams Daily Check-in + Inbox processing
                 Output: docs/ux-flows.md
                 Bloquea: Stories de E5 y E6
```

## Story 1.1 Context (para @sm)

La primera story debe configurar:

1. Clonar/adaptar TailAdmin como base
2. Configurar TypeScript strict mode
3. Confirmar Tailwind CSS 4 funcionando
4. Instalar/verificar shadcn/ui
5. Configurar ESLint + Prettier + Husky + lint-staged
6. Crear estructura de carpetas del source tree (ver `source-tree.md`)
7. Variables de entorno (`.env.example`)
8. Verificar build limpio y deploy a Vercel

## Decisiones Pendientes (sin bloquear MVP)

| Decisión                     | Para Quién        | Urgencia | Bloquea     |
| ---------------------------- | ----------------- | -------- | ----------- |
| Diagrama UX Daily Check-in   | @ux-design-expert | 🟡 Media | E5/E6       |
| Diagrama UX Inbox processing | @ux-design-expert | 🟡 Media | E6          |
| Diferir E7 (Habilidades)     | Mario (decisión)  | 🟢 Baja  | Planning E7 |
| E2E con Playwright           | @qa               | 🟢 Baja  | Phase 2     |

## Estado General del Proyecto

| Fase                              | Estado                                    |
| --------------------------------- | ----------------------------------------- |
| PRD (docs/prd/)                   | ✅ Sharded — listo para @sm               |
| Architecture (docs/architecture/) | ✅ Sharded — listo para @sm               |
| DB Schema (lib/db/schema/)        | ✅ Creado — pendiente migration           |
| RLS + Seeds (docs/data/)          | ✅ Creado — pendiente aplicar en Supabase |
| Story 1.1                         | ❌ Pendiente → @sm \*create-next-story    |
| UX Flows                          | ❌ Pendiente → @ux-design-expert          |
