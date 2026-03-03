'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { HabitCard } from './HabitCard'
import { HabitForm } from './HabitForm'
import { createHabit, updateHabit } from '@/actions/habits'
import type { Habit } from '@/lib/db/schema/habits'
import type { Area } from '@/lib/db/schema/areas'

interface HabitListProps {
  habits: (Habit & { areaName: string | null })[]
  areas: Area[]
  userId: string
}

/**
 * Client Component — lists habits with toggle active/inactive,
 * and manages create/edit form state.
 */
export function HabitList({ habits: initialHabits, areas }: HabitListProps) {
  const [showInactive, setShowInactive] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState<(Habit & { areaName: string | null }) | null>(
    null
  )
  const [isPending, startTransition] = useTransition()

  const visibleHabits = showInactive ? initialHabits : initialHabits.filter((h) => h.isActive)

  function handleCreate(data: {
    title: string
    description: string
    areaId: string
    rrule: string
    durationMinutes: number
  }) {
    startTransition(async () => {
      const result = await createHabit(data)
      if (result.error) {
        alert(result.error)
      } else {
        setShowCreateForm(false)
      }
    })
  }

  function handleUpdate(data: {
    title: string
    description: string
    areaId: string
    rrule: string
    durationMinutes: number
  }) {
    if (!editingHabit) return
    startTransition(async () => {
      const result = await updateHabit(editingHabit.id, data)
      if (result.error) {
        alert(result.error)
      } else {
        setEditingHabit(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-input"
          />
          Mostrar inactivos
        </label>

        {!showCreateForm && !editingHabit && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Hábito
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_3px_rgb(0_0_0/0.06)] space-y-4 animate-in fade-in duration-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Nuevo Hábito
          </h3>
          <HabitForm
            areas={areas}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            isLoading={isPending}
            submitLabel="Crear Hábito"
          />
        </div>
      )}

      {/* Edit form */}
      {editingHabit && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_3px_rgb(0_0_0/0.06)] space-y-4 animate-in fade-in duration-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Editar Hábito
          </h3>
          <HabitForm
            areas={areas}
            initialData={editingHabit}
            onSubmit={handleUpdate}
            onCancel={() => setEditingHabit(null)}
            isLoading={isPending}
            submitLabel="Guardar Cambios"
          />
        </div>
      )}

      {/* Habit grid */}
      {visibleHabits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <span className="text-5xl">🔁</span>
          <p className="text-sm font-medium text-foreground">
            {showInactive ? 'No tienes hábitos registrados' : 'No tienes hábitos activos'}
          </p>
          <p className="text-xs text-muted-foreground">
            Crea tu primer hábito para empezar a rastrear tus rutinas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleHabits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} onEdit={setEditingHabit} />
          ))}
        </div>
      )}
    </div>
  )
}
