'use client'

// app/(app)/calendar/_components/CalendarSidebar.tsx
// Panel lateral estilo Google Calendar para Calendarios Personalizados.
// Story 10.2 (AC2, AC3, AC4) + Story 10.10: checkbox coloreado, 20 colores, drag to reorder.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Plus, ArrowLeft, GripVertical, RefreshCw, Trash2 } from 'lucide-react'
import type { Calendar } from '@/lib/db/queries/calendars'

// ─── Paleta de colores extendida (20 colores Google/Material) ─────────────────

export const CALENDAR_COLORS = [
  '#4285F4', // Azul Google
  '#34A853', // Verde Google
  '#EA4335', // Rojo Google
  '#FBBC04', // Amarillo Google
  '#FF6D01', // Naranja
  '#46BDC6', // Cian
  '#7986CB', // Índigo
  '#E91E63', // Rosa
  '#9C27B0', // Morado
  '#00BCD4', // Cian claro
  '#009688', // Teal
  '#8BC34A', // Verde lima
  '#FF5722', // Naranja profundo
  '#795548', // Marrón
  '#607D8B', // Azul grisáceo
  '#3F51B5', // Azul índigo
  '#673AB7', // Morado profundo
  '#F06292', // Rosa suave
  '#26A69A', // Teal suave
  '#F4511E', // Tomate
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

// ─── ColorPicker ─────────────────────────────────────────────────────────────

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CALENDAR_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => onChange(c)}
          className="h-5 w-5 rounded-full transition-transform hover:scale-110"
          style={{
            backgroundColor: c,
            outline: value === c ? `2px solid ${c}` : 'none',
            outlineOffset: '2px',
          }}
        />
      ))}
    </div>
  )
}

// ─── CalendarEditForm ─────────────────────────────────────────────────────────

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
      <ColorPicker value={color} onChange={setColor} />
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
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  calendar: Calendar
  isHidden: boolean
  isEditing: boolean
  onToggleVisibility: (id: string) => void
  onStartEdit: (id: string) => void
  onSaveEdit: (id: string, name: string, color: string) => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (id: string) => void
  isDragOver: boolean
}) {
  if (isEditing) {
    return <CalendarEditForm calendar={calendar} onSave={onSaveEdit} onCancel={onCancelEdit} />
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(calendar.id)}
      onDragOver={(e) => onDragOver(e, calendar.id)}
      onDrop={() => onDrop(calendar.id)}
      className={`group flex items-center gap-1.5 rounded-md px-1 py-1 hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing${isDragOver ? ' border-t-2 border-primary' : ''}`}
    >
      {/* Drag handle */}
      <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Checkbox coloreado — click para toggle visibilidad */}
      <button
        type="button"
        onClick={() => onToggleVisibility(calendar.id)}
        aria-label={isHidden ? `Mostrar ${calendar.name}` : `Ocultar ${calendar.name}`}
        className="shrink-0 h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: calendar.color,
          backgroundColor: isHidden ? 'transparent' : calendar.color,
        }}
      >
        {!isHidden && (
          <svg className="h-2 w-2 text-white" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Name — click to edit */}
      <button
        type="button"
        onClick={() => onStartEdit(calendar.id)}
        className={`flex-1 text-left text-xs truncate transition-opacity ${isHidden ? 'opacity-40' : 'text-foreground'}`}
      >
        {calendar.name}
      </button>

      {/* Edit — hover only */}
      <button
        type="button"
        onClick={() => onStartEdit(calendar.id)}
        aria-label={`Editar ${calendar.name}`}
        className="p-0.5 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Pencil className="h-2.5 w-2.5" />
      </button>

      {/* Sync button — only for Clases Régimen Sierra */}
      {calendar.name.toLowerCase().includes('régimen sierra') && (
        <SyncSierraButton calendarId={calendar.id} />
      )}

      {/* Delete — hover only, no default calendars */}
      {!calendar.isDefault && (
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                `¿Eliminar el calendario "${calendar.name}"? Esta acción no se puede deshacer.`
              )
            ) {
              onDelete(calendar.id)
            }
          }}
          aria-label={`Eliminar ${calendar.name}`}
          className="p-0.5 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  )
}

// ─── SyncSierraButton ────────────────────────────────────────────────────────

function SyncSierraButton({ calendarId }: { calendarId: string }) {
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setMsg(null)
    try {
      const { syncSierraSchoolCalendar } = await import('@/actions/calendar')
      const result = await syncSierraSchoolCalendar(calendarId)
      if (result.error) {
        setMsg(`Error: ${result.error}`)
      } else if (result.synced === 0) {
        setMsg('Ya sincronizado')
      } else {
        setMsg(`${result.synced} clases añadidas`)
      }
    } finally {
      setSyncing(false)
      setTimeout(() => setMsg(null), 3000)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        title="Sincronizar clases Régimen Sierra 2025-2026"
        className="p-0.5 rounded text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
      >
        <RefreshCw className={`h-2.5 w-2.5 ${syncing ? 'animate-spin' : ''}`} />
      </button>
      {msg && (
        <div className="absolute right-0 top-5 z-50 bg-popover border border-border rounded px-2 py-1 text-[10px] text-foreground whitespace-nowrap shadow">
          {msg}
        </div>
      )}
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
      <ColorPicker value={color} onChange={setColor} />
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

  const [hiddenCalendars, setHiddenCalendars] = useState<Set<string>>(() => loadHiddenCalendars())
  const [localCalendars, setLocalCalendars] = useState<Calendar[]>(calendars)
  const draggingIdRef = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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

  async function handleDelete(id: string) {
    const { deleteCalendar } = await import('@/actions/calendars')
    const result = await deleteCalendar(id)
    if (result.error) {
      alert(`No se pudo eliminar: ${result.error}`)
      return
    }
    setLocalCalendars((prev) => prev.filter((c) => c.id !== id))
    // Limpiar visibilidad guardada
    localStorage.removeItem(`${STORAGE_PREFIX}${id}`)
    setHiddenCalendars((prev) => {
      const next = new Set(prev)
      next.delete(id)
      onVisibilityChange(next)
      return next
    })
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

  // ── Drag to reorder ──────────────────────────────────────────────────────────

  function handleDragStart(id: string) {
    draggingIdRef.current = id
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    setDragOverId(targetId)
  }

  async function handleDrop(targetId: string) {
    const sourceId = draggingIdRef.current
    draggingIdRef.current = null
    setDragOverId(null)
    if (!sourceId || sourceId === targetId) return

    const next = [...localCalendars]
    const fromIdx = next.findIndex((c) => c.id === sourceId)
    const toIdx = next.findIndex((c) => c.id === targetId)
    if (fromIdx < 0 || toIdx < 0) return

    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setLocalCalendars(next)

    const { reorderCalendars } = await import('@/actions/calendars')
    await reorderCalendars(next.map((c) => c.id))
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full border-r border-border bg-background">
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Mis Calendarios
          </p>

          {localCalendars.length === 0 && !isCreating && (
            <p className="text-xs text-muted-foreground py-2">Sin calendarios. Crea el primero.</p>
          )}

          <div
            className="space-y-0.5"
            onDragEnd={() => {
              draggingIdRef.current = null
              setDragOverId(null)
            }}
          >
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
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragOver={dragOverId === cal.id}
              />
            ))}
          </div>

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
