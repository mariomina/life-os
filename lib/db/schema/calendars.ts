import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core'

/**
 * Calendarios personalizados del usuario — Epic 10.
 *
 * Cada calendario tiene un nombre y un color hex para categorizar actividades
 * (Trabajo, Personal, Salud, Familia, etc.) y filtrar informes por tipo.
 *
 * is_default = true → se asigna automáticamente a nuevas actividades.
 * Solo puede haber un calendario default por usuario (enforced en la app).
 */
export const calendars = pgTable(
  'calendars',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    name: text('name').notNull(),
    /** Color hex: '#4285F4' */
    color: text('color').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('calendars_user_id_idx').on(table.userId),
  })
)

export type Calendar = typeof calendars.$inferSelect
export type NewCalendar = typeof calendars.$inferInsert
