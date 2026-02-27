'use client'

// app/(app)/inbox/_components/InboxClient.tsx
// Client Component para la página de Inbox.
// Textarea de captura rápida + lista de items con filtros por estado.
// Story 6.1 — Captura Rápida Inbox.
// Story 6.3 — Propuesta IA (tarjeta de propuesta + botones Procesar/Confirmar).
// Story 6.4 — Detección de proyecto emergente (ProjectProposalCard).

import { useState, useTransition, useRef } from 'react'
import {
  createInboxItem,
  discardInboxItem,
  processInboxItem,
  confirmInboxProposal,
  createProjectFromInbox,
} from '@/actions/inbox'
import type { InboxItem } from '@/lib/db/schema/inbox-items'
import type { WorkflowTemplate } from '@/lib/db/queries/workflow-templates'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'processed' | 'discarded'

interface InboxClientProps {
  initialItems: InboxItem[]
  templates: WorkflowTemplate[]
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

function formatSlot(date: Date): string {
  return new Intl.DateTimeFormat('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ─── ProposalCard sub-component ───────────────────────────────────────────────

interface ProposalCardProps {
  item: InboxItem
  onConfirm: (itemId: string) => void
  onDiscard: (itemId: string) => void
  isLoading: boolean
  confirmedId: string | null
}

function ProposalCard({ item, onConfirm, onDiscard, isLoading, confirmedId }: ProposalCardProps) {
  const isConfirmed = confirmedId === item.id

  if (isConfirmed) {
    return (
      <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3">
        <p className="text-sm font-medium text-green-700">✓ Activity creada en el calendario</p>
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Propuesta IA</p>
      {item.aiSuggestedTitle && (
        <p className="text-sm font-medium text-foreground">{item.aiSuggestedTitle}</p>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {item.aiSuggestedSlot && <span>📅 {formatSlot(new Date(item.aiSuggestedSlot))}</span>}
        {item.aiSuggestedDurationMinutes && (
          <span>⏱ {formatDuration(item.aiSuggestedDurationMinutes)}</span>
        )}
        {item.aiClassification && <span className="capitalize">🏷 {item.aiClassification}</span>}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onConfirm(item.id)}
          disabled={isLoading}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? 'Confirmando...' : '✓ Confirmar'}
        </button>
        <button
          onClick={() => onDiscard(item.id)}
          disabled={isLoading}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          Descartar
        </button>
      </div>
    </div>
  )
}

// ─── ProjectProposalCard sub-component ───────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  personal_development: 'Desarrollo Personal',
  product_launch: 'Lanzamiento de Producto',
  health_sprint: 'Health Sprint',
  learning: 'Aprendizaje',
  content_creation: 'Creación de Contenido',
  financial_review: 'Revisión Financiera',
  habit_building: 'Hábitos',
  custom: 'Personalizado',
}

interface ProjectProposalCardProps {
  item: InboxItem
  templates: WorkflowTemplate[]
  onCreateProject: (itemId: string, templateId?: string) => void
  onDiscard: (itemId: string) => void
  isLoading: boolean
  confirmedProjectId: string | null
}

function ProjectProposalCard({
  item,
  templates,
  onCreateProject,
  onDiscard,
  isLoading,
  confirmedProjectId,
}: ProjectProposalCardProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const isConfirmed = confirmedProjectId === item.id

  if (isConfirmed) {
    return (
      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-sm font-medium text-emerald-700">✓ Proyecto creado. Ver en Proyectos.</p>
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
        Proyecto Detectado
      </p>
      {item.aiSuggestedTitle && (
        <p className="text-sm font-medium text-foreground">{item.aiSuggestedTitle}</p>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {item.aiClassification && <span className="capitalize">📁 {item.aiClassification}</span>}
      </div>
      {templates.length > 0 && (
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Template de workflow</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="">Sin template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {CATEGORY_LABELS[t.category] ?? t.category}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onCreateProject(item.id, selectedTemplateId || undefined)}
          disabled={isLoading}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? 'Creando...' : '✓ Crear Proyecto'}
        </button>
        <button
          onClick={() => onDiscard(item.id)}
          disabled={isLoading}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          Descartar
        </button>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InboxClient({ initialItems, templates }: InboxClientProps) {
  const [items, setItems] = useState<InboxItem[]>(initialItems)
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmedId, setConfirmedId] = useState<string | null>(null)
  const [confirmedProjectId, setConfirmedProjectId] = useState<string | null>(null)
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

  // ── Process (IA) ──────────────────────────────────────────────────────────

  function handleProcess(itemId: string) {
    setErrorMsg(null)
    // Optimistic: show 'processing' immediately
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: 'processing' as const } : item))
    )
    startTransition(async () => {
      const result = await processInboxItem(itemId)
      if (!result.success) {
        setErrorMsg(result.error ?? 'Error al procesar')
        // Revert optimistic
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, status: 'pending' as const } : item))
        )
      }
      // On success, revalidatePath in the action will refresh the page data
    })
  }

  // ── Confirm ───────────────────────────────────────────────────────────────

  function handleConfirm(itemId: string) {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await confirmInboxProposal(itemId)
      if (!result.success) {
        setErrorMsg(result.error ?? 'Error al confirmar')
        return
      }
      setConfirmedId(itemId)
    })
  }

  // ── Create Project ────────────────────────────────────────────────────────

  function handleCreateProject(itemId: string, templateId?: string) {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await createProjectFromInbox(itemId, templateId)
      if (!result.success) {
        setErrorMsg(result.error ?? 'Error al crear el proyecto')
        return
      }
      setConfirmedProjectId(itemId)
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

                {/* Project proposal card for processed items classified as 'project' */}
                {item.status === 'processed' &&
                  item.aiClassification === 'project' &&
                  !item.projectId && (
                    <ProjectProposalCard
                      item={item}
                      templates={templates}
                      onCreateProject={handleCreateProject}
                      onDiscard={handleDiscard}
                      isLoading={isPending}
                      confirmedProjectId={confirmedProjectId}
                    />
                  )}

                {/* Activity proposal card for processed items NOT classified as project */}
                {item.status === 'processed' &&
                  item.aiClassification !== 'project' &&
                  !item.stepActivityId && (
                    <ProposalCard
                      item={item}
                      onConfirm={handleConfirm}
                      onDiscard={handleDiscard}
                      isLoading={isPending}
                      confirmedId={confirmedId}
                    />
                  )}

                {/* Already confirmed as activity */}
                {item.status === 'processed' && item.stepActivityId && (
                  <p className="mt-1 text-xs text-green-600">✓ Activity en calendario</p>
                )}

                {/* Already converted to project */}
                {item.status === 'processed' && item.projectId && (
                  <p className="mt-1 text-xs text-violet-600">✓ Proyecto creado</p>
                )}

                {/* Manual fallback — show AI error if any */}
                {item.status === 'manual' && item.aiError && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    IA no disponible: procesamiento manual
                  </p>
                )}
              </div>

              {/* Action buttons by status */}
              <div className="flex shrink-0 gap-1">
                {item.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleProcess(item.id)}
                      disabled={isPending}
                      title="Procesar con IA"
                      className="rounded p-1 text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                    >
                      ✨
                    </button>
                    <button
                      onClick={() => handleDiscard(item.id)}
                      disabled={isPending}
                      title="Descartar"
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
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
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
