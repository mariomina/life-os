import { pgTable, uuid, integer, date, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { areaSubareas } from './area-subareas'

/**
 * Daily score snapshots per sub-area — immutable time series.
 * One record per (subarea_id, scored_at) date.
 *
 * Stores the three scoring components separately for debugging and
 * audit purposes. The composite `score` is the weighted sum of all three.
 *
 * Component weights vary by Maslow level:
 *   D-Needs (L1-4): behavioral > subjective
 *   B-Needs (L5-8): subjective > behavioral
 *
 * [Source: docs/briefs/areas-redesign-brief.md#5-fuentes, #7-schema]
 */
export const areaSubareaScores = pgTable(
  'area_subarea_scores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    subareaId: uuid('subarea_id')
      .notNull()
      .references(() => areaSubareas.id, { onDelete: 'cascade' }),
    /** Denormalized for RLS policy efficiency */
    userId: uuid('user_id').notNull(),
    /** Composite score 0-100 (weighted sum of the three components below) */
    score: integer('score').notNull().default(0),
    /**
     * Behavioral component 0-100.
     * Calculated from: completed time_entries, completed habit days,
     * completed steps_activities — all filtered by subarea_id.
     * [Source: brief#5-fuentes — "Hechos, no aspiraciones"]
     */
    behavioralScore: integer('behavioral_score').default(0),
    /**
     * Subjective component 0-100.
     * From checkin questionnaire response (1-10 scale normalized to 0-100).
     * [Source: brief#regla3 — cycle varies by Maslow level]
     */
    subjectiveScore: integer('subjective_score').default(0),
    /**
     * Progress component 0-100.
     * From linked OKR/KR progress in the parent area.
     * [Source: brief#5-fuentes — "key_results con progreso registrado"]
     */
    progressScore: integer('progress_score').default(0),
    /** Date of the snapshot — one entry per sub-area per day */
    scoredAt: date('scored_at').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** Enforce one score entry per sub-area per day */
    uniqueSubareaDay: uniqueIndex('area_subarea_scores_subarea_id_scored_at_idx').on(
      table.subareaId,
      table.scoredAt
    ),
    /** Time-series queries: scores for a user's sub-area in date range */
    userSubareaTimeIdx: index('area_subarea_scores_user_subarea_time_idx').on(
      table.userId,
      table.subareaId,
      table.scoredAt
    ),
  })
)

export type AreaSubareaScore = typeof areaSubareaScores.$inferSelect
export type NewAreaSubareaScore = typeof areaSubareaScores.$inferInsert
