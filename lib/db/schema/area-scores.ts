import { pgTable, uuid, integer, date, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { areas } from './areas'

/**
 * Daily historical score snapshots per area.
 * Immutable — one record per (area_id, scored_at) date.
 * Used for trend analysis and the tiered correlation engine.
 */
export const areaScores = pgTable(
  'area_scores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    areaId: uuid('area_id')
      .notNull()
      .references(() => areas.id, { onDelete: 'cascade' }),
    /** Denormalized for RLS policy efficiency */
    userId: uuid('user_id').notNull(),
    /** Score 0-100 calculated via maslow scoring formula */
    score: integer('score').notNull(),
    /** Date of the score snapshot (one per day per area) */
    scoredAt: date('scored_at').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** One score entry per area per day */
    uniqueAreaDay: uniqueIndex('area_scores_area_id_scored_at_idx').on(
      table.areaId,
      table.scoredAt
    ),
  })
)

export type AreaScore = typeof areaScores.$inferSelect
export type NewAreaScore = typeof areaScores.$inferInsert
