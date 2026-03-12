// features/maslow/subarea-scoring.ts
// Motor de cálculo puro para scores de sub-áreas — sin side effects, sin DB.
// Story 11.3 — Motor de Cálculo.
// [Source: docs/briefs/areas-redesign-brief.md#4-subareas, #6-reglas]

/** Señales conductuales recolectadas en la ventana de tiempo de la sub-área */
export interface BehavioralSignals {
  subareaSlug: string
  maslowLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  /** Días con hábito completado dentro de la ventana */
  completedHabitDays: number
  /** Total de días en la ventana de cálculo */
  totalDaysInWindow: number
  /** Actividades con status='completed' vinculadas a la sub-área */
  completedActivities: number
  /** Suma de duration_seconds de time_entries completados (endedAt IS NOT NULL) */
  totalTimeSeconds: number
  /** Progreso del KR vinculado al área padre (0-100). -1 si no aplica. */
  completedKRProgress: number
}

/**
 * Días de umbral de inactividad antes de aplicar decay, por nivel Maslow.
 * L1: 3d (fisiológico, alta frecuencia), L2: 7d, L3: 14d, L4-8: 30d
 * [Source: brief#regla4]
 */
export const DECAY_THRESHOLDS: Record<number, number> = {
  1: 3,
  2: 7,
  3: 14,
  4: 30,
  5: 30,
  6: 30,
  7: 30,
  8: 30,
}

/**
 * Pesos de cada componente según nivel Maslow.
 * D-Needs (L1-4): conductual tiene más peso.
 * B-Needs (L5-8): subjetivo tiene más peso.
 * [Source: brief#4-subareas]
 */
const COMPONENT_WEIGHTS: Record<
  number,
  { behavioral: number; subjective: number; progress: number }
> = {
  1: { behavioral: 0.6, subjective: 0.3, progress: 0.1 },
  2: { behavioral: 0.55, subjective: 0.3, progress: 0.15 },
  3: { behavioral: 0.4, subjective: 0.5, progress: 0.1 },
  4: { behavioral: 0.4, subjective: 0.4, progress: 0.2 },
  5: { behavioral: 0.35, subjective: 0.5, progress: 0.15 },
  6: { behavioral: 0.3, subjective: 0.6, progress: 0.1 },
  7: { behavioral: 0.25, subjective: 0.65, progress: 0.1 },
  8: { behavioral: 0.2, subjective: 0.7, progress: 0.1 },
}

/** Fórmula genérica para sub-áreas sin mapeo de señales específico */
function genericBehavioral(completedActivities: number, totalTimeSeconds: number): number {
  return Math.min(
    100,
    Math.round(
      Math.min(1, completedActivities / 3) * 60 + Math.min(1, totalTimeSeconds / 7200) * 40
    )
  )
}

/**
 * Calcula el componente conductual (0-100) de una sub-área.
 * Usa fórmulas específicas por slug cuando las señales disponibles permiten mapearlas;
 * en caso contrario aplica la fórmula genérica.
 *
 * @param signals - Señales conductuales de la ventana de tiempo
 * @returns Score conductual 0-100
 * [Source: brief#4-subareas, brief#5-fuentes]
 */
export function calculateBehavioralScore(signals: BehavioralSignals): number {
  const {
    subareaSlug,
    completedHabitDays,
    totalDaysInWindow,
    completedActivities,
    totalTimeSeconds,
  } = signals
  const days = Math.max(1, totalDaysInWindow)

  switch (subareaSlug) {
    case 'sueno': {
      // horasPromedio/día desde time_entries (horas de sueño rastreadas)
      const horasPromedio = Math.min(8, totalTimeSeconds / 3600 / days)
      // consistencia del hábito de sueño (fracción 0-1)
      const consistencia = completedHabitDays / days
      // brief: (horasPromedio/8)×0.4 + (consistencia)×0.2 — max comportamental 0.6
      const raw = (horasPromedio / 8) * 0.4 + consistencia * 0.2
      return Math.min(100, Math.round((raw / 0.6) * 100))
    }

    case 'gratitud': {
      // Práctica de gratitud: días completados en la semana
      const weekDays = Math.min(7, days)
      const diasPractica = Math.min(weekDays, completedHabitDays)
      // brief: (diasPractica/7)×0.5 — max comportamental 0.5
      const raw = (diasPractica / 7) * 0.5
      return Math.min(100, Math.round((raw / 0.5) * 100))
    }

    case 'servicio': {
      // Horas de voluntariado o servicio rastreadas en la ventana
      const horasVolunt = Math.min(8, totalTimeSeconds / 3600)
      // brief: (horasVolunt/8)×0.5 — max comportamental 0.5
      const raw = (horasVolunt / 8) * 0.5
      return Math.min(100, Math.round((raw / 0.5) * 100))
    }

    default:
      // Fórmula genérica para ejercicio, nutricion, aprendizaje, atencion y demás
      return genericBehavioral(completedActivities, totalTimeSeconds)
  }
}

/**
 * Combina los 3 componentes (conductual, subjetivo, progreso) según el nivel Maslow.
 * Garantiza que el resultado esté en el rango [0, 100].
 *
 * @param behavioral - Componente conductual 0-100
 * @param subjective - Componente subjetivo 0-100 (del checkin, o 0 si no hay)
 * @param progressScore - Componente de progreso KR 0-100 (o 0 si no aplica)
 * @param maslowLevel - Nivel Maslow 1-8
 * @returns Score compuesto 0-100
 * [Source: brief#4-subareas]
 */
export function calculateSubareaScore(
  behavioral: number,
  subjective: number,
  progressScore: number,
  maslowLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
): number {
  const w = COMPONENT_WEIGHTS[maslowLevel]
  const raw = behavioral * w.behavioral + subjective * w.subjective + progressScore * w.progress
  return Math.max(0, Math.min(100, Math.round(raw)))
}

/**
 * Aplica decay exponencial por inactividad.
 * Después de N días sin actividad (threshold por nivel), el score baja 5% por día.
 *
 * @param currentScore - Score actual 0-100
 * @param daysSinceLastActivity - Días desde la última actividad registrada
 * @param maslowLevel - Nivel Maslow 1-8
 * @returns Score con decay aplicado, mínimo 0
 * [Source: brief#regla4]
 */
export function applyDecay(
  currentScore: number,
  daysSinceLastActivity: number,
  maslowLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
): number {
  const threshold = DECAY_THRESHOLDS[maslowLevel]
  const daysOverThreshold = Math.max(0, daysSinceLastActivity - threshold)
  const decayFactor = Math.pow(0.95, daysOverThreshold)
  return Math.max(0, Math.round(currentScore * decayFactor))
}
