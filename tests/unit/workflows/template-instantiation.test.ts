// tests/unit/workflows/template-instantiation.test.ts
// Tests unitarios para templateConfigToCanvas() — función pura de Story 4.3.
// Verifica la transformación tasks_config → { nodes, edges, taskSyncData, stepSyncData }.

import { describe, it, expect, vi } from 'vitest'

// Mock de applyDagreLayout — retorna los nodos sin modificar posiciones.
// Aísla los tests del entorno browser que requiere @xyflow/react.
vi.mock('@/components/workflow/dagre-layout', () => ({
  applyDagreLayout: (nodes: unknown[]) => nodes,
}))

import { templateConfigToCanvas } from '@/lib/workflow/template-utils'
import type { TemplateTaskConfig } from '@/lib/workflow/template-utils'

// ─── Helpers ────────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(val: string): boolean {
  return UUID_REGEX.test(val)
}

// ─── Fixtures ────────────────────────────────────────────────────────────────────

const ONE_TASK_NO_STEPS: TemplateTaskConfig[] = [{ title: 'Task Sin Steps', order: 0, steps: [] }]

const ONE_TASK_ONE_STEP_HUMAN: TemplateTaskConfig[] = [
  {
    title: 'Task A',
    order: 0,
    steps: [{ title: 'Step Human', executor_type: 'human' }],
  },
]

const ONE_TASK_ONE_STEP_AI: TemplateTaskConfig[] = [
  {
    title: 'Task A',
    order: 0,
    steps: [{ title: 'Step AI', executor_type: 'ai', ai_agent: '@dev' }],
  },
]

const ONE_TASK_ONE_STEP_MIXED: TemplateTaskConfig[] = [
  {
    title: 'Task A',
    order: 0,
    steps: [{ title: 'Step Mixed', executor_type: 'mixed', ai_agent: '@qa' }],
  },
]

const TWO_TASKS_MULTI_STEPS: TemplateTaskConfig[] = [
  {
    title: 'Diseño',
    order: 0,
    steps: [
      { title: 'Wireframes', executor_type: 'human' },
      { title: 'Prototipar', executor_type: 'human' },
    ],
  },
  {
    title: 'Implementación',
    order: 1,
    steps: [
      { title: 'Setup proyecto', executor_type: 'human' },
      { title: 'Generar código', executor_type: 'ai', ai_agent: '@dev' },
      { title: 'Review', executor_type: 'mixed' },
    ],
  },
]

// ─── Tests ────────────────────────────────────────────────────────────────────────

describe('templateConfigToCanvas', () => {
  // ─── Canvas vacío ────────────────────────────────────────────────────────────

  describe('canvas vacío (tasksConfig = [])', () => {
    it('retorna 0 nodos, 0 edges, 0 taskSyncData, 0 stepSyncData', () => {
      const result = templateConfigToCanvas([])
      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
      expect(result.taskSyncData).toHaveLength(0)
      expect(result.stepSyncData).toHaveLength(0)
    })
  })

  // ─── 1 task sin steps ────────────────────────────────────────────────────────

  describe('1 task sin steps', () => {
    it('retorna 1 nodo Task, 0 Steps, 0 edges', () => {
      const result = templateConfigToCanvas(ONE_TASK_NO_STEPS)
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].type).toBe('task')
      expect(result.edges).toHaveLength(0)
    })

    it('taskSyncData tiene 1 elemento con order=0', () => {
      const result = templateConfigToCanvas(ONE_TASK_NO_STEPS)
      expect(result.taskSyncData).toHaveLength(1)
      expect(result.taskSyncData[0].order).toBe(0)
      expect(result.taskSyncData[0].title).toBe('Task Sin Steps')
      expect(result.taskSyncData[0].status).toBe('pending')
    })

    it('stepSyncData está vacío', () => {
      const result = templateConfigToCanvas(ONE_TASK_NO_STEPS)
      expect(result.stepSyncData).toHaveLength(0)
    })
  })

  // ─── 1 task con 1 step human ─────────────────────────────────────────────────

  describe('1 task con 1 step human', () => {
    it('retorna 2 nodos y 1 edge Task→Step', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_HUMAN)
      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(1)
      const taskNode = result.nodes.find((n) => n.type === 'task')
      const stepNode = result.nodes.find((n) => n.type === 'step')
      expect(result.edges[0].source).toBe(taskNode?.id)
      expect(result.edges[0].target).toBe(stepNode?.id)
    })

    it('nodo Step tiene executorType=human', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_HUMAN)
      const stepNode = result.nodes.find((n) => n.type === 'step')
      const data = stepNode?.data as { executorType: string }
      expect(data.executorType).toBe('human')
    })

    it('stepSyncData tiene taskId correcto apuntando a la task padre', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_HUMAN)
      const taskId = result.taskSyncData[0].id
      expect(result.stepSyncData[0].taskId).toBe(taskId)
    })
  })

  // ─── 1 task con 1 step ai ────────────────────────────────────────────────────

  describe('1 task con 1 step ai', () => {
    it('nodo Step tiene executorType=ai', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_AI)
      const stepNode = result.nodes.find((n) => n.type === 'step')
      const data = stepNode?.data as { executorType: string }
      expect(data.executorType).toBe('ai')
    })

    it('aiAgent se preserva desde tasks_config', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_AI)
      const stepNode = result.nodes.find((n) => n.type === 'step')
      const data = stepNode?.data as { aiAgent: string | null }
      expect(data.aiAgent).toBe('@dev')
    })

    it('stepSyncData.aiAgent tiene el valor del config', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_AI)
      expect(result.stepSyncData[0].aiAgent).toBe('@dev')
    })
  })

  // ─── 1 task con 1 step mixed ─────────────────────────────────────────────────

  describe('1 task con 1 step mixed', () => {
    it('nodo Step tiene executorType=mixed', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_MIXED)
      const stepNode = result.nodes.find((n) => n.type === 'step')
      const data = stepNode?.data as { executorType: string }
      expect(data.executorType).toBe('mixed')
    })

    it('aiAgent se preserva para step mixed', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_MIXED)
      expect(result.stepSyncData[0].aiAgent).toBe('@qa')
    })
  })

  // ─── 2 tasks con múltiples steps ─────────────────────────────────────────────

  describe('2 tasks con steps distribuidos', () => {
    it('retorna 7 nodos (2 Tasks + 5 Steps)', () => {
      const result = templateConfigToCanvas(TWO_TASKS_MULTI_STEPS)
      expect(result.nodes).toHaveLength(7)
      const taskNodes = result.nodes.filter((n) => n.type === 'task')
      const stepNodes = result.nodes.filter((n) => n.type === 'step')
      expect(taskNodes).toHaveLength(2)
      expect(stepNodes).toHaveLength(5)
    })

    it('taskSyncData tiene 2 elementos con order correcto', () => {
      const result = templateConfigToCanvas(TWO_TASKS_MULTI_STEPS)
      expect(result.taskSyncData).toHaveLength(2)
      expect(result.taskSyncData[0].order).toBe(0)
      expect(result.taskSyncData[1].order).toBe(1)
    })

    it('stepSyncData tiene 5 elementos en total', () => {
      const result = templateConfigToCanvas(TWO_TASKS_MULTI_STEPS)
      expect(result.stepSyncData).toHaveLength(5)
    })

    it('steps de task 1 tienen el taskId de task 1', () => {
      const result = templateConfigToCanvas(TWO_TASKS_MULTI_STEPS)
      const task1Id = result.taskSyncData[0].id
      const stepsOfTask1 = result.stepSyncData.filter((s) => s.taskId === task1Id)
      expect(stepsOfTask1).toHaveLength(2)
    })

    it('steps de task 2 tienen el taskId de task 2', () => {
      const result = templateConfigToCanvas(TWO_TASKS_MULTI_STEPS)
      const task2Id = result.taskSyncData[1].id
      const stepsOfTask2 = result.stepSyncData.filter((s) => s.taskId === task2Id)
      expect(stepsOfTask2).toHaveLength(3)
    })

    it('edges incluyen Task→Step y Step→Step secuenciales', () => {
      const result = templateConfigToCanvas(TWO_TASKS_MULTI_STEPS)
      // task 1: 1 edge Task→Step1 + 1 edge Step1→Step2 = 2
      // task 2: 1 edge Task→Step3 + 1 edge Step3→Step4 + 1 edge Step4→Step5 = 3
      // total = 5
      expect(result.edges).toHaveLength(5)
    })
  })

  // ─── IDs generados son UUIDs válidos ─────────────────────────────────────────

  describe('IDs generados son UUIDs válidos', () => {
    it('taskSyncData IDs son UUIDs v4', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_HUMAN)
      expect(isValidUUID(result.taskSyncData[0].id)).toBe(true)
    })

    it('stepSyncData IDs son UUIDs v4', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_HUMAN)
      expect(isValidUUID(result.stepSyncData[0].id)).toBe(true)
    })

    it('nodos tienen IDs UUID únicos entre sí', () => {
      const result = templateConfigToCanvas(TWO_TASKS_MULTI_STEPS)
      const ids = result.nodes.map((n) => n.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  // ─── executorType mapeado desde tasks_config ─────────────────────────────────

  describe('executorType mapeado correctamente desde tasks_config', () => {
    it('executor_type=human → nodo data.executorType=human', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_HUMAN)
      const step = result.stepSyncData[0]
      expect(step.executorType).toBe('human')
    })

    it('executor_type=ai → nodo data.executorType=ai', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_AI)
      const step = result.stepSyncData[0]
      expect(step.executorType).toBe('ai')
    })

    it('executor_type=mixed → nodo data.executorType=mixed', () => {
      const result = templateConfigToCanvas(ONE_TASK_ONE_STEP_MIXED)
      const step = result.stepSyncData[0]
      expect(step.executorType).toBe('mixed')
    })
  })

  // ─── Status inicial ───────────────────────────────────────────────────────────

  describe('status inicial de todos los nodos es pending', () => {
    it('taskSyncData status=pending', () => {
      const result = templateConfigToCanvas(TWO_TASKS_MULTI_STEPS)
      expect(result.taskSyncData.every((t) => t.status === 'pending')).toBe(true)
    })

    it('stepSyncData status=pending', () => {
      const result = templateConfigToCanvas(TWO_TASKS_MULTI_STEPS)
      expect(result.stepSyncData.every((s) => s.status === 'pending')).toBe(true)
    })
  })
})
