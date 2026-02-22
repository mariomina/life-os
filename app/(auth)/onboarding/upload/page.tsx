'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { analyzePsychometricText } from '@/actions/upload-analysis'
import { seedUserAreas, saveAreaScores, completeOnboarding } from '@/actions/questionnaire'
import { calculateGlobalScore } from '@/features/maslow/scoring'
import { QUESTIONNAIRE } from '@/features/maslow/questionnaire'
import type { MaslowScores } from '@/lib/ai/types'
import type { MaslowLevel } from '@/lib/utils/maslow-weights'

const MIN_LENGTH = 200

// ─── Review Screen ────────────────────────────────────────────────────────────

interface ReviewScreenProps {
  scores: MaslowScores
  onConfirm: () => void
  onRetry: () => void
  isSaving: boolean
  saveError: string | null
}

function ReviewScreen({ scores, onConfirm, onRetry, isSaving, saveError }: ReviewScreenProps) {
  const globalScore = calculateGlobalScore(scores)

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="mb-2 text-4xl">🤖</div>
        <h2 className="text-2xl font-bold text-foreground">Diagnóstico generado por IA</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisa los scores propuestos antes de confirmar
        </p>
      </div>

      {/* Global Score */}
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <p className="text-sm font-medium text-muted-foreground">Life System Health Score</p>
        <p className="mt-1 text-5xl font-bold text-primary">{Math.round(globalScore)}%</p>
        <p className="mt-1 text-xs text-muted-foreground">Score global ponderado</p>
      </div>

      {/* Area Scores */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUESTIONNAIRE.map((area) => {
          const score = Math.round(scores[area.level as MaslowLevel])
          return (
            <div
              key={area.level}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <span className="text-2xl">{area.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{area.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="min-w-[36px] text-right text-xs font-semibold text-foreground">
                    {score}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {saveError && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {saveError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          disabled={isSaving}
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          ← Reintentar
        </button>
        <button
          onClick={onConfirm}
          disabled={isSaving}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Guardando...' : 'Confirmar →'}
        </button>
      </div>
    </div>
  )
}

// ─── Upload Page ──────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [scores, setScores] = useState<MaslowScores | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const canSubmit = text.trim().length >= MIN_LENGTH

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result
      if (typeof content === 'string') setText(content)
    }
    reader.readAsText(file)
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalyzeError(null)
    const { scores: result, error } = await analyzePsychometricText(text)
    setIsAnalyzing(false)
    if (error || !result) {
      setAnalyzeError(error ?? 'No se pudieron calcular los scores')
      return
    }
    setScores(result)
  }

  const handleConfirm = async () => {
    if (!scores) return
    setIsSaving(true)
    setSaveError(null)

    try {
      const { createSupabaseBrowserClient } = await import('@/lib/supabase/client')
      const supabase = createSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setSaveError('No se encontró sesión activa. Por favor recarga la página.')
        setIsSaving(false)
        return
      }

      const { areaIds } = await seedUserAreas(user.id)

      const { error: scoresError } = await saveAreaScores(user.id, areaIds, scores)
      if (scoresError) {
        setSaveError(`Error guardando scores: ${scoresError}`)
        setIsSaving(false)
        return
      }

      const { error: onboardingError } = await completeOnboarding()
      if (onboardingError) {
        setSaveError(`Error completando onboarding: ${onboardingError}`)
        setIsSaving(false)
        return
      }

      router.push('/')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error inesperado')
      setIsSaving(false)
    }
  }

  const handleRetry = () => {
    setScores(null)
    setSaveError(null)
  }

  // ── Review Screen ──
  if (scores) {
    return (
      <ReviewScreen
        scores={scores}
        onConfirm={handleConfirm}
        onRetry={handleRetry}
        isSaving={isSaving}
        saveError={saveError}
      />
    )
  }

  // ── Input Screen ──
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="mb-2 text-4xl">📄</div>
        <h2 className="text-xl font-bold text-foreground">Sube tus resultados psicométricos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pega o sube el texto de tu MBTI, Big Five, StrengthsFinder u otros tests
        </p>
      </div>

      {/* Textarea */}
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pega aquí tus resultados psicométricos... (mínimo 200 caracteres)"
          rows={10}
          className="w-full resize-none rounded-xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {text.trim().length} / {MIN_LENGTH} caracteres mínimos
        </p>
      </div>

      {/* File upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          📁 O sube un archivo .txt
        </button>
      </div>

      {analyzeError && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {analyzeError}
        </p>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!canSubmit || isAnalyzing}
        className={[
          'w-full rounded-lg py-3 text-sm font-medium transition-colors',
          canSubmit && !isAnalyzing
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'cursor-not-allowed bg-muted text-muted-foreground',
        ].join(' ')}
      >
        {isAnalyzing ? '🤖 Analizando con IA...' : 'Analizar con IA →'}
      </button>
    </div>
  )
}
