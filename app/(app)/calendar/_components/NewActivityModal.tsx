'use client'

// app/(app)/calendar/_components/NewActivityModal.tsx
// Modal dialog for creating a new spontaneous activity in the calendar.
// Story 5.7  — CRUD Eventos desde el Calendario.
// Story 10.4 — Click-to-create con hora pre-llenada + eventos recurrentes.

import { useRef, useEffect, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { X, RefreshCw } from 'lucide-react'
import { createActivity } from '@/actions/calendar'
import type { AreaOption } from '@/actions/calendar'
import type { Calendar } from '@/lib/db/queries/calendars'
import {
  RECURRENCE_LABELS,
  RECURRENCE_DEFAULTS,
  describeRecurrence,
  type RecurrenceType,
  type RecurrenceOptions,
} from '@/lib/calendar/recurrence-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewActivityModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate: Date
  areas: AreaOption[]
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
]

const RECURRENCE_OPTIONS = Object.entries(RECURRENCE_LABELS) as [RecurrenceType, string][]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Default ISO end date: 3 months from a given date */
function defaultEndDate(from: Date): string {
  const d = new Date(from)
  d.setMonth(d.getMonth() + 3)
  return format(d, 'yyyy-MM-dd')
}

// ─── NewActivityModal ─────────────────────────────────────────────────────────

export function NewActivityModal({
  isOpen,
  onClose,
  defaultDate,
  areas,
  calendars = [],
}: NewActivityModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceEndType, setRecurrenceEndType] = useState<'count' | 'date'>('count')
  const [recurrenceCount, setRecurrenceCount] = useState(RECURRENCE_DEFAULTS.weekly)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(() => defaultEndDate(defaultDate))

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
    setRecurrenceCount(RECURRENCE_DEFAULTS[type])
  }

  // Show dialog on mount (component is conditionally rendered by parent, so mount = open)
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

        {/* Duration */}
        <div className="space-y-1">
          <label htmlFor="duration" className="text-sm font-medium text-foreground">
            Duración
          </label>
          <select
            id="duration"
            name="duration"
            defaultValue={30}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Area */}
        <div className="space-y-1">
          <label htmlFor="areaId" className="text-sm font-medium text-foreground">
            Área <span className="text-red-500">*</span>
          </label>
          {areas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Configura tus áreas primero en la sección Áreas de Vida.
            </p>
          ) : (
            <select
              id="areaId"
              name="areaId"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Selecciona un área</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.maslowLevel}. {area.name}
                </option>
              ))}
            </select>
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

        {/* ── Recurrencia (Story 10.4) ────────────────────────────────────── */}
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
            <label htmlFor="recurrenceType" className="text-sm font-medium text-foreground">
              Repetir
            </label>
          </div>

          <select
            id="recurrenceType"
            name="recurrenceType"
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

          {/* Recurrence end options — only visible when type !== 'none' */}
          {recurrenceType !== 'none' && (
            <div className="space-y-3 pl-1">
              {/* End type radio */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Termina
                </p>

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
                      name="recurrenceCount"
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
                      name="recurrenceEndDate"
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

              {/* Preview */}
              {recurrencePreview && (
                <p className="text-xs text-primary bg-primary/8 rounded-lg px-3 py-2">
                  {recurrencePreview}
                </p>
              )}
            </div>
          )}
        </div>
        {/* ── Fin recurrencia ─────────────────────────────────────────────── */}

        {/* Hidden fields para recurrencia (siempre en el form para el server action) */}
        <input type="hidden" name="recurrenceType" value={recurrenceType} />
        {recurrenceType !== 'none' && recurrenceEndType === 'count' && (
          <input type="hidden" name="recurrenceCount" value={recurrenceCount} />
        )}
        {recurrenceType !== 'none' && recurrenceEndType === 'date' && (
          <input type="hidden" name="recurrenceEndDate" value={recurrenceEndDate} />
        )}

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
            disabled={isPending || areas.length === 0}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Creando...' : recurrenceType !== 'none' ? `Crear eventos` : 'Crear'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
