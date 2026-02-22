'use client'

// components/okrs/VisionCard.tsx
// Muestra y permite editar inline la narrativa de visión de 5 años.

import { useState, useTransition } from 'react'
import { upsertVision } from '@/actions/okrs'
import type { OKR } from '@/lib/db/schema/okrs'

interface VisionCardProps {
  /** Visión actual del usuario — null si aún no la ha definido. */
  vision: OKR | null
}

/**
 * Tarjeta de visión 5 años con edición inline.
 * Muestra la narrativa cuando existe; estado vacío con CTA cuando no.
 * La edición se activa con el botón "Editar visión" y no usa modal.
 */
export function VisionCard({ vision }: VisionCardProps) {
  const [isEditing, setIsEditing] = useState(!vision)
  const [title, setTitle] = useState(vision?.title ?? '')
  const [description, setDescription] = useState(vision?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await upsertVision({
        title: title.trim(),
        description: description.trim() || undefined,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setIsEditing(false)
      }
    })
  }

  function handleCancel() {
    setTitle(vision?.title ?? '')
    setDescription(vision?.description ?? '')
    setError(null)
    setIsEditing(false)
  }

  if (!vision && !isEditing) {
    // Estado vacío
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4 text-center">
        <span className="text-5xl">🔭</span>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Sin visión de largo plazo</h3>
          <p className="text-sm text-muted-foreground">
            Define tu visión de 5 años para anclar tus objetivos anuales.
          </p>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Define tu visión de 5 años
        </button>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold text-foreground">
          {vision ? 'Editar visión de 5 años' : 'Define tu visión de 5 años'}
        </h3>

        <div className="space-y-1">
          <label htmlFor="vision-title" className="block text-sm font-medium text-foreground">
            Título
          </label>
          <input
            id="vision-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Libertad financiera y salud óptima para mi familia"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="vision-desc" className="block text-sm font-medium text-foreground">
            Narrativa (opcional)
          </label>
          <textarea
            id="vision-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe en detalle cómo será tu vida en 5 años..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-2 justify-end">
          {vision && (
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isPending || !title.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            {isPending ? 'Guardando...' : 'Guardar visión'}
          </button>
        </div>
      </div>
    )
  }

  // Vista de lectura
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔭</span>
            <h3 className="text-base font-semibold text-foreground truncate">{vision!.title}</h3>
          </div>
          {vision!.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {vision!.description}
            </p>
          )}
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          Editar visión
        </button>
      </div>
    </div>
  )
}
