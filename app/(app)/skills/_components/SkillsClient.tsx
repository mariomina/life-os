'use client'

// app/(app)/skills/_components/SkillsClient.tsx
// Client Component para la página de Habilidades.
// Lista de skills con badges de nivel, formulario de creación y acciones.
// Story 7.1 — CRUD Habilidades.

import { useState, useTransition } from 'react'
import { createSkill, updateSkill, archiveSkill } from '@/actions/skills'
import type { Skill } from '@/lib/db/schema/skills'
import type { Area } from '@/lib/db/schema/areas'

// ─── Types ────────────────────────────────────────────────────────────────────

type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

interface SkillsClientProps {
  initialSkills: Skill[]
  areas: Area[]
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

export function SkillsClient({ initialSkills, areas }: SkillsClientProps) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
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
        <ul className="space-y-2">
          {skills.map((skill) => {
            const level = skill.level as SkillLevel
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

            return (
              <li
                key={skill.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
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
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatSkillTime(skill.timeInvestedSeconds)}</span>
                    {areaName && <span>· {areaName}</span>}
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
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
