// tests/unit/workflows/squad-utils.test.ts
// Tests unitarios para squadTypeToAgents() y squadTypeToPrimaryAgent().
// Función pura — sin dependencias de DB ni browser.

import { describe, it, expect } from 'vitest'
import {
  squadTypeToAgents,
  squadTypeToPrimaryAgent,
  SQUAD_LABELS,
  type SquadType,
} from '@/lib/workflow/squad-utils'

// ─── squadTypeToAgents ────────────────────────────────────────────────────────

describe('squadTypeToAgents', () => {
  it('dev → [@architect, @dev, @qa, @devops]', () => {
    expect(squadTypeToAgents('dev')).toEqual(['@architect', '@dev', '@qa', '@devops'])
  })

  it('research → [@analyst, @pm]', () => {
    expect(squadTypeToAgents('research')).toEqual(['@analyst', '@pm'])
  })

  it('coach → [@analyst]', () => {
    expect(squadTypeToAgents('coach')).toEqual(['@analyst'])
  })

  it('none → []', () => {
    expect(squadTypeToAgents('none')).toEqual([])
  })

  it('retorna array (no referencia mutable)', () => {
    const agents = squadTypeToAgents('dev')
    agents.push('@intruder')
    // La siguiente llamada no debe verse afectada
    expect(squadTypeToAgents('dev')).toEqual(['@architect', '@dev', '@qa', '@devops'])
  })
})

// ─── squadTypeToPrimaryAgent ──────────────────────────────────────────────────

describe('squadTypeToPrimaryAgent', () => {
  it('dev → @architect (primer agente)', () => {
    expect(squadTypeToPrimaryAgent('dev')).toBe('@architect')
  })

  it('research → @analyst (primer agente)', () => {
    expect(squadTypeToPrimaryAgent('research')).toBe('@analyst')
  })

  it('coach → @analyst', () => {
    expect(squadTypeToPrimaryAgent('coach')).toBe('@analyst')
  })

  it('none → null', () => {
    expect(squadTypeToPrimaryAgent('none')).toBeNull()
  })
})

// ─── SQUAD_LABELS ─────────────────────────────────────────────────────────────

describe('SQUAD_LABELS', () => {
  it('tiene etiquetas para los 4 squads', () => {
    const squads: SquadType[] = ['dev', 'research', 'coach', 'none']
    for (const sq of squads) {
      expect(SQUAD_LABELS[sq]).toBeTruthy()
    }
  })

  it('dev → "Dev Squad"', () => {
    expect(SQUAD_LABELS['dev']).toBe('Dev Squad')
  })

  it('research → "Research Squad"', () => {
    expect(SQUAD_LABELS['research']).toBe('Research Squad')
  })

  it('coach → "Personal Coach"', () => {
    expect(SQUAD_LABELS['coach']).toBe('Personal Coach')
  })

  it('none → "Sin Squad"', () => {
    expect(SQUAD_LABELS['none']).toBe('Sin Squad')
  })
})
