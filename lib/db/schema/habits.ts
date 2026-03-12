import { pgTable, uuid, text, boolean, integer, date, timestamp, index } from 'drizzle-orm/pg-core'
import { areas } from './areas'
import { areaSubareas } from './area-subareas'

/**
 * Recurring habits driven by rrule (RFC 5545).
 * Habits generate step_activities on-the-fly via the rrule engine —
 * only past/present occurrences are persisted in steps_activities.
 * Future occurrences are calculated from the rrule string.
 */
export const habits = pgTable(
  'habits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    areaId: uuid('area_id').references(() => areas.id, { onDelete: 'set null' }),
    /** Optional — narrows the habit to a specific sub-area within the parent area */
    subareaId: uuid('subarea_id').references(() => areaSubareas.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    /** RFC 5545 rrule string. Example: "FREQ=DAILY;BYHOUR=7;BYMINUTE=0" */
    rrule: text('rrule').notNull(),
    /** Default duration when scheduling in calendar */
    durationMinutes: integer('duration_minutes').default(30).notNull(),
    /** Current active streak in days */
    streakCurrent: integer('streak_current').default(0).notNull(),
    /** All-time best streak */
    streakBest: integer('streak_best').default(0).notNull(),
    /** Date of last confirmed completion */
    lastCompletedAt: date('last_completed_at'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** Habit list view: only active habits per user */
    userActiveIdx: index('habits_user_active_idx').on(table.userId, table.isActive),
    /** Filter habits by area for area detail view */
    userAreaIdx: index('habits_user_area_idx').on(table.userId, table.areaId),
  })
)

export type Habit = typeof habits.$inferSelect
export type NewHabit = typeof habits.$inferInsert
