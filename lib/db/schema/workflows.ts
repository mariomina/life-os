import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { workflowTemplates } from './workflow-templates'

/**
 * Workflows within projects — one project has one or more workflows.
 * canvas_data stores React Flow nodes/edges for the Visual Workflow Builder (FR20).
 *
 * Squad types:
 *   dev      → Dev Squad (@architect + @dev + @qa + @devops)
 *   research → Research Squad (@analyst + @pm)
 *   coach    → Personal Coach (@analyst)
 *   none     → No AI squad assigned
 */
export const workflows = pgTable('workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** null if workflow is standalone (not linked to a project) */
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  /** Template this workflow was instantiated from */
  templateId: uuid('template_id').references(() => workflowTemplates.id, {
    onDelete: 'set null',
  }),
  /** AIOS agent squad assigned to this workflow */
  squadType: text('squad_type')
    .$type<'dev' | 'research' | 'coach' | 'none'>()
    .default('none')
    .notNull(),
  status: text('status').$type<'active' | 'completed' | 'archived'>().default('active').notNull(),
  /**
   * React Flow canvas state (nodes + edges) for Visual Workflow Builder.
   * Shape: { nodes: FlowNode[], edges: FlowEdge[] }
   * null until workflow is opened in builder.
   */
  canvasData: jsonb('canvas_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Workflow = typeof workflows.$inferSelect
export type NewWorkflow = typeof workflows.$inferInsert
