import type { MaslowLevel } from '@/lib/utils/maslow-weights'

/** Scores 0-100 for each of the 8 Maslow areas */
export type MaslowScores = Record<MaslowLevel, number>

/** Provider-agnostic interface for AI-based psychometric analysis */
export interface ILLMProvider {
  analyzeText(text: string): Promise<MaslowScores>
}
