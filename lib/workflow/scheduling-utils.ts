// lib/workflow/scheduling-utils.ts
// Helpers de calendarización para steps tipo `human`.
// Función pura — sin dependencias de DB ni browser.

/**
 * Retorna el siguiente día hábil (lunes-viernes) a las 09:00 UTC
 * a partir de la fecha dada.
 *
 * Siempre avanza al menos 1 día (nunca retorna el mismo día).
 *
 * Ejemplos:
 *   lunes    → martes 09:00 UTC
 *   viernes  → lunes siguiente 09:00 UTC
 *   sábado   → lunes siguiente 09:00 UTC
 *   domingo  → lunes 09:00 UTC
 */
export function getNextBusinessDaySlot(fromDate: Date): Date {
  const next = new Date(fromDate)
  // Avanzar al menos 1 día
  next.setUTCDate(next.getUTCDate() + 1)
  // Continuar hasta que sea lunes-viernes (0=dom, 6=sab)
  while (next.getUTCDay() === 0 || next.getUTCDay() === 6) {
    next.setUTCDate(next.getUTCDate() + 1)
  }
  next.setUTCHours(9, 0, 0, 0)
  return next
}
