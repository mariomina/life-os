# Architecture — 15. Decisiones Críticas Resueltas

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 15 de 17

---

## 15.1 ORM: Drizzle ORM ✅ CERRADA

**Decisión:** Drizzle ORM sobre Supabase JS Client directo.

**Razones:**

1. **Type safety end-to-end:** El schema de ~15 tablas con relaciones complejas genera tipos automáticamente — sin duplicación ni desync entre DB y TypeScript
2. **Migraciones gestionadas:** `drizzle-kit generate` crea archivos de migración versionados — crítico para un schema que evolucionará 8 epics
3. **Queries complejas type-safe:** El motor de correlaciones requiere joins de 4-5 tablas — Drizzle los hace legibles y type-safe vs SQL manual
4. **Compatible con RLS:** Drizzle usa la connection string de Supabase — RLS se aplica normalmente
5. **Costo de adopción bajo:** ~2h de setup en Story 1.4. Beneficio durante todo el proyecto.

**Configuración:**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

**Estado de implementación:** ✅ Schema completo creado por @data-engineer (15 tablas en `lib/db/schema/`)

---

## 15.2 Correlaciones con Datos Escasos: Enfoque Escalonado ✅ CERRADA

**Decisión:** Sistema escalonado de 3 niveles según disponibilidad de datos.

**Problema:** El umbral de 14 días para correlaciones completas significa que el usuario ve nada útil durante las primeras 2 semanas — reduciendo el engagement crítico para el hábito de uso.

**Solución: Tiered Insights**

| Nivel           | Condición | Qué se muestra                                                          | Badge                       |
| --------------- | --------- | ----------------------------------------------------------------------- | --------------------------- |
| **Gathering**   | < 7 días  | Distribución de tiempo por área (simple suma) + mensaje motivacional    | 🟡 "Reuniendo datos"        |
| **Provisional** | 7-13 días | Top actividades por tiempo + correlaciones preliminares con advertencia | 🟠 "Insights provisionales" |
| **Full**        | ≥ 14 días | Pearson/Spearman completo + patrones + insights en lenguaje natural     | 🟢 "Análisis completo"      |

**Implementación en Edge Function:**

```typescript
// features/correlation-engine/tiered-analysis.ts
type AnalysisTier = 'gathering' | 'provisional' | 'full'

function determineTier(daysOfData: number): AnalysisTier {
  if (daysOfData < 7) return 'gathering'
  if (daysOfData < 14) return 'provisional'
  return 'full'
}

async function runTieredAnalysis(userId: string): Promise<CorrelationResult> {
  const { daysOfData, dataPoints } = await getDataAvailability(userId)
  const tier = determineTier(daysOfData)

  switch (tier) {
    case 'gathering':
      return runDescriptiveStats(userId, tier) // solo sumas
    case 'provisional':
      return runPreliminaryCorrelation(userId, tier) // Pearson low confidence
    case 'full':
      return runFullCorrelation(userId, tier) // Pearson + Spearman completo
  }
}
```

**Impacto en UI:** El componente de Informes/Correlaciones muestra el badge de nivel prominentemente. Para niveles `gathering` y `provisional`, el CTA principal es "Registra más actividades para desbloquear análisis completo" con barra de progreso hacia 14 días.
