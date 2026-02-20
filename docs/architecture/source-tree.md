# Architecture — 9. Source Tree

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 9 de 17

---

```
life-os/
├── app/                            # Next.js App Router
│   ├── (auth)/                     # Rutas sin sidebar
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── onboarding/
│   │       └── page.tsx
│   ├── (app)/                      # Rutas con layout TailAdmin
│   │   ├── layout.tsx              # Sidebar + Navbar + auth check
│   │   ├── page.tsx                # Home — Execution Space
│   │   ├── areas/
│   │   │   └── page.tsx            # Vista Áreas de Vida
│   │   ├── okrs/
│   │   │   └── page.tsx            # Vista OKRs
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Detalle proyecto
│   │   │       └── workflow/
│   │   │           └── page.tsx    # Visual Workflow Builder
│   │   ├── calendar/
│   │   │   └── page.tsx            # Calendario 5 vistas
│   │   ├── inbox/
│   │   │   └── page.tsx
│   │   ├── habits/
│   │   │   └── page.tsx
│   │   ├── skills/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx            # Informes + correlaciones
│   │   └── weekly-review/
│   │       └── page.tsx
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Tailwind CSS 4 + TailAdmin styles
│
├── components/                     # Componentes compartidos
│   ├── ui/                         # shadcn/ui components (generados)
│   └── shared/                     # Componentes propios reutilizables
│       ├── MaslowScoreCard.tsx
│       ├── TimerWidget.tsx
│       ├── DailyCheckinBanner.tsx
│       └── AreaBadge.tsx
│
├── features/                       # Lógica de dominio por feature
│   ├── maslow/
│   │   ├── scoring.ts              # calculateAreaScore, calculateGlobalScore
│   │   └── alerts.ts               # getAlerts, getBalancingSuggestions
│   ├── calendar/
│   │   ├── big-calendar-adapter.tsx # Wrapper + Tailwind v4 migration
│   │   └── rrule-utils.ts          # generateOccurrences, parseRRule
│   ├── correlation-engine/
│   │   ├── pearson.ts              # Pearson correlation calculation
│   │   ├── spearman.ts             # Spearman correlation calculation
│   │   ├── tiered-analysis.ts      # Tiered approach por días de datos
│   │   └── pattern-detector.ts     # Bucles, leverage, bottlenecks
│   ├── workflow-builder/
│   │   ├── WorkflowCanvas.tsx      # React Flow canvas
│   │   ├── nodes/
│   │   │   ├── TaskNode.tsx        # Nodo Task (rectángulo)
│   │   │   └── StepNode.tsx        # Nodo Step (círculo coloreado)
│   │   └── edges/
│   │       └── DependencyEdge.tsx
│   ├── inbox/
│   │   ├── ai-pipeline.ts          # processInboxItem + fallback manual
│   │   └── slot-detector.ts        # Detectar huecos en calendario
│   └── timer/
│       ├── useTimer.ts             # Hook con start/pause/stop
│       └── realtime-sync.ts        # Supabase Realtime integration
│
├── lib/
│   ├── db/
│   │   ├── schema/                 # Drizzle schema (fuente de verdad)
│   │   │   ├── index.ts
│   │   │   ├── areas.ts
│   │   │   ├── area-scores.ts
│   │   │   ├── okrs.ts
│   │   │   ├── habits.ts
│   │   │   ├── skills.ts
│   │   │   ├── workflow-templates.ts
│   │   │   ├── projects.ts
│   │   │   ├── workflows.ts
│   │   │   ├── tasks.ts
│   │   │   ├── steps-activities.ts
│   │   │   ├── time-entries.ts
│   │   │   ├── inbox-items.ts
│   │   │   ├── checkin-responses.ts
│   │   │   ├── step-skill-tags.ts
│   │   │   ├── correlations.ts
│   │   │   └── relations.ts
│   │   ├── queries/                # Funciones de query reutilizables
│   │   │   ├── areas.ts
│   │   │   ├── calendar.ts
│   │   │   ├── checkin.ts
│   │   │   ├── correlations.ts
│   │   │   ├── inbox.ts
│   │   │   ├── okrs.ts
│   │   │   ├── projects.ts
│   │   │   ├── skills.ts
│   │   │   ├── timer.ts
│   │   │   └── workflows.ts
│   │   ├── migrations/             # Drizzle migrations (auto-generadas)
│   │   └── client.ts               # Drizzle client + Supabase connection
│   ├── ai/
│   │   ├── providers/
│   │   │   ├── interface.ts        # ILLMProvider interface
│   │   │   ├── claude.ts           # ClaudeProvider
│   │   │   ├── openai.ts           # OpenAIProvider
│   │   │   ├── gemini.ts           # GeminiProvider
│   │   │   └── factory.ts          # createLLMProvider() factory
│   │   └── prompts/
│   │       ├── inbox-classification.ts
│   │       ├── correlation-insights.ts
│   │       ├── weekly-review.ts
│   │       └── area-diagnosis.ts
│   ├── supabase/
│   │   ├── server.ts               # createServerClient (Server Components/Actions)
│   │   └── client.ts               # createBrowserClient (Client Components)
│   └── utils/
│       ├── maslow-weights.ts       # Constantes multiplicadores (2.0, 1.5, 1.2, 1.0)
│       └── date-utils.ts           # Helpers de fecha/timezone
│
├── actions/                        # Next.js Server Actions
│   ├── calendar.ts
│   ├── checkin.ts
│   ├── inbox.ts
│   ├── okrs.ts
│   ├── projects.ts
│   ├── timer.ts
│   └── areas.ts
│
├── stores/                         # Zustand stores (client-side)
│   ├── timer-store.ts              # Timer activo + estado optimista
│   └── ui-store.ts                 # Sidebar, modales, preferencias UI
│
├── types/                          # TypeScript types compartidos
│   ├── domain.ts                   # Area, OKR, Project, StepActivity, etc.
│   ├── ai.ts                       # ILLMProvider, LLMOptions, InboxSuggestion
│   └── supabase.ts                 # Tipos generados por Supabase CLI
│
├── hooks/                          # React hooks compartidos
│   ├── useTimer.ts                 # Timer wrapper
│   └── useOptimistic.ts            # Helper para optimistic updates
│
├── supabase/
│   ├── functions/                  # Edge Functions
│   │   └── correlation-cron/
│   │       └── index.ts            # Cron nocturno 03:00 UTC
│   └── config.toml                 # Supabase local dev config
│
├── tests/
│   ├── unit/                       # Vitest unit tests
│   │   ├── maslow/
│   │   ├── correlation-engine/
│   │   └── ai/
│   ├── integration/                # Vitest integration (DB local)
│   └── e2e/                        # (Phase 2 — Playwright)
│
├── docs/
│   ├── prd/                        # PRD sharded
│   ├── architecture/               # Architecture sharded (este directorio)
│   ├── data/                       # Schema notes + SQL files
│   └── stories/                    # Development stories (pendiente)
│
├── drizzle.config.ts               # Drizzle Kit config
├── next.config.ts                  # Next.js config
├── tailwind.config.ts              # Tailwind CSS 4 config
├── vitest.config.ts                # Vitest config
├── .env.example                    # Variables de entorno documentadas
└── package.json
```
