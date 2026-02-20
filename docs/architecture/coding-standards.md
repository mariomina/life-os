# Architecture — 12. Coding Standards

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 12 de 17

---

## 12.1 Core Standards

- **Lenguaje + Runtime:** TypeScript 5.x strict mode (`"strict": true` en tsconfig) — sin `any` implícito
- **Linting:** ESLint con config Next.js + Prettier (formato automático en pre-commit)
- **Tests:** Vitest — archivos en `tests/unit/` o `*.test.ts` junto al archivo testeado
- **Imports:** Path aliases — `@/` mapea a la raíz del proyecto según Next.js config

## 12.2 Naming Conventions

| Elemento            | Convención                                  | Ejemplo                              |
| ------------------- | ------------------------------------------- | ------------------------------------ |
| Componentes React   | PascalCase                                  | `TimerWidget.tsx`                    |
| Server Actions      | camelCase, verbo primero                    | `startTimer()`, `processInboxItem()` |
| DB Query functions  | camelCase, `get`/`create`/`update`/`delete` | `getAreaScores()`                    |
| Zustand stores      | camelCase + `Store` sufijo                  | `timerStore`, `uiStore`              |
| Types/Interfaces    | PascalCase                                  | `StepActivity`, `ILLMProvider`       |
| DB Tables (Drizzle) | snake_case plural                           | `steps_activities`, `area_scores`    |
| Env variables       | UPPER_SNAKE_CASE                            | `ANTHROPIC_API_KEY`                  |

## 12.3 Critical Rules

- **Server Actions exclusivos para mutaciones:** Ningún componente client hace fetch directo a Supabase para mutaciones — siempre via Server Actions
- **Queries solo via `lib/db/queries/`:** Los Server Actions y Server Components nunca importan `db` directamente — siempre funciones de query
- **Secrets solo server-side:** `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` — NUNCA en variables `NEXT_PUBLIC_*`
- **RLS siempre activo:** Ninguna query debe bypassar RLS. Si se usa `service_role_key`, debe documentarse explícitamente por qué
- **ILLMProvider factory, nunca instanciación directa:** `createLLMProvider()` en lugar de `new ClaudeProvider()` — permite cambio de proveedor via env
- **Server Actions devuelven `ActionResult<T>`:** Nunca lanzan excepciones sin capturar — el cliente siempre recibe objeto tipado
- **`'use client'` mínimo:** Solo en componentes que requieren interactividad (eventos, Zustand, hooks). Los data-fetching components son Server Components por defecto
- **Maslow weights son constantes:** `lib/utils/maslow-weights.ts` es la única fuente de verdad para multiplicadores (2.0, 1.5, 1.2, 1.0) — nunca hardcodear en componentes

## 12.4 TypeScript Specifics

- **Discriminated unions para resultados:** Usar `| { success: true; data: T } | { success: false; error: string }` en lugar de throw/catch
- **Zod para validación en boundaries externos:** Input de formularios, respuestas de IA, webhooks — validar con Zod antes de procesar
- **Drizzle types via inferencia:** Usar `InferSelectModel<typeof table>` en lugar de duplicar tipos manualmente
