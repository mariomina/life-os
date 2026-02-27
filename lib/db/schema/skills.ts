import { pgTable, uuid, text, boolean, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { areas } from './areas'

/**
 * User skills with level tracking.
 * time_invested_seconds is calculated from time_entries
 * linked to step_skill_tags → steps_activities.
 * auto_detected=true means it was suggested by the engine, not manually created.
 */
export const skills = pgTable(
  'skills',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    areaId: uuid('area_id').references(() => areas.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    level: text('level')
      .$type<'beginner' | 'intermediate' | 'advanced' | 'expert'>()
      .default('beginner')
      .notNull(),
    /** Accumulated seconds from linked time_entries (updated via trigger or Server Action) */
    timeInvestedSeconds: integer('time_invested_seconds').default(0).notNull(),
    /** true if suggested by the auto-detection engine, false if manually created */
    autoDetected: boolean('auto_detected').default(false).notNull(),
    /** Soft-delete: null = active, timestamp = archived */
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** Prevent duplicate skill names per user */
    uniqueUserSkill: uniqueIndex('skills_user_id_name_idx').on(table.userId, table.name),
  })
)

export type Skill = typeof skills.$inferSelect
export type NewSkill = typeof skills.$inferInsert
