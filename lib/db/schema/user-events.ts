import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

/**
 * User analytics events — fire-and-forget behavioural tracking.
 * Story 10.19 — Analytics de Actividad del Usuario.
 *
 * Events are written via POST /api/analytics (fire-and-forget, no UI block).
 * RLS: only the owner can read/insert their own events.
 * Retention: 90-day rolling (manual purge — pg_cron accepted as tech debt).
 */
export const userEvents = pgTable(
  'user_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    eventType: text('event_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    userTimeIdx: index('idx_user_events_user_time').on(table.userId, table.occurredAt.desc()),
    userTypeIdx: index('idx_user_events_type').on(
      table.userId,
      table.eventType,
      table.occurredAt.desc()
    ),
  })
)

export type UserEvent = typeof userEvents.$inferSelect
export type NewUserEvent = typeof userEvents.$inferInsert
