// features/maslow/questionnaire.ts
// Preguntas del cuestionario de diagnóstico inicial — hardcoded MVP
// Basadas en las dimensiones de cada área Maslow (docs/prd/technical-assumptions.md)

import type { MaslowLevel } from '@/lib/utils/maslow-weights'

export interface AreaQuestions {
  level: MaslowLevel
  group: 'd_needs' | 'b_needs'
  name: string
  defaultName: string
  weightMultiplier: string
  icon: string
  questions: [string, string, string, string, string] // exactly 5
}

export const QUESTIONNAIRE: AreaQuestions[] = [
  {
    level: 1,
    group: 'd_needs',
    name: 'Fisiológica',
    defaultName: 'Fisiológica',
    weightMultiplier: '2.0',
    icon: '🏃',
    questions: [
      '¿Duermes 7-8 horas regularmente y te despiertas descansado?',
      '¿Tu alimentación es nutritiva y equilibrada la mayoría de los días?',
      '¿Realizas actividad física al menos 3 veces por semana?',
      '¿Te mantienes bien hidratado durante el día?',
      '¿Tienes tiempo de descanso y recuperación entre actividades?',
    ],
  },
  {
    level: 2,
    group: 'd_needs',
    name: 'Seguridad',
    defaultName: 'Seguridad',
    weightMultiplier: '2.0',
    icon: '🛡️',
    questions: [
      '¿Tu situación financiera te permite cubrir tus necesidades sin estrés constante?',
      '¿Tienes empleo o fuente de ingresos estable?',
      '¿Tu entorno físico (hogar, barrio) te resulta seguro y ordenado?',
      '¿Tienes acceso a atención médica cuando la necesitas?',
      '¿Sientes que tu vida tiene estructura y rutinas predecibles?',
    ],
  },
  {
    level: 3,
    group: 'd_needs',
    name: 'Conexión Social',
    defaultName: 'Conexión Social',
    weightMultiplier: '1.5',
    icon: '🤝',
    questions: [
      '¿Tienes relaciones cercanas con personas en quienes confías?',
      '¿Sientes que perteneces a alguna comunidad o grupo significativo?',
      '¿Mantienes contacto regular y satisfactorio con familia o amigos cercanos?',
      '¿Tienes espacios de intimidad emocional con otras personas?',
      '¿Te sientes conectado y comprendido en tus relaciones importantes?',
    ],
  },
  {
    level: 4,
    group: 'd_needs',
    name: 'Estima',
    defaultName: 'Estima',
    weightMultiplier: '1.5',
    icon: '⭐',
    questions: [
      '¿Sientes que tus logros y contribuciones son reconocidos por otros?',
      '¿Confías en tu capacidad para afrontar nuevos retos?',
      '¿Tienes autonomía para tomar decisiones importantes en tu vida?',
      '¿Te sientes competente y efectivo en tu trabajo o actividades principales?',
      '¿Tu autoestima se mantiene estable ante críticas o fracasos?',
    ],
  },
  {
    level: 5,
    group: 'b_needs',
    name: 'Cognitiva',
    defaultName: 'Cognitiva',
    weightMultiplier: '1.2',
    icon: '🧠',
    questions: [
      '¿Dedicas tiempo regularmente a aprender algo nuevo?',
      '¿Ejercitas tu pensamiento crítico y analítico en tu vida diaria?',
      '¿Sientes curiosidad intelectual activa por el mundo que te rodea?',
      '¿Resuelves problemas complejos con frecuencia en tu trabajo o vida personal?',
      '¿Lees, estudias o te formas de manera habitual?',
    ],
  },
  {
    level: 6,
    group: 'b_needs',
    name: 'Estética',
    defaultName: 'Estética',
    weightMultiplier: '1.2',
    icon: '🎨',
    questions: [
      '¿Tu entorno cotidiano (hogar, espacio de trabajo) es ordenado y agradable para ti?',
      '¿Tienes contacto regular con arte, naturaleza o experiencias que te inspiran belleza?',
      '¿Expresas creatividad en alguna forma (arte, diseño, escritura, música u otra)?',
      '¿Prestas atención a la estética y el orden en tu vida?',
      '¿Encuentras momentos de apreciación de lo bello en tu día a día?',
    ],
  },
  {
    level: 7,
    group: 'b_needs',
    name: 'Autorrealización',
    defaultName: 'Autorrealización',
    weightMultiplier: '1.0',
    icon: '🚀',
    questions: [
      '¿Sientes que estás desarrollando tu máximo potencial en áreas que te importan?',
      '¿Tu vida tiene un propósito claro que te motiva?',
      '¿Persigues metas que se alinean profundamente con tus valores?',
      '¿Tienes espacios para el crecimiento personal deliberado?',
      '¿Sientes que evolucionas como persona de manera continua?',
    ],
  },
  {
    level: 8,
    group: 'b_needs',
    name: 'Autotrascendencia',
    defaultName: 'Autotrascendencia',
    weightMultiplier: '1.0',
    icon: '✨',
    questions: [
      '¿Contribuyes activamente a causas o personas más allá de tu propio beneficio?',
      '¿Sientes que tu trabajo o acciones tienen un impacto positivo en otros?',
      '¿Piensas en el legado o huella que dejarás en el mundo?',
      '¿Tienes conexión con algo más grande que tú mismo (comunidad, fe, humanidad)?',
      '¿Encuentras sentido en el servicio o la contribución a los demás?',
    ],
  },
]

/**
 * Calculates an area score (0-100) from 5 Likert responses (1-5 each).
 * Formula: (sum - 5) / 20 * 100
 * Min: 5 responses of 1 → (5-5)/20 × 100 = 0
 * Max: 5 responses of 5 → (25-5)/20 × 100 = 100
 */
export function calculateAreaScoreFromResponses(responses: number[]): number {
  const sum = responses.reduce((acc, r) => acc + r, 0)
  return ((sum - 5) / 20) * 100
}
