// lib/db/queries/okrs.ts
// Queries de lectura para la tabla okrs.
// Todas las funciones requieren userId explícito — no confiar solo en RLS.

import { eq, and, count } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { okrs } from '@/lib/db/schema/okrs'
import type { OKR } from '@/lib/db/schema/okrs'

/**
 * Retorna el OKR de tipo 'vision' del usuario, o null si no existe.
 * El usuario tiene máximo un registro vision (upsert garantiza unicidad).
 */
export async function getVision(userId: string): Promise<OKR | null> {
  assertDatabaseUrl()
  const rows = await db
    .select()
    .from(okrs)
    .where(and(eq(okrs.userId, userId), eq(okrs.type, 'vision')))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Retorna todos los OKRs anuales del usuario para el año dado.
 * Incluye todos los estados (active, completed, cancelled, paused).
 */
export async function getAnnualOKRs(userId: string, year: number): Promise<OKR[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(okrs)
    .where(and(eq(okrs.userId, userId), eq(okrs.type, 'annual'), eq(okrs.year, year)))
}

/**
 * Cuenta los OKRs anuales con status='active' para el año dado.
 * Usado para validar la regla Buffett 5/25 (máx 3 activos).
 */
export async function countActiveAnnualOKRs(userId: string, year: number): Promise<number> {
  assertDatabaseUrl()
  const result = await db
    .select({ value: count() })
    .from(okrs)
    .where(
      and(
        eq(okrs.userId, userId),
        eq(okrs.type, 'annual'),
        eq(okrs.year, year),
        eq(okrs.status, 'active')
      )
    )
  return result[0]?.value ?? 0
}

/**
 * Retorna todos los KRs (Key Results) hijos de un OKR anual.
 * Ordena por trimestre (Q1-Q4).
 */
export async function getKRsByAnnualOKR(userId: string, annualOkrId: string): Promise<OKR[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(okrs)
    .where(
      and(eq(okrs.userId, userId), eq(okrs.parentId, annualOkrId), eq(okrs.type, 'key_result'))
    )
    .orderBy(okrs.quarter)
}

/**
 * Retorna todos los KRs del usuario filtrados por año y trimestre.
 * Útil para dashboards tácticos trimestrales.
 */
export async function getKRsByQuarter(
  userId: string,
  year: number,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
): Promise<OKR[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(okrs)
    .where(
      and(
        eq(okrs.userId, userId),
        eq(okrs.type, 'key_result'),
        eq(okrs.year, year),
        eq(okrs.quarter, quarter)
      )
    )
}

/**
 * Retorna todos los KRs del usuario para el año dado.
 */
export async function getKRsByYear(userId: string, year: number): Promise<OKR[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(okrs)
    .where(and(eq(okrs.userId, userId), eq(okrs.type, 'key_result'), eq(okrs.year, year)))
    .orderBy(okrs.quarter)
}
