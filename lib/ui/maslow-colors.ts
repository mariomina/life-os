/**
 * lib/ui/maslow-colors.ts
 * Design System — Única fuente de verdad para íconos y etiquetas de los niveles Maslow.
 *
 * Fuente de verdad: app/(auth)/onboarding/StepMaslow.tsx
 * Los íconos reflejan la categoría real de cada nivel.
 */

export const MASLOW_ICONS: Record<number, string> = {
  1: '🏃', // Fisiológica — Salud, sueño, alimentación, ejercicio
  2: '🛡️', // Seguridad — Finanzas, estabilidad, entorno seguro
  3: '🤝', // Conexión Social — Relaciones, familia, comunidad
  4: '⭐', // Estima — Reconocimiento, logros, autoestima
  5: '🧠', // Cognitiva — Aprendizaje, curiosidad, conocimiento
  6: '🎨', // Estética — Belleza, orden, creatividad
  7: '🚀', // Autorrealización — Propósito, potencial, crecimiento
  8: '✨', // Autotrascendencia — Contribución, legado, impacto
}

export const MASLOW_LABELS: Record<number, string> = {
  1: 'Fisiológica',
  2: 'Seguridad',
  3: 'Conexión Social',
  4: 'Estima',
  5: 'Cognitiva',
  6: 'Estética',
  7: 'Autorrealización',
  8: 'Autotrascendencia',
}

/** Color de fondo y texto por nivel Maslow — para badges y visualizaciones */
export const MASLOW_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
  2: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400' },
  3: { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-400' },
  4: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
  5: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
  6: { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-400' },
  7: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400' },
  8: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400' },
}
