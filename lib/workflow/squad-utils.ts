// lib/workflow/squad-utils.ts
// Helpers para squads de agentes AIOS asignables a workflows.
// Función pura — sin dependencias de DB ni browser.

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SquadType = 'dev' | 'research' | 'coach' | 'none'

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Etiquetas UI para cada squad */
export const SQUAD_LABELS: Record<SquadType, string> = {
  dev: 'Dev Squad',
  research: 'Research Squad',
  coach: 'Personal Coach',
  none: 'Sin Squad',
}

/** Agentes de cada squad en orden (primer agente = agente principal) */
const SQUAD_AGENTS: Record<SquadType, string[]> = {
  dev: ['@architect', '@dev', '@qa', '@devops'],
  research: ['@analyst', '@pm'],
  coach: ['@analyst'],
  none: [],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retorna la lista de agentes del squad.
 * dev      → ['@architect', '@dev', '@qa', '@devops']
 * research → ['@analyst', '@pm']
 * coach    → ['@analyst']
 * none     → []
 */
export function squadTypeToAgents(squadType: SquadType): string[] {
  return [...(SQUAD_AGENTS[squadType] ?? [])]
}

/**
 * Retorna el agente principal del squad (primer elemento).
 * Se usa para asignar automáticamente a steps con executorType='ai'.
 * none → null
 */
export function squadTypeToPrimaryAgent(squadType: SquadType): string | null {
  const agents = squadTypeToAgents(squadType)
  return agents[0] ?? null
}
