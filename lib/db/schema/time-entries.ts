import { pgTable, uuid, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { stepsActivities } from './steps-activities'

/**
 * Time tracking entries — one per start/stop session.
 * A single step_activity can have multiple time entries (e.g. if paused/resumed).
 *
 * Active timer: is_active=true, ended_at=null
 * Completed timer: is_active=false, ended_at set, duration_seconds calculated
 * Paused timer: paused_at set, pause_reason set, is_active=false temporarily
 *
 * Total time for an activity = SUM(duration_seconds) WHERE step_activity_id = X
 */
export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stepActivityId: uuid('step_activity_id')
      .notNull()
      .references(() => stepsActivities.id, { onDelete: 'cascade' }),
    /** Denormalized for RLS and query efficiency */
    userId: uuid('user_id').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    /** Calculated on stop: EXTRACT(EPOCH FROM ended_at - started_at) - paused_seconds */
    durationSeconds: integer('duration_seconds'),
    /** When the current pause started */
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    pauseReason: text('pause_reason'),
    /** true = timer is actively running right now (Realtime subscription target) */
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** Realtime + reporting: active timers by user */
    activeTimerIdx: index('time_entries_user_active_idx').on(table.userId, table.isActive),
    /** Correlation engine: time entries by user + date range */
    userStartedIdx: index('time_entries_user_started_at_idx').on(table.userId, table.startedAt),
    /** Reports: all entries for a given activity */
    activityIdx: index('time_entries_step_activity_id_idx').on(table.stepActivityId),
  })
)

export type TimeEntry = typeof timeEntries.$inferSelect
export type NewTimeEntry = typeof timeEntries.$inferInsert
