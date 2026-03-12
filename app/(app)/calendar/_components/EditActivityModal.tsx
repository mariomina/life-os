'use client'

// app/(app)/calendar/_components/EditActivityModal.tsx
// Modal para editar o eliminar una actividad existente.
// Story 10.9: Edición con soporte para eventos recurrentes (scope: una sola / todas).

import { useRef, useEffect, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { X, Plus, Check, CalendarDays, RefreshCw, Clock, Trash2 } from 'lucide-react'
import type { ICalendarEvent } from '@/lib/calendar/calendar-utils'
import type { Calendar } from '@/lib/db/queries/calendars'
import type { AreaOption } from '@/actions/calendar'
import type { AreaSubarea } from '@/lib/db/schema/area-subareas'
import {
  RECURRENCE_LABELS,
  RECURRENCE_DEFAULTS,
  describeRecurrence,
} from '@/lib/calendar/recurrence-utils'
import type { RecurrenceType, RecurrenceOptions } from '@/lib/calendar/recurrence-utils'
import { ColorPicker, CALENDAR_COLORS } from './CalendarSidebar'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function calcDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let diff = eh * 60 + em - (sh * 60 + sm)
  if (diff <= 0) diff += 24 * 60 // cruce de medianoche
  return Math.max(1, diff)
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface EditActivityModalProps {
  event: ICalendarEvent
  onClose: () => void
  calendars?: Calendar[]
  onSaved?: (eventId: string, date: string, time: string, duration: number) => void
}

// ─── EditActivityModal ─────────────────────────────────────────────────────────

export function EditActivityModal({
  event,
  onClose,
  calendars = [],
  onSaved,
}: EditActivityModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Form state ─────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description ?? '')
  const [date, setDate] = useState(format(event.start, 'yyyy-MM-dd'))
  const [time, setTime] = useState(format(event.start, 'HH:mm'))
  const [endTime, setEndTime] = useState(format(event.end, 'HH:mm'))
  const [calendarId, setCalendarId] = useState(event.calendarId ?? '')

  // ── Recurrence state (solo cuando isRecurring) ────────────────────────────
  const isRecurring = !!event.recurrenceGroupId
  const initialRecType = (event.recurrenceType as RecurrenceType) ?? 'weekly'
  const [recType, setRecType] = useState<RecurrenceType>(initialRecType)
  const [recEndType, setRecEndType] = useState<'count' | 'date' | 'never'>('never')
  const [recCount, setRecCount] = useState(RECURRENCE_DEFAULTS[initialRecType] ?? 8)
  const [recEndDate, setRecEndDate] = useState('')
  const [recFromDate, setRecFromDate] = useState(format(event.start, 'yyyy-MM-dd'))

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

  // ── Duración derivada de hora inicio/fin ──────────────────────────────────
  const effectiveDuration = calcDuration(time, endTime)

  // ── Calendarios + inline create ───────────────────────────────────────────
  const [localCalendars, setLocalCalendars] = useState<Calendar[]>(calendars)
  const [showNewCal, setShowNewCal] = useState(false)
  const [newCalName, setNewCalName] = useState('')
  const [newCalColor, setNewCalColor] = useState<string>(CALENDAR_COLORS[0])
  const [newCalError, setNewCalError] = useState<string | null>(null)
  const [isCreatingCal, setIsCreatingCal] = useState(false)

  // ── Area + Subarea ─────────────────────────────────────────────────────────
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState(event.areaId ?? '')
  const [subareas, setSubareas] = useState<AreaSubarea[]>([])
  const [selectedSubareaId, setSelectedSubareaId] = useState(event.subareaId ?? '')

  // ── Scope para recurrentes: elegido arriba del formulario ─────────────────
  const [editScope, setEditScope] = useState<'single' | 'all'>('single')
  const [pendingDelete, setPendingDelete] = useState(false)

  // ── Lifecycle ─────────────────────────────────────────────────────────────

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
      return
    }
    import('@/lib/db/queries/areas').then(({ getSubareasByArea }) => {
      getSubareasByArea(selectedAreaId)
        .then(setSubareas)
        .catch(() => setSubareas([]))
    })
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSaveClick() {
    executeSave(isRecurring ? editScope : 'single')
  }

  function handleDeleteClick() {
    if (isRecurring) {
      setPendingDelete(true)
    } else {
      if (!window.confirm(`¿Eliminar "${event.title}"?`)) return
      executeDelete('single')
    }
  }

  function executeSave(scope: 'single' | 'all') {
    setError(null)
    startTransition(async () => {
      const { updateActivity, updateActivityGroup, changeGroupRecurrence } =
        await import('@/actions/calendar')
      let result

      const resolvedAreaId = selectedAreaId || null
      const resolvedSubareaId = selectedSubareaId || null

      if (scope === 'all' && event.recurrenceGroupId) {
        result = await updateActivityGroup(event.recurrenceGroupId, {
          title,
          description: description.trim() || null,
          duration: effectiveDuration,
          areaId: resolvedAreaId,
          subareaId: resolvedSubareaId,
          calendarId: calendarId || null,
          time,
        })
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
        result = await updateActivity(event.id, {
          title,
          description: description.trim() || null,
          date,
          time,
          duration: effectiveDuration,
          areaId: resolvedAreaId,
          subareaId: resolvedSubareaId,
          calendarId: calendarId || null,
        })
      }

      if (result.error) {
        setError(result.error)
      } else {
        if (scope === 'single') {
          onSaved?.(event.id, date, time, effectiveDuration)
        }
        onClose()
      }
    })
  }

  function executeDelete(scope: 'single' | 'all') {
    setPendingDelete(false)
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

  // ── Render ────────────────────────────────────────────────────────────────

  // Color indicator del calendario
  const calColor = localCalendars.find((c) => c.id === calendarId)?.color ?? event.calendarColor

  return (
    <dialog
      ref={dialogRef}
      className="m-auto rounded-2xl border border-border bg-card text-foreground shadow-2xl backdrop:bg-black/50 p-0 w-full max-w-md"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      {/* Confirm dialog solo para eliminar recurrentes */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl w-80 space-y-4">
            <p className="text-sm font-semibold text-foreground">¿Eliminar...?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => executeDelete('single')}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
              >
                Solo esta ocurrencia
              </button>
              <button
                onClick={() => executeDelete('all')}
                className="w-full rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors text-left"
              >
                Todos los eventos del grupo
              </button>
              <button
                onClick={() => setPendingDelete(false)}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors text-left"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          {/* Dot indicador de color del calendario */}
          {calColor && (
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: calColor }} />
          )}
          <div>
            <h2 className="text-base font-semibold text-foreground leading-tight">
              Editar actividad
            </h2>
            {isRecurring && (
              <div className="flex items-center gap-1 mt-0.5">
                <RefreshCw className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Recurrente</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Selector de scope para recurrentes ─────────────────────────────── */}
      {isRecurring && (
        <div className="px-5 py-3 border-b border-border bg-muted/10">
          <p className="text-xs text-muted-foreground mb-2">¿Qué quieres editar?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditScope('single')}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors text-left ${
                editScope === 'single'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              Solo este día
            </button>
            <button
              type="button"
              onClick={() => setEditScope('all')}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors text-left ${
                editScope === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              Toda la serie
            </button>
          </div>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {/* Título */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Nombre de la actividad"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas opcionales..."
            rows={2}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {/* Fecha — para no recurrentes y para "solo este día" */}
        {(!isRecurring || editScope === 'single') && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              readOnly={isRecurring && editScope === 'single'}
              className={`w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRecurring && editScope === 'single' ? 'opacity-60 cursor-default' : ''}`}
            />
            {isRecurring && editScope === 'single' && (
              <p className="text-xs text-muted-foreground">
                Solo se editan los cambios de este día.
              </p>
            )}
          </div>
        )}

        {/* Hora inicio + Hora fin */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Inicio
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Fin
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Duración: {formatDuration(effectiveDuration)}
        </p>

        {/* ── Recurrencia — solo cuando se edita toda la serie ── */}
        {isRecurring && editScope === 'all' && (
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Recurrencia
              </p>
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['daily', 'weekdays', 'weekly', 'monthly', 'yearly'] as RecurrenceType[]).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setRecType(t)
                        setRecCount(RECURRENCE_DEFAULTS[t] ?? 8)
                      }}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                        recType === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {RECURRENCE_LABELS[t]}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Fecha desde */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Aplicar desde</label>
              <input
                type="date"
                value={recFromDate}
                onChange={(e) => setRecFromDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                Las ocurrencias anteriores se conservan.
              </p>
            </div>

            {/* Condición de fin */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Termina</label>
              <div className="flex gap-1.5">
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
                    className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
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

        {/* Área + Sub-área */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Área
          </label>
          <select
            value={selectedAreaId}
            onChange={(e) => {
              setSelectedAreaId(e.target.value)
              setSelectedSubareaId('')
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sub-área{' '}
              <span className="text-muted-foreground font-normal normal-case">(opcional)</span>
            </label>
            <select
              value={selectedSubareaId}
              onChange={(e) => setSelectedSubareaId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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

        {/* Calendario */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Sin calendario</option>
            {localCalendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name}
              </option>
            ))}
          </select>
          {showNewCal && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
              <input
                type="text"
                autoFocus
                value={newCalName}
                onChange={(e) => setNewCalName(e.target.value)}
                placeholder="Nombre del calendario"
                maxLength={60}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <ColorPicker value={newCalColor} onChange={setNewCalColor} />
              <div className="flex gap-1.5">
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
                  className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" /> {isCreatingCal ? 'Creando...' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCal(false)
                    setNewCalName('')
                    setNewCalError(null)
                  }}
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="h-3 w-3" /> Cancelar
                </button>
              </div>
              {newCalError && <p className="text-[10px] text-red-500">{newCalError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10 rounded-b-2xl">
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
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
    </dialog>
  )
}
