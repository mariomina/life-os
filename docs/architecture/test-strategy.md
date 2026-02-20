# Architecture — 13. Test Strategy

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 13 de 17

---

## 13.1 Testing Philosophy

- **Approach:** Test-after (post-implementation) en MVP — AIOS escribe tests al completar cada story
- **Coverage Goal:** 80% en `features/`, `lib/db/queries/`, `actions/` — no en componentes UI básicos
- **Test Pyramid:** 70% unit (lógica pura) · 25% integration (DB + Server Actions) · 5% E2E (Phase 2)

## 13.2 Unit Tests (Vitest)

- **Framework:** Vitest 3.x — compatible con Vite/Next.js, faster que Jest
- **Naming:** `*.test.ts` junto al archivo testeado, o en `tests/unit/` espejando estructura
- **Mocking:** `vi.mock()` para Drizzle, Supabase, ILLMProvider
- **Coverage:** `vitest --coverage` — mínimo 80% en features/ y lib/

**Prioridad de tests unitarios:**

1. `features/maslow/scoring.ts` — fórmula de scoring es crítica y pura (fácil de testear)
2. `features/correlation-engine/` — algoritmos Pearson/Spearman
3. `lib/ai/providers/factory.ts` — selección correcta de proveedor
4. `features/inbox/ai-pipeline.ts` — especialmente el fallback manual (FR22)
5. `lib/utils/maslow-weights.ts` — constantes correctas

## 13.3 Integration Tests (Vitest + Supabase Local)

- **Scope:** Server Actions + DB queries contra Supabase local (Docker)
- **Setup:** `supabase start` + seed data + tests + `supabase stop`
- **Location:** `tests/integration/`
- **Casos críticos:** Timer start/stop con time_entry correcta, Daily Check-in actualiza area_score, Inbox item processed correctamente

## 13.4 E2E Tests (Phase 2)

- **Framework:** Playwright (ya disponible en AIOS MCP)
- **Scope:** Happy paths de Daily Check-in, Inbox processing, Timer completo
- **Deferido:** Phase 2 — MVP se apoya en integration tests

## 13.5 Continuous Testing

- **CI:** GitHub Actions ejecuta `npm test` + `npm run typecheck` en cada PR
- **Pre-commit:** Husky + lint-staged ejecuta ESLint + Prettier antes de cada commit
- **Coverage gate:** PR bloqueado si coverage cae por debajo del 80% en nuevos archivos
