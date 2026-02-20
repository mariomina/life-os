import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { stepsActivities } from './steps-activities'
import { skills } from './skills'

/**
 * Junction table: links StepActivities to Skills for time tracking.
 * Avoids circular FK between steps_activities and skills.
 *
 * When a time_entry completes on a step_activity:
 *   → Find all skills tagged to that step_activity
 *   → Add time_entry.duration_seconds to each skill.time_invested_seconds
 *
 * This powers: "Time invested in TypeScript: 142h (Intermediate → Advanced)"
 */
export const stepSkillTags = pgTable(
  'step_skill_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stepActivityId: uuid('step_activity_id')
      .notNull()
      .references(() => stepsActivities.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    /** Denormalized for RLS */
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** Prevent tagging the same skill twice on the same step */
    uniqueStepSkill: uniqueIndex('step_skill_tags_step_skill_idx').on(
      table.stepActivityId,
      table.skillId
    ),
    /** Find all steps tagged to a skill (for time aggregation) */
    skillIdx: index('step_skill_tags_skill_id_idx').on(table.skillId),
  })
)

export type StepSkillTag = typeof stepSkillTags.$inferSelect
export type NewStepSkillTag = typeof stepSkillTags.$inferInsert
