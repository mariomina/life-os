'use client'

// app/(app)/calendar/_components/EditActivityModal.tsx
// Modal para editar o eliminar una actividad existente.
// Story 10.9: Edición de actividad con soporte para eventos recurrentes (scope: una sola / todas).

import { useRef, useEffect, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { X, Plus, Check } from 'lucide-react'
import type { ICalendarEvent } from '@/lib/calendar/calendar-utils'
import type { Calendar } from '@/lib/db/queries/calendars'
import {
  RECURRENCE_LABELS,
  RECURRENCE_DEFAULTS,
  describeRecurrence,
} from '@/lib/calendar/recurrence-utils'
import type { RecurrenceType, RecurrenceOptions } from '@/lib/calendar/recurrence-utils'
import { ColorPicker, CALENDAR_COLORS } from './CalendarSidebar'

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditActivityModalProps {
  event: ICalendarEvent
  onClose: () => void
  calendars?: Calendar[]
}

// ─── EditActivityModal ────────────────────────────────────────────────────────

export function EditActivityModal({ event, onClose, calendars = [] }: EditActivityModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Form state ──────────────────────────────────────────────────────────────
  const durationMin = Math.round((event.end.getTime() - event.start.getTime()) / 60000)
  const knownPreset = DURATION_OPTIONS.some((o) => o.value === durationMin && o.value !== 0)

  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description ?? '')
  const [date, setDate] = useState(format(event.start, 'yyyy-MM-dd'))
  const [time, setTime] = useState(format(event.start, 'HH:mm'))
  const [durationMode, setDurationMode] = useState<'preset' | 'custom'>(
    knownPreset ? 'preset' : 'custom'
  )
  const [presetDuration, setPresetDuration] = useState(knownPreset ? durationMin : 30)
  const [customHours, setCustomHours] = useState(Math.floor(durationMin / 60))
  const [customMins, setCustomMins] = useState(durationMin % 60)
  const [calendarId, setCalendarId] = useState(event.calendarId ?? '')

  // ── Recurrence state (solo cuando isRecurring) ───────────────────────────────
  const isRecurring = !!event.recurrenceGroupId
  const initialRecType = (event.recurrenceType as RecurrenceType) ?? 'weekly'
  const [recType, setRecType] = useState<RecurrenceType>(initialRecType)
  const [recEndType, setRecEndType] = useState<'count' | 'date' | 'never'>('never')
  const [recCount, setRecCount] = useState(RECURRENCE_DEFAULTS[initialRecType] ?? 8)
  const [recEndDate, setRecEndDate] = useState('')
  // "desde" — por defecto la fecha de este evento
  const [recFromDate, setRecFromDate] = useState(format(event.start, 'yyyy-MM-dd'))

  // computed preview
  const recurrencePreview =
    isRecurring && recType !== 'none'
      ? (() => {
          const opts: RecurrenceOptions = {
            type: recType,
            endType: recEndType,
            count: recCount,
            endDate: recEndDate,
          }
          try {
            return describeRecurrence(opts, new Date(`${recFromDate}T${time}:00`))
          } catch {
            return ''
          }
        })()
      : ''

  // Actual time spent state (retroactive logging)
  const [logActualTime, setLogActualTime] = useState(false)
  const [actualHours, setActualHours] = useState(0)
  const [actualMins, setActualMins] = useState(30)

  // Local calendars + inline create state
  const [localCalendars, setLocalCalendars] = useState<Calendar[]>(calendars)
  const [showNewCal, setShowNewCal] = useState(false)
  const [newCalName, setNewCalName] = useState('')
  const [newCalColor, setNewCalColor] = useState<string>(CALENDAR_COLORS[0])
  const [newCalError, setNewCalError] = useState<string | null>(null)
  const [isCreatingCal, setIsCreatingCal] = useState(false)

  const effectiveDuration =
    durationMode === 'custom' ? Math.max(1, customHours * 60 + customMins) : presetDuration

  // ── Recurring scope dialog state ────────────────────────────────────────────
  const [pendingAction, setPendingAction] = useState<'save' | 'delete' | null>(null)

  // ── Lifecycle ───────────────────────────────────────────────────────────────

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

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSaveClick() {
    if (isRecurring) {
      setPendingAction('save')
    } else {
      executeSave('single')
    }
  }

  function handleDeleteClick() {
    if (isRecurring) {
      setPendingAction('delete')
    } else {
      if (!window.confirm(`¿Eliminar "${event.title}"?`)) return
      executeDelete('single')
    }
  }

  function executeSave(scope: 'single' | 'all') {
    setPendingAction(null)
    setError(null)
    startTransition(async () => {
      const { updateActivity, updateActivityGroup, changeGroupRecurrence } =
        await import('@/actions/calendar')
      let result

      if (scope === 'all' && event.recurrenceGroupId) {
        // Primero actualizar campos comunes (título, descripción, duración, calendario)
        result = await updateActivityGroup(event.recurrenceGroupId, {
          title,
          description: description.trim() || null,
          duration: effectiveDuration,
          areaId: null,
          calendarId: calendarId || null,
        })
        // Si no hay error y la recurrencia cambió, regenerar fechas futuras
        if (!result.error) {
          const recOpts: RecurrenceOptions = {
            type: recType,
            endType: recEndType,
            count: recCount,
            endDate: recEndDate,
          }
          result = await changeGroupRecurrence(event.recurrenceGroupId, recFromDate, recOpts)
        }
      } else {
        const actualTimeMinutes = logActualTime ? Math.max(0, actualHours * 60 + actualMins) : 0
        result = await updateActivity(event.id, {
          title,
          description: description.trim() || null,
          date,
          time,
          duration: effectiveDuration,
          areaId: null,
          calendarId: calendarId || null,
          actualTimeMinutes: actualTimeMinutes > 0 ? actualTimeMinutes : undefined,
        })
      }

      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  function executeDelete(scope: 'single' | 'all') {
    setPendingAction(null)
    startTransition(async () => {
      const { deleteActivity, deleteActivityGroup } = await import('@/actions/calendar')
      let result
      if (scope === 'all' && event.recurrenceGroupId) {
        result = await deleteActivityGroup(event.recurrenceGroupId)
      } else {
        result = await deleteActivity(event.id)
      }
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <dialog
      ref={dialogRef}
      className="rounded-xl border border-border bg-card text-foreground shadow-xl backdrop:bg-black/40 p-0 w-full max-w-md"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      {/* Scope dialog for recurring events */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xl w-80 space-y-4">
            <p className="text-sm font-medium text-foreground">
              {pendingAction === 'save' ? '¿Guardar cambios en...' : '¿Eliminar...'}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() =>
                  pendingAction === 'save' ? executeSave('single') : executeDelete('single')
                }
                className="w-full rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
              >
                Solo esta ocurrencia
              </button>
              <button
                onClick={() =>
                  pendingAction === 'save' ? executeSave('all') : executeDelete('all')
                }
                className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors text-left ${
                  pendingAction === 'delete'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {pendingAction === 'delete'
                  ? 'Todos los eventos del grupo'
                  : 'Todo el grupo (aplica nueva recurrencia)'}
              </button>
              <button
                onClick={() => setPendingAction(null)}
                className="w-full rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors text-left"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground">Editar Actividad</h2>
          {isRecurring && <p className="text-xs text-muted-foreground mt-0.5">Evento recurrente</p>}
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form */}
      <div className="px-6 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Title */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas opcionales..."
            rows={2}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {/* Date + Time — solo visible para ocurrencia individual */}
        {!isRecurring && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Hora <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {/* Duration */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Duración</label>
          <select
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

        {/* Tiempo real gastado — solo para ocurrencias individuales */}
        {!isRecurring && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={logActualTime}
                onChange={(e) => setLogActualTime(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-sm font-medium text-foreground">
                Agregar tiempo real gastado
              </span>
            </label>
            {logActualTime && (
              <div className="flex items-center gap-2 pl-6">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={actualHours}
                    onChange={(e) =>
                      setActualHours(Math.max(0, Math.min(23, Number(e.target.value))))
                    }
                    className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-sm text-muted-foreground">h</span>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={actualMins}
                    onChange={(e) => setActualMins(Number(e.target.value))}
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
                  = {actualHours * 60 + actualMins} min
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Recurrencia — solo para eventos recurrentes ── */}
        {isRecurring && (
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Recurrencia
            </p>

            {/* Tipo */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Tipo</label>
              <select
                value={recType}
                onChange={(e) => {
                  const t = e.target.value as RecurrenceType
                  setRecType(t)
                  setRecCount(RECURRENCE_DEFAULTS[t] ?? 8)
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {(['daily', 'weekly', 'weekdays', 'monthly', 'yearly'] as RecurrenceType[]).map(
                  (t) => (
                    <option key={t} value={t}>
                      {RECURRENCE_LABELS[t]}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Fecha desde */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Aplicar desde</label>
              <input
                type="date"
                value={recFromDate}
                onChange={(e) => setRecFromDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                Las ocurrencias anteriores a esta fecha se conservan.
              </p>
            </div>

            {/* Condición de fin */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Termina</label>
              <div className="flex gap-2">
                {(
                  [
                    { v: 'count', label: 'Después de N' },
                    { v: 'date', label: 'El día' },
                    { v: 'never', label: 'Nunca' },
                  ] as { v: 'count' | 'date' | 'never'; label: string }[]
                ).map(({ v, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRecEndType(v)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                      recEndType === v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {recEndType === 'count' && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={recCount}
                    onChange={(e) => setRecCount(Math.max(1, Number(e.target.value)))}
                    className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-sm text-muted-foreground">ocurrencias</span>
                </div>
              )}

              {recEndType === 'date' && (
                <input
                  type="date"
                  value={recEndDate}
                  onChange={(e) => setRecEndDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                />
              )}
            </div>

            {/* Preview */}
            {recurrencePreview && (
              <p className="text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
                {recurrencePreview}
              </p>
            )}
          </div>
        )}

        {/* Calendar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Calendario</label>
            <button
              type="button"
              onClick={() => setShowNewCal((v) => !v)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3 w-3" /> Nuevo
            </button>
          </div>
          <select
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              <div className="flex gap-1">
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
                        setCalendarId(result.calendar!.id)
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
              </div>
              {newCalError && <p className="text-[10px] text-red-500 mt-1">{newCalError}</p>}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
          >
            Eliminar
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isPending || !title.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
