import { describe, it, expect } from 'vitest'
import { calculateOKRImpact, buildScoreMap } from '@/features/maslow/okr-impact'
import { MASLOW_WEIGHTS, MASLOW_TOTAL_WEIGHT } from '@/lib/utils/maslow-weights'
import type { Area } from '@/lib/db/schema/areas'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeArea(
  id: string,
  maslowLevel: number,
  currentScore: number,
  name = `Area ${maslowLevel}`
): Area {
  return {
    id,
    userId: 'user-1',
    maslowLevel,
    group: maslowLevel <= 4 ? 'd_needs' : 'b_needs',
    name,
    defaultName: name,
    weightMultiplier: String(MASLOW_WEIGHTS[maslowLevel as keyof typeof MASLOW_WEIGHTS]),
    currentScore,
    lastActivityAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/** Construye un array con todas las 8 áreas, cada una con el score dado (default 50). */
function makeAllAreas(overrides: Record<number, number> = {}): Area[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((level) =>
    makeArea(`area-${level}`, level, overrides[level] ?? 50)
  )
}

// ─── Tests: calculateOKRImpact ────────────────────────────────────────────────

describe('calculateOKRImpact', () => {
  describe('AC4 — areaId null o área no encontrada → impacto = 0', () => {
    it('returns deltaPoints=0 when areaId is null', () => {
      const areas = makeAllAreas()
      const result = calculateOKRImpact({ areaId: null }, areas)
      expect(result.deltaPoints).toBe(0)
      expect(result.areaWeight).toBe(0)
    })

    it('returns deltaPoints=0 when areaId does not match any area', () => {
      const areas = makeAllAreas()
      const result = calculateOKRImpact({ areaId: 'non-existent-id' }, areas)
      expect(result.deltaPoints).toBe(0)
    })
  })

  describe('AC3 — score ya en 100% → impacto = 0', () => {
    it('returns deltaPoints=0 when area score is already at targetScore (100)', () => {
      const areas = makeAllAreas({ 1: 100 })
      const result = calculateOKRImpact({ areaId: 'area-1' }, areas)
      expect(result.deltaPoints).toBe(0)
      expect(result.currentAreaScore).toBe(100)
      expect(result.targetAreaScore).toBe(100)
    })

    it('returns deltaPoints=0 when area score equals custom targetScore', () => {
      const areas = makeAllAreas({ 3: 80 })
      const result = calculateOKRImpact({ areaId: 'area-3', targetScore: 80 }, areas)
      expect(result.deltaPoints).toBe(0)
    })

    it('returns deltaPoints=0 when area score exceeds targetScore', () => {
      const areas = makeAllAreas({ 5: 90 })
      const result = calculateOKRImpact({ areaId: 'area-5', targetScore: 80 }, areas)
      expect(result.deltaPoints).toBe(0)
    })
  })

  describe('AC5 — delta correcto: globalSimulado − globalActual', () => {
    it('computes delta correctly for a simple scenario', () => {
      // Área nivel 1 (peso 2.0) con score 50, objetivo 100
      // globalActual: todas en 50
      // globalSimulado: nivel 1 en 100, resto en 50
      const areas = makeAllAreas({ 1: 50 })

      const result = calculateOKRImpact({ areaId: 'area-1', targetScore: 100 }, areas)

      // Cálculo manual:
      // weightedSumActual = 50*2 + 50*2 + 50*1.5 + 50*1.5 + 50*1.2 + 50*1.2 + 50*1 + 50*1
      // = 100+100+75+75+60+60+50+50 = 570
      // globalActual = 570 / 11.4 = 50

      // weightedSumSimulado = 100*2 + 50*2 + 50*1.5*3 + ... (resto igual)
      // diferencia = (100-50)*2.0 = 100 extra en suma ponderada
      // deltaGlobal = 100 / 11.4 ≈ 8.77

      const expectedDelta = ((100 - 50) * MASLOW_WEIGHTS[1]) / MASLOW_TOTAL_WEIGHT
      expect(result.deltaPoints).toBeCloseTo(expectedDelta, 5)
    })

    it('uses targetScore=100 by default', () => {
      const areas = makeAllAreas({ 2: 60 })
      const withDefault = calculateOKRImpact({ areaId: 'area-2' }, areas)
      const withExplicit = calculateOKRImpact({ areaId: 'area-2', targetScore: 100 }, areas)
      expect(withDefault.deltaPoints).toBeCloseTo(withExplicit.deltaPoints, 10)
      expect(withDefault.targetAreaScore).toBe(100)
    })
  })

  describe('AC1 — retorna OKRImpactResult correctamente tipado', () => {
    it('returns all required fields with correct types', () => {
      const areas = makeAllAreas({ 3: 40 })
      const result = calculateOKRImpact({ areaId: 'area-3', targetScore: 90 }, areas)

      expect(typeof result.deltaPoints).toBe('number')
      expect(typeof result.currentAreaScore).toBe('number')
      expect(typeof result.targetAreaScore).toBe('number')
      expect(typeof result.areaWeight).toBe('number')

      expect(result.currentAreaScore).toBe(40)
      expect(result.targetAreaScore).toBe(90)
      expect(result.areaWeight).toBe(MASLOW_WEIGHTS[3])
    })
  })

  describe('AC2 — área nivel 1 (peso 2.0×) > área nivel 7 (peso 1.0×) con mismo delta', () => {
    it('area level 1 has greater impact potential than area level 7 given equal score delta', () => {
      // Mismo score de partida (50) y mismo targetScore (100) para ambas áreas
      // El delta global de nivel 1 debe ser mayor que el de nivel 7

      const areasForLevel1 = makeAllAreas({ 1: 50 })
      const areasForLevel7 = makeAllAreas({ 7: 50 })

      const impactLevel1 = calculateOKRImpact(
        { areaId: 'area-1', targetScore: 100 },
        areasForLevel1
      )
      const impactLevel7 = calculateOKRImpact(
        { areaId: 'area-7', targetScore: 100 },
        areasForLevel7
      )

      expect(impactLevel1.deltaPoints).toBeGreaterThan(impactLevel7.deltaPoints)

      // Verificar la proporción exacta: debe ser 2.0/1.0 = 2×
      expect(impactLevel1.deltaPoints / impactLevel7.deltaPoints).toBeCloseTo(
        MASLOW_WEIGHTS[1] / MASLOW_WEIGHTS[7],
        5
      )
    })

    it('area level 2 (peso 2.0) has more impact than area level 6 (peso 1.2)', () => {
      const areasL2 = makeAllAreas({ 2: 30 })
      const areasL6 = makeAllAreas({ 6: 30 })

      const impactL2 = calculateOKRImpact({ areaId: 'area-2', targetScore: 80 }, areasL2)
      const impactL6 = calculateOKRImpact({ areaId: 'area-6', targetScore: 80 }, areasL6)

      expect(impactL2.deltaPoints).toBeGreaterThan(impactL6.deltaPoints)
    })
  })

  describe('Edge cases', () => {
    it('handles areas array with only one area', () => {
      const areas = [makeArea('solo', 4, 40)]
      const result = calculateOKRImpact({ areaId: 'solo', targetScore: 100 }, areas)
      // Solo el nivel 4 tiene score. Resto en 0.
      // globalActual = (40*1.5) / 11.4
      // globalSimulado = (100*1.5) / 11.4
      // delta = (60*1.5) / 11.4
      const expected = (60 * MASLOW_WEIGHTS[4]) / MASLOW_TOTAL_WEIGHT
      expect(result.deltaPoints).toBeCloseTo(expected, 5)
    })

    it('accepts pre-computed scoreMap to avoid redundant computation', () => {
      const areas = makeAllAreas({ 5: 50 })
      const scoreMap = buildScoreMap(areas)

      const withMap = calculateOKRImpact({ areaId: 'area-5' }, areas, scoreMap)
      const withoutMap = calculateOKRImpact({ areaId: 'area-5' }, areas)

      expect(withMap.deltaPoints).toBeCloseTo(withoutMap.deltaPoints, 10)
    })
  })
})

// ─── Tests: buildScoreMap ─────────────────────────────────────────────────────

describe('buildScoreMap', () => {
  it('maps maslowLevel to currentScore for all 8 levels', () => {
    const areas = makeAllAreas({ 1: 80, 4: 60, 7: 30 })
    const map = buildScoreMap(areas)

    expect(map[1]).toBe(80)
    expect(map[4]).toBe(60)
    expect(map[7]).toBe(30)
  })

  it('defaults missing levels to 0', () => {
    const areas = [makeArea('a1', 1, 70)]
    const map = buildScoreMap(areas)

    expect(map[1]).toBe(70)
    expect(map[2]).toBe(0)
    expect(map[8]).toBe(0)
  })

  it('all 8 Maslow levels are present in the map', () => {
    const areas = makeAllAreas()
    const map = buildScoreMap(areas)
    for (let level = 1; level <= 8; level++) {
      expect(level in map).toBe(true)
    }
  })
})
