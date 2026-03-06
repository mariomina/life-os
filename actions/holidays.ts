'use server'

// actions/holidays.ts
// Server Actions para CRUD de festivos personales — Story 10.6.

import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { holidays } from '@/lib/db/schema/holidays'
import { getHolidaysForUser, getHolidayCountForYear } from '@/lib/db/queries/holidays'
export type { Holiday } from '@/lib/db/schema/holidays'

// ─── Nager.Date types ─────────────────────────────────────────────────────────

interface NagerHoliday {
  date: string
  localName: string
  name: string
  countryCode: string
  types: string[]
}

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
 * Sincroniza los feriados nacionales de Ecuador para un año dado usando la API pública
 * de Nager.Date (https://date.nager.at). Solo inserta si no existen (ON CONFLICT DO NOTHING).
 * Permite que el usuario agregue manualmente puentes o decretos presidenciales sin perderlos.
 *
 * @param year - Año a sincronizar (ej. 2026)
 * @returns `synced` = registros nuevos insertados, 0 si ya existían todos
 */
export async function syncHolidaysForYear(
  year: number
): Promise<{ synced: number; error: string | null }> {
  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/EC`
    const res = await fetch(url, {
      next: { revalidate: 86400 }, // cache 24h — los feriados no cambian a diario
    })

    if (!res.ok) {
      return { synced: 0, error: `No se pudo obtener feriados de la API (status ${res.status})` }
    }

    const data: NagerHoliday[] = await res.json()
    const publicHolidays = data.filter((h) => h.types.includes('Public'))

    if (publicHolidays.length === 0) return { synced: 0, error: null }

    await db
      .insert(holidays)
      .values(publicHolidays.map((h) => ({ userId, date: h.date, name: h.localName })))
      .onConflictDoNothing()

    // No llamamos revalidatePath aquí porque syncHolidaysForYear puede ser invocado
    // durante el render SSR (desde autoSyncHolidaysIfNeeded en page.tsx).
    // revalidatePath solo puede llamarse desde Server Actions activados por el cliente.
    return { synced: publicHolidays.length, error: null }
  } catch (err) {
    console.error('[syncHolidaysForYear] failed:', err)
    return { synced: 0, error: 'No se pudo sincronizar los feriados.' }
  }
}

/**
 * Auto-sincroniza feriados para un año si no existe ningún registro para ese año.
 * Diseñado para llamarse silenciosamente en page.tsx sin bloquear el render.
 */
export async function autoSyncHolidaysIfNeeded(userId: string, year: number): Promise<void> {
  try {
    const count = await getHolidayCountForYear(userId, year)
    if (count === 0) await syncHolidaysForYear(year)
  } catch {
    // Auto-sync es best-effort — nunca bloquea el render del calendario
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
