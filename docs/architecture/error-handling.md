# Architecture — 11. Error Handling Strategy

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 11 de 17

---

## 11.1 General Approach

- **Modelo:** Errores tipados con discriminated unions en TypeScript
- **Propagación:** Server Actions devuelven `{ data: T, error: null } | { data: null, error: AppError }` — nunca lanzan excepciones al cliente
- **Logging:** `console.error` en development; en producción → Vercel logs (suficiente para MVP single-user)

## 11.2 Patrones por Capa

**Server Actions:**

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: ErrorCode }

// Nunca: throw en Server Actions
// Siempre: return { success: false, error: "...", code: "DB_ERROR" }
```

**ILLMProvider — Fallback Graceful (FR22):**

```typescript
async function processWithAI(text: string): Promise<InboxResult> {
  try {
    const provider = createLLMProvider()
    const available = await provider.isAvailable()
    if (!available) return { mode: 'manual', reason: 'provider_unavailable' }
    return await provider.complete(buildPrompt(text))
  } catch (error) {
    console.error('LLM Error:', error)
    return { mode: 'manual', reason: 'provider_error' }
  }
}
```

**DB Errors (Drizzle):**

- Constraint violations → retornar mensaje de usuario amigable
- Connection errors → retry 1x, luego error controlado
- RLS violations → 401 con mensaje claro (usuario no autorizado)

## 11.3 Error Codes

| Código             | Categoría        | Mensaje usuario                             |
| ------------------ | ---------------- | ------------------------------------------- |
| `DB_ERROR`         | Base de datos    | "Error al guardar. Intenta de nuevo."       |
| `AI_UNAVAILABLE`   | IA no disponible | "IA no disponible. Modo manual activado."   |
| `AI_TIMEOUT`       | Timeout IA       | "IA tardó demasiado. Modo manual activado." |
| `AUTH_REQUIRED`    | No autenticado   | Redirect a `/login`                         |
| `RLS_VIOLATION`    | Sin permisos     | "No tienes acceso a este recurso."          |
| `VALIDATION_ERROR` | Input inválido   | Mensaje específico del campo                |
