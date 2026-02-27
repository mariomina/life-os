'use client'

// app/(app)/inbox/_components/InboxClient.tsx
// Client Component para la página de Inbox.
// Textarea de captura rápida + lista de items con filtros por estado.
// Story 6.1 — Captura Rápida Inbox.

import { useState, useTransition, useRef } from 'react'
import { createInboxItem, discardInboxItem } from '@/actions/inbox'
import type { InboxItem } from '@/lib/db/schema/inbox-items'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'processed' | 'discarded'

interface InboxClientProps {
  initialItems: InboxItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<InboxItem['status'], string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  processed: 'Procesado',
  manual: 'Manual',
  discarded: 'Descartado',
}

const STATUS_BADGE_COLORS: Record<InboxItem['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  processed: 'bg-green-100 text-green-800',
  manual: 'bg-purple-100 text-purple-800',
  discarded: 'bg-gray-100 text-gray-500',
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'ahora mismo'
  if (diffMins < 60) return `hace ${diffMins} min`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `hace ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `hace ${diffDays}d`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InboxClient({ initialItems }: InboxClientProps) {
  const [items, setItems] = useState<InboxItem[]>(initialItems)
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed) return
    setErrorMsg(null)

    startTransition(async () => {
      const result = await createInboxItem(trimmed)
      if (!result.success) {
        setErrorMsg(result.error ?? 'Error al guardar')
        return
      }
      // Optimistic: prepend new item placeholder — page revalidation brings real data
      setText('')
      textareaRef.current?.focus()
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // ── Discard ───────────────────────────────────────────────────────────────

  function handleDiscard(itemId: string) {
    startTransition(async () => {
      const result = await discardInboxItem(itemId)
      if (!result.success) {
        setErrorMsg(result.error ?? 'Error al descartar')
        return
      }
      // Optimistic update
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: 'discarded' as const } : item))
      )
    })
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true
    return item.status === filter
  })

  const pendingCount = items.filter((i) => i.status === 'pending').length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Capture area */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-foreground">
          ¿Qué tienes en mente?
        </label>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe algo rápido... (Enter para guardar, Shift+Enter para nueva línea)"
          rows={3}
          disabled={isPending}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        {errorMsg && <p className="mt-1 text-xs text-destructive">{errorMsg}</p>}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`
              : 'Sin pendientes'}
          </span>
          <button
            onClick={handleSubmit}
            disabled={isPending || !text.trim()}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'processed', 'discarded'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f === 'all' ? 'Todos' : STATUS_LABELS[f as InboxItem['status']]}
          </button>
        ))}
      </div>

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {filter === 'all' ? 'No hay items en el inbox.' : 'No hay items con este filtro.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{item.rawText}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_COLORS[item.status]}`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(new Date(item.createdAt))}
                  </span>
                </div>
              </div>

              {item.status === 'pending' && (
                <button
                  onClick={() => handleDiscard(item.id)}
                  disabled={isPending}
                  title="Descartar"
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
