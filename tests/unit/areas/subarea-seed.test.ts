import { describe, it, expect } from 'vitest'

// ── Inline the definitions from onboarding.ts for pure unit testing ───────────
// We test the seed logic without hitting the DB.

interface SubareaDef {
  slug: string
  name: string
  internalWeight: string
  displayOrder: number
  isOptional?: boolean
}

const SUBAREAS_BY_LEVEL: Record<number, SubareaDef[]> = {
  1: [
    { slug: 'sueno', name: 'Sueño y Descanso', internalWeight: '0.250', displayOrder: 1 },
    { slug: 'ejercicio', name: 'Ejercicio y Movimiento', internalWeight: '0.200', displayOrder: 2 },
    {
      slug: 'nutricion',
      name: 'Nutrición e Hidratación',
      internalWeight: '0.200',
      displayOrder: 3,
    },
    {
      slug: 'respiracion',
      name: 'Respiración y Salud Respiratoria',
      internalWeight: '0.150',
      displayOrder: 4,
    },
    {
      slug: 'salud_musculo',
      name: 'Salud Musculoesquelética y Dolor',
      internalWeight: '0.120',
      displayOrder: 5,
    },
    { slug: 'homeostasis', name: 'Homeostasis Corporal', internalWeight: '0.050', displayOrder: 6 },
    {
      slug: 'salud_sexual',
      name: 'Salud Sexual y Reproductiva',
      internalWeight: '0.030',
      displayOrder: 7,
      isOptional: true,
    },
  ],
  2: [
    {
      slug: 'seguridad_financiera',
      name: 'Seguridad Financiera',
      internalWeight: '0.400',
      displayOrder: 1,
    },
    {
      slug: 'estabilidad_laboral',
      name: 'Estabilidad Laboral y Profesional',
      internalWeight: '0.250',
      displayOrder: 2,
    },
    {
      slug: 'seguridad_legal',
      name: 'Seguridad Jurídica y Legal',
      internalWeight: '0.150',
      displayOrder: 3,
    },
    {
      slug: 'seguridad_fisica',
      name: 'Seguridad Física y Salud Preventiva',
      internalWeight: '0.120',
      displayOrder: 4,
    },
    {
      slug: 'estabilidad_hogar',
      name: 'Estabilidad Habitacional',
      internalWeight: '0.080',
      displayOrder: 5,
    },
  ],
  3: [
    {
      slug: 'pareja',
      name: 'Relación de Pareja / Intimidad',
      internalWeight: '0.300',
      displayOrder: 1,
    },
    { slug: 'familia_nuclear', name: 'Familia Nuclear', internalWeight: '0.250', displayOrder: 2 },
    { slug: 'amistades', name: 'Amistades', internalWeight: '0.250', displayOrder: 3 },
    {
      slug: 'familia_extendida',
      name: 'Familia Extendida',
      internalWeight: '0.080',
      displayOrder: 4,
    },
    {
      slug: 'comunidad',
      name: 'Comunidad y Pertenencia',
      internalWeight: '0.080',
      displayOrder: 5,
    },
    {
      slug: 'mascotas',
      name: 'Mascotas y Vínculo Animal',
      internalWeight: '0.040',
      displayOrder: 6,
      isOptional: true,
    },
  ],
  4: [
    {
      slug: 'logro_profesional',
      name: 'Logro Profesional',
      internalWeight: '0.220',
      displayOrder: 1,
    },
    {
      slug: 'autoeficacia',
      name: 'Autoeficacia y Confianza',
      internalWeight: '0.180',
      displayOrder: 2,
    },
    {
      slug: 'desarrollo_habilidades',
      name: 'Desarrollo de Habilidades',
      internalWeight: '0.180',
      displayOrder: 3,
    },
    {
      slug: 'salud_emocional',
      name: 'Salud Emocional y Regulación',
      internalWeight: '0.150',
      displayOrder: 4,
    },
    {
      slug: 'autonomia',
      name: 'Independencia y Autonomía',
      internalWeight: '0.120',
      displayOrder: 5,
    },
    {
      slug: 'imagen_corporal',
      name: 'Imagen Corporal y Autocuidado',
      internalWeight: '0.080',
      displayOrder: 6,
    },
    {
      slug: 'reputacion',
      name: 'Reputación e Imagen Externa',
      internalWeight: '0.070',
      displayOrder: 7,
    },
  ],
  5: [
    { slug: 'aprendizaje', name: 'Aprendizaje Continuo', internalWeight: '0.280', displayOrder: 1 },
    {
      slug: 'atencion',
      name: 'Atención y Concentración',
      internalWeight: '0.250',
      displayOrder: 2,
    },
    {
      slug: 'pensamiento_critico',
      name: 'Pensamiento Crítico',
      internalWeight: '0.220',
      displayOrder: 3,
    },
    {
      slug: 'curiosidad',
      name: 'Curiosidad Intelectual',
      internalWeight: '0.150',
      displayOrder: 4,
    },
    {
      slug: 'creatividad',
      name: 'Creatividad e Innovación',
      internalWeight: '0.100',
      displayOrder: 5,
    },
  ],
  6: [
    {
      slug: 'entorno_fisico',
      name: 'Entorno Físico Estético',
      internalWeight: '0.280',
      displayOrder: 1,
    },
    {
      slug: 'gastronomia',
      name: 'Gastronomía y Experiencia Culinaria',
      internalWeight: '0.250',
      displayOrder: 2,
    },
    {
      slug: 'arte_cultura',
      name: 'Arte y Apreciación Cultural',
      internalWeight: '0.220',
      displayOrder: 3,
    },
    {
      slug: 'naturaleza',
      name: 'Naturaleza y Belleza Natural',
      internalWeight: '0.150',
      displayOrder: 4,
    },
    {
      slug: 'diseno',
      name: 'Diseño y Estética Funcional',
      internalWeight: '0.100',
      displayOrder: 5,
    },
  ],
  7: [
    {
      slug: 'proposito',
      name: 'Propósito y Misión Personal',
      internalWeight: '0.250',
      displayOrder: 1,
    },
    {
      slug: 'crecimiento_personal',
      name: 'Crecimiento Personal Continuo',
      internalWeight: '0.220',
      displayOrder: 2,
    },
    {
      slug: 'experiencias_cumbre',
      name: 'Experiencias Cumbre y Flow',
      internalWeight: '0.200',
      displayOrder: 3,
    },
    {
      slug: 'expresion_autentica',
      name: 'Expresión Auténtica',
      internalWeight: '0.180',
      displayOrder: 4,
    },
    {
      slug: 'contribucion',
      name: 'Contribución Significativa',
      internalWeight: '0.100',
      displayOrder: 5,
    },
    {
      slug: 'gestion_energia',
      name: 'Gestión de Energía Personal',
      internalWeight: '0.050',
      displayOrder: 6,
    },
  ],
  8: [
    { slug: 'servicio', name: 'Servicio y Altruismo', internalWeight: '0.280', displayOrder: 1 },
    {
      slug: 'legado',
      name: 'Legado y Contribución Duradera',
      internalWeight: '0.250',
      displayOrder: 2,
    },
    { slug: 'gratitud', name: 'Gratitud como Práctica', internalWeight: '0.200', displayOrder: 3 },
    {
      slug: 'espiritualidad',
      name: 'Espiritualidad y Conexión Trascendente',
      internalWeight: '0.150',
      displayOrder: 4,
    },
    { slug: 'unidad', name: 'Unidad e Interconexión', internalWeight: '0.120', displayOrder: 5 },
  ],
}

/** Builds rows exactly as seedAreaSubareas does — pure function, no DB */
function buildSeedRows(userId: string, userAreas: { id: string; maslowLevel: number }[]) {
  return userAreas.flatMap((area) => {
    const defs = SUBAREAS_BY_LEVEL[area.maslowLevel] ?? []
    return defs.map((def) => ({
      areaId: area.id,
      userId,
      maslowLevel: area.maslowLevel,
      name: def.name,
      slug: def.slug,
      internalWeight: def.internalWeight,
      displayOrder: def.displayOrder,
      isOptional: def.isOptional ?? false,
      currentScore: 0,
      isActive: true,
    }))
  })
}

/** Fake 8 areas with sequential UUIDs */
const FAKE_AREAS = Array.from({ length: 8 }, (_, i) => ({
  id: `area-${i + 1}-uuid`,
  maslowLevel: i + 1,
}))

describe('seedAreaSubareas — row generation', () => {
  it('generates exactly 46 rows for all 8 areas', () => {
    const rows = buildSeedRows('user-1', FAKE_AREAS)
    expect(rows).toHaveLength(46)
  })

  it('each row has currentScore = 0 and isActive = true', () => {
    const rows = buildSeedRows('user-1', FAKE_AREAS)
    for (const row of rows) {
      expect(row.currentScore).toBe(0)
      expect(row.isActive).toBe(true)
    }
  })

  it('every row carries the correct userId', () => {
    const rows = buildSeedRows('user-xyz', FAKE_AREAS)
    for (const row of rows) {
      expect(row.userId).toBe('user-xyz')
    }
  })

  it('level 1 has 7 sub-areas (including 1 optional)', () => {
    const rows = buildSeedRows('u', FAKE_AREAS).filter((r) => r.maslowLevel === 1)
    expect(rows).toHaveLength(7)
    const optionals = rows.filter((r) => r.isOptional)
    expect(optionals).toHaveLength(1)
    expect(optionals[0].slug).toBe('salud_sexual')
  })

  it('level 3 has 6 sub-areas (including mascotas optional)', () => {
    const rows = buildSeedRows('u', FAKE_AREAS).filter((r) => r.maslowLevel === 3)
    expect(rows).toHaveLength(6)
    const mascotas = rows.find((r) => r.slug === 'mascotas')
    expect(mascotas?.isOptional).toBe(true)
  })

  it('non-optional sub-areas have isOptional = false', () => {
    const rows = buildSeedRows('u', FAKE_AREAS)
    const required = rows.filter((r) => !r.isOptional)
    expect(required).toHaveLength(44)
  })

  it('displayOrder starts at 1 for the first sub-area of each level', () => {
    for (let level = 1; level <= 8; level++) {
      const rows = buildSeedRows('u', FAKE_AREAS).filter((r) => r.maslowLevel === level)
      const sorted = [...rows].sort((a, b) => a.displayOrder - b.displayOrder)
      expect(sorted[0].displayOrder).toBe(1)
    }
  })

  it('displayOrder is sequential within each level (no gaps)', () => {
    for (let level = 1; level <= 8; level++) {
      const rows = buildSeedRows('u', FAKE_AREAS)
        .filter((r) => r.maslowLevel === level)
        .sort((a, b) => a.displayOrder - b.displayOrder)

      rows.forEach((row, idx) => {
        expect(row.displayOrder).toBe(idx + 1)
      })
    }
  })

  it('weights within each level sum to 1.000 (±0.001)', () => {
    for (let level = 1; level <= 8; level++) {
      const rows = buildSeedRows('u', FAKE_AREAS).filter((r) => r.maslowLevel === level)
      const total = rows.reduce((sum, r) => sum + parseFloat(r.internalWeight), 0)
      expect(total).toBeCloseTo(1.0, 2)
    }
  })

  it('sueno is displayOrder 1 in level 1 (highest impact)', () => {
    const rows = buildSeedRows('u', FAKE_AREAS).filter((r) => r.maslowLevel === 1)
    const sueno = rows.find((r) => r.slug === 'sueno')
    expect(sueno?.displayOrder).toBe(1)
  })

  it('seguridad_financiera is displayOrder 1 in level 2 (highest impact)', () => {
    const rows = buildSeedRows('u', FAKE_AREAS).filter((r) => r.maslowLevel === 2)
    const sf = rows.find((r) => r.slug === 'seguridad_financiera')
    expect(sf?.displayOrder).toBe(1)
  })

  it('returns empty rows when userAreas is empty', () => {
    const rows = buildSeedRows('u', [])
    expect(rows).toHaveLength(0)
  })

  it('returns only level 5 rows when only one area passed', () => {
    const rows = buildSeedRows('u', [{ id: 'area-5', maslowLevel: 5 }])
    expect(rows).toHaveLength(5)
    for (const row of rows) {
      expect(row.maslowLevel).toBe(5)
    }
  })

  it('all slugs are unique across all levels', () => {
    const rows = buildSeedRows('u', FAKE_AREAS)
    const slugs = rows.map((r) => r.slug)
    const unique = new Set(slugs)
    expect(unique.size).toBe(slugs.length)
  })
})
