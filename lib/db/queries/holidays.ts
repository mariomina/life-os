'use server'

import { eq, asc, and, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { holidays } from '@/lib/db/schema/holidays'
export type { Holiday } from '@/lib/db/schema/holidays'

/**
 * Devuelve los festivos del usuario, ordenados por fecha ascendente.
 * Usado por: createActivity (filtrar workdays), CalendarClient (indicadores visuales).
 */
export async function getHolidaysForUser(userId: string) {
  return db.select().from(holidays).where(eq(holidays.userId, userId)).orderBy(asc(holidays.date))
}

/**
 * Devuelve la cantidad de festivos del usuario para un año dado.
 * Usado por el auto-sync para saber si ya existe data para ese año.
 */
export async function getHolidayCountForYear(userId: string, year: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(holidays)
    .where(
      and(
        eq(holidays.userId, userId),
        gte(holidays.date, `${year}-01-01`),
        lte(holidays.date, `${year}-12-31`)
      )
    )
  return result[0]?.count ?? 0
}
