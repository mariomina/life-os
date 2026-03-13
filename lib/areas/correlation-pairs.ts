// lib/areas/correlation-pairs.ts
// Pares de correlación predefinidos entre sub-áreas de distintos niveles Maslow.
// Story 11.9 — Motor de Correlaciones.
//
// Basado en evidencia de la pirámide de Maslow: D-Needs → B-Needs (efecto cascada)
// y B-Needs amplificando D-Needs.
// [Source: docs/briefs/areas-redesign-brief.md#fase5]

export interface CorrelationPair {
  source: string // slug de sub-área fuente
  target: string // slug de sub-área target
  label: string // descripción legible
}

export const SUBAREA_CORRELATION_PAIRS: CorrelationPair[] = [
  // D-Needs → B-Needs (efecto cascada documentado)
  { source: 'sueno', target: 'atencion', label: 'Sueño → Concentración' },
  { source: 'sueno', target: 'pensamiento_critico', label: 'Sueño → Pensamiento' },
  { source: 'sueno', target: 'salud_emocional', label: 'Sueño → Regulación emocional' },
  {
    source: 'seguridad_financiera',
    target: 'pareja',
    label: 'Finanzas → Relación de pareja',
  },
  {
    source: 'seguridad_financiera',
    target: 'autoeficacia',
    label: 'Finanzas → Autoeficacia',
  },
  { source: 'ejercicio', target: 'atencion', label: 'Ejercicio → Concentración' },
  { source: 'ejercicio', target: 'salud_emocional', label: 'Ejercicio → Estado emocional' },
  // B-Needs amplificando D-Needs
  { source: 'proposito', target: 'logro_profesional', label: 'Propósito → Logro' },
  { source: 'gratitud', target: 'sueno', label: 'Gratitud → Sueño' },
  { source: 'espiritualidad', target: 'salud_emocional', label: 'Espiritualidad → Regulación' },
]
