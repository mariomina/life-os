// tests/unit/workflows/canvas-sync.test.ts
// Tests unitarios para las funciones puras de transformación canvas ↔ DB.
// Sin dependencias de DB — lógica pura.

import { describe, it, expect } from 'vitest'
import type { FlowNode, FlowEdge, TaskSyncData, StepSyncData } from '@/actions/workflows'
import { EXECUTOR_COLORS } from '@/components/workflow/types'

// ─── Funciones puras bajo test ─────────────────────────────────────────────────
// Estas funciones son el contrato de sincronización canvas ↔ DB.

/** Extrae los datos de sync de los nodos Task */
function parseTaskNodes(nodes: FlowNode[]): TaskSyncData[] {
  return nodes
    .filter((n) => n.type === 'task')
    .map((n, idx) => {
      const d = n.data as { label: string; status: TaskSyncData['status'] }
      return {
        id: n.id,
        title: d.label,
        status: d.status,
        order: idx,
      }
    })
}

/** Extrae los datos de sync de los nodos Step, resolviendo taskId desde edges */
function parseStepNodes(nodes: FlowNode[], edges: FlowEdge[]): StepSyncData[] {
  const stepNodes = nodes.filter((n) => n.type === 'step')
  return stepNodes.map((n, idx) => {
    const d = n.data as {
      label: string
      executorType: 'human' | 'ai' | 'mixed'
      aiAgent?: string | null
      verificationCriteria?: string | null
      description?: string | null
      status: StepSyncData['status']
    }
    // Buscar edge Task → Step (el padre)
    const parentEdge = edges.find((e) => {
      const sourceNode = nodes.find((sn) => sn.id === e.source)
      return e.target === n.id && sourceNode?.type === 'task'
    })
    return {
      id: n.id,
      taskId: parentEdge ? parentEdge.source : null,
      title: d.label,
      executorType: d.executorType,
      aiAgent: d.aiAgent ?? null,
      verificationCriteria: d.verificationCriteria ?? null,
      description: d.description ?? null,
      status: d.status,
      order: idx,
    }
  })
}

/** Retorna el color hexadecimal (o gradiente) para el executor_type */
function executorTypeToColor(type: string): string {
  return EXECUTOR_COLORS[type as keyof typeof EXECUTOR_COLORS] ?? EXECUTOR_COLORS.human
}

/**
 * Reconstruye nodes + edges desde las entidades de DB para restaurar el canvas.
 * Solo reconstructibilidad básica — sin posiciones (esas vienen de canvas_data).
 */
function nodesToCanvasData(
  tasks: TaskSyncData[],
  steps: StepSyncData[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const taskNodes: FlowNode[] = tasks.map((t, idx) => ({
    id: t.id,
    type: 'task',
    position: { x: idx * 200, y: 0 },
    data: { label: t.title, status: t.status },
  }))

  const stepNodes: FlowNode[] = steps.map((s, idx) => ({
    id: s.id,
    type: 'step',
    position: { x: idx * 120, y: 150 },
    data: {
      label: s.title,
      executorType: s.executorType,
      aiAgent: s.aiAgent,
      verificationCriteria: s.verificationCriteria,
      description: s.description,
      status: s.status,
    },
  }))

  // Generar edges Task → Step desde taskId
  const edges: FlowEdge[] = steps
    .filter((s) => s.taskId !== null)
    .map((s) => ({
      id: `e-${s.taskId}-${s.id}`,
      source: s.taskId!,
      target: s.id,
      animated: true,
    }))

  return { nodes: [...taskNodes, ...stepNodes], edges }
}

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const TASK_NODE_A: FlowNode = {
  id: 'task-001',
  type: 'task',
  position: { x: 0, y: 0 },
  data: { label: 'Diseño', status: 'pending' },
}

const TASK_NODE_B: FlowNode = {
  id: 'task-002',
  type: 'task',
  position: { x: 200, y: 0 },
  data: { label: 'Implementación', status: 'in_progress' },
}

const STEP_NODE_HUMAN: FlowNode = {
  id: 'step-001',
  type: 'step',
  position: { x: 80, y: 150 },
  data: { label: 'Revisar maquetas', executorType: 'human', status: 'pending' },
}

const STEP_NODE_AI: FlowNode = {
  id: 'step-002',
  type: 'step',
  position: { x: 200, y: 150 },
  data: { label: 'Generar código', executorType: 'ai', aiAgent: '@dev', status: 'pending' },
}

const STEP_NODE_MIXED: FlowNode = {
  id: 'step-003',
  type: 'step',
  position: { x: 320, y: 150 },
  data: {
    label: 'Review final',
    executorType: 'mixed',
    aiAgent: '@qa',
    verificationCriteria: 'Tests pasan y linter sin errores',
    status: 'pending',
  },
}

const EDGE_TASK_A_TO_STEP_1: FlowEdge = {
  id: 'e1',
  source: 'task-001',
  target: 'step-001',
  animated: true,
}

const EDGE_TASK_B_TO_STEP_2: FlowEdge = {
  id: 'e2',
  source: 'task-002',
  target: 'step-002',
  animated: true,
}

const EDGE_STEP_TO_STEP: FlowEdge = {
  id: 'e3',
  source: 'step-001',
  target: 'step-002',
  animated: true,
}

// ─── Tests: parseTaskNodes ────────────────────────────────────────────────────

describe('parseTaskNodes', () => {
  it('retorna array vacío si no hay nodos Task', () => {
    const result = parseTaskNodes([STEP_NODE_HUMAN])
    expect(result).toHaveLength(0)
  })

  it('extrae un solo nodo Task correctamente', () => {
    const result = parseTaskNodes([TASK_NODE_A])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('task-001')
    expect(result[0].title).toBe('Diseño')
    expect(result[0].status).toBe('pending')
    expect(result[0].order).toBe(0)
  })

  it('extrae múltiples nodos Task con order correcto', () => {
    const result = parseTaskNodes([TASK_NODE_A, TASK_NODE_B])
    expect(result).toHaveLength(2)
    expect(result[0].order).toBe(0)
    expect(result[1].order).toBe(1)
    expect(result[1].title).toBe('Implementación')
    expect(result[1].status).toBe('in_progress')
  })

  it('filtra nodos que no son Task (ignora Steps)', () => {
    const nodes = [TASK_NODE_A, STEP_NODE_HUMAN, TASK_NODE_B]
    const result = parseTaskNodes(nodes)
    expect(result).toHaveLength(2)
    expect(result.every((t) => t.id.startsWith('task-'))).toBe(true)
  })
})

// ─── Tests: parseStepNodes ────────────────────────────────────────────────────

describe('parseStepNodes', () => {
  it('retorna array vacío si no hay nodos Step', () => {
    const result = parseStepNodes([TASK_NODE_A], [])
    expect(result).toHaveLength(0)
  })

  it('extrae Step con taskId resuelto desde edge Task→Step', () => {
    const nodes = [TASK_NODE_A, STEP_NODE_HUMAN]
    const edges = [EDGE_TASK_A_TO_STEP_1]
    const result = parseStepNodes(nodes, edges)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('step-001')
    expect(result[0].taskId).toBe('task-001')
    expect(result[0].title).toBe('Revisar maquetas')
    expect(result[0].executorType).toBe('human')
  })

  it('resuelve taskId=null cuando el Step no tiene Task padre', () => {
    const nodes = [STEP_NODE_HUMAN]
    const result = parseStepNodes(nodes, [])
    expect(result[0].taskId).toBeNull()
  })

  it('NO resuelve taskId cuando el edge es Step→Step (no Task→Step)', () => {
    const nodes = [TASK_NODE_A, STEP_NODE_HUMAN, STEP_NODE_AI]
    const edges = [EDGE_TASK_A_TO_STEP_1, EDGE_STEP_TO_STEP]
    const result = parseStepNodes(nodes, edges)
    const step2 = result.find((s) => s.id === 'step-002')
    // step-002 no tiene edge Task→Step, solo Step→Step
    expect(step2?.taskId).toBeNull()
  })

  it('extrae aiAgent correctamente en Step tipo ai', () => {
    const nodes = [TASK_NODE_B, STEP_NODE_AI]
    const edges = [EDGE_TASK_B_TO_STEP_2]
    const result = parseStepNodes(nodes, edges)
    expect(result[0].aiAgent).toBe('@dev')
    expect(result[0].executorType).toBe('ai')
  })

  it('extrae verificationCriteria en Step tipo mixed', () => {
    const nodes = [STEP_NODE_MIXED]
    const result = parseStepNodes(nodes, [])
    expect(result[0].verificationCriteria).toBe('Tests pasan y linter sin errores')
    expect(result[0].aiAgent).toBe('@qa')
    expect(result[0].executorType).toBe('mixed')
  })

  it('aiAgent es null en Step tipo human', () => {
    const nodes = [STEP_NODE_HUMAN]
    const result = parseStepNodes(nodes, [])
    expect(result[0].aiAgent).toBeNull()
  })
})

// ─── Tests: executorTypeToColor ───────────────────────────────────────────────

describe('executorTypeToColor', () => {
  it('retorna azul para human', () => {
    expect(executorTypeToColor('human')).toBe('#3b82f6')
  })

  it('retorna púrpura para ai', () => {
    expect(executorTypeToColor('ai')).toBe('#8b5cf6')
  })

  it('retorna degradado para mixed', () => {
    const color = executorTypeToColor('mixed')
    expect(color).toContain('gradient')
    expect(color).toContain('#3b82f6')
    expect(color).toContain('#8b5cf6')
  })

  it('fallback a human color para tipo desconocido', () => {
    expect(executorTypeToColor('unknown')).toBe('#3b82f6')
  })
})

// ─── Tests: nodesToCanvasData ────────────────────────────────────────────────

describe('nodesToCanvasData', () => {
  const tasks: TaskSyncData[] = [
    { id: 'task-001', title: 'Diseño', status: 'pending', order: 0 },
    { id: 'task-002', title: 'Implementación', status: 'in_progress', order: 1 },
  ]

  const steps: StepSyncData[] = [
    {
      id: 'step-001',
      taskId: 'task-001',
      title: 'Revisar maquetas',
      executorType: 'human',
      aiAgent: null,
      verificationCriteria: null,
      description: null,
      status: 'pending',
      order: 0,
    },
    {
      id: 'step-002',
      taskId: 'task-002',
      title: 'Generar código',
      executorType: 'ai',
      aiAgent: '@dev',
      verificationCriteria: 'Tests pasan',
      description: null,
      status: 'pending',
      order: 1,
    },
  ]

  it('genera el número correcto de nodos totales', () => {
    const { nodes } = nodesToCanvasData(tasks, steps)
    expect(nodes).toHaveLength(4) // 2 tasks + 2 steps
  })

  it('genera edges desde taskId de los steps', () => {
    const { edges } = nodesToCanvasData(tasks, steps)
    expect(edges).toHaveLength(2)
    expect(edges[0].source).toBe('task-001')
    expect(edges[0].target).toBe('step-001')
    expect(edges[1].source).toBe('task-002')
    expect(edges[1].target).toBe('step-002')
  })

  it('no genera edge para step sin taskId', () => {
    const stepsOrphan: StepSyncData[] = [{ ...steps[0], taskId: null, id: 'step-orphan' }]
    const { edges } = nodesToCanvasData(tasks, stepsOrphan)
    expect(edges).toHaveLength(0)
  })

  it('nodos Task tienen type="task"', () => {
    const { nodes } = nodesToCanvasData(tasks, [])
    const taskNodes = nodes.filter((n) => n.type === 'task')
    expect(taskNodes).toHaveLength(2)
  })

  it('nodos Step tienen type="step"', () => {
    const { nodes } = nodesToCanvasData([], steps)
    const stepNodes = nodes.filter((n) => n.type === 'step')
    expect(stepNodes).toHaveLength(2)
  })

  it('datos del nodo Task se preservan correctamente', () => {
    const { nodes } = nodesToCanvasData(tasks, [])
    const taskNode = nodes.find((n) => n.id === 'task-001')
    expect(taskNode?.data).toMatchObject({ label: 'Diseño', status: 'pending' })
  })

  it('datos del nodo Step incluyen executorType y aiAgent', () => {
    const { nodes } = nodesToCanvasData([], steps)
    const stepNode = nodes.find((n) => n.id === 'step-002')
    expect(stepNode?.data).toMatchObject({
      label: 'Generar código',
      executorType: 'ai',
      aiAgent: '@dev',
    })
  })

  it('canvas vacío retorna nodos y edges vacíos', () => {
    const { nodes, edges } = nodesToCanvasData([], [])
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })
})
