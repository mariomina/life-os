'use client'

// app/(app)/calendar/_components/CalendarSidebar.tsx
// Panel lateral estilo Google Calendar para Calendarios Personalizados.
// Story 10.2 (AC2, AC3, AC4).

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Pencil, Check, X, Plus, ArrowLeft } from 'lucide-react'
import type { Calendar } from '@/lib/db/queries/calendars'

// ─── Paleta de colores (estilo Google Calendar) ───────────────────────────────

const CALENDAR_COLORS = [
  '#4285F4', // Azul Google
  '#34A853', // Verde Google
  '#EA4335', // Rojo Google
  '#FBBC04', // Amarillo Google
  '#FF6D01', // Naranja
  '#46BDC6', // Cian
  '#7986CB', // Índigo
  '#E91E63', // Rosa
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'calendar_visibility_'

function loadHiddenCalendars(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const hidden = new Set<string>()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      const calendarId = key.slice(STORAGE_PREFIX.length)
      const value = localStorage.getItem(key)
      if (value === 'hidden') hidden.add(calendarId)
    }
  }
  return hidden
}

// ─── CalendarItem ─────────────────────────────────────────────────────────────

// ─── CalendarEditForm ─────────────────────────────────────────────────────────
// Separate component so it mounts fresh (with current values) every time edit mode opens.

function CalendarEditForm({
  calendar,
  onSave,
  onCancel,
}: {
  calendar: Calendar
  onSave: (id: string, name: string, color: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(calendar.name)
  const [color, setColor] = useState<string>(calendar.color)

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        maxLength={60}
      />
      <div className="flex flex-wrap gap-1.5">
        {CALENDAR_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => setColor(c)}
            className="h-5 w-5 rounded-full transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              outline: color === c ? `2px solid ${c}` : 'none',
              outlineOffset: '2px',
            }}
          />
        ))}
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => {
            if (name.trim()) onSave(calendar.id, name.trim(), color)
          }}
          className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Check className="h-2.5 w-2.5" /> Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-2.5 w-2.5" /> Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── CalendarItem ─────────────────────────────────────────────────────────────

function CalendarItem({
  calendar,
  isHidden,
  isEditing,
  onToggleVisibility,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: {
  calendar: Calendar
  isHidden: boolean
  isEditing: boolean
  onToggleVisibility: (id: string) => void
  onStartEdit: (id: string) => void
  onSaveEdit: (id: string, name: string, color: string) => void
  onCancelEdit: () => void
}) {
  if (isEditing) {
    return <CalendarEditForm calendar={calendar} onSave={onSaveEdit} onCancel={onCancelEdit} />
  }

  return (
    <div className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50 transition-colors">
      {/* Color dot */}
      <span
        className="h-3 w-3 shrink-0 rounded-full transition-opacity"
        style={{ backgroundColor: calendar.color, opacity: isHidden ? 0.35 : 1 }}
      />

      {/* Name — click to edit */}
      <button
        type="button"
        onClick={() => onStartEdit(calendar.id)}
        className={`flex-1 text-left text-xs truncate transition-opacity ${isHidden ? 'opacity-40' : 'text-foreground'}`}
      >
        {calendar.name}
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onStartEdit(calendar.id)}
          aria-label={`Editar ${calendar.name}`}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-2.5 w-2.5" />
        </button>
        <button
          type="button"
          onClick={() => onToggleVisibility(calendar.id)}
          aria-label={isHidden ? `Mostrar ${calendar.name}` : `Ocultar ${calendar.name}`}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground"
        >
          {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      </div>
    </div>
  )
}

// ─── NewCalendarForm ──────────────────────────────────────────────────────────

function NewCalendarForm({
  onSave,
  onCancel,
}: {
  onSave: (name: string, color: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(CALENDAR_COLORS[0])

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2 mt-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del calendario"
        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        maxLength={60}
      />
      <div className="flex flex-wrap gap-1.5">
        {CALENDAR_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => setColor(c)}
            className="h-5 w-5 rounded-full transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              outline: color === c ? `2px solid ${c}` : 'none',
              outlineOffset: '2px',
            }}
          />
        ))}
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => {
            if (name.trim()) onSave(name.trim(), color)
          }}
          className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Check className="h-2.5 w-2.5" /> Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-2.5 w-2.5" /> Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── CalendarSidebar ──────────────────────────────────────────────────────────

export interface CalendarSidebarProps {
  calendars: Calendar[]
  onVisibilityChange: (hiddenCalendarIds: Set<string>) => void
}

export function CalendarSidebar({ calendars, onVisibilityChange }: CalendarSidebarProps) {
  const router = useRouter()

  // Visibility state — loaded from localStorage
  const [hiddenCalendars, setHiddenCalendars] = useState<Set<string>>(() => loadHiddenCalendars())

  // Local list (updates optimistically after create/edit)
  const [localCalendars, setLocalCalendars] = useState<Calendar[]>(calendars)

  // UI state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync local calendars when prop changes
  useEffect(() => {
    setLocalCalendars(calendars)
  }, [calendars])

  function toggleVisibility(calendarId: string) {
    const next = new Set(hiddenCalendars)
    if (next.has(calendarId)) {
      next.delete(calendarId)
      localStorage.removeItem(`${STORAGE_PREFIX}${calendarId}`)
    } else {
      next.add(calendarId)
      localStorage.setItem(`${STORAGE_PREFIX}${calendarId}`, 'hidden')
    }
    setHiddenCalendars(next)
    onVisibilityChange(next)
  }

  async function handleSaveEdit(id: string, name: string, color: string) {
    if (isSaving) return
    setIsSaving(true)
    try {
      const { updateCalendar } = await import('@/actions/calendars')
      const result = await updateCalendar(id, { name, color })
      if (!result.error && result.calendar) {
        setLocalCalendars((prev) => prev.map((c) => (c.id === id ? { ...c, name, color } : c)))
      }
    } finally {
      setIsSaving(false)
      setEditingId(null)
    }
  }

  async function handleCreate(name: string, color: string) {
    if (isSaving) return
    setIsSaving(true)
    try {
      const { createCalendar } = await import('@/actions/calendars')
      const result = await createCalendar({ name, color })
      if (!result.error && result.calendar) {
        setLocalCalendars((prev) => [...prev, result.calendar!])
        setIsCreating(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full border-r border-border bg-background">
      {/* Calendars list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Mis Calendarios
          </p>

          {localCalendars.length === 0 && !isCreating && (
            <p className="text-xs text-muted-foreground py-2">Sin calendarios. Crea el primero.</p>
          )}

          <div className="space-y-0.5">
            {localCalendars.map((cal) => (
              <CalendarItem
                key={cal.id}
                calendar={cal}
                isHidden={hiddenCalendars.has(cal.id)}
                isEditing={editingId === cal.id}
                onToggleVisibility={toggleVisibility}
                onStartEdit={(id) => {
                  setEditingId(id)
                  setIsCreating(false)
                }}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingId(null)}
              />
            ))}
          </div>

          {/* New calendar form / button */}
          {isCreating ? (
            <NewCalendarForm onSave={handleCreate} onCancel={() => setIsCreating(false)} />
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsCreating(true)
                setEditingId(null)
              }}
              className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
            >
              <Plus className="h-3 w-3" />
              Nuevo calendario
            </button>
          )}
        </section>
      </div>

      {/* Footer — Salir */}
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Salir del Calendario
        </button>
      </div>
    </aside>
  )
}
