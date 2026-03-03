'use server'

// actions/calendars.ts
// Server Actions para CRUD de Calendarios — Epic 10: Calendarios Personalizados.

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { assertDatabaseUrl } from '@/lib/db/client'
import {
  getCalendarsForUser as queryGetCalendarsForUser,
  getCalendarById,
  createCalendar as queryCreateCalendar,
  updateCalendar as queryUpdateCalendar,
  deleteCalendar as queryDeleteCalendar,
  getTimeByCalendar,
} from '@/lib/db/queries/calendars'
import type { Calendar, CalendarTimeData } from '@/lib/db/queries/calendars'
import { getPeriodRange } from '@/features/reports/periods'
import type { ReportPeriod } from '@/features/reports/periods'

// ─── Re-exports de tipos ──────────────────────────────────────────────────────
// NOTA: No re-exportar tipos Drizzle/primitivos desde 'use server' —
// Turbopack los registra como server action references y falla.
// Importar los tipos desde sus fuentes originales.

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CalendarActionResult {
  error: string | null
  calendar?: Calendar
}

// ─── Colores permitidos (paleta Google Calendar) ──────────────────────────────

const VALID_HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

function isValidHexColor(color: string): boolean {
  return VALID_HEX_COLOR.test(color)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user.id
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Retorna todos los calendarios del usuario autenticado.
 * Para uso en Server Components.
 */
export async function getCalendarsForUser(): Promise<Calendar[]> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()
    return queryGetCalendarsForUser(userId)
  } catch {
    return []
  }
}

/**
 * Crea un nuevo calendario.
 * Valida nombre no vacío y color hex válido.
 */
export async function createCalendar(data: {
  name: string
  color: string
  isDefault?: boolean
}): Promise<CalendarActionResult> {
  assertDatabaseUrl()
  try {
    if (!data.name.trim()) {
      return { error: 'El nombre del calendario es requerido' }
    }
    if (!isValidHexColor(data.color)) {
      return { error: 'El color debe ser un valor hexadecimal válido (ej: #4285F4)' }
    }

    const userId = await getAuthenticatedUserId()
    const calendar = await queryCreateCalendar(userId, {
      name: data.name.trim(),
      color: data.color,
      isDefault: data.isDefault,
    })

    revalidatePath('/calendar')
    revalidatePath('/reports')
    return { error: null, calendar }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

/**
 * Actualiza nombre y/o color de un calendario.
 * Solo el propietario puede editar su calendario.
 */
export async function updateCalendar(
  id: string,
  data: { name?: string; color?: string }
): Promise<CalendarActionResult> {
  assertDatabaseUrl()
  try {
    if (data.name !== undefined && !data.name.trim()) {
      return { error: 'El nombre no puede estar vacío' }
    }
    if (data.color !== undefined && !isValidHexColor(data.color)) {
      return { error: 'El color debe ser un valor hexadecimal válido (ej: #4285F4)' }
    }

    const userId = await getAuthenticatedUserId()
    const calendar = await queryUpdateCalendar(userId, id, {
      name: data.name?.trim(),
      color: data.color,
    })

    revalidatePath('/calendar')
    revalidatePath('/reports')
    return { error: null, calendar }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

/**
 * Elimina un calendario.
 * Rechaza si es_default = true o tiene actividades asociadas.
 */
export async function deleteCalendar(id: string): Promise<CalendarActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()
    await queryDeleteCalendar(userId, id)

    revalidatePath('/calendar')
    revalidatePath('/reports')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

// ─── Calendarios por defecto ──────────────────────────────────────────────────

const DEFAULT_CALENDARS = [
  { name: 'Trabajo', color: '#4285F4', isDefault: true },
  { name: 'Personal', color: '#34A853', isDefault: false },
  { name: 'Salud', color: '#EA4335', isDefault: false },
  { name: 'Familia', color: '#FBBC04', isDefault: false },
] as const

/**
 * Crea los 4 calendarios por defecto si el usuario no tiene ninguno.
 * Se llama en el primer login (Story 10.2).
 */
export async function seedDefaultCalendars(): Promise<{ error: string | null }> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()
    const existing = await queryGetCalendarsForUser(userId)

    if (existing.length > 0) {
      return { error: null } // Ya tiene calendarios, no hacer nada
    }

    for (const cal of DEFAULT_CALENDARS) {
      await queryCreateCalendar(userId, cal)
    }

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

/**
 * Retorna el calendario por defecto del usuario (is_default = true).
 * Retorna null si no tiene ninguno.
 */
export async function getDefaultCalendar(): Promise<Calendar | null> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()
    const cals = await queryGetCalendarsForUser(userId)
    return cals.find((c) => c.isDefault) ?? null
  } catch {
    return null
  }
}

export { getCalendarById }

// ─── Informe de tiempo por calendario ────────────────────────────────────────

/**
 * Server action para el widget "Tiempo por Calendario" en Reports.
 * Acepta un período ('week' | 'month' | 'quarter') y retorna los datos.
 */
export async function getTimeByCalendarReport(period: ReportPeriod): Promise<CalendarTimeData[]> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()
    const { from, to } = getPeriodRange(period)
    return getTimeByCalendar(userId, from, to)
  } catch {
    return []
  }
}
