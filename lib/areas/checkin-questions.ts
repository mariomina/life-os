// lib/areas/checkin-questions.ts
// Preguntas de checkin subjetivo por sub-área.
// Story 11.5 — Checkin Periódico por Sub-área.
//
// Ciclos de revisión por nivel Maslow [Source: brief#regla3]:
//   L1: daily | L2-3: weekly | L4-6: monthly | L7-8: quarterly
//
// MVP: top-3 sub-áreas por nivel (mayor internalWeight).

export interface CheckinQuestion {
  subareaSlug: string
  maslowLevel: number
  cycleType: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  question: string
  scale: '1-10'
}

export const CHECKIN_QUESTIONS: CheckinQuestion[] = [
  // ── L1 Fisiológica — daily ──────────────────────────────────────────────────
  {
    subareaSlug: 'sueno',
    maslowLevel: 1,
    cycleType: 'daily',
    question: '¿Cómo calificarías la calidad de tu sueño anoche?',
    scale: '1-10',
  },
  {
    subareaSlug: 'ejercicio',
    maslowLevel: 1,
    cycleType: 'daily',
    question: '¿Cómo te sentiste físicamente hoy?',
    scale: '1-10',
  },
  {
    subareaSlug: 'alimentacion',
    maslowLevel: 1,
    cycleType: 'daily',
    question: '¿Cómo evalúas la calidad de tu alimentación hoy?',
    scale: '1-10',
  },

  // ── L2 Seguridad — weekly ───────────────────────────────────────────────────
  {
    subareaSlug: 'seguridad_financiera',
    maslowLevel: 2,
    cycleType: 'weekly',
    question: '¿Qué tan tranquilo/a te sientes con tu situación financiera esta semana?',
    scale: '1-10',
  },
  {
    subareaSlug: 'estabilidad_laboral',
    maslowLevel: 2,
    cycleType: 'weekly',
    question: '¿Cómo evalúas tu seguridad laboral esta semana?',
    scale: '1-10',
  },
  {
    subareaSlug: 'salud_preventiva',
    maslowLevel: 2,
    cycleType: 'weekly',
    question: '¿Qué tan atento/a estás siendo a tu salud preventiva esta semana?',
    scale: '1-10',
  },

  // ── L3 Conexión Social — weekly ─────────────────────────────────────────────
  {
    subareaSlug: 'pareja',
    maslowLevel: 3,
    cycleType: 'weekly',
    question: '¿Cómo fue la calidad de tu conexión con tu pareja esta semana?',
    scale: '1-10',
  },
  {
    subareaSlug: 'amistades',
    maslowLevel: 3,
    cycleType: 'weekly',
    question: '¿Qué tan conectado/a te sentiste con tus amigos íntimos esta semana?',
    scale: '1-10',
  },
  {
    subareaSlug: 'familia',
    maslowLevel: 3,
    cycleType: 'weekly',
    question: '¿Cómo fue la calidad de tu relación familiar esta semana?',
    scale: '1-10',
  },

  // ── L4 Estima — monthly ─────────────────────────────────────────────────────
  {
    subareaSlug: 'autoeficacia',
    maslowLevel: 4,
    cycleType: 'monthly',
    question: '¿Qué tan confiado/a te sientes en tu capacidad de lograr lo que te propones?',
    scale: '1-10',
  },
  {
    subareaSlug: 'salud_emocional',
    maslowLevel: 4,
    cycleType: 'monthly',
    question: '¿Cómo calificarías tu regulación emocional este mes?',
    scale: '1-10',
  },
  {
    subareaSlug: 'reconocimiento',
    maslowLevel: 4,
    cycleType: 'monthly',
    question: '¿Qué tan valorado/a te sientes en tu entorno personal y profesional este mes?',
    scale: '1-10',
  },

  // ── L5 Cognitiva — monthly ──────────────────────────────────────────────────
  {
    subareaSlug: 'aprendizaje',
    maslowLevel: 5,
    cycleType: 'monthly',
    question: '¿Qué tan satisfecho/a estás con tu crecimiento intelectual este mes?',
    scale: '1-10',
  },
  {
    subareaSlug: 'creatividad',
    maslowLevel: 5,
    cycleType: 'monthly',
    question: '¿Qué tan fluido/a te sientes en tu expresión creativa este mes?',
    scale: '1-10',
  },
  {
    subareaSlug: 'trabajo_significativo',
    maslowLevel: 5,
    cycleType: 'monthly',
    question: '¿Qué tan significativo encuentras tu trabajo o proyectos principales este mes?',
    scale: '1-10',
  },

  // ── L6 Estética — monthly ───────────────────────────────────────────────────
  {
    subareaSlug: 'apreciacion_estetica',
    maslowLevel: 6,
    cycleType: 'monthly',
    question: '¿Qué tan presente está la belleza y el arte en tu vida este mes?',
    scale: '1-10',
  },
  {
    subareaSlug: 'orden',
    maslowLevel: 6,
    cycleType: 'monthly',
    question: '¿Qué tan ordenado y armonioso sientes tu entorno este mes?',
    scale: '1-10',
  },
  {
    subareaSlug: 'entorno',
    maslowLevel: 6,
    cycleType: 'monthly',
    question: '¿Qué tan satisfecho/a estás con tu entorno físico y digital este mes?',
    scale: '1-10',
  },

  // ── L7 Autorrealización — quarterly ─────────────────────────────────────────
  {
    subareaSlug: 'proposito',
    maslowLevel: 7,
    cycleType: 'quarterly',
    question: '¿Qué tan alineado/a sientes que está tu vida con tu propósito personal?',
    scale: '1-10',
  },
  {
    subareaSlug: 'autonomia',
    maslowLevel: 7,
    cycleType: 'quarterly',
    question: '¿Qué tan libre te sientes para tomar decisiones alineadas con tus valores?',
    scale: '1-10',
  },
  {
    subareaSlug: 'crecimiento_personal',
    maslowLevel: 7,
    cycleType: 'quarterly',
    question: '¿Qué tan satisfecho/a estás con tu crecimiento personal en los últimos 3 meses?',
    scale: '1-10',
  },

  // ── L8 Autotrascendencia — quarterly ────────────────────────────────────────
  {
    subareaSlug: 'servicio',
    maslowLevel: 8,
    cycleType: 'quarterly',
    question: '¿Qué tan presente está el servicio a otros en tu vida este trimestre?',
    scale: '1-10',
  },
  {
    subareaSlug: 'gratitud',
    maslowLevel: 8,
    cycleType: 'quarterly',
    question: '¿Qué tan profundo es tu sentido de gratitud y apreciación por la vida?',
    scale: '1-10',
  },
  {
    subareaSlug: 'conexion_universal',
    maslowLevel: 8,
    cycleType: 'quarterly',
    question: '¿Qué tan conectado/a te sientes con algo más grande que tú mismo/a?',
    scale: '1-10',
  },
]

/**
 * Returns the checkin question for a given subarea slug, or undefined if not defined.
 */
export function getCheckinQuestion(subareaSlug: string): CheckinQuestion | undefined {
  return CHECKIN_QUESTIONS.find((q) => q.subareaSlug === subareaSlug)
}
