'use server'

import { eq, asc } from 'drizzle-orm'
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
