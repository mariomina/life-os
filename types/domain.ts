// types/domain.ts
// Skeleton de tipos de dominio — desarrollo completo en epics posteriores
// Source: docs/architecture/data-models.md

// ── Maslow ──────────────────────────────────────────────────────────────────
export type MaslowLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

// ── Areas ────────────────────────────────────────────────────────────────────
export interface Area {
  id: string
  userId: string
  name: string
  maslowLevel: MaslowLevel
  icon?: string
  color?: string
  createdAt: Date
  updatedAt: Date
}

// ── OKRs ─────────────────────────────────────────────────────────────────────
export interface OKR {
  id: string
  userId: string
  areaId: string
  title: string
  description?: string
  quarter: string // e.g. "2026-Q1"
  createdAt: Date
  updatedAt: Date
}

// ── Projects ─────────────────────────────────────────────────────────────────
export interface Project {
  id: string
  userId: string
  areaId?: string
  okrId?: string
  name: string
  status: 'active' | 'paused' | 'completed' | 'archived'
  createdAt: Date
  updatedAt: Date
}

// ── Steps / Activities (unified entity) ──────────────────────────────────────
export type ExecutorType = 'human' | 'ai' | 'mixed'

export interface StepActivity {
  id: string
  userId: string
  projectId?: string
  name: string
  executorType: ExecutorType
  planned: boolean
  durationMinutes?: number
  createdAt: Date
  updatedAt: Date
}

// ── Inbox ─────────────────────────────────────────────────────────────────────
export interface InboxItem {
  id: string
  userId: string
  rawText: string
  status: 'unprocessed' | 'processing' | 'processed' | 'discarded'
  createdAt: Date
  updatedAt: Date
}

// ── ActionResult pattern ──────────────────────────────────────────────────────
// Source: docs/architecture/error-handling.md
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
