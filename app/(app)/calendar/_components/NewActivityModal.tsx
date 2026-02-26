'use client'

// app/(app)/calendar/_components/NewActivityModal.tsx
// Modal dialog for creating a new spontaneous activity in the calendar.
// Story 5.7 — CRUD Eventos desde el Calendario.

import { useRef, useEffect, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { createActivity } from '@/actions/calendar'
import type { AreaOption } from '@/actions/calendar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewActivityModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate: Date
  areas: AreaOption[]
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

// ─── NewActivityModal ─────────────────────────────────────────────────────────

export function NewActivityModal({ isOpen, onClose, defaultDate, areas }: NewActivityModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Default time: next round hour
  const defaultTime = (() => {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    now.setHours(now.getHours() + 1)
    return format(now, 'HH:mm')
  })()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

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

  if (!isOpen) return null

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
      <form action={handleSubmit} className="px-6 py-4 space-y-4">
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
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || areas.length === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
