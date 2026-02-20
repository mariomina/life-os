# Architecture — 3. Tech Stack

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 3 de 17

---

## 3.1 Cloud Infrastructure

- **Provider:** Vercel (frontend + server actions) + Supabase (database + auth + realtime)
- **Key Services:** Vercel Edge Runtime (middleware), Supabase PostgreSQL, Supabase Auth, Supabase Realtime, Supabase Edge Functions (cron jobs)
- **Deployment Region:** Vercel → auto (CDN global); Supabase → `us-east-1` (free tier default)
- **Budget MVP:** $0 — Vercel Hobby + Supabase Free Tier (≤500MB DB, ≤50MB file storage)

## 3.2 Technology Stack Table

| Categoría             | Tecnología                 | Versión | Propósito                                    | Justificación                                    |
| --------------------- | -------------------------- | ------- | -------------------------------------------- | ------------------------------------------------ |
| **Framework**         | Next.js                    | 16.1.6  | Full-stack app framework (App Router)        | Stack mandatorio del PRD                         |
| **UI Library**        | React                      | 19.x    | Component model                              | Stack mandatorio del PRD                         |
| **Lenguaje**          | TypeScript                 | 5.x     | Type safety completo                         | Previene errores en schema complejo              |
| **Estilos**           | Tailwind CSS               | 4.x     | Utility-first CSS                            | Stack mandatorio + TailAdmin nativo              |
| **Layout Base**       | TailAdmin                  | 2.2.2   | Sidebar, navbar, dashboard, dark mode        | MIT, Next.js 16 + Tailwind v4 nativo             |
| **UI Components**     | shadcn/ui                  | latest  | Componentes accesibles reutilizables         | Viene con TailAdmin; sin vendor lock-in          |
| **Calendario**        | big-calendar (lramos33)    | latest  | 5 vistas calendario (Año/Mes/Sem/Día/Agenda) | MIT, shadcn/ui, drag&drop nativo                 |
| **Recurrencia**       | rrule                      | 2.x     | RFC 5545 — eventos recurrentes on-the-fly    | Estándar de facto, sin pre-generar ocurrencias   |
| **Workflow Builder**  | @xyflow/react (React Flow) | 12.x    | Canvas visual estilo n8n para workflows      | MIT, 11.5k dependents, nodos/edges customizables |
| **Charts**            | ApexCharts (TailAdmin)     | 3.x     | Gráficos en Informes                         | Ya incluido en TailAdmin                         |
| **Base de datos**     | Supabase (PostgreSQL)      | Cloud   | DB relacional con RLS                        | Stack mandatorio                                 |
| **ORM**               | Drizzle ORM                | 0.39.x  | Type-safe queries + migraciones              | **DECISIÓN RESUELTA** — ver §3.3                 |
| **Auth**              | Supabase Auth              | Cloud   | Magic link + email/password                  | Stack mandatorio                                 |
| **Realtime**          | Supabase Realtime          | Cloud   | Timer activo (latencia <1s)                  | Solo para NFR7                                   |
| **Edge Functions**    | Supabase Edge Functions    | Deno    | Cron job correlaciones nocturno              | NFR8                                             |
| **Estado Global**     | Zustand                    | 5.x     | UI state + timer state + optimistic updates  | Minimal, sin boilerplate de Redux                |
| **IA — Abstracción**  | ILLMProvider (custom)      | —       | Interfaz multi-proveedor                     | FR15 — sin vendor lock-in                        |
| **IA — MVP Provider** | Claude (Anthropic SDK)     | Haiku   | Clasificación inbox, correlaciones, review   | Velocidad + costo óptimo para MVP                |
| **Deploy**            | Vercel                     | Cloud   | Hosting + CI/CD automático                   | FR NFR3                                          |
| **CI/CD**             | GitHub Actions + Vercel    | —       | Auto-deploy main + PR previews               | NFR3                                             |
| **Testing**           | Vitest                     | 3.x     | Unit + integration tests                     | Story 1.6 — fast, compatible Vite/Next           |
| **Testing UI**        | React Testing Library      | 16.x    | Component testing                            | Story 1.6                                        |
| **Linting**           | ESLint + Prettier          | latest  | Code style                                   | Viene con Next.js                                |
| **Git hooks**         | Husky + lint-staged        | latest  | Pre-commit checks                            | Calidad automática                               |

## 3.3 Decisión Resuelta: ORM

**Decisión: Drizzle ORM** ✅

| Criterio                 | Supabase JS Client                   | Drizzle ORM                                 |
| ------------------------ | ------------------------------------ | ------------------------------------------- |
| Type safety              | Parcial (tipos generados desde DB)   | Total (schema como código, tipos inferidos) |
| Migraciones              | Manual (SQL directo o Supabase UI)   | Automático (`drizzle-kit push/generate`)    |
| Queries complejas        | `rpc()` + SQL manual                 | Type-safe query builder                     |
| RLS compatibility        | Total (client respeta RLS)           | Total (usa Supabase connection)             |
| Curva de aprendizaje     | Baja                                 | Baja-media                                  |
| Bundle size              | 0 (client-side)                      | ~50KB (server only)                         |
| Ideal para correlaciones | No (SQL manual para joins complejos) | Sí (joins type-safe)                        |

**Justificación:** El schema de life-os tiene ~15 tablas con relaciones complejas (activities → steps → tasks → workflows → projects). El motor de correlaciones requiere joins de 4-5 tablas. Drizzle provee type-safety en todas las queries sin codegen externo, y gestiona migraciones automáticamente — crítico para un schema que evolucionará significativamente durante el desarrollo. La compatibilidad con RLS de Supabase es total (Drizzle usa la connection de Supabase). **Costo marginal de adoptar Drizzle en MVP: ~2h de setup. Beneficio: elimina bugs de SQL manual durante todo el desarrollo.**

```typescript
// Ejemplo: Drizzle ORM con Supabase
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL! // Supabase connection string
const client = postgres(connectionString)
export const db = drizzle(client)
```
