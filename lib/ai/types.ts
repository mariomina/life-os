import type { MaslowLevel } from '@/lib/utils/maslow-weights'

/** Scores 0-100 for each of the 8 Maslow areas */
export type MaslowScores = Record<MaslowLevel, number>

// ─── Inbox Classification (Story 6.2) ─────────────────────────────────────────

/** Result of AI classification for an inbox item */
export interface ClassifyInboxResult {
  /** Semantic type of the captured text */
  classification: 'task' | 'event' | 'project' | 'habit' | 'idea' | 'reference'
  /** UUID of the most relevant area for this item */
  suggestedAreaId: string
  /** UUID of the most relevant active OKR, or undefined if none match */
  suggestedOkrId?: string
  /** Suggested execution slot as ISO 8601 string */
  suggestedSlot: string
  /** Concise title (max 60 chars) derived from rawText */
  suggestedTitle: string
  /** Estimated duration in minutes */
  estimatedDurationMinutes: number
}

/** Context provided to the AI for inbox classification */
export interface ClassifyInboxContext {
  areas: Array<{ id: string; name: string; maslowLevel: number }>
  activeOKRs: Array<{ id: string; title: string; type: string; areaId: string | null }>
  freeSlots: Array<{ start: string; end: string; durationMinutes: number }>
}

// ─── Provider Interface ────────────────────────────────────────────────────────

/** Provider-agnostic interface for all AI operations */
export interface ILLMProvider {
  /** Analyze free-text for Maslow area scores (psychometric analysis) */
  analyzeText(text: string): Promise<MaslowScores>
  /** Classify an inbox item and suggest area, OKR and calendar slot (Story 6.2) */
  classifyInboxItem(rawText: string, context: ClassifyInboxContext): Promise<ClassifyInboxResult>
}
