# Architecture — 6. External APIs

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 6 de 17

---

## 6.1 Supabase API

- **Propósito:** PostgreSQL (DB), Auth, Realtime, Edge Functions
- **Autenticación:** `SUPABASE_URL` + `SUPABASE_ANON_KEY` (client) + `SUPABASE_SERVICE_ROLE_KEY` (server actions)
- **Rate Limits:** Free tier — 500MB DB, 1GB bandwidth, 50MB storage, 2M Edge Function invocations/mes
- **Integración:** Drizzle ORM sobre connection string PostgreSQL directo; Auth via `@supabase/ssr` para App Router

```typescript
// lib/supabase/server.ts — Client para Server Components / Actions
import { createServerClient } from '@supabase/ssr'
// lib/supabase/client.ts — Client para Client Components (Realtime)
import { createBrowserClient } from '@supabase/ssr'
```

## 6.2 Anthropic Claude API (ILLMProvider MVP)

- **Propósito:** Clasificación inbox, insights correlaciones, weekly review, diagnóstico inicial
- **Modelo MVP:** `claude-haiku-4-5` — latencia baja, costo mínimo, suficiente para clasificación
- **Autenticación:** `ANTHROPIC_API_KEY` (server-side only, nunca expuesta al client)
- **Rate Limits:** Haiku — 5 req/min en free, 50 req/min en tier 1
- **Fallback:** Si Claude falla → fallback a modo manual (FR22)

```typescript
// lib/ai/providers/claude.ts
import Anthropic from '@anthropic-ai/sdk'
class ClaudeProvider implements ILLMProvider {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  async complete(prompt: string): Promise<string> { ... }
  async isAvailable(): Promise<boolean> { ... }
}
```

## 6.3 OpenAI API (ILLMProvider alternativa)

- **Propósito:** Proveedor alternativo, intercambiable via env var `LLM_PROVIDER=openai`
- **Modelo sugerido:** `gpt-4o-mini` para MVP (equivalente en costo/velocidad a Haiku)
- **Autenticación:** `OPENAI_API_KEY` (server-side only)

## 6.4 Vercel Deployment API

- **Propósito:** Auto-deploy desde GitHub + PR previews
- **Configuración:** via `vercel.json` + secrets en Vercel dashboard
- **No requiere integración programática** — solo webhook de GitHub
