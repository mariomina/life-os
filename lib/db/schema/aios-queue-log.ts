import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { stepsActivities } from './steps-activities'

/**
 * AIOS Queue Log — registro de steps tipo `ai` encolados para ejecución por agentes AIOS.
 *
 * MVP: solo registra el estado de cola (queued/running/completed/failed).
 * Phase 2: integración real con API de agentes AIOS externos.
 *
 * RLS: auth.uid() = user_id
 */
export const aiosQueueLog = pgTable(
  'aios_queue_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Step que se encoló — CASCADE DELETE si el step se elimina */
    stepId: uuid('step_id')
      .notNull()
      .references(() => stepsActivities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    /** Agente AIOS asignado (ej: '@dev', '@analyst'). 'unassigned' si squad='none' */
    agent: text('agent').notNull(),
    /** Estado de la tarea en cola */
    status: text('status')
      .$type<'queued' | 'running' | 'completed' | 'failed'>()
      .default('queued')
      .notNull(),
    queuedAt: timestamp('queued_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** Resumen del resultado cuando el agente completa (Phase 2) */
    resultSummary: text('result_summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** Lookup por step para badge de estado en StepNode */
    stepIdIdx: index('aios_queue_log_step_id_idx').on(table.stepId),
    /** Queries por usuario + estado (Agent Leverage Report — Story 8.7) */
    userStatusIdx: index('aios_queue_log_user_status_idx').on(table.userId, table.status),
  })
)

export type AiosQueueLog = typeof aiosQueueLog.$inferSelect
export type NewAiosQueueLog = typeof aiosQueueLog.$inferInsert
