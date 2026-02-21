import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { areas } from './areas'
import { okrs } from './okrs'
import { workflowTemplates } from './workflow-templates'

/**
 * Projects — execution vehicles for KRs.
 * Each project can optionally be linked to an Area and a Key Result.
 * A project contains one or more Workflows.
 *
 * Hierarchy: Area → OKR → Project → Workflow → Task → Step/Activity
 */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    areaId: uuid('area_id').references(() => areas.id, { onDelete: 'set null' }),
    /** Optional link to a Key Result OKR */
    okrId: uuid('okr_id').references(() => okrs.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status')
      .$type<'active' | 'completed' | 'archived' | 'paused'>()
      .default('active')
      .notNull(),
    /** Template used when project was created (informational, not enforced) */
    templateId: uuid('template_id').references(() => workflowTemplates.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** Project list: filter by user + status */
    userStatusIdx: index('projects_user_status_idx').on(table.userId, table.status),
    /** Area detail view: projects linked to an area */
    userAreaIdx: index('projects_user_area_idx').on(table.userId, table.areaId),
  })
)

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
