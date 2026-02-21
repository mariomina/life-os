import { pgTable, uuid, text, integer, timestamp, AnyPgColumn, index } from 'drizzle-orm/pg-core'
import { areas } from './areas'

/**
 * Unified OKR hierarchy: Vision (5Y) → Annual OKR → Key Result (quarterly).
 * Self-referential via parent_id.
 *
 * Hierarchy rules:
 *   type='vision'        → parent_id=NULL, no quarter, no year required
 *   type='annual'        → parent_id=vision.id, year required
 *   type='key_result'    → parent_id=annual.id, year+quarter required
 *
 * progress (0-100) is calculated automatically:
 *   - key_result: from linked activities/time_entries
 *   - annual: average of linked key_results
 *   - vision: narrative only, no progress calculation
 */
export const okrs = pgTable(
  'okrs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    type: text('type').$type<'vision' | 'annual' | 'key_result'>().notNull(),
    /** Self-referential FK — null for vision root */
    parentId: uuid('parent_id').references((): AnyPgColumn => okrs.id, {
      onDelete: 'cascade',
    }),
    areaId: uuid('area_id').references(() => areas.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    /** Required for annual and key_result types */
    year: integer('year'),
    /** Q1 | Q2 | Q3 | Q4 — required for key_result type */
    quarter: text('quarter').$type<'Q1' | 'Q2' | 'Q3' | 'Q4'>(),
    /** 0-100. For key_result: auto-calculated. For annual: avg of KRs. */
    progress: integer('progress').default(0).notNull(),
    /** KR metric type — how progress is measured */
    krType: text('kr_type').$type<'time_based' | 'outcome_based' | 'milestone'>(),
    /** Target value for outcome-based KRs (e.g. "lose 5kg", target=5) */
    targetValue: integer('target_value'),
    /** Unit for outcome-based KRs (kg, books, sessions, etc.) */
    targetUnit: text('target_unit'),
    status: text('status')
      .$type<'active' | 'completed' | 'cancelled' | 'paused'>()
      .default('active')
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** Filter by user + status for dashboard view */
    userStatusIdx: index('okrs_user_status_idx').on(table.userId, table.status),
    /** Filter by user + OKR type (vision / annual / key_result) */
    userTypeIdx: index('okrs_user_type_idx').on(table.userId, table.type),
    /** Self-referential hierarchy traversal */
    parentIdIdx: index('okrs_parent_id_idx').on(table.parentId),
  })
)

export type OKR = typeof okrs.$inferSelect
export type NewOKR = typeof okrs.$inferInsert
