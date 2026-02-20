// lib/utils/maslow-weights.ts
// FUENTE DE VERDAD de multiplicadores Maslow — NO duplicar en componentes
// Source: docs/architecture/coding-standards.md#12.3 + docs/architecture/data-models.md#4.2

export const MASLOW_WEIGHTS = {
  1: 2.0, // Fisiológica — D-Needs críticos
  2: 2.0, // Seguridad — D-Needs críticos
  3: 1.5, // Conexión Social — D-Needs sociales
  4: 1.5, // Estima — D-Needs sociales
  5: 1.2, // Cognitiva — B-Needs tempranos
  6: 1.2, // Estética — B-Needs tempranos
  7: 1.0, // Autorrealización — B-Needs avanzados
  8: 1.0, // Autotrascendencia — B-Needs avanzados
} as const

export const MASLOW_TOTAL_WEIGHT = 11.4 // Suma: 2+2+1.5+1.5+1.2+1.2+1+1

export type MaslowLevel = keyof typeof MASLOW_WEIGHTS
export type MaslowGroup = 'd_needs' | 'b_needs'

export const MASLOW_GROUPS: Record<MaslowLevel, MaslowGroup> = {
  1: 'd_needs',
  2: 'd_needs',
  3: 'd_needs',
  4: 'd_needs',
  5: 'b_needs',
  6: 'b_needs',
  7: 'b_needs',
  8: 'b_needs',
}
