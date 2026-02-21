import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { workflows } from './workflows'

/**
 * Tasks — phases within a workflow.
 * Ordered by the `order` field (0-based).
 * Each task is broken down into Steps/Activities (steps_activities table).
 */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    /** 0-based ordering within the workflow */
    order: integer('order').notNull().default(0),
    status: text('status')
      .$type<'pending' | 'in_progress' | 'completed' | 'skipped'>()
      .default('pending')
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** Ordered task list within a workflow (most common query) */
    workflowOrderIdx: index('tasks_workflow_order_idx').on(table.workflowId, table.order),
    /** Filter tasks by user + status for cross-workflow views */
    userStatusIdx: index('tasks_user_status_idx').on(table.userId, table.status),
  })
)

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
