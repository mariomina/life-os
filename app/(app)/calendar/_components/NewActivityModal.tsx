'use client'

// app/(app)/calendar/_components/NewActivityModal.tsx
// Modal con dos tabs: "Planear" (actividad futura) y "Registrar" (actividad pasada).

import { useRef, useEffect, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { X, CalendarDays, CheckCircle2, RefreshCw, Plus, Check } from 'lucide-react'
import { createActivity } from '@/actions/calendar'
import type { AreaOption } from '@/actions/calendar'
import type { AreaSubarea } from '@/lib/db/schema/area-subareas'
import type { Calendar } from '@/lib/db/queries/calendars'
import { ColorPicker, CALENDAR_COLORS } from './CalendarSidebar'
import {
  RECURRENCE_LABELS,
  RECURRENCE_DEFAULTS,
  describeRecurrence,
  type RecurrenceType,
  type RecurrenceUnit,
  type RecurrenceOptions,
} from '@/lib/calendar/recurrence-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = 'plan' | 'log'

interface NewActivityModalProps {
  onClose: () => void
  defaultDate: Date
  calendars?: Calendar[]
  /** Fuerza la apertura en un modo específico */
  initialMode?: ModalMode
  /** Pre-rellena la duración (min) — para "Registrar gap" del Diario de Cierre */
  defaultDuration?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
  { value: 0, label: 'Personalizado...' },
]

const RECURRENCE_OPTIONS = Object.entries(RECURRENCE_LABELS) as [RecurrenceType, string][]
const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const UNIT_OPTIONS: { value: RecurrenceUnit; label: string }[] = [
  { value: 'day', label: 'día' },
  { value: 'week', label: 'semana' },
  { value: 'month', label: 'mes' },
  { value: 'year', label: 'año' },
]

function defaultEndDate(from: Date): string {
  const d = new Date(from)
  d.setMonth(d.getMonth() + 3)
  return format(d, 'yyyy-MM-dd')
}

// ─── NewActivityModal ─────────────────────────────────────────────────────────

export function NewActivityModal({
  onClose,
  defaultDate,
  calendars = [],
  initialMode = 'plan',
  defaultDuration,
}: NewActivityModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Tab mode ────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<ModalMode>(initialMode)

  // ── Shared state ────────────────────────────────────────────────────────────
  const [description, setDescription] = useState('')

  // ── Area + Subarea ───────────────────────────────────────────────────────────
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [subareas, setSubareas] = useState<AreaSubarea[]>([])
  const [selectedSubareaId, setSelectedSubareaId] = useState('')

  const [localCalendars, setLocalCalendars] = useState<Calendar[]>(calendars)
  const [selectedCalId, setSelectedCalId] = useState<string>(
    calendars.find((c) => c.isDefault)?.id ?? ''
  )
  const [showNewCal, setShowNewCal] = useState(false)
  const [newCalName, setNewCalName] = useState('')
  const [newCalColor, setNewCalColor] = useState<string>(CALENDAR_COLORS[0])
  const [newCalError, setNewCalError] = useState<string | null>(null)
  const [isCreatingCal, setIsCreatingCal] = useState(false)

  // ── "Planear" state ─────────────────────────────────────────────────────────
  const [durationMode, setDurationMode] = useState<'preset' | 'custom'>(() => {
    if (!defaultDuration) return 'preset'
    const isPreset = DURATION_OPTIONS.some((o) => o.value === defaultDuration && o.value > 0)
    return isPreset ? 'preset' : 'custom'
  })
  const [presetDuration, setPresetDuration] = useState(() => {
    if (!defaultDuration) return 30
    const isPreset = DURATION_OPTIONS.some((o) => o.value === defaultDuration && o.value > 0)
    return isPreset ? defaultDuration : 30
  })
  const [customHours, setCustomHours] = useState(() =>
    defaultDuration && !DURATION_OPTIONS.some((o) => o.value === defaultDuration && o.value > 0)
      ? Math.floor(defaultDuration / 60)
      : 0
  )
  const [customMins, setCustomMins] = useState(() =>
    defaultDuration && !DURATION_OPTIONS.some((o) => o.value === defaultDuration && o.value > 0)
      ? defaultDuration % 60
      : 30
  )
  const [isAllDay, setIsAllDay] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceEndType, setRecurrenceEndType] = useState<'count' | 'date' | 'never'>('count')
  const [recurrenceCount, setRecurrenceCount] = useState(RECURRENCE_DEFAULTS.weekly)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(() => defaultEndDate(defaultDate))
  const [customInterval, setCustomInterval] = useState(1)
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>('week')
  const [customDays, setCustomDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]))
  const [customExcludeHolidays, setCustomExcludeHolidays] = useState(false)

  // ── "Registrar" state ───────────────────────────────────────────────────────
  const [logStartTime, setLogStartTime] = useState(() => {
    const h = defaultDate.getHours()
    if (h > 0) return `${String(h).padStart(2, '0')}:00`
    const now = new Date()
    now.setMinutes(0, 0, 0)
    now.setHours(now.getHours() + 1)
    return format(now, 'HH:mm')
  })
  const [logEndTime, setLogEndTime] = useState(() => {
    const h = defaultDate.getHours()
    const base = h > 0 ? h : new Date().getHours() + 1
    return `${String(Math.min(base + 1, 23)).padStart(2, '0')}:00`
  })

  // ── Derived ─────────────────────────────────────────────────────────────────
  const effectiveDuration =
    durationMode === 'custom' ? Math.max(1, customHours * 60 + customMins) : presetDuration

  const defaultTime = (() => {
    const h = defaultDate.getHours()
    if (h > 0) return `${String(h).padStart(2, '0')}:00`
    const now = new Date()
    now.setMinutes(0, 0, 0)
    now.setHours(now.getHours() + 1)
    return format(now, 'HH:mm')
  })()

  const recurrencePreview =
    recurrenceType !== 'none'
      ? describeRecurrence(
          {
            type: recurrenceType,
            endType: recurrenceEndType,
            count: recurrenceCount,
            endDate: recurrenceEndDate,
            interval: customInterval,
            unit: customUnit,
            daysOfWeek: [...customDays],
            excludeHolidays: customExcludeHolidays,
          } satisfies RecurrenceOptions,
          defaultDate
        )
      : ''

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleRecurrenceTypeChange = (type: RecurrenceType) => {
    setRecurrenceType(type)
    if (type === 'custom') {
      setRecurrenceEndType('never')
      setRecurrenceCount(RECURRENCE_DEFAULTS.custom)
    } else {
      setRecurrenceEndType('count')
      setRecurrenceCount(RECURRENCE_DEFAULTS[type])
    }
  }

  const toggleCustomDay = (day: number) => {
    setCustomDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  // Load areas on mount
  useEffect(() => {
    import('@/actions/calendar').then(({ getAreasForUser }) => {
      getAreasForUser()
        .then(setAreas)
        .catch(() => {})
    })
  }, [])

  // Load subareas when area changes
  useEffect(() => {
    if (!selectedAreaId) {
      setSubareas([])
      setSelectedSubareaId('')
      return
    }
    import('@/lib/db/queries/areas').then(({ getSubareasByArea }) => {
      getSubareasByArea(selectedAreaId)
        .then(setSubareas)
        .catch(() => setSubareas([]))
    })
    setSelectedSubareaId('')
  }, [selectedAreaId])

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog) dialog.showModal()
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = () => onClose()
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  function handleSubmit(formData: FormData) {
    if (mode === 'log') {
      // Registrar actividad pasada: duración = diferencia entre hora inicio y hora fin
      const [sh, sm] = logStartTime.split(':').map(Number)
      const [eh, em] = logEndTime.split(':').map(Number)
      let totalMins = eh * 60 + em - (sh * 60 + sm)
      if (totalMins <= 0) totalMins += 24 * 60 // cruce de medianoche
      totalMins = Math.max(1, totalMins)
      formData.set('duration', String(totalMins))
      formData.set('actualTimeMinutes', String(totalMins))
      formData.set('recurrenceType', 'none')
    } else {
      // Planear actividad futura
      if (isAllDay) {
        formData.set('time', '00:00')
        formData.set('duration', '1440')
      } else {
        formData.set('duration', String(effectiveDuration))
      }
      formData.set('actualTimeMinutes', '0')
      formData.set('recurrenceType', recurrenceType)
      formData.set('recurrenceEndType', recurrenceEndType)
      if (recurrenceEndType === 'count') formData.set('recurrenceCount', String(recurrenceCount))
      if (recurrenceEndType === 'date') formData.set('recurrenceEndDate', recurrenceEndDate)
      if (recurrenceType === 'custom') {
        formData.set('recurrenceInterval', String(customInterval))
        formData.set('recurrenceUnit', customUnit)
        formData.set('recurrenceDays', JSON.stringify([...customDays].sort((a, b) => a - b)))
        formData.set('recurrenceExcludeHolidays', String(customExcludeHolidays))
      }
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await createActivity(formData)
        if (result.error) {
          setError(result.error)
        } else {
          onClose()
        }
      } catch {
        setError('Error inesperado al crear la actividad')
      }
    })
  }

  // ── Shared sub-components ───────────────────────────────────────────────────

  const inputCls =
    'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50'
  const selectCls =
    'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50'

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <dialog
      ref={dialogRef}
      className="m-auto rounded-xl border border-border bg-card text-foreground shadow-xl backdrop:bg-black/40 p-0 w-full max-w-md"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      {/* ── Header con tabs ── */}
      <div className="border-b border-border">
        {/* Fila título + cerrar */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3">
          <h2 className="text-base font-semibold text-foreground">Nueva Actividad</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-1 pb-0">
          <button
            type="button"
            onClick={() => setMode('plan')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              mode === 'plan'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Planear
          </button>
          <button
            type="button"
            onClick={() => setMode('log')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              mode === 'log'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Registrar
          </button>
        </div>
      </div>

      {/* ── Form ── */}
      <form action={handleSubmit} className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
        {/* Descripción del modo activo */}
        <p className="text-xs text-muted-foreground">
          {mode === 'plan'
            ? 'Planea una actividad futura en tu calendario.'
            : 'Registra algo que ya hiciste para llevar el control de tu tiempo.'}
        </p>

        {/* ── Título (compartido) ── */}
        <div className="space-y-1">
          <label htmlFor="title" className="text-sm font-medium text-foreground">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={100}
            placeholder={mode === 'plan' ? 'Ej. Revisión semanal' : 'Ej. Llamada con cliente'}
            className={inputCls}
          />
        </div>

        {/* ── Descripción (compartido) ── */}
        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium text-foreground">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas opcionales..."
            rows={2}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {/* ── Fecha + Hora ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="date" className="text-sm font-medium text-foreground">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={format(defaultDate, 'yyyy-MM-dd')}
              max={mode === 'log' ? format(new Date(), 'yyyy-MM-dd') : undefined}
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            {mode === 'plan' ? (
              <>
                <div className="flex items-center justify-between">
                  <label htmlFor="time" className="text-sm font-medium text-foreground">
                    Hora {!isAllDay && <span className="text-red-500">*</span>}
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="accent-primary"
                    />
                    <span className="text-xs text-muted-foreground">Todo el día</span>
                  </label>
                </div>
                {isAllDay ? (
                  <div className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    Todo el día
                  </div>
                ) : (
                  <input
                    id="time"
                    name="time"
                    type="time"
                    required
                    defaultValue={defaultTime}
                    className={inputCls}
                  />
                )}
              </>
            ) : (
              <>
                <label htmlFor="time" className="text-sm font-medium text-foreground">
                  Hora inicio <span className="text-red-500">*</span>
                </label>
                <input
                  id="time"
                  name="time"
                  type="time"
                  required
                  value={logStartTime}
                  onChange={(e) => setLogStartTime(e.target.value)}
                  className={inputCls}
                />
              </>
            )}
          </div>
        </div>

        {/* ══ TAB: PLANEAR ══════════════════════════════════════════════════════ */}
        {mode === 'plan' && (
          <>
            {/* Duración */}
            {!isAllDay && (
              <div className="space-y-1">
                <label htmlFor="durationSelect" className="text-sm font-medium text-foreground">
                  Duración estimada
                </label>
                <select
                  id="durationSelect"
                  value={durationMode === 'custom' ? 0 : presetDuration}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val === 0) {
                      setDurationMode('custom')
                    } else {
                      setDurationMode('preset')
                      setPresetDuration(val)
                    }
                  }}
                  className={selectCls}
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {durationMode === 'custom' && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={customHours}
                        onChange={(e) =>
                          setCustomHours(Math.max(0, Math.min(23, Number(e.target.value))))
                        }
                        className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <span className="text-sm text-muted-foreground">h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={customMins}
                        onChange={(e) => setCustomMins(Number(e.target.value))}
                        className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-muted-foreground">min</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">
                      = {effectiveDuration} min
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Recurrencia */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
                <label htmlFor="recurrenceType" className="text-sm font-medium text-foreground">
                  Repetir
                </label>
              </div>

              <select
                id="recurrenceType"
                value={recurrenceType}
                onChange={(e) => handleRecurrenceTypeChange(e.target.value as RecurrenceType)}
                className={selectCls}
              >
                {RECURRENCE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {recurrenceType !== 'none' && recurrenceType !== 'custom' && (
                <div className="space-y-3 pl-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Termina
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="recurrenceEndType"
                      value="never"
                      checked={recurrenceEndType === 'never'}
                      onChange={() => setRecurrenceEndType('never')}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">Nunca</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="recurrenceEndType"
                      value="count"
                      checked={recurrenceEndType === 'count'}
                      onChange={() => setRecurrenceEndType('count')}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground flex items-center gap-2">
                      Después de
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={recurrenceCount}
                        disabled={recurrenceEndType !== 'count'}
                        onChange={(e) => setRecurrenceCount(Math.max(1, Number(e.target.value)))}
                        className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                        onClick={() => setRecurrenceEndType('count')}
                      />
                      ocurrencias
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="recurrenceEndType"
                      value="date"
                      checked={recurrenceEndType === 'date'}
                      onChange={() => setRecurrenceEndType('date')}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground flex items-center gap-2">
                      El día
                      <input
                        type="date"
                        value={recurrenceEndDate}
                        disabled={recurrenceEndType !== 'date'}
                        min={format(defaultDate, 'yyyy-MM-dd')}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        className="rounded-lg border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                        onClick={() => setRecurrenceEndType('date')}
                      />
                    </span>
                  </label>
                </div>
              )}

              {recurrenceType === 'custom' && (
                <div className="space-y-3 pl-1 border border-border rounded-xl p-3 bg-muted/20">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-foreground">Repetir cada</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={customInterval}
                      onChange={(e) => setCustomInterval(Math.max(1, Number(e.target.value)))}
                      className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value as RecurrenceUnit)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {customUnit === 'week' && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Repetir el</p>
                      <div className="flex gap-1">
                        {DAY_LABELS.map((label, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleCustomDay(idx)}
                            className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                              customDays.has(idx)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {customUnit === 'week' && customDays.size > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customExcludeHolidays}
                        onChange={(e) => setCustomExcludeHolidays(e.target.checked)}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground">Excluir festivos</span>
                    </label>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Finaliza
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="recurrenceEndTypeCustom"
                        value="never"
                        checked={recurrenceEndType === 'never'}
                        onChange={() => setRecurrenceEndType('never')}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground">Nunca</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="recurrenceEndTypeCustom"
                        value="date"
                        checked={recurrenceEndType === 'date'}
                        onChange={() => setRecurrenceEndType('date')}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground flex items-center gap-2">
                        El
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          disabled={recurrenceEndType !== 'date'}
                          min={format(defaultDate, 'yyyy-MM-dd')}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                          onClick={() => setRecurrenceEndType('date')}
                        />
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="recurrenceEndTypeCustom"
                        value="count"
                        checked={recurrenceEndType === 'count'}
                        onChange={() => setRecurrenceEndType('count')}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground flex items-center gap-2">
                        Después de
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={recurrenceCount}
                          disabled={recurrenceEndType !== 'count'}
                          onChange={(e) => setRecurrenceCount(Math.max(1, Number(e.target.value)))}
                          className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                          onClick={() => setRecurrenceEndType('count')}
                        />
                        ocurrencias
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {recurrencePreview && (
                <p className="text-xs text-primary bg-primary/8 rounded-lg px-3 py-2">
                  {recurrencePreview}
                </p>
              )}
            </div>
          </>
        )}

        {/* ══ TAB: REGISTRAR — Hora fin ═════════════════════════════════════════ */}
        {mode === 'log' && (
          <div className="space-y-1.5">
            <label htmlFor="logEndTime" className="text-sm font-medium text-foreground">
              Hora fin <span className="text-red-500">*</span>
            </label>
            <input
              id="logEndTime"
              type="time"
              value={logEndTime}
              onChange={(e) => setLogEndTime(e.target.value)}
              className={inputCls}
            />
            {logEndTime &&
              (() => {
                const [sh, sm] = logStartTime.split(':').map(Number)
                const [eh, em] = logEndTime.split(':').map(Number)
                let diff = eh * 60 + em - (sh * 60 + sm)
                if (diff <= 0) diff += 24 * 60
                const h = Math.floor(diff / 60)
                const m = diff % 60
                const label = h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`
                return <p className="text-xs text-muted-foreground">Duración: {label}</p>
              })()}
          </div>
        )}

        {/* ── Área + Sub-área (compartido) ── */}
        <div className="space-y-1">
          <label htmlFor="areaId" className="text-sm font-medium text-foreground">
            Área
          </label>
          <select
            id="areaId"
            name="areaId"
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            className={selectCls}
          >
            <option value="">Sin área</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {selectedAreaId && subareas.length > 0 && (
          <div className="space-y-1">
            <label htmlFor="subareaId" className="text-sm font-medium text-foreground">
              Sub-área <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <select
              id="subareaId"
              name="subareaId"
              value={selectedSubareaId}
              onChange={(e) => setSelectedSubareaId(e.target.value)}
              className={selectCls}
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

        {/* ── Calendario (compartido) ── */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="calendarId" className="text-sm font-medium text-foreground">
              Calendario
            </label>
            <button
              type="button"
              onClick={() => setShowNewCal((v) => !v)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3 w-3" /> Nuevo
            </button>
          </div>
          <select
            id="calendarId"
            name="calendarId"
            value={selectedCalId}
            onChange={(e) => setSelectedCalId(e.target.value)}
            className={selectCls}
          >
            <option value="">Sin calendario</option>
            {localCalendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name}
              </option>
            ))}
          </select>
          {showNewCal && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2">
              <input
                type="text"
                autoFocus
                value={newCalName}
                onChange={(e) => setNewCalName(e.target.value)}
                placeholder="Nombre del calendario"
                maxLength={60}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <ColorPicker value={newCalColor} onChange={setNewCalColor} />
              <div className="flex gap-1 flex-wrap">
                <button
                  type="button"
                  disabled={!newCalName.trim() || isCreatingCal}
                  onClick={async () => {
                    setNewCalError(null)
                    setIsCreatingCal(true)
                    try {
                      const { createCalendar } = await import('@/actions/calendars')
                      const result = await createCalendar({
                        name: newCalName.trim(),
                        color: newCalColor,
                      })
                      if (result.error) {
                        setNewCalError(result.error)
                      } else if (result.calendar) {
                        setLocalCalendars((prev) => [...prev, result.calendar!])
                        setSelectedCalId(result.calendar!.id)
                        setShowNewCal(false)
                        setNewCalName('')
                        setNewCalError(null)
                      }
                    } catch {
                      setNewCalError('Error al crear el calendario')
                    } finally {
                      setIsCreatingCal(false)
                    }
                  }}
                  className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Check className="h-2.5 w-2.5" /> {isCreatingCal ? 'Creando...' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCal(false)
                    setNewCalName('')
                    setNewCalError(null)
                  }}
                  className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="h-2.5 w-2.5" /> Cancelar
                </button>
                {newCalError && (
                  <p className="text-[10px] text-red-500 mt-1 w-full">{newCalError}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p
            role="alert"
            className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || (mode === 'log' && !logEndTime)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending
              ? mode === 'plan'
                ? 'Creando...'
                : 'Registrando...'
              : mode === 'plan'
                ? recurrenceType !== 'none'
                  ? 'Crear eventos'
                  : 'Planear'
                : 'Registrar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
