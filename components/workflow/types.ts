// components/workflow/types.ts
// Tipos compartidos para el Visual Workflow Builder.

export interface TaskNodeData {
  label: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  onLabelChange?: (label: string) => void
}

export interface StepNodeData {
  label: string
  executorType: 'human' | 'ai' | 'mixed'
  aiAgent?: string | null
  verificationCriteria?: string | null
  description?: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'
  /** Estado de cola AIOS (solo para executorType='ai') */
  queueStatus?: 'queued' | 'running' | 'completed' | 'failed' | null
  /** Fecha calendarizada ISO string (solo para executorType='human'|'mixed') */
  scheduledAt?: string | null
}

/** Colores para executor_type */
export const EXECUTOR_COLORS = {
  human: '#3b82f6',
  ai: '#8b5cf6',
  mixed: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
} as const

export type ExecutorType = 'human' | 'ai' | 'mixed'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'
