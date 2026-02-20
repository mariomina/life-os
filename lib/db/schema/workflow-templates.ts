import { pgTable, uuid, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'

/**
 * Predefined workflow templates (8 MVP + user-created custom).
 * System templates (is_system=true) are seeded and immutable.
 * User-created templates have is_system=false and a user_id.
 *
 * tasks_config shape:
 * [
 *   {
 *     title: string,
 *     order: number,
 *     steps: [{ title: string, executor_type: 'human'|'ai'|'mixed', ai_agent?: string }]
 *   }
 * ]
 */
export const workflowTemplates = pgTable('workflow_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** null for system templates */
  userId: uuid('user_id'),
  name: text('name').notNull(),
  category: text('category')
    .$type<
      | 'personal_development'
      | 'product_launch'
      | 'health_sprint'
      | 'learning'
      | 'content_creation'
      | 'financial_review'
      | 'habit_building'
      | 'custom'
    >()
    .notNull(),
  description: text('description'),
  executorTypeDefault: text('executor_type_default')
    .$type<'human' | 'ai' | 'mixed'>()
    .default('human')
    .notNull(),
  /** dev | research | coach | none */
  squadType: text('squad_type')
    .$type<'dev' | 'research' | 'coach' | 'none'>()
    .default('none')
    .notNull(),
  /** JSONB array of task objects with nested step configs */
  tasksConfig: jsonb('tasks_config').notNull(),
  /** true = seeded system template; false = user-created */
  isSystem: boolean('is_system').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect
export type NewWorkflowTemplate = typeof workflowTemplates.$inferInsert
