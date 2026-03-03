/**
 * Utilidades de recurrencia para actividades del calendario.
 *
 * Story 10.4: tipos base (daily/weekdays/weekly/monthly)
 * Story 10.5: yearly
 * Story 10.6: workdays + filtrado de festivos
 * Story 10.7: tipo 'custom' — intervalo, días de semana seleccionables y
 *             opción de excluir festivos. Reemplaza 'weekdays' y 'workdays'.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

export type RecurrenceUnit = 'day' | 'week' | 'month' | 'year'

export interface RecurrenceOptions {
  type: RecurrenceType
  endType: 'count' | 'date' | 'never'
  /** Número de ocurrencias. Usado cuando endType='count'. */
  count: number
  /** Fecha de fin en formato "YYYY-MM-DD". Usado cuando endType='date'. */
  endDate: string
  // ── Custom fields (relevantes cuando type='custom') ──────────────────────
  /** Intervalo entre repeticiones — p.ej. 2 = cada 2 semanas. Default 1. */
  interval?: number
  /** Unidad del intervalo. Default 'week'. */
  unit?: RecurrenceUnit
  /** Días de la semana seleccionados (0=Dom, 1=Lun...6=Sáb). Solo para unit='week'. */
  daysOfWeek?: number[]
  /** Si true, el server action filtrará festivos del usuario post-generación. */
  excludeHolidays?: boolean
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

/** Cantidad por defecto de ocurrencias según tipo de recurrencia */
export const RECURRENCE_DEFAULTS: Record<RecurrenceType, number> = {
  none: 1,
  daily: 30,
  weekly: 8,
  monthly: 3,
  yearly: 3,
  custom: 13,
}

/** Límites máximos para evitar inserciones masivas accidentales */
const MAX_OCCURRENCES: Record<RecurrenceType, number> = {
  none: 1,
  daily: 365,
  weekly: 52,
  monthly: 12,
  yearly: 10,
  custom: 260, // ~1 año de días hábiles
}

// ─── Core generators ──────────────────────────────────────────────────────────

/**
 * Para type='custom' con unit='week' y daysOfWeek definidos.
 * Genera ocurrencias cada `interval` semanas en los días especificados.
 */
function generateWeeklyWithDays(
  start: Date,
  interval: number,
  daysOfWeek: number[],
  endDate: Date | null,
  limit: number
): Date[] {
  const results: Date[] = []

  // Ordenar días con lunes primero (ISO: Lun=1...Dom=7, Dom=0 → tratar como 7)
  const sorted = [...new Set(daysOfWeek)].sort((a, b) => {
    const toIso = (d: number) => (d === 0 ? 7 : d)
    return toIso(a) - toIso(b)
  })

  // Lunes de la semana que contiene 'start'
  const startDow = start.getDay() // 0=Dom
  const daysFromMon = (startDow + 6) % 7 // Lun=0, Mar=1, ..., Dom=6
  const refMon = new Date(start)
  refMon.setDate(refMon.getDate() - daysFromMon)
  refMon.setHours(start.getHours(), start.getMinutes(), 0, 0)

  let weekIdx = 0

  while (results.length < limit) {
    // Primer día (lunes) de la semana actual según el intervalo
    const weekMon = new Date(refMon)
    weekMon.setDate(weekMon.getDate() + weekIdx * 7 * interval)

    for (const day of sorted) {
      const offset = day === 0 ? 6 : day - 1 // Lun=0...Sáb=5, Dom=6
      const candidate = new Date(weekMon)
      candidate.setDate(candidate.getDate() + offset)

      if (candidate < start) continue
      if (endDate && candidate > endDate) return results
      if (results.length >= limit) return results

      results.push(candidate)
    }

    weekIdx++
    if (weekIdx > 5000) break // seguridad
  }

  return results
}

/**
 * Generador simple para tipos con intervalo fijo (día/semana/mes/año).
 */
function generateSimple(
  start: Date,
  interval: number,
  unit: RecurrenceUnit,
  endDate: Date | null,
  limit: number
): Date[] {
  const results: Date[] = []
  const current = new Date(start)

  while (results.length < limit) {
    if (endDate && current > endDate) break
    results.push(new Date(current))

    switch (unit) {
      case 'day':
        current.setDate(current.getDate() + interval)
        break
      case 'week':
        current.setDate(current.getDate() + 7 * interval)
        break
      case 'month': {
        const d = current.getDate()
        current.setMonth(current.getMonth() + interval)
        const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()
        current.setDate(Math.min(d, daysInMonth))
        break
      }
      case 'year': {
        const d = current.getDate()
        const m = current.getMonth()
        current.setFullYear(current.getFullYear() + interval)
        const daysInMonth = new Date(current.getFullYear(), m + 1, 0).getDate()
        current.setDate(Math.min(d, daysInMonth))
        break
      }
    }
  }

  return results
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Genera un array de Dates para un evento recurrente.
 * Siempre incluye la fecha de inicio como primera ocurrencia.
 *
 * Nota: excludeHolidays se aplica POST-generación en el server action createActivity.
 *
 * @param start   - Fecha y hora de la primera ocurrencia
 * @param options - Configuración de recurrencia
 * @returns Array de Dates ordenado ascendentemente
 */
export function generateOccurrences(start: Date, options: RecurrenceOptions): Date[] {
  if (options.type === 'none') return [new Date(start)]

  const maxOcc = MAX_OCCURRENCES[options.type]
  const limit = options.endType === 'never' ? maxOcc : Math.min(Math.max(1, options.count), maxOcc)

  const endDate =
    options.endType === 'date' && options.endDate ? new Date(options.endDate + 'T23:59:59') : null

  // Tipos simples — intervalo fijo de 1 unidad
  const simpleUnitMap: Partial<Record<RecurrenceType, RecurrenceUnit>> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    yearly: 'year',
  }
  if (options.type in simpleUnitMap) {
    return generateSimple(start, 1, simpleUnitMap[options.type]!, endDate, limit)
  }

  // Tipo 'custom'
  const interval = Math.max(1, options.interval ?? 1)
  const unit = options.unit ?? 'week'
  const days = options.daysOfWeek ?? []

  if (unit === 'week' && days.length > 0) {
    return generateWeeklyWithDays(start, interval, days, endDate, limit)
  }

  return generateSimple(start, interval, unit, endDate, limit)
}

// ─── Human-readable description ───────────────────────────────────────────────

const DAY_ABBR = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']

const SIMPLE_TYPE_LABELS: Partial<Record<RecurrenceType, string>> = {
  daily: 'cada día',
  weekly: 'cada semana',
  monthly: 'cada mes',
  yearly: 'cada año',
}

/**
 * Devuelve un texto legible del tipo "Se crearán 4 eventos (cada semana, Lu-Vi)".
 * Usado como preview en el modal antes de confirmar.
 */
export function describeRecurrence(options: RecurrenceOptions, start: Date): string {
  if (options.type === 'none') return ''

  const occurrences = generateOccurrences(start, options)
  const count = occurrences.length
  const plural = count !== 1

  let label: string

  if (options.type === 'custom') {
    const interval = options.interval ?? 1
    const unit = options.unit ?? 'week'
    const days = options.daysOfWeek ?? []

    const unitLabels: Record<RecurrenceUnit, [string, string]> = {
      day: ['día', 'días'],
      week: ['semana', 'semanas'],
      month: ['mes', 'meses'],
      year: ['año', 'años'],
    }
    const [sing, plur] = unitLabels[unit]
    label = interval === 1 ? `cada ${sing}` : `cada ${interval} ${plur}`

    if (unit === 'week' && days.length > 0) {
      const sortedDays = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
      label += `, ${sortedDays.map((d) => DAY_ABBR[d]).join('-')}`
    }

    if (options.excludeHolidays) label += ' excl. festivos'
  } else {
    label = SIMPLE_TYPE_LABELS[options.type] ?? options.type
  }

  const eventWord = `evento${plural ? 's' : ''}`

  if (options.endType === 'date' && options.endDate) {
    const end = new Date(options.endDate)
    const formatted = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    return `Se crearán ${count} ${eventWord} (${label}, hasta ${formatted})`
  }

  if (options.endType === 'never') {
    return `Se crearán hasta ${count} ${eventWord} (${label})`
  }

  return `Se crearán ${count} ${eventWord} (${label})`
}

// ─── Labels ───────────────────────────────────────────────────────────────────

/** Etiqueta legible para mostrar en el select del modal */
export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'No se repite',
  daily: 'Cada día',
  weekly: 'Cada semana',
  monthly: 'Cada mes',
  yearly: 'Cada año',
  custom: 'Personalizado...',
}
