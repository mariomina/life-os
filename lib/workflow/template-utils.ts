// lib/workflow/template-utils.ts
// Función pura para transformar tasks_config de un template a nodos y edges de React Flow.
// Sin dependencias de DB — completamente testeable con Vitest.

import { applyDagreLayout } from '@/components/workflow/dagre-layout'
import type { FlowNode, FlowEdge, TaskSyncData, StepSyncData } from '@/actions/workflows'

// ─── Tipos de entrada ─────────────────────────────────────────────────────────

/** Un step dentro de la configuración del template */
export interface TemplateStepConfig {
  title: string
  executor_type: 'human' | 'ai' | 'mixed'
  ai_agent?: string
}

/** Una task dentro de la configuración del template */
export interface TemplateTaskConfig {
  title: string
  order: number
  steps: TemplateStepConfig[]
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface TemplateCanvasResult {
  nodes: FlowNode[]
  edges: FlowEdge[]
  taskSyncData: TaskSyncData[]
  stepSyncData: StepSyncData[]
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Convierte el tasks_config de un template a nodos y edges de React Flow.
 *
 * Genera:
 * - Un nodo tipo 'task' por cada task en tasksConfig
 * - Un nodo tipo 'step' por cada step dentro de cada task
 * - Edges Task→Step y Step→Step (secuencial dentro de la misma task)
 * - Aplica auto-layout dagre LR antes de retornar
 *
 * Función pura — no accede a DB ni a servicios externos.
 */
export function templateConfigToCanvas(tasksConfig: TemplateTaskConfig[]): TemplateCanvasResult {
  if (!tasksConfig || tasksConfig.length === 0) {
    return { nodes: [], edges: [], taskSyncData: [], stepSyncData: [] }
  }

  const rawNodes: FlowNode[] = []
  const edges: FlowEdge[] = []
  const taskSyncData: TaskSyncData[] = []
  const stepSyncData: StepSyncData[] = []

  for (let taskIdx = 0; taskIdx < tasksConfig.length; taskIdx++) {
    const taskConfig = tasksConfig[taskIdx]

    // Generar ID único para la task
    const taskId = crypto.randomUUID()

    // Nodo Task — posición inicial, luego dagre reposiciona
    const taskNode: FlowNode = {
      id: taskId,
      type: 'task',
      position: { x: taskIdx * 220, y: 0 },
      data: {
        label: taskConfig.title,
        status: 'pending',
      },
    }
    rawNodes.push(taskNode)

    taskSyncData.push({
      id: taskId,
      title: taskConfig.title,
      status: 'pending',
      order: taskConfig.order ?? taskIdx,
    })

    // Generar steps para esta task
    const steps = taskConfig.steps ?? []
    let prevStepId: string | null = null

    for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
      const stepConfig = steps[stepIdx]
      const stepId = crypto.randomUUID()

      // Nodo Step
      const stepNode: FlowNode = {
        id: stepId,
        type: 'step',
        position: { x: taskIdx * 220 + stepIdx * 120, y: 200 },
        data: {
          label: stepConfig.title,
          executorType: stepConfig.executor_type,
          aiAgent: stepConfig.ai_agent ?? null,
          status: 'pending',
        },
      }
      rawNodes.push(stepNode)

      stepSyncData.push({
        id: stepId,
        taskId,
        title: stepConfig.title,
        executorType: stepConfig.executor_type,
        aiAgent: stepConfig.ai_agent ?? null,
        verificationCriteria: null,
        description: null,
        status: 'pending',
        order: stepIdx,
      })

      // Edge Task→primer Step
      if (stepIdx === 0) {
        edges.push({
          id: `e-${taskId}-${stepId}`,
          source: taskId,
          target: stepId,
          animated: true,
        })
      }

      // Edge Step→Step (secuencial dentro de la misma task)
      if (prevStepId !== null) {
        edges.push({
          id: `e-${prevStepId}-${stepId}`,
          source: prevStepId,
          target: stepId,
          animated: true,
        })
      }

      prevStepId = stepId
    }
  }

  // Aplicar auto-layout dagre LR
  // applyDagreLayout trabaja con Node de @xyflow/react — compatible con FlowNode
  const laidOutNodes = applyDagreLayout(
    rawNodes as unknown as import('@xyflow/react').Node[],
    edges as import('@xyflow/react').Edge[]
  ) as unknown as FlowNode[]

  return { nodes: laidOutNodes, edges, taskSyncData, stepSyncData }
}
