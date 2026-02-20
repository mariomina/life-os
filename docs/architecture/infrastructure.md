# Architecture — 10. Infrastructure & Deployment

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 10 de 17

---

## 10.1 Infraestructura como Código

- **Herramienta:** Vercel CLI + Supabase CLI (via comandos en CI/CD)
- **Ubicación:** No hay IaC formal en MVP (configuración via dashboards + env vars)
- **Configuración:** `vercel.json` para headers y rewrites; `supabase/config.toml` para dev local

## 10.2 Deployment Strategy

- **Estrategia:** Continuous Deployment — cada push a `main` despliega automáticamente a producción
- **CI/CD Platform:** GitHub Actions (linting + tests) + Vercel (build + deploy)
- **Pipeline:** `push main` → GitHub Actions (lint + typecheck + vitest) → Vercel build → Vercel deploy
- **PR Previews:** Cada PR genera preview URL automática en Vercel

## 10.3 Environments

| Ambiente       | Propósito     | Detalles                                                           |
| -------------- | ------------- | ------------------------------------------------------------------ |
| **Local**      | Desarrollo    | `npm run dev` + Supabase local (Docker) + `.env.local`             |
| **Preview**    | Review de PRs | Vercel PR Preview + Supabase staging (misma instancia con prefijo) |
| **Production** | Prod          | Vercel production + Supabase prod — deploy automático desde `main` |

## 10.4 Promotion Flow

```
Local dev  →  git push origin feature/xxx
              ↓
           GitHub PR created
              ↓
           GitHub Actions: lint → typecheck → vitest
              ↓  (si pasa)
           Vercel PR Preview (URL automática)
              ↓  (review OK)
           Merge to main
              ↓
           GitHub Actions: full test suite
              ↓  (si pasa)
           Vercel Production Deploy (auto, <5 min)
```

## 10.5 Variables de Entorno Requeridas

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # URL pública del proyecto
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Clave anon (segura para client)
SUPABASE_SERVICE_ROLE_KEY=          # Solo server-side — NUNCA exponer
DATABASE_URL=                       # Connection string PostgreSQL para Drizzle

# IA
LLM_PROVIDER=claude                 # claude | openai | gemini
ANTHROPIC_API_KEY=                  # Solo server-side
OPENAI_API_KEY=                     # Solo server-side (alternativa)
GEMINI_API_KEY=                     # Solo server-side (alternativa)

# App
NEXT_PUBLIC_APP_URL=                # URL de la app (para redirects Auth)
```

## 10.6 Rollback Strategy

- **Método primario:** Revert commit en `main` → auto-redeploy via Vercel
- **Método alternativo:** Vercel dashboard → Deployments → Promote previous deployment
- **DB Migrations:** Drizzle Kit no hace rollback automático — crear migración inversa manualmente
- **RTO objetivo:** < 10 minutos para rollback de frontend; DB migrations requieren cuidado manual
