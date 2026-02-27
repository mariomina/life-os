'use client'

// app/(app)/skills/_components/SkillsClient.tsx
// Client Component para la página de Habilidades.
// Lista de skills con badges de nivel, formulario de creación y acciones.
// Story 7.1 — CRUD Habilidades.

import { useState, useTransition, useMemo } from 'react'
import { createSkill, updateSkill, archiveSkill, confirmEmergingSkill } from '@/actions/skills'
import type { Skill } from '@/lib/db/schema/skills'
import type { Area } from '@/lib/db/schema/areas'
import type { EmergingSkillSuggestion } from '@/features/skills/detection'
import { getSkillProgress, computeSkillLevel } from '@/features/skills/level'
import type { SkillLevel } from '@/features/skills/level'

const DISMISS_KEY = 'life_os_dismissed_skill_suggestions'

interface SkillsClientProps {
  initialSkills: Skill[]
  areas: Area[]
  /** Story 7.3 — Suggestions from the auto-detection engine */
  initialSuggestions?: EmergingSkillSuggestion[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto',
}

const LEVEL_BADGE_COLORS: Record<SkillLevel, string> = {
  beginner: 'bg-gray-100 text-gray-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-violet-100 text-violet-700',
  expert: 'bg-amber-100 text-amber-700',
}

function formatSkillTime(seconds: number): string {
  if (seconds === 0) return '0h'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SkillsClient({ initialSkills, areas, initialSuggestions = [] }: SkillsClientProps) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Emerging skills state (Story 7.3) ─────────────────────────────────────

  const [dismissedTerms, setDismissedTerms] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[]
    } catch {
      return []
    }
  })
  const [confirmingTerm, setConfirmingTerm] = useState<string | null>(null)
  const [confirmLevel, setConfirmLevel] = useState<SkillLevel>('beginner')
  const [confirmAreaId, setConfirmAreaId] = useState<string>('')

  const visibleSuggestions = useMemo(
    () => initialSuggestions.filter((s) => !dismissedTerms.includes(s.term.toLowerCase())),
    [initialSuggestions, dismissedTerms]
  )

  // ── Filter and sort state (Story 7.4 — AC5) ──────────────────────────────

  const [filterLevel, setFilterLevel] = useState<SkillLevel | 'all'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'time'>('time')

  const levelOrder: Record<SkillLevel, number> = {
    beginner: 0,
    intermediate: 1,
    advanced: 2,
    expert: 3,
  }

  const filteredAndSortedSkills = useMemo(() => {
    return [...skills]
      .filter(
        (s) => filterLevel === 'all' || computeSkillLevel(s.timeInvestedSeconds) === filterLevel
      )
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'level')
          return (
            levelOrder[computeSkillLevel(b.timeInvestedSeconds)] -
            levelOrder[computeSkillLevel(a.timeInvestedSeconds)]
          )
        return b.timeInvestedSeconds - a.timeInvestedSeconds
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, filterLevel, sortBy])

  // ── Create form state ─────────────────────────────────────────────────────

  const [newName, setNewName] = useState('')
  const [newLevel, setNewLevel] = useState<SkillLevel>('beginner')
  const [newAreaId, setNewAreaId] = useState<string>('')

  // ── Edit form state ───────────────────────────────────────────────────────

  const [editName, setEditName] = useState('')
  const [editLevel, setEditLevel] = useState<SkillLevel>('beginner')
  const [editAreaId, setEditAreaId] = useState<string>('')

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCreate() {
    if (!newName.trim()) return
    setErrorMsg(null)

    startTransition(async () => {
      const result = await createSkill({
        name: newName.trim(),
        level: newLevel,
        areaId: newAreaId || null,
      })
      if (!result.success) {
        setErrorMsg(result.error ?? 'Error al crear habilidad')
        return
      }
      setNewName('')
      setNewLevel('beginner')
      setNewAreaId('')
      setShowForm(false)
    })
  }

  function startEdit(skill: Skill) {
    setEditingId(skill.id)
    setEditName(skill.name)
    setEditLevel(skill.level as SkillLevel)
    setEditAreaId(skill.areaId ?? '')
    setErrorMsg(null)
  }

  function handleUpdate(skillId: string) {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await updateSkill(skillId, {
        name: editName.trim(),
        level: editLevel,
        areaId: editAreaId || null,
      })
      if (!result.success) {
        setErrorMsg(result.error ?? 'Error al actualizar')
        return
      }
      setEditingId(null)
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skillId
            ? { ...s, name: editName.trim(), level: editLevel, areaId: editAreaId || null }
            : s
        )
      )
    })
  }

  function handleArchive(skillId: string) {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await archiveSkill(skillId)
      if (!result.success) {
        setErrorMsg(result.error ?? 'Error al archivar')
        return
      }
      setSkills((prev) => prev.filter((s) => s.id !== skillId))
    })
  }

  // ── Emerging skill handlers (Story 7.3) ───────────────────────────────────

  function handleDismissSuggestion(term: string) {
    const lower = term.toLowerCase()
    const updated = [...dismissedTerms, lower]
    setDismissedTerms(updated)
    localStorage.setItem(DISMISS_KEY, JSON.stringify(updated))
  }

  function handleConfirmSuggestion(term: string) {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await confirmEmergingSkill(term, confirmLevel, confirmAreaId || null)
      if (!result.success) {
        setErrorMsg(result.error ?? 'Error al registrar skill')
        return
      }
      handleDismissSuggestion(term)
      setConfirmingTerm(null)
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Emerging skills banner (Story 7.3 — AC6) */}
      {visibleSuggestions.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3 dark:bg-amber-950/20 dark:border-amber-800">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            ✨ Habilidades emergentes detectadas
          </h3>
          <div className="space-y-2">
            {visibleSuggestions.map((suggestion) => (
              <div key={suggestion.term} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-sm capitalize text-foreground">
                      {suggestion.term}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatSkillTime(suggestion.totalSeconds)} en {suggestion.activityCount}{' '}
                      actividades
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => {
                        setConfirmingTerm(suggestion.term)
                        setConfirmLevel('beginner')
                        setConfirmAreaId('')
                      }}
                      disabled={isPending}
                      className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      ✓ Registrar skill
                    </button>
                    <button
                      onClick={() => handleDismissSuggestion(suggestion.term)}
                      disabled={isPending}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
                {/* Mini-form for confirming */}
                {confirmingTerm === suggestion.term && (
                  <div className="flex flex-wrap gap-2 items-center pl-2 border-l-2 border-amber-300">
                    <select
                      value={confirmLevel}
                      onChange={(e) => setConfirmLevel(e.target.value as SkillLevel)}
                      disabled={isPending}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    >
                      {(Object.keys(LEVEL_LABELS) as SkillLevel[]).map((l) => (
                        <option key={l} value={l}>
                          {LEVEL_LABELS[l]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={confirmAreaId}
                      onChange={(e) => setConfirmAreaId(e.target.value)}
                      disabled={isPending}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="">Sin área</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleConfirmSuggestion(suggestion.term)}
                      disabled={isPending}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {isPending ? 'Creando...' : 'Crear'}
                    </button>
                    <button
                      onClick={() => setConfirmingTerm(null)}
                      disabled={isPending}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {skills.length > 0
            ? `${skills.length} habilidad${skills.length > 1 ? 'es' : ''} registrada${skills.length > 1 ? 's' : ''}`
            : 'No has registrado habilidades aún.'}
        </p>
        <button
          onClick={() => {
            setShowForm((v) => !v)
            setErrorMsg(null)
          }}
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {showForm ? 'Cancelar' : '+ Nueva habilidad'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Nueva habilidad</h3>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nombre *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ej: TypeScript, React, Diseño UX..."
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nivel</label>
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value as SkillLevel)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              >
                {(Object.keys(LEVEL_LABELS) as SkillLevel[]).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Área (opcional)</label>
              <select
                value={newAreaId}
                onChange={(e) => setNewAreaId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              >
                <option value="">Sin área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

          <button
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Creando...' : 'Crear'}
          </button>
        </div>
      )}

      {/* Skills list */}
      {skills.length === 0 && !showForm ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No has registrado habilidades aún.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Registra tus competencias para seguir tu progreso.
          </p>
        </div>
      ) : (
        <>
          {/* Filters and sorting (Story 7.4 — AC5) */}
          {skills.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Nivel:</span>
                {(['all', 'beginner', 'intermediate', 'advanced', 'expert'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setFilterLevel(lvl)}
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
                      filterLevel === lvl
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {lvl === 'all' ? 'Todos' : LEVEL_LABELS[lvl]}
                  </button>
                ))}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="ml-auto rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="time">Ordenar: Tiempo ↓</option>
                <option value="name">Ordenar: Nombre A-Z</option>
                <option value="level">Ordenar: Nivel ↓</option>
              </select>
            </div>
          )}

          <ul className="space-y-2">
            {filteredAndSortedSkills.map((skill) => {
              const areaName = areas.find((a) => a.id === skill.areaId)?.name

              if (editingId === skill.id) {
                return (
                  <li
                    key={skill.id}
                    className="rounded-lg border border-primary/30 bg-card p-4 shadow-sm space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Nombre</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={isPending}
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Nivel</label>
                        <select
                          value={editLevel}
                          onChange={(e) => setEditLevel(e.target.value as SkillLevel)}
                          disabled={isPending}
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        >
                          {(Object.keys(LEVEL_LABELS) as SkillLevel[]).map((l) => (
                            <option key={l} value={l}>
                              {LEVEL_LABELS[l]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(skill.id)}
                        disabled={isPending}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {isPending ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={isPending}
                        className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </li>
                )
              }

              // SkillProgressCard (Story 7.4 — AC4)
              const progress = getSkillProgress(skill.timeInvestedSeconds)
              const level = progress.currentLevel

              return (
                <li
                  key={skill.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{skill.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_BADGE_COLORS[level]}`}
                        >
                          {LEVEL_LABELS[level]}
                        </span>
                        {skill.autoDetected && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Auto
                          </span>
                        )}
                        {areaName && (
                          <span className="text-xs text-muted-foreground">· {areaName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startEdit(skill)}
                        disabled={isPending}
                        title="Editar"
                        className="rounded p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleArchive(skill.id)}
                        disabled={isPending}
                        title="Archivar"
                        className="rounded p-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                          <path d="m3.3 7 8.7 5 8.7-5" />
                          <path d="M12 22V12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* Progress bar (AC4) */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatSkillTime(skill.timeInvestedSeconds)}
                    {progress.hoursToNextLevel != null
                      ? ` · faltan ${progress.hoursToNextLevel}h para ${LEVEL_LABELS[progress.nextLevel!]}`
                      : ' · Nivel máximo'}
                  </p>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
