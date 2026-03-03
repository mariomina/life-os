'use client'

import { useState, useTransition } from 'react'
import { Archive, Trash2, Flame } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { archiveHabit, deleteHabit } from '@/actions/habits'
import { describeRrule } from '@/lib/habits/occurrence-utils'
import type { Habit } from '@/lib/db/schema/habits'

interface HabitCardProps {
  habit: Habit & { areaName: string | null }
  onEdit: (habit: Habit & { areaName: string | null }) => void
}

export function HabitCard({ habit, onEdit }: HabitCardProps) {
  const [isPending, startTransition] = useTransition()
  const [removed, setRemoved] = useState(false)

  if (removed) return null

  function handleArchive() {
    if (!confirm('¿Archivar este hábito? Puedes activarlo de nuevo mostrando inactivos.')) return
    startTransition(async () => {
      const result = await archiveHabit(habit.id)
      if (result.error) {
        alert(result.error)
      } else {
        setRemoved(true)
      }
    })
  }

  function handleDelete() {
    if (
      !confirm(
        '¿Eliminar definitivamente este hábito? Las ocurrencias existentes perderán el vínculo con él.'
      )
    )
      return
    startTransition(async () => {
      const result = await deleteHabit(habit.id)
      if (result.error) {
        alert(result.error)
      } else {
        setRemoved(true)
      }
    })
  }

  const frequencyLabel = describeRrule(habit.rrule)

  return (
    <div
      className={`rounded-2xl border bg-card p-4 space-y-3 shadow-[0_1px_3px_rgb(0_0_0/0.06)] transition-all duration-200 hover:shadow-sm ${
        !habit.isActive ? 'opacity-60' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{habit.title}</p>
          {habit.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{habit.description}</p>
          )}
        </div>
        <Badge variant={habit.isActive ? 'active' : 'archived'} className="shrink-0">
          {habit.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-1.5">
        {habit.areaName && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground">
            {habit.areaName}
          </span>
        )}
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
          {frequencyLabel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
          <Flame className="w-3 h-3" />
          {habit.streakCurrent} días · Best: {habit.streakBest}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-dashed">
        <button
          onClick={() => onEdit(habit)}
          className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Editar
        </button>
        <div className="flex items-center gap-2">
          {habit.isActive && (
            <button
              onClick={handleArchive}
              disabled={isPending}
              className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-yellow-600 transition-colors disabled:opacity-50"
            >
              <Archive className="w-3 h-3" />
              Archivar
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
