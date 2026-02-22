'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { QUESTIONNAIRE, calculateAreaScoreFromResponses } from '@/features/maslow/questionnaire'
import { calculateGlobalScore } from '@/features/maslow/scoring'
import { seedUserAreas, saveAreaScores, completeOnboarding } from '@/actions/questionnaire'
import type { MaslowLevel } from '@/lib/utils/maslow-weights'

const STORAGE_KEY = 'life-os-questionnaire-state'
const LIKERT_LABELS = ['Nunca', 'Raramente', 'A veces', 'Frecuentemente', 'Siempre'] as const

type Responses = Record<number, number[]>

interface SavedState {
  currentArea: number
  responses: Responses
}

// ─── Summary Screen ──────────────────────────────────────────────────────────

interface DiagnosisSummaryProps {
  responses: Responses
  onConfirm: () => void
  isSaving: boolean
}

function DiagnosisSummary({ responses, onConfirm, isSaving }: DiagnosisSummaryProps) {
  const scores = QUESTIONNAIRE.reduce<Record<MaslowLevel, number>>(
    (acc, area) => {
      const areaResponses = responses[area.level] ?? []
      acc[area.level] = calculateAreaScoreFromResponses(areaResponses)
      return acc
    },
    {} as Record<MaslowLevel, number>
  )

  const globalScore = calculateGlobalScore(scores)

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="mb-2 text-4xl">🎯</div>
        <h2 className="text-2xl font-bold text-foreground">Tu diagnóstico inicial</h2>
        <p className="mt-1 text-sm text-muted-foreground">Revisa tus resultados antes de guardar</p>
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
          const score = Math.round(scores[area.level])
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

      <button
        onClick={onConfirm}
        disabled={isSaving}
        className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? 'Guardando diagnóstico...' : 'Confirmar y empezar →'}
      </button>
    </div>
  )
}

// ─── Questionnaire Wizard ─────────────────────────────────────────────────────

export default function QuestionnairePage() {
  const router = useRouter()
  const [currentArea, setCurrentArea] = useState(0)
  const [responses, setResponses] = useState<Responses>({})
  const [showSummary, setShowSummary] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { currentArea: savedArea, responses: savedResponses } = JSON.parse(
          saved
        ) as SavedState
        setCurrentArea(savedArea)
        setResponses(savedResponses)
      }
    } catch {
      // Ignore parse errors — start fresh
    }
  }, [])

  // Persist state to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentArea, responses } as SavedState))
    } catch {
      // Ignore storage errors
    }
  }, [currentArea, responses])

  const area = QUESTIONNAIRE[currentArea]
  const areaResponses = responses[area.level] ?? []
  const allAnswered = areaResponses.length === 5 && areaResponses.every((r) => r >= 1 && r <= 5)
  const isFirst = currentArea === 0
  const isLast = currentArea === QUESTIONNAIRE.length - 1

  const handleAnswer = useCallback(
    (questionIdx: number, value: number) => {
      setResponses((prev) => {
        const current = prev[area.level] ? [...prev[area.level]] : Array<number>(5).fill(0)
        current[questionIdx] = value
        return { ...prev, [area.level]: current }
      })
    },
    [area.level]
  )

  const handleNext = () => {
    if (isLast) {
      setShowSummary(true)
    } else {
      setCurrentArea((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (showSummary) {
      setShowSummary(false)
    } else if (!isFirst) {
      setCurrentArea((prev) => prev - 1)
    }
  }

  const handleConfirm = async () => {
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

      const scores = QUESTIONNAIRE.reduce<Record<MaslowLevel, number>>(
        (acc, q) => {
          acc[q.level] = calculateAreaScoreFromResponses(responses[q.level] ?? [])
          return acc
        },
        {} as Record<MaslowLevel, number>
      )

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

      localStorage.removeItem(STORAGE_KEY)
      router.push('/')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error inesperado')
      setIsSaving(false)
    }
  }

  // ── Summary Screen ──
  if (showSummary) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={handlePrev}
          className="self-start text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al cuestionario
        </button>
        {saveError && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {saveError}
          </p>
        )}
        <DiagnosisSummary responses={responses} onConfirm={handleConfirm} isSaving={isSaving} />
      </div>
    )
  }

  // ── Questionnaire Screen ──
  const progressPct = ((currentArea + 1) / QUESTIONNAIRE.length) * 100

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Área {currentArea + 1} de {QUESTIONNAIRE.length}
          </span>
          <span>{area.name}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Area Header */}
      <div className="text-center">
        <div className="mb-2 text-5xl">{area.icon}</div>
        <h2 className="text-xl font-bold text-foreground">{area.name}</h2>
        <span className="mt-1 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {area.group === 'd_needs' ? 'Necesidad Básica' : 'Necesidad de Crecimiento'}
        </span>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-5">
        {area.questions.map((question, qIdx) => {
          const selected = areaResponses[qIdx] ?? 0
          return (
            <div key={qIdx} className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-medium text-foreground">{question}</p>
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => handleAnswer(qIdx, val)}
                    title={LIKERT_LABELS[val - 1]}
                    className={[
                      'flex flex-1 flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium transition-colors',
                      selected === val
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                    ].join(' ')}
                  >
                    <span className="text-base font-bold">{val}</span>
                    <span className="hidden text-[10px] leading-tight sm:block">
                      {LIKERT_LABELS[val - 1]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {!isFirst && (
          <button
            onClick={handlePrev}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            ← Anterior
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!allAnswered}
          className={[
            'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
            allAnswered
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'cursor-not-allowed bg-muted text-muted-foreground',
          ].join(' ')}
        >
          {isLast ? 'Ver resumen →' : 'Siguiente →'}
        </button>
      </div>
    </div>
  )
}
