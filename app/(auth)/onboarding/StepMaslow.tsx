'use client'

interface StepMaslowProps {
  onNext: () => void
  onBack: () => void
}

const D_NEEDS = [
  { level: 1, name: 'Fisiológica', icon: '🏃', desc: 'Salud, sueño, alimentación, ejercicio' },
  { level: 2, name: 'Seguridad', icon: '🛡️', desc: 'Finanzas, estabilidad, entorno seguro' },
  { level: 3, name: 'Conexión Social', icon: '🤝', desc: 'Relaciones, familia, comunidad' },
  { level: 4, name: 'Estima', icon: '⭐', desc: 'Reconocimiento, logros, autoestima' },
]

const B_NEEDS = [
  { level: 5, name: 'Cognitiva', icon: '🧠', desc: 'Aprendizaje, curiosidad, conocimiento' },
  { level: 6, name: 'Estética', icon: '🎨', desc: 'Belleza, orden, creatividad' },
  { level: 7, name: 'Autorrealización', icon: '🚀', desc: 'Propósito, potencial, crecimiento' },
  { level: 8, name: 'Autotrascendencia', icon: '✨', desc: 'Contribución, legado, impacto' },
]

function AreaCard({
  level,
  name,
  icon,
  desc,
}: {
  level: number
  name: string
  icon: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-sm font-medium text-foreground">
          <span className="mr-1.5 text-xs text-muted-foreground">{level}.</span>
          {name}
        </p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

export function StepMaslow({ onNext, onBack }: StepMaslowProps) {
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-foreground">Las 8 áreas de tu vida</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        life-os organiza tu bienestar en 8 áreas basadas en la jerarquía de Maslow. Primero cubrimos
        las necesidades fundamentales (D-Needs) y luego las de crecimiento (B-Needs).
      </p>

      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            D-Needs — Necesidades fundamentales
          </span>
          <span className="text-xs text-muted-foreground">Niveles 1–4 (peso: 2.0× y 1.5×)</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {D_NEEDS.map((area) => (
            <AreaCard key={area.level} {...area} />
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            B-Needs — Necesidades de crecimiento
          </span>
          <span className="text-xs text-muted-foreground">Niveles 5–8 (peso: 1.2× y 1.0×)</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {B_NEEDS.map((area) => (
            <AreaCard key={area.level} {...area} />
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          ← Atrás
        </button>
        <button
          onClick={onNext}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
