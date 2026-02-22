'use client'

import { type OnboardingMethod } from '@/actions/onboarding'

interface StepSelectionProps {
  onSelect: (method: OnboardingMethod) => void
  onBack: () => void
  loading: boolean
}

export function StepSelection({ onSelect, onBack, loading }: StepSelectionProps) {
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-foreground">
        ¿Cómo quieres hacer tu diagnóstico?
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Necesitamos conocer tu estado actual en cada área para calcular tu Life System Health Score
        inicial. Elige la vía que prefieras:
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Cuestionario */}
        <button
          onClick={() => onSelect('questionnaire')}
          disabled={loading}
          className="flex flex-col items-start rounded-xl border-2 border-border bg-background p-5 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="mb-3 text-3xl">📝</span>
          <span className="mb-1 text-base font-semibold text-foreground">Cuestionario guiado</span>
          <span className="text-sm text-muted-foreground">
            Responde 5–8 preguntas científicamente validadas por cada área. Proceso guiado, unos
            15–20 minutos.
          </span>
          <span className="mt-3 text-xs font-medium text-primary">Recomendado →</span>
        </button>

        {/* Upload */}
        <button
          onClick={() => onSelect('upload')}
          disabled={loading}
          className="flex flex-col items-start rounded-xl border-2 border-border bg-background p-5 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="mb-3 text-3xl">📄</span>
          <span className="mb-1 text-base font-semibold text-foreground">
            Subir archivos psicométricos
          </span>
          <span className="text-sm text-muted-foreground">
            Sube resultados de tests psicométricos existentes (PDF, texto). La IA extrae los scores
            automáticamente.
          </span>
          <span className="mt-3 text-xs font-medium text-muted-foreground">
            Tienes tests previos →
          </span>
        </button>
      </div>

      <div className="flex justify-start">
        <button
          onClick={onBack}
          disabled={loading}
          className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          ← Atrás
        </button>
      </div>

      {loading && (
        <p className="mt-4 text-center text-sm text-muted-foreground">Guardando selección...</p>
      )}
    </div>
  )
}
