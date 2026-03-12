'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { isValidRrule, buildRruleString } from '@/lib/habits/occurrence-utils'
import type { Area } from '@/lib/db/schema/areas'
import type { Habit } from '@/lib/db/schema/habits'
import type { AreaSubarea } from '@/lib/db/schema/area-subareas'

type FrequencyPreset = 'daily' | 'weekly' | 'custom'

interface HabitFormData {
  title: string
  description: string
  areaId: string
  subareaId?: string
  rrule: string
  durationMinutes: number
}

interface HabitFormProps {
  areas: Area[]
  initialData?: Partial<Habit>
  onSubmit: (data: HabitFormData) => void
  onCancel: () => void
  isLoading: boolean
  submitLabel: string
}

const WEEKDAYS = [
  { label: 'Lun', value: 0 },
  { label: 'Mar', value: 1 },
  { label: 'Mié', value: 2 },
  { label: 'Jue', value: 3 },
  { label: 'Vie', value: 4 },
  { label: 'Sáb', value: 5 },
  { label: 'Dom', value: 6 },
]

export function HabitForm({
  areas,
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel,
}: HabitFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [areaId, setAreaId] = useState(initialData?.areaId ?? '')
  const [subareaId, setSubareaId] = useState(initialData?.subareaId ?? '')
  const [subareas, setSubareas] = useState<AreaSubarea[]>([])
  const [durationMinutes, setDurationMinutes] = useState(initialData?.durationMinutes ?? 30)
  const [hour, setHour] = useState(7)
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 2, 4]) // Mon, Wed, Fri
  const [preset, setPreset] = useState<FrequencyPreset>('daily')
  const [customRrule, setCustomRrule] = useState(initialData?.rrule ?? '')
  const [rruleError, setRruleError] = useState('')
  const [formError, setFormError] = useState('')

  // Load subareas when area changes
  useEffect(() => {
    if (!areaId) {
      setSubareas([])
      setSubareaId('')
      return
    }
    import('@/lib/db/queries/areas').then(({ getSubareasByArea }) => {
      getSubareasByArea(areaId)
        .then(setSubareas)
        .catch(() => setSubareas([]))
    })
    setSubareaId('')
  }, [areaId])

  function getComputedRrule(): string {
    if (preset === 'custom') return customRrule
    if (preset === 'daily') return buildRruleString('daily', hour)
    return buildRruleString('weekly', hour, selectedDays)
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  function validateAndSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setRruleError('')

    if (!title.trim()) {
      setFormError('El título es requerido')
      return
    }
    if (!areaId) {
      setFormError('Selecciona un área')
      return
    }

    const rrule = getComputedRrule()
    if (!rrule || !isValidRrule(rrule)) {
      setRruleError('La frecuencia ingresada no es válida')
      return
    }
    if (preset === 'weekly' && selectedDays.length === 0) {
      setRruleError('Selecciona al menos un día de la semana')
      return
    }

    onSubmit({
      title: title.trim(),
      description,
      areaId,
      subareaId: subareaId || undefined,
      rrule,
      durationMinutes,
    })
  }

  return (
    <form onSubmit={validateAndSubmit} className="space-y-4">
      {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}

      {/* Title */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground" htmlFor="habit-title">
          Título <span className="text-red-500">*</span>
        </label>
        <Input
          id="habit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ej. Meditación matutina"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground" htmlFor="habit-desc">
          Descripción
        </label>
        <textarea
          id="habit-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional — propósito o notas del hábito"
          rows={2}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Area */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground" htmlFor="habit-area">
          Área de vida <span className="text-red-500">*</span>
        </label>
        <select
          id="habit-area"
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        >
          <option value="">Selecciona un área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sub-area */}
      {areaId && subareas.length > 0 && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground" htmlFor="habit-subarea">
            Sub-área <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
          </label>
          <select
            id="habit-subarea"
            value={subareaId}
            onChange={(e) => setSubareaId(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Sub-área (opcional)</option>
            {subareas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isOptional ? ' (Opcional)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Frequency preset */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Frecuencia <span className="text-red-500">*</span>
        </p>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'custom'] as FrequencyPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                preset === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {p === 'daily' ? 'Diaria' : p === 'weekly' ? 'Semanal' : 'Personalizada'}
            </button>
          ))}
        </div>

        {/* Hour picker — shown for daily & weekly */}
        {preset !== 'custom' && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-24">Hora preferida</label>
            <Input
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-20 h-8 px-2 py-1"
            />
            <span className="text-xs text-muted-foreground">:00</span>
          </div>
        )}

        {/* Weekday selector */}
        {preset === 'weekly' && (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  selectedDays.includes(day.value)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        )}

        {/* Custom rrule input */}
        {preset === 'custom' && (
          <div className="space-y-1">
            <input
              type="text"
              value={customRrule}
              onChange={(e) => {
                setCustomRrule(e.target.value)
                setRruleError('')
              }}
              placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=7;BYMINUTE=0;BYSECOND=0"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground">
              RFC 5545 rrule string — se validará al guardar
            </p>
          </div>
        )}

        {rruleError && <p className="text-xs text-red-600 dark:text-red-400">{rruleError}</p>}
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground w-32" htmlFor="habit-duration">
          Duración (min)
        </label>
        <Input
          id="habit-duration"
          type="number"
          min={1}
          max={480}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="w-20 h-8 px-2 py-1"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
