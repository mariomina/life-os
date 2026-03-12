'use server'

// actions/calendar.ts
// Server Actions para CRUD de actividades en el Calendario.
// Crea y elimina entradas en steps_activities; obtiene áreas del usuario.
// Story 5.7 — CRUD Eventos desde el Calendario.
// Story 10.4 — Recurrencia: crea múltiples ocurrencias agrupadas por recurrenceGroupId.
// Story 10.6 — Recurrencia 'workdays': filtra festivos del usuario post-generación.
// Story 10.7 — Tipo 'custom' con interval/unit/daysOfWeek/excludeHolidays.

import { eq, and, asc, gte, sql } from 'drizzle-orm'
import { format } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { timeEntries } from '@/lib/db/schema/time-entries'
import { areas } from '@/lib/db/schema/areas'
import { areaSubareas } from '@/lib/db/schema/area-subareas'
import { getHolidaysForUser } from '@/lib/db/queries/holidays'
import {
  generateOccurrences,
  type RecurrenceType,
  type RecurrenceUnit,
  type RecurrenceOptions,
} from '@/lib/calendar/recurrence-utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ActionResult {
  error: string | null
}

export interface AreaOption {
  id: string
  name: string
  maslowLevel: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
 * Creates a spontaneous (non-planned) activity in the calendar.
 * Validates title, date/time, and areaId before inserting.
 *
 * Story 10.4: si recurrenceType !== 'none', genera múltiples ocurrencias
 * agrupadas por recurrenceGroupId (UUID compartido).
 */
export async function createActivity(formData: FormData): Promise<ActionResult> {
  const title = (formData.get('title') as string | null) ?? ''
  const date = (formData.get('date') as string | null) ?? ''
  const time = (formData.get('time') as string | null) ?? ''
  const duration = Number(formData.get('duration') ?? 30)
  const areaId = (formData.get('areaId') as string | null) ?? ''
  const subareaId = (formData.get('subareaId') as string | null) || null
  const calendarId = (formData.get('calendarId') as string | null) || null
  const description = (formData.get('description') as string | null)?.trim() || null
  const actualTimeMinutes = Number(formData.get('actualTimeMinutes') ?? 0)

  // Recurrence fields
  const recurrenceType = ((formData.get('recurrenceType') as string | null) ??
    'none') as RecurrenceType
  const recurrenceEndType = ((formData.get('recurrenceEndType') as string | null) ?? 'count') as
    | 'count'
    | 'date'
    | 'never'
  const recurrenceCount = Math.max(1, Number(formData.get('recurrenceCount') ?? 1))
  const recurrenceEndDate = (formData.get('recurrenceEndDate') as string | null) ?? ''
  // Custom recurrence fields (Story 10.7)
  const recurrenceInterval = Math.max(1, Number(formData.get('recurrenceInterval') ?? 1))
  const recurrenceUnit = ((formData.get('recurrenceUnit') as string | null) ??
    'week') as RecurrenceUnit
  const recurrenceDaysRaw = (formData.get('recurrenceDays') as string | null) ?? '[]'
  const recurrenceDays: number[] = JSON.parse(recurrenceDaysRaw)
  const recurrenceExcludeHolidays = formData.get('recurrenceExcludeHolidays') === 'true'

  // Validate inputs
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return { error: 'El título es requerido' }
  if (trimmedTitle.length > 100) return { error: 'El título no puede superar 100 caracteres' }
  if (!date || !time) return { error: 'La fecha y hora son requeridas' }

  const scheduledAt = new Date(`${date}T${time}:00`)
  if (isNaN(scheduledAt.getTime())) return { error: 'Fecha u hora inválida' }

  const durationMinutes = isNaN(duration) || duration <= 0 ? 30 : duration

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    const resolvedAreaId = areaId && UUID_REGEX.test(areaId) ? areaId : null
    const resolvedSubareaId = subareaId && UUID_REGEX.test(subareaId) ? subareaId : null

    // Validate subarea belongs to the selected area
    if (resolvedSubareaId && resolvedAreaId) {
      const [subarea] = await db
        .select({ id: areaSubareas.id })
        .from(areaSubareas)
        .where(and(eq(areaSubareas.id, resolvedSubareaId), eq(areaSubareas.areaId, resolvedAreaId)))
        .limit(1)
      if (!subarea) return { error: 'Sub-área no pertenece al área seleccionada' }
    }

    const baseFields = {
      userId,
      title: trimmedTitle,
      description,
      scheduledDurationMinutes: durationMinutes,
      areaId: resolvedAreaId,
      subareaId: resolvedSubareaId,
      calendarId: calendarId ?? null,
      status: 'pending' as const,
      planned: false,
      executorType: 'human' as const,
    }

    if (recurrenceType === 'none') {
      // Actividad simple — generamos el ID antes para evitar .returning()
      const newActivityId = crypto.randomUUID()
      await db.insert(stepsActivities).values({ ...baseFields, id: newActivityId, scheduledAt })

      // Registrar tiempo real gastado como time_entry completado
      if (actualTimeMinutes > 0) {
        const durationSeconds = actualTimeMinutes * 60
        const endedAt = new Date(scheduledAt.getTime() + durationSeconds * 1000)
        await db.insert(timeEntries).values({
          stepActivityId: newActivityId,
          userId,
          startedAt: scheduledAt,
          endedAt,
          durationSeconds,
          isActive: false,
        })
      }
    } else {
      // Actividad recurrente — genera todas las ocurrencias
      const recurrenceOptions: RecurrenceOptions = {
        type: recurrenceType,
        endType: recurrenceEndType,
        count: recurrenceCount,
        endDate: recurrenceEndDate,
        interval: recurrenceInterval,
        unit: recurrenceUnit,
        daysOfWeek: recurrenceDays,
        excludeHolidays: recurrenceExcludeHolidays,
      }
      let occurrences = generateOccurrences(scheduledAt, recurrenceOptions)

      // Story 10.7: filtrar festivos cuando excludeHolidays=true (aplica a cualquier tipo)
      if (recurrenceExcludeHolidays) {
        const userHolidays = await getHolidaysForUser(userId)
        const holidayDates = new Set(userHolidays.map((h) => h.date)) // Set<'YYYY-MM-DD'>
        occurrences = occurrences.filter((d) => !holidayDates.has(format(d, 'yyyy-MM-dd')))
      }

      if (occurrences.length === 0) {
        return { error: 'No se generaron ocurrencias con los parámetros indicados' }
      }
      const recurrenceGroupId = crypto.randomUUID()
      await db.insert(stepsActivities).values(
        occurrences.map((date) => ({
          ...baseFields,
          scheduledAt: date,
          recurrenceGroupId,
          recurrenceType,
        }))
      )
    }

    revalidatePath('/calendar')
    revalidatePath('/reports')
    return { error: null }
  } catch (err) {
    console.error('[createActivity] failed:', err)
    return { error: 'No se pudo crear la actividad. Inténtalo de nuevo.' }
  }
}

/**
 * Deletes an activity by ID.
 * Validates UUID format and enforces userId ownership before deleting.
 */
export async function deleteActivity(activityId: string): Promise<ActionResult> {
  if (!activityId || !UUID_REGEX.test(activityId)) {
    return { error: 'ID de actividad inválido' }
  }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    await db
      .delete(stepsActivities)
      .where(and(eq(stepsActivities.id, activityId), eq(stepsActivities.userId, userId)))

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[deleteActivity] failed:', err)
    return { error: 'No se pudo eliminar la actividad.' }
  }
}

// ─── Edit / Delete (Story 10.9) ───────────────────────────────────────────────

/**
 * Updates a single activity.
 * Validates ownership and UUID format. Updates date/time only for this occurrence.
 */
export async function updateActivity(
  activityId: string,
  data: {
    title: string
    description: string | null
    date: string
    time: string
    duration: number
    areaId: string | null
    subareaId?: string | null
    calendarId: string | null
    actualTimeMinutes?: number
  }
): Promise<ActionResult> {
  if (!UUID_REGEX.test(activityId)) return { error: 'ID de actividad inválido' }

  const trimmedTitle = data.title?.trim() ?? ''
  if (!trimmedTitle) return { error: 'El título es requerido' }
  if (trimmedTitle.length > 100) return { error: 'El título no puede superar 100 caracteres' }

  const scheduledAt = new Date(`${data.date}T${data.time}:00`)
  if (isNaN(scheduledAt.getTime())) return { error: 'Fecha u hora inválida' }

  const durationMinutes = isNaN(data.duration) || data.duration <= 0 ? 30 : data.duration

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    const resolvedAreaId = data.areaId && UUID_REGEX.test(data.areaId) ? data.areaId : null
    const resolvedSubareaId =
      data.subareaId && UUID_REGEX.test(data.subareaId) ? data.subareaId : null

    // Validate subarea belongs to the selected area
    if (resolvedSubareaId && resolvedAreaId) {
      const [subarea] = await db
        .select({ id: areaSubareas.id })
        .from(areaSubareas)
        .where(and(eq(areaSubareas.id, resolvedSubareaId), eq(areaSubareas.areaId, resolvedAreaId)))
        .limit(1)
      if (!subarea) return { error: 'Sub-área no pertenece al área seleccionada' }
    }

    await db
      .update(stepsActivities)
      .set({
        title: trimmedTitle,
        description: data.description,
        scheduledAt,
        scheduledDurationMinutes: durationMinutes,
        areaId: resolvedAreaId,
        subareaId: resolvedSubareaId,
        calendarId: data.calendarId ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(stepsActivities.id, activityId), eq(stepsActivities.userId, userId)))

    // Registrar tiempo real adicional como time_entry completado
    if (data.actualTimeMinutes && data.actualTimeMinutes > 0) {
      const durationSeconds = data.actualTimeMinutes * 60
      const endedAt = new Date(scheduledAt.getTime() + durationSeconds * 1000)
      await db.insert(timeEntries).values({
        stepActivityId: activityId,
        userId,
        startedAt: scheduledAt,
        endedAt,
        durationSeconds,
        isActive: false,
      })
    }

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[updateActivity] failed:', err)
    return { error: 'No se pudo actualizar la actividad.' }
  }
}

/**
 * Updates all activities sharing a recurrenceGroupId.
 * Common fields (title, description, area, calendar, duration) and optionally time (HH:mm).
 * When time is provided, updates scheduledAt for each occurrence preserving its original date.
 */
export async function updateActivityGroup(
  recurrenceGroupId: string,
  data: {
    title: string
    description: string | null
    duration: number
    areaId: string | null
    subareaId?: string | null
    calendarId: string | null
    time?: string // HH:mm — si se provee, actualiza la hora de todas las ocurrencias
  }
): Promise<ActionResult> {
  if (!UUID_REGEX.test(recurrenceGroupId)) return { error: 'ID de grupo inválido' }

  const trimmedTitle = data.title?.trim() ?? ''
  if (!trimmedTitle) return { error: 'El título es requerido' }

  const durationMinutes = isNaN(data.duration) || data.duration <= 0 ? 30 : data.duration

  // Validar formato de time si se provee
  if (data.time !== undefined && !/^\d{2}:\d{2}$/.test(data.time)) {
    return { error: 'Formato de hora inválido' }
  }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    const whereClause = and(
      eq(stepsActivities.recurrenceGroupId, recurrenceGroupId),
      eq(stepsActivities.userId, userId)
    )
    const commonFields = {
      title: trimmedTitle,
      description: data.description,
      scheduledDurationMinutes: durationMinutes,
      areaId: data.areaId && UUID_REGEX.test(data.areaId) ? data.areaId : null,
      subareaId: data.subareaId && UUID_REGEX.test(data.subareaId) ? data.subareaId : null,
      calendarId: data.calendarId ?? null,
      updatedAt: new Date(),
    }

    if (data.time !== undefined) {
      // Actualiza hora de cada ocurrencia preservando su fecha original
      await db
        .update(stepsActivities)
        .set({
          ...commonFields,
          scheduledAt: sql`date_trunc('day', ${stepsActivities.scheduledAt}) + ${data.time}::interval`,
        })
        .where(whereClause)
    } else {
      await db.update(stepsActivities).set(commonFields).where(whereClause)
    }

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[updateActivityGroup] failed:', err)
    return { error: 'No se pudo actualizar el grupo de actividades.' }
  }
}

/**
 * Updates only the scheduled time (HH:mm) for all activities in a recurrence group.
 * Preserves the original date of each occurrence — only changes the time component.
 * Used by DnD scope dialog "Toda la serie".
 */
export async function updateGroupScheduleTime(
  groupId: string,
  newTime: string, // HH:mm
  duration: number
): Promise<ActionResult> {
  if (!UUID_REGEX.test(groupId)) return { error: 'ID de grupo inválido' }
  if (!/^\d{2}:\d{2}$/.test(newTime)) return { error: 'Formato de hora inválido' }

  const durationMinutes = isNaN(duration) || duration <= 0 ? 30 : duration

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    await db
      .update(stepsActivities)
      .set({
        scheduledAt: sql`date_trunc('day', ${stepsActivities.scheduledAt}) + ${newTime}::interval`,
        scheduledDurationMinutes: durationMinutes,
        updatedAt: new Date(),
      })
      .where(
        and(eq(stepsActivities.recurrenceGroupId, groupId), eq(stepsActivities.userId, userId))
      )

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[updateGroupScheduleTime] failed:', err)
    return { error: 'No se pudo actualizar el horario del grupo.' }
  }
}

/**
 * Deletes all activities sharing a recurrenceGroupId.
 */
export async function deleteActivityGroup(recurrenceGroupId: string): Promise<ActionResult> {
  if (!UUID_REGEX.test(recurrenceGroupId)) return { error: 'ID de grupo inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    await db
      .delete(stepsActivities)
      .where(
        and(
          eq(stepsActivities.recurrenceGroupId, recurrenceGroupId),
          eq(stepsActivities.userId, userId)
        )
      )

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[deleteActivityGroup] failed:', err)
    return { error: 'No se pudo eliminar el grupo de actividades.' }
  }
}

/**
 * Changes the recurrenceType label for all activities in a group.
 * Purely a metadata update — does not regenerate scheduledAt dates.
 */
export async function updateGroupRecurrenceType(
  recurrenceGroupId: string,
  recurrenceType: RecurrenceType
): Promise<ActionResult> {
  if (!UUID_REGEX.test(recurrenceGroupId)) return { error: 'ID de grupo inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    await db
      .update(stepsActivities)
      .set({ recurrenceType, updatedAt: new Date() })
      .where(
        and(
          eq(stepsActivities.recurrenceGroupId, recurrenceGroupId),
          eq(stepsActivities.userId, userId)
        )
      )

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[updateGroupRecurrenceType] failed:', err)
    return { error: 'No se pudo actualizar el tipo de recurrencia.' }
  }
}

/**
 * Changes the recurrence of a group from a given date onwards.
 * Deletes all occurrences in the group scheduled on or after `fromDate`,
 * then regenerates them with the new recurrenceOptions starting from `fromDate`.
 * Past occurrences are preserved.
 */
export async function changeGroupRecurrence(
  recurrenceGroupId: string,
  fromDate: string, // 'YYYY-MM-DD' — first date of the new series
  recurrenceOptions: RecurrenceOptions
): Promise<ActionResult> {
  if (!UUID_REGEX.test(recurrenceGroupId)) return { error: 'ID de grupo inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    // Get base fields from the first activity in the group
    const [base] = await db
      .select()
      .from(stepsActivities)
      .where(
        and(
          eq(stepsActivities.recurrenceGroupId, recurrenceGroupId),
          eq(stepsActivities.userId, userId)
        )
      )
      .orderBy(asc(stepsActivities.scheduledAt))
      .limit(1)

    if (!base) return { error: 'Grupo no encontrado' }

    // Parse fromDate + keep original time
    const originalTime = base.scheduledAt ? new Date(base.scheduledAt) : new Date()
    const [y, m, d] = fromDate.split('-').map(Number)
    const startDate = new Date(
      Date.UTC(y, m - 1, d, originalTime.getUTCHours(), originalTime.getUTCMinutes(), 0, 0)
    )

    // Delete all occurrences on or after fromDate
    const fromDateTs = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
    await db
      .delete(stepsActivities)
      .where(
        and(
          eq(stepsActivities.recurrenceGroupId, recurrenceGroupId),
          eq(stepsActivities.userId, userId),
          gte(stepsActivities.scheduledAt, fromDateTs)
        )
      )

    // Generate new occurrences
    let occurrences = generateOccurrences(startDate, recurrenceOptions)

    // Filter holidays if requested
    if (recurrenceOptions.excludeHolidays) {
      const userHolidays = await getHolidaysForUser(userId)
      const holidayDates = new Set(userHolidays.map((h) => h.date))
      occurrences = occurrences.filter((d) => !holidayDates.has(format(d, 'yyyy-MM-dd')))
    }

    if (occurrences.length === 0) {
      return { error: 'No se generaron ocurrencias con los parámetros indicados' }
    }

    await db.insert(stepsActivities).values(
      occurrences.map((date) => ({
        userId,
        title: base.title,
        description: base.description,
        scheduledAt: date,
        scheduledDurationMinutes: base.scheduledDurationMinutes,
        calendarId: base.calendarId,
        recurrenceGroupId,
        recurrenceType: recurrenceOptions.type,
        status: 'pending' as const,
        planned: false,
        executorType: 'human' as const,
      }))
    )

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[changeGroupRecurrence] failed:', err)
    return { error: 'No se pudo cambiar la recurrencia.' }
  }
}

// ─── Sync Clases Régimen Sierra Ecuador (Story 10.12) ────────────────────────

/**
 * Datos del año lectivo Régimen Sierra Ecuador 2025-2026 (Ministerio de Educación).
 * No existe API pública — datos hardcodeados del cronograma oficial.
 * Referencia: https://educacion.gob.ec
 */
const SIERRA_PERIODS_2025_2026 = [
  { start: '2025-09-01', end: '2025-12-05' }, // Primer período
  { start: '2025-12-08', end: '2026-03-20' }, // Segundo período
  { start: '2026-03-23', end: '2026-06-26' }, // Tercer período
]

/**
 * Genera actividades de "Clases" para cada día hábil (lun-vie) dentro de los
 * tres períodos del año lectivo Régimen Sierra 2025-2026, excluyendo festivos.
 * Idempotente: si ya hay actividades en ese calendario con el mismo groupId, no duplica.
 *
 * @param calendarId - ID del calendario "Clases Régimen Sierra"
 */
export async function syncSierraSchoolCalendar(
  calendarId: string
): Promise<{ synced: number; error: string | null }> {
  if (!UUID_REGEX.test(calendarId)) return { synced: 0, error: 'ID de calendario inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()
    const { getHolidaysForUser } = await import('@/lib/db/queries/holidays')
    const userHolidays = await getHolidaysForUser(userId)
    const holidayDates = new Set(userHolidays.map((h) => h.date))

    // Verificar si ya existe una sincronización anterior (recurrenceGroupId empezando con 'sierra-')
    // Usamos un UUID determinista basado en calendarId para idempotencia
    const groupTag = `sierra-2025-2026-${calendarId}`
    const existing = await db
      .select({ id: stepsActivities.id })
      .from(stepsActivities)
      .where(
        and(
          eq(stepsActivities.userId, userId),
          eq(stepsActivities.calendarId, calendarId),
          eq(stepsActivities.title, 'Clases')
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return { synced: 0, error: null } // ya sincronizado
    }

    const recurrenceGroupId = crypto.randomUUID()
    const classDates: Date[] = []

    for (const period of SIERRA_PERIODS_2025_2026) {
      const start = new Date(`${period.start}T07:00:00`)
      const end = new Date(`${period.end}T07:00:00`)
      const current = new Date(start)
      while (current <= end) {
        const dow = current.getDay()
        const dateStr = format(current, 'yyyy-MM-dd')
        if (dow !== 0 && dow !== 6 && !holidayDates.has(dateStr)) {
          classDates.push(new Date(current))
        }
        current.setDate(current.getDate() + 1)
      }
    }

    if (classDates.length === 0) return { synced: 0, error: null }

    // Insert in chunks of 100 to avoid hitting DB limits
    const CHUNK = 100
    for (let i = 0; i < classDates.length; i += CHUNK) {
      const chunk = classDates.slice(i, i + CHUNK)
      await db.insert(stepsActivities).values(
        chunk.map((d) => ({
          userId,
          title: 'Clases',
          description: 'Día de clases — Régimen Sierra Ecuador',
          scheduledAt: d,
          scheduledDurationMinutes: 480, // 8 horas
          calendarId,
          recurrenceGroupId,
          status: 'pending' as const,
          planned: false,
          executorType: 'human' as const,
        }))
      )
    }

    revalidatePath('/calendar')
    return { synced: classDates.length, error: null }
  } catch (err) {
    console.error('[syncSierraSchoolCalendar] failed:', err)
    return { synced: 0, error: 'No se pudo sincronizar el calendario escolar.' }
  }
}

/**
 * Returns the list of areas for the authenticated user, ordered by Maslow level.
 * Used to populate the area select in the NewActivityModal.
 */
export async function getAreasForUser(): Promise<AreaOption[]> {
  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    const rows = await db
      .select({ id: areas.id, name: areas.name, maslowLevel: areas.maslowLevel })
      .from(areas)
      .where(eq(areas.userId, userId))
      .orderBy(asc(areas.maslowLevel))

    return rows
  } catch (err) {
    console.error('[getAreasForUser] failed:', err)
    return []
  }
}
