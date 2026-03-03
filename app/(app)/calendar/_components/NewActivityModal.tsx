'use client'

// app/(app)/calendar/_components/NewActivityModal.tsx
// Modal dialog for creating a new spontaneous activity in the calendar.
// Story 5.7  — CRUD Eventos desde el Calendario.
// Story 10.4 — Click-to-create con hora pre-llenada + eventos recurrentes.
// Story 10.6 — Duración personalizada + recurrencia días hábiles.
// Story 10.7 — Recurrencia personalizada unificada (Google Calendar style).

import { useRef, useEffect, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { X, RefreshCw } from 'lucide-react'
import { createActivity } from '@/actions/calendar'
import type { Calendar } from '@/lib/db/queries/calendars'
import {
  RECURRENCE_LABELS,
  RECURRENCE_DEFAULTS,
  describeRecurrence,
  type RecurrenceType,
  type RecurrenceUnit,
  type RecurrenceOptions,
} from '@/lib/calendar/recurrence-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewActivityModalProps {
  onClose: () => void
  defaultDate: Date
  /** Calendars for the selector (Story 10.2 AC6) */
  calendars?: Calendar[]
}

// ─── Duration options ─────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Default ISO end date: 3 months from a given date */
function defaultEndDate(from: Date): string {
  const d = new Date(from)
  d.setMonth(d.getMonth() + 3)
  return format(d, 'yyyy-MM-dd')
}

// ─── NewActivityModal ─────────────────────────────────────────────────────────

export function NewActivityModal({ onClose, defaultDate, calendars = [] }: NewActivityModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Duration state (Story 10.6)
  const [durationMode, setDurationMode] = useState<'preset' | 'custom'>('preset')
  const [presetDuration, setPresetDuration] = useState(30)
  const [customHours, setCustomHours] = useState(0)
  const [customMins, setCustomMins] = useState(30)

  // Effective duration in minutes sent to the form
  const effectiveDuration =
    durationMode === 'custom' ? Math.max(1, customHours * 60 + customMins) : presetDuration

  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceEndType, setRecurrenceEndType] = useState<'count' | 'date' | 'never'>('count')
  const [recurrenceCount, setRecurrenceCount] = useState(RECURRENCE_DEFAULTS.weekly)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(() => defaultEndDate(defaultDate))

  // Custom recurrence state (Story 10.7)
  const [customInterval, setCustomInterval] = useState(1)
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>('week')
  const [customDays, setCustomDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]))
  const [customExcludeHolidays, setCustomExcludeHolidays] = useState(false)

  // Default time: use hour from the clicked slot if it was set, otherwise next round hour
  const defaultTime = (() => {
    const h = defaultDate.getHours()
    if (h > 0) return `${String(h).padStart(2, '0')}:00`
    const now = new Date()
    now.setMinutes(0, 0, 0)
    now.setHours(now.getHours() + 1)
    return format(now, 'HH:mm')
  })()

  // Keep recurrence defaults in sync with type changes
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

  // Toggle a day in the custom days set
  const toggleCustomDay = (day: number) => {
    setCustomDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  // Show dialog on mount (component is conditionally rendered by parent)
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog) dialog.showModal()
  }, [])

  // Close on Escape key
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = () => onClose()
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  function handleSubmit(formData: FormData) {
    // Inject effective duration (preset or custom) into the form data
    formData.set('duration', String(effectiveDuration))
    // Inject recurrence fields
    formData.set('recurrenceType', recurrenceType)
    formData.set('recurrenceEndType', recurrenceEndType)
    if (recurrenceEndType === 'count') {
      formData.set('recurrenceCount', String(recurrenceCount))
    }
    if (recurrenceEndType === 'date') {
      formData.set('recurrenceEndDate', recurrenceEndDate)
    }
    if (recurrenceType === 'custom') {
      formData.set('recurrenceInterval', String(customInterval))
      formData.set('recurrenceUnit', customUnit)
      formData.set('recurrenceDays', JSON.stringify([...customDays].sort((a, b) => a - b)))
      formData.set('recurrenceExcludeHolidays', String(customExcludeHolidays))
    }
    setError(null)
    startTransition(async () => {
      const result = await createActivity(formData)
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  // Build recurrence preview text
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

  return (
    <dialog
      ref={dialogRef}
      className="rounded-xl border border-border bg-card text-foreground shadow-xl backdrop:bg-black/40 p-0 w-full max-w-md"
      onClick={(e) => {
        // Close when clicking the backdrop
        if (e.target === dialogRef.current) onClose()
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Nueva Actividad</h2>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form */}
      <form action={handleSubmit} className="px-6 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Title */}
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
            placeholder="Ej. Revisión semanal"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Date + Time row */}
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
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="time" className="text-sm font-medium text-foreground">
              Hora <span className="text-red-500">*</span>
            </label>
            <input
              id="time"
              name="time"
              type="time"
              required
              defaultValue={defaultTime}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Duration (Story 10.6 — con opción personalizada) */}
        <div className="space-y-1">
          <label htmlFor="durationSelect" className="text-sm font-medium text-foreground">
            Duración
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
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom duration inputs — visible only when 'Personalizado' is selected */}
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
              <span className="text-xs text-muted-foreground ml-1">= {effectiveDuration} min</span>
            </div>
          )}
        </div>

        {/* Calendar picker (Story 10.2 AC6) */}
        {calendars.length > 0 && (
          <div className="space-y-1">
            <label htmlFor="calendarId" className="text-sm font-medium text-foreground">
              Calendario
            </label>
            <select
              id="calendarId"
              name="calendarId"
              defaultValue={calendars.find((c) => c.isDefault)?.id ?? ''}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Sin calendario</option>
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── Recurrencia (Story 10.4 / 10.6 / 10.7) ──────────────────────── */}
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
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {RECURRENCE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* End options for simple types (daily / weekly / monthly / yearly) */}
          {recurrenceType !== 'none' && recurrenceType !== 'custom' && (
            <div className="space-y-3 pl-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Termina
              </p>

              {/* Never */}
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

              {/* After N occurrences */}
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

              {/* On specific date */}
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

          {/* ── Custom recurrence panel (Story 10.7) ───────────────────── */}
          {recurrenceType === 'custom' && (
            <div className="space-y-3 pl-1 border border-border rounded-xl p-3 bg-muted/20">
              {/* Interval + Unit */}
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

              {/* Day toggles — only when unit='week' */}
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

              {/* Excluir festivos — only when unit='week' and days selected */}
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

              {/* Finaliza */}
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

          {/* Preview */}
          {recurrencePreview && (
            <p className="text-xs text-primary bg-primary/8 rounded-lg px-3 py-2">
              {recurrencePreview}
            </p>
          )}
        </div>
        {/* ── Fin recurrencia ──────────────────────────────────────────────── */}

        {/* Error message */}
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}

        {/* Actions */}
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
            disabled={isPending}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Creando...' : recurrenceType !== 'none' ? `Crear eventos` : 'Crear'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
