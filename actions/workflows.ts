'use server'

// actions/workflows.ts
// Server Actions para el Visual Workflow Builder (FR20).
// CRUD de workflows + sincronización canvas ↔ DB + instanciación de templates.

import { eq, and, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { workflows } from '@/lib/db/schema/workflows'
import { tasks } from '@/lib/db/schema/tasks'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import {
  getSystemWorkflowTemplates,
  getWorkflowTemplateById,
} from '@/lib/db/queries/workflow-templates'
import { templateConfigToCanvas } from '@/lib/workflow/template-utils'
import type { Workflow } from '@/lib/db/schema/workflows'
import type { WorkflowTemplate } from '@/lib/db/schema/workflow-templates'
import type { TemplateTaskConfig } from '@/lib/workflow/template-utils'

export type { WorkflowTemplate }

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ActionResult {
  error: string | null
}

/** Shape de un nodo React Flow serializable */
export interface FlowNode {
  id: string
  type: 'task' | 'step'
  position: { x: number; y: number }
  data: TaskNodeData | StepNodeData
}

export interface TaskNodeData {
  label: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
}

export interface StepNodeData {
  label: string
  executorType: 'human' | 'ai' | 'mixed'
  aiAgent?: string | null
  verificationCriteria?: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'
  description?: string | null
}

/** Shape de un edge React Flow */
export interface FlowEdge {
  id: string
  source: string
  target: string
  type?: string
  animated?: boolean
}

/** Datos para sincronizar una Task al guardar el canvas */
export interface TaskSyncData {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  order: number
}

/** Datos para sincronizar un Step al guardar el canvas */
export interface StepSyncData {
  id: string
  taskId: string | null
  title: string
  executorType: 'human' | 'ai' | 'mixed'
  aiAgent?: string | null
  verificationCriteria?: string | null
  description?: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'
  order: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user.id
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Crea un workflow vacío vinculado a un proyecto.
 * Retorna el workflow creado para poder navegar al canvas.
 */
export async function createWorkflow(
  projectId: string,
  title: string
): Promise<{ error: string | null; workflow: Workflow | null }> {
  assertDatabaseUrl()
  try {
    if (!title.trim()) {
      return { error: 'El título es requerido', workflow: null }
    }

    const userId = await getAuthenticatedUserId()

    const [created] = await db
      .insert(workflows)
      .values({
        projectId,
        userId,
        title: title.trim(),
        squadType: 'none',
        status: 'active',
        canvasData: null,
      })
      .returning()

    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/projects/${projectId}/workflow`)
    return { error: null, workflow: created }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado', workflow: null }
    return { error: message, workflow: null }
  }
}

/**
 * Retorna el workflow del proyecto (o lo crea si no existe).
 * Garantiza que siempre haya exactamente uno por proyecto (MVP).
 */
export async function getOrCreateWorkflow(
  projectId: string
): Promise<{ error: string | null; workflow: Workflow | null }> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    const existing = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.projectId, projectId), eq(workflows.userId, userId)))
      .limit(1)

    if (existing.length > 0) {
      return { error: null, workflow: existing[0] }
    }

    // Crear workflow vacío
    const [created] = await db
      .insert(workflows)
      .values({
        projectId,
        userId,
        title: 'Workflow del Proyecto',
        squadType: 'none',
        status: 'active',
        canvasData: null,
      })
      .returning()

    revalidatePath(`/projects/${projectId}`)
    return { error: null, workflow: created }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado', workflow: null }
    return { error: message, workflow: null }
  }
}

/**
 * Persiste el canvas_data del workflow y sincroniza tasks y steps en DB.
 *
 * Sincronización:
 * 1. Nodos tipo `task` → upsert en tabla `tasks`
 * 2. Nodos tipo `step` → upsert en tabla `steps_activities`
 * 3. Guarda `canvas_data` en `workflows`
 *
 * Los IDs de nodos React Flow coinciden con UUIDs de DB para facilitar sync.
 */
export async function saveWorkflowCanvas(
  workflowId: string,
  canvasData: { nodes: FlowNode[]; edges: FlowEdge[] },
  taskSyncData: TaskSyncData[],
  stepSyncData: StepSyncData[]
): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    // Verificar que el workflow pertenece al usuario
    const workflowRows = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)))
      .limit(1)

    if (workflowRows.length === 0) {
      return { error: 'Workflow no encontrado' }
    }

    // ── 1. Upsert tasks ──────────────────────────────────────────────────────
    if (taskSyncData.length > 0) {
      for (const taskData of taskSyncData) {
        await db
          .insert(tasks)
          .values({
            id: taskData.id,
            workflowId,
            userId,
            title: taskData.title,
            status: taskData.status,
            order: taskData.order,
          })
          .onConflictDoUpdate({
            target: tasks.id,
            set: {
              title: taskData.title,
              status: taskData.status,
              order: taskData.order,
              updatedAt: new Date(),
            },
          })
      }
    }

    // ── 2. Eliminar tasks que ya no están en el canvas ───────────────────────
    const currentTaskIds = taskSyncData.map((t) => t.id)
    const existingTasks = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.workflowId, workflowId))

    const tasksToDelete = existingTasks
      .map((t) => t.id)
      .filter((id) => !currentTaskIds.includes(id))

    if (tasksToDelete.length > 0) {
      await db.delete(tasks).where(inArray(tasks.id, tasksToDelete))
    }

    // ── 3. Upsert steps ──────────────────────────────────────────────────────
    if (stepSyncData.length > 0) {
      for (const stepData of stepSyncData) {
        await db
          .insert(stepsActivities)
          .values({
            id: stepData.id,
            taskId: stepData.taskId,
            userId,
            title: stepData.title,
            description: stepData.description ?? null,
            executorType: stepData.executorType,
            aiAgent: stepData.aiAgent ?? null,
            verificationCriteria: stepData.verificationCriteria ?? null,
            status: stepData.status,
            order: stepData.order,
            planned: true,
          })
          .onConflictDoUpdate({
            target: stepsActivities.id,
            set: {
              taskId: stepData.taskId,
              title: stepData.title,
              description: stepData.description ?? null,
              executorType: stepData.executorType,
              aiAgent: stepData.aiAgent ?? null,
              verificationCriteria: stepData.verificationCriteria ?? null,
              status: stepData.status,
              order: stepData.order,
              updatedAt: new Date(),
            },
          })
      }
    }

    // ── 4. Eliminar steps que ya no están en el canvas ───────────────────────
    const currentStepIds = stepSyncData.map((s) => s.id)
    const allWorkflowTaskIds = taskSyncData.map((t) => t.id)

    if (allWorkflowTaskIds.length > 0) {
      const existingSteps = await db
        .select({ id: stepsActivities.id })
        .from(stepsActivities)
        .where(inArray(stepsActivities.taskId, allWorkflowTaskIds))

      const stepsToDelete = existingSteps
        .map((s) => s.id)
        .filter((id) => !currentStepIds.includes(id))

      if (stepsToDelete.length > 0) {
        await db.delete(stepsActivities).where(inArray(stepsActivities.id, stepsToDelete))
      }
    }

    // ── 5. Guardar canvas_data en el workflow ────────────────────────────────
    await db
      .update(workflows)
      .set({
        canvasData: canvasData as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId))

    revalidatePath(`/projects`)
    // Extraer projectId del workflow para revalidar
    const wf = workflowRows[0]
    if (wf.projectId) {
      revalidatePath(`/projects/${wf.projectId}/workflow`)
    }

    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

/**
 * Retorna todos los templates de sistema disponibles.
 * No requiere filtro por user_id — los templates del sistema son globales.
 */
export async function getWorkflowTemplates(): Promise<{
  error: string | null
  templates: WorkflowTemplate[]
}> {
  assertDatabaseUrl()
  try {
    await getAuthenticatedUserId()
    const templates = await getSystemWorkflowTemplates()
    return { error: null, templates }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado', templates: [] }
    return { error: message, templates: [] }
  }
}

/**
 * Instancia un template en el canvas del workflow.
 *
 * Flujo:
 * 1. Verifica ownership del workflow
 * 2. Obtiene el template por ID
 * 3. Genera nodos/edges con templateConfigToCanvas()
 * 4. Persiste tasks + steps + canvas_data + template_id via saveWorkflowCanvas()
 */
export async function instantiateTemplate(
  workflowId: string,
  templateId: string
): Promise<
  ActionResult & {
    canvasData?: { nodes: FlowNode[]; edges: FlowEdge[] }
    taskSyncData?: TaskSyncData[]
    stepSyncData?: StepSyncData[]
  }
> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    // Verificar ownership del workflow
    const workflowRows = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)))
      .limit(1)

    if (workflowRows.length === 0) {
      return { error: 'Workflow no encontrado' }
    }

    // Obtener template
    const template = await getWorkflowTemplateById(templateId)
    if (!template) {
      return { error: 'Template no encontrado' }
    }

    // Transformar tasks_config → nodos/edges
    const tasksConfig = template.tasksConfig as TemplateTaskConfig[]
    const { nodes, edges, taskSyncData, stepSyncData } = templateConfigToCanvas(tasksConfig)

    // Persistir canvas + tasks + steps
    const saveResult = await saveWorkflowCanvas(
      workflowId,
      { nodes, edges },
      taskSyncData,
      stepSyncData
    )

    if (saveResult.error) {
      return { error: saveResult.error }
    }

    // Actualizar template_id en el workflow
    await db
      .update(workflows)
      .set({ templateId, updatedAt: new Date() })
      .where(eq(workflows.id, workflowId))

    const wf = workflowRows[0]
    if (wf.projectId) {
      revalidatePath(`/projects/${wf.projectId}/workflow`)
    }

    return { error: null, canvasData: { nodes, edges }, taskSyncData, stepSyncData }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}
