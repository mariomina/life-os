'use server'

// actions/holidays.ts
// Server Actions para CRUD de festivos personales — Story 10.6.

import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { holidays } from '@/lib/db/schema/holidays'
import { getHolidaysForUser } from '@/lib/db/queries/holidays'
export type { Holiday } from '@/lib/db/schema/holidays'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user.id
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface HolidayActionResult {
  error: string | null
}

/**
 * Devuelve los festivos del usuario autenticado.
 * Wrapper conveniente sobre getHolidaysForUser para usar desde Client Components.
 */
export async function listHolidays() {
  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()
    return getHolidaysForUser(userId)
  } catch {
    return []
  }
}

/**
 * Crea un festivo para el usuario autenticado.
 * @param date - Fecha en formato 'YYYY-MM-DD'
 * @param name - Nombre del festivo (ej. 'Navidad', 'Año Nuevo')
 */
export async function createHoliday(date: string, name: string): Promise<HolidayActionResult> {
  if (!DATE_REGEX.test(date)) return { error: 'Fecha inválida (usa formato YYYY-MM-DD)' }
  const trimmedName = name?.trim() ?? ''
  if (!trimmedName) return { error: 'El nombre del festivo es requerido' }
  if (trimmedName.length > 100) return { error: 'El nombre no puede superar 100 caracteres' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()
    await db.insert(holidays).values({ userId, date, name: trimmedName }).onConflictDoNothing()
    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[createHoliday] failed:', err)
    return { error: 'No se pudo crear el festivo.' }
  }
}

/**
 * Elimina un festivo por ID, validando ownership del usuario autenticado.
 */
export async function deleteHoliday(holidayId: string): Promise<HolidayActionResult> {
  if (!UUID_REGEX.test(holidayId)) return { error: 'ID inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()
    await db.delete(holidays).where(and(eq(holidays.id, holidayId), eq(holidays.userId, userId)))
    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[deleteHoliday] failed:', err)
    return { error: 'No se pudo eliminar el festivo.' }
  }
}
