/**
 * Utilidades de recurrencia para actividades del calendario — Story 10.4 / 10.6.
 *
 * Genera ocurrencias concretas de Date[] a partir de una fecha de inicio y
 * opciones de recurrencia. Las ocurrencias se pre-crean en BD (no se expanden
 * on-the-fly), agrupadas por recurrenceGroupId.
 *
 * Story 10.6: añadido 'workdays' (Lun-Vie excluyendo festivos del usuario).
 * El filtrado de festivos se aplica POST-generación en el server action createActivity.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecurrenceType =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'workdays'
  | 'weekly'
  | 'monthly'
  | 'yearly'

export interface RecurrenceOptions {
  type: RecurrenceType
  endType: 'count' | 'date'
  /** Número de ocurrencias (incluyendo la primera). Usado cuando endType='count'. */
  count: number
  /** Fecha de fin en formato "YYYY-MM-DD". Usado cuando endType='date'. */
  endDate: string
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

/** Cantidad por defecto de ocurrencias según tipo de recurrencia */
export const RECURRENCE_DEFAULTS: Record<RecurrenceType, number> = {
  none: 1,
  daily: 30,
  weekdays: 20, // ~4 semanas de Lun-Vie
  workdays: 20, // ~4 semanas de días hábiles
  weekly: 8,
  monthly: 3,
  yearly: 3,
}

/** Límites máximos para evitar inserciones masivas accidentales */
const MAX_OCCURRENCES: Record<RecurrenceType, number> = {
  none: 1,
  daily: 365,
  weekdays: 260,
  workdays: 260,
  weekly: 52,
  monthly: 12,
  yearly: 10,
}

// ─── Core generator ───────────────────────────────────────────────────────────

/**
 * Genera un array de Dates para un evento recurrente.
 * Siempre incluye la fecha de inicio como primera ocurrencia.
 *
 * Nota: 'workdays' genera las mismas fechas que 'weekdays' (Lun-Vie).
 * El filtrado de festivos se aplica en createActivity() del server action.
 *
 * @param start - Fecha y hora de la primera ocurrencia
 * @param options - Configuración de recurrencia
 * @returns Array de Dates ordenado ascendentemente
 */
export function generateOccurrences(start: Date, options: RecurrenceOptions): Date[] {
  if (options.type === 'none') return [new Date(start)]

  const limit = Math.min(options.count, MAX_OCCURRENCES[options.type])
  const endDate =
    options.endType === 'date' && options.endDate ? new Date(options.endDate + 'T23:59:59') : null

  const results: Date[] = []
  let current = new Date(start)

  while (results.length < limit) {
    // Verificar límite por fecha
    if (endDate && current > endDate) break

    if (options.type === 'weekdays' || options.type === 'workdays') {
      const dayOfWeek = current.getDay() // 0=Dom, 1=Lun, ..., 5=Vie, 6=Sáb
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        results.push(new Date(current))
      }
    } else {
      results.push(new Date(current))
    }

    // Avanzar al siguiente candidato
    current = nextCandidate(current, options.type)
  }

  return results
}

/** Calcula la siguiente fecha candidata según el tipo de recurrencia */
function nextCandidate(date: Date, type: RecurrenceType): Date {
  const next = new Date(date)

  switch (type) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekdays':
    case 'workdays':
      // Avanzar 1 día siempre; el filtro de Lun-Vie está en el loop principal
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly': {
      const originalDay = date.getDate()
      next.setMonth(next.getMonth() + 1)
      // Si el mes destino tiene menos días (ej. 31 → feb), ajustar al último día
      const daysInNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(originalDay, daysInNextMonth))
      break
    }
    case 'yearly': {
      const originalDay = date.getDate()
      const originalMonth = date.getMonth()
      next.setFullYear(next.getFullYear() + 1)
      // Ajustar si el mes destino tiene menos días (ej. 29-Feb en año no bisiesto)
      const daysInMonth = new Date(next.getFullYear(), originalMonth + 1, 0).getDate()
      next.setDate(Math.min(originalDay, daysInMonth))
      break
    }
    default:
      next.setDate(next.getDate() + 1)
  }

  return next
}

// ─── Human-readable description ───────────────────────────────────────────────

const TYPE_LABELS: Record<RecurrenceType, string> = {
  none: 'Sin repetición',
  daily: 'cada día',
  weekdays: 'días de semana (Lun–Vie)',
  workdays: 'días hábiles (excl. festivos)',
  weekly: 'cada semana',
  monthly: 'cada mes',
  yearly: 'cada año',
}

/**
 * Devuelve un texto legible del tipo "Se crearán 4 eventos (cada semana)".
 * Usado como preview en el modal antes de confirmar.
 */
export function describeRecurrence(options: RecurrenceOptions, start: Date): string {
  if (options.type === 'none') return ''

  const occurrences = generateOccurrences(start, options)
  const count = occurrences.length
  const label = TYPE_LABELS[options.type]

  if (options.endType === 'date' && options.endDate) {
    const end = new Date(options.endDate)
    const formatted = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    return `Se crearán ${count} evento${count !== 1 ? 's' : ''} (${label}, hasta ${formatted})`
  }

  return `Se crearán ${count} evento${count !== 1 ? 's' : ''} (${label})`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Etiqueta legible para mostrar en el select del modal */
export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'No se repite',
  daily: 'Cada día',
  weekdays: 'Días de semana (Lun–Vie)',
  workdays: 'Días hábiles (excl. festivos)',
  weekly: 'Cada semana',
  monthly: 'Cada mes',
  yearly: 'Cada año',
}
