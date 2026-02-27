import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { areas } from './areas'
import { okrs } from './okrs'
import { projects } from './projects'
import { stepsActivities } from './steps-activities'

/**
 * Inbox capture — free-text items awaiting AI classification or manual processing.
 *
 * Status flow:
 *   pending    → User just captured the item
 *   processing → AI is classifying (short-lived state)
 *   processed  → AI proposed a slot, user confirmed → step_activity_id set
 *   manual     → AI unavailable (FR22) or user chose manual → no AI data
 *   discarded  → User explicitly dismissed without creating activity
 */
export const inboxItems = pgTable(
  'inbox_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    /** Original free-text from user */
    rawText: text('raw_text').notNull(),
    status: text('status')
      .$type<'pending' | 'processing' | 'processed' | 'manual' | 'discarded'>()
      .default('pending')
      .notNull(),
    // --- AI Classification Fields (null if status='manual' or 'discarded') ---
    /** task | event | project | habit | idea | reference */
    aiClassification: text('ai_classification').$type<
      'task' | 'event' | 'project' | 'habit' | 'idea' | 'reference'
    >(),
    aiSuggestedAreaId: uuid('ai_suggested_area_id').references(() => areas.id, {
      onDelete: 'set null',
    }),
    aiSuggestedOkrId: uuid('ai_suggested_okr_id').references(() => okrs.id, {
      onDelete: 'set null',
    }),
    aiSuggestedSlot: timestamp('ai_suggested_slot', { withTimezone: true }),
    aiSuggestedTitle: text('ai_suggested_title'),
    aiSuggestedDurationMinutes: integer('ai_suggested_duration_minutes'),
    /** Error message if AI processing failed — triggers fallback to manual (FR22) */
    aiError: text('ai_error'),
    // --- Result ---
    /** Set when user confirms the proposal — links to the created activity */
    stepActivityId: uuid('step_activity_id').references(() => stepsActivities.id, {
      onDelete: 'set null',
    }),
    /** Set when user converts item to a project (classification='project') */
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** Inbox queue: pending items for a user */
    pendingIdx: index('inbox_items_user_status_idx').on(table.userId, table.status),
    /** Alert: inbox accumulated > 7 days */
    createdAtIdx: index('inbox_items_user_created_at_idx').on(table.userId, table.createdAt),
    /** OKR suggestion lookup */
    okrIdx: index('inbox_items_okr_idx').on(table.aiSuggestedOkrId),
    /** Project link lookup */
    projectIdx: index('inbox_items_project_idx').on(table.projectId),
  })
)

export type InboxItem = typeof inboxItems.$inferSelect
export type NewInboxItem = typeof inboxItems.$inferInsert
