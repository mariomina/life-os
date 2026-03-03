import { pgTable, uuid, text, date, timestamp, index, unique } from 'drizzle-orm/pg-core'

/**
 * Festivos y días feriados personales del usuario (Story 10.6).
 *
 * Usados para:
 *   1. Filtrar ocurrencias en recurrencia 'workdays' (Días hábiles)
 *   2. Mostrar indicadores visuales en el calendario
 */
export const holidays = pgTable(
  'holidays',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    /** Fecha del festivo en formato 'YYYY-MM-DD' (tipo date de Postgres) */
    date: date('date').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userDateIdx: index('holidays_user_date_idx').on(table.userId, table.date),
    userDateUnique: unique('holidays_user_date_unique').on(table.userId, table.date),
  })
)

export type Holiday = typeof holidays.$inferSelect
export type NewHoliday = typeof holidays.$inferInsert
