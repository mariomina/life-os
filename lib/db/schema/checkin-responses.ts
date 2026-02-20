import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { stepsActivities } from './steps-activities'

/**
 * Daily Check-in responses — accountability for past activities.
 * One record per (user_id, step_activity_id, checkin_date).
 *
 * Status:
 *   completed  → Activity was done ✓
 *   skipped    → Activity was intentionally skipped
 *   postponed  → Rescheduled to another day
 *   partial    → Partially completed (bulk habits may use this)
 *
 * energy_level (optional): How the user felt during this activity (1-5).
 * Used as input to the correlation engine.
 */
export const checkinResponses = pgTable(
  'checkin_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    stepActivityId: uuid('step_activity_id')
      .notNull()
      .references(() => stepsActivities.id, { onDelete: 'cascade' }),
    /** Date the check-in was for (not when it was answered) */
    checkinDate: date('checkin_date').notNull(),
    status: text('status')
      .$type<'completed' | 'skipped' | 'postponed' | 'partial'>()
      .default('completed')
      .notNull(),
    /** Optional energy/mood signal for correlation engine (1=low, 5=high) */
    energyLevel: integer('energy_level'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** One response per activity per check-in date */
    uniqueActivityDate: uniqueIndex('checkin_responses_activity_date_idx').on(
      table.stepActivityId,
      table.checkinDate
    ),
    /** Daily check-in: fetch all responses for user + date */
    userDateIdx: index('checkin_responses_user_date_idx').on(table.userId, table.checkinDate),
  })
)

export type CheckinResponse = typeof checkinResponses.$inferSelect
export type NewCheckinResponse = typeof checkinResponses.$inferInsert
