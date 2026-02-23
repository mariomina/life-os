// lib/db/queries/workflows.ts
// Queries de lectura para workflows, tasks y steps del Visual Workflow Builder (FR20).
// Todas las funciones requieren userId explícito — no confiar solo en RLS.

import { eq, and, asc } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { workflows } from '@/lib/db/schema/workflows'
import { tasks } from '@/lib/db/schema/tasks'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import type { Workflow } from '@/lib/db/schema/workflows'
import type { Task } from '@/lib/db/schema/tasks'
import type { StepActivity } from '@/lib/db/schema/steps-activities'

export type { Workflow, Task, StepActivity }

export interface WorkflowWithTasks extends Workflow {
  tasks: TaskWithSteps[]
}

export interface TaskWithSteps extends Task {
  steps: StepActivity[]
}

/**
 * Retorna el primer workflow vinculado a un proyecto para el usuario.
 * MVP: un workflow por proyecto.
 */
export async function getWorkflowByProject(
  userId: string,
  projectId: string
): Promise<Workflow | null> {
  assertDatabaseUrl()

  const rows = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.projectId, projectId), eq(workflows.userId, userId)))
    .limit(1)

  return rows[0] ?? null
}

/**
 * Retorna el canvas data (nodes + edges) de un workflow.
 * Usado para restaurar el canvas en el Visual Workflow Builder.
 */
export async function getWorkflowCanvas(
  userId: string,
  workflowId: string
): Promise<Workflow | null> {
  assertDatabaseUrl()

  const rows = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)))
    .limit(1)

  return rows[0] ?? null
}

/**
 * Retorna un workflow con sus tasks y steps, ordenados por `order`.
 * Usado para sincronización bidireccional canvas ↔ DB.
 */
export async function getWorkflowWithTasks(
  userId: string,
  workflowId: string
): Promise<WorkflowWithTasks | null> {
  assertDatabaseUrl()

  const workflowRows = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)))
    .limit(1)

  if (workflowRows.length === 0) return null

  const workflow = workflowRows[0]

  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.workflowId, workflowId))
    .orderBy(asc(tasks.order))

  const taskWithSteps: TaskWithSteps[] = await Promise.all(
    taskRows.map(async (task) => {
      const stepRows = await db
        .select()
        .from(stepsActivities)
        .where(eq(stepsActivities.taskId, task.id))
        .orderBy(asc(stepsActivities.order))

      return { ...task, steps: stepRows }
    })
  )

  return { ...workflow, tasks: taskWithSteps }
}
