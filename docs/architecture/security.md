# Architecture — 14. Security

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 14 de 17

---

## 14.1 Input Validation

- **Librería:** Zod — validación en Server Actions (boundary de entrada) y respuestas de IA
- **Regla:** Todo input de usuario y toda respuesta de ILLMProvider pasa por schema Zod antes de procesarse
- **Approach:** Whitelist — validar lo que se espera, rechazar lo inesperado

## 14.2 Authentication & Authorization

- **Auth Method:** Supabase Auth — magic link (preferido) + email/password
- **Session Management:** `@supabase/ssr` con cookies httpOnly — sin JWT expuesto en localStorage
- **Middleware:** `middleware.ts` verifica sesión en todas las rutas `/(app)/*` — redirect a `/login` si no autenticado
- **RLS:** Todas las tablas tienen policy `user_id = auth.uid()` — capa de seguridad independiente del código

## 14.3 Secrets Management

- **Development:** Variables en `.env.local` (gitignored)
- **Production:** Variables en Vercel Dashboard (encriptadas) + Supabase Vault para API keys IA
- **Reglas:**
  - NUNCA commitear `.env.local` o valores reales
  - `.env.example` con nombres de variables, sin valores
  - `SUPABASE_SERVICE_ROLE_KEY` y `ANTHROPIC_API_KEY` solo en Server Actions — nunca al cliente

## 14.4 API Security

- **Rate Limiting:** Supabase rate limiting nativo (free tier: 100 req/s) — suficiente para single-user MVP
- **CORS:** Configurado por Vercel/Next.js — solo origin del dominio de producción
- **Security Headers:** Next.js `headers()` en `next.config.ts` — X-Frame-Options, X-Content-Type-Options, CSP básico
- **HTTPS:** Enforced por Vercel en producción

## 14.5 Data Protection

- **Encryption at Rest:** Supabase gestiona encryption en PostgreSQL (AES-256)
- **Encryption in Transit:** HTTPS en todas las conexiones (Vercel + Supabase)
- **PII Handling:** Solo email del usuario en `auth.users`. Datos de vida personal protegidos por RLS.
- **Logging:** No loggear API keys, tokens, ni contenido de `raw_text` de Inbox en producción

## 14.6 Dependency Security

- **Scanning:** `npm audit` en CI — bloquear en vulnerabilidades HIGH/CRITICAL
- **Update Policy:** Dependencias menores actualizadas mensualmente; majors evaluadas manualmente
- **New Dependencies:** Revisar licencia (MIT/Apache/BSD preferidas) + tamaño + mantenimiento antes de agregar
