'use client'

// components/workflow/NodeSidebar.tsx
// Panel lateral para editar propiedades del nodo seleccionado (Task o Step).
// Aparece al hacer click en un nodo y muestra campos editables.

import type { Node } from '@xyflow/react'
import type { TaskNodeData, StepNodeData } from './types'

const STATUS_OPTIONS_TASK = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completado' },
  { value: 'skipped', label: 'Omitido' },
]

const STATUS_OPTIONS_STEP = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completado' },
  { value: 'skipped', label: 'Omitido' },
  { value: 'cancelled', label: 'Cancelado' },
]

const EXECUTOR_OPTIONS = [
  { value: 'human', label: 'Human' },
  { value: 'ai', label: 'AI' },
  { value: 'mixed', label: 'Mixed' },
]

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  skipped: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
}

interface NodeSidebarProps {
  node: Node
  onUpdate: (nodeId: string, updates: Partial<TaskNodeData | StepNodeData>) => void
  onClose: () => void
}

export default function NodeSidebar({ node, onUpdate, onClose }: NodeSidebarProps) {
  const isTask = node.type === 'task'
  const taskData = node.data as unknown as TaskNodeData & { onLabelChange?: unknown }
  const stepData = node.data as unknown as StepNodeData

  const label = isTask ? taskData.label : stepData.label
  const status = isTask ? taskData.status : stepData.status
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE.pending

  return (
    <aside className="flex w-72 flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${
              isTask ? 'bg-slate-600 text-white' : 'bg-blue-600 text-white'
            }`}
          >
            {isTask ? 'Task' : 'Step'}
          </span>
          <h3 className="text-sm font-semibold text-slate-800">Propiedades</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Cerrar panel"
        >
          ✕
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4 p-4">
        {/* Título */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Título</label>
          <input
            type="text"
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            value={label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          />
        </div>

        {/* Descripción (Step only) */}
        {!isTask && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Descripción</label>
            <textarea
              rows={2}
              className="w-full resize-none rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              value={stepData.description ?? ''}
              onChange={(e) => onUpdate(node.id, { description: e.target.value || null })}
              placeholder="Descripción opcional"
            />
          </div>
        )}

        {/* Executor Type (Step only) */}
        {!isTask && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Executor Type</label>
            <select
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              value={stepData.executorType}
              onChange={(e) =>
                onUpdate(node.id, { executorType: e.target.value as 'human' | 'ai' | 'mixed' })
              }
            >
              {EXECUTOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* AI Agent (Step only, visible si ai o mixed) */}
        {!isTask && (stepData.executorType === 'ai' || stepData.executorType === 'mixed') && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">AI Agent</label>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              value={stepData.aiAgent ?? ''}
              onChange={(e) => onUpdate(node.id, { aiAgent: e.target.value || null })}
              placeholder="@dev, @analyst, @qa…"
            />
          </div>
        )}

        {/* Verification Criteria (Step only) */}
        {!isTask && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Criterio de Verificación
            </label>
            <textarea
              rows={3}
              className="w-full resize-none rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              value={stepData.verificationCriteria ?? ''}
              onChange={(e) => onUpdate(node.id, { verificationCriteria: e.target.value || null })}
              placeholder="¿Cómo verificar que este step está completo?"
            />
          </div>
        )}

        {/* Status (no editable, solo informativo) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Estado</label>
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadge}`}>
              {(isTask ? STATUS_OPTIONS_TASK : STATUS_OPTIONS_STEP).find((o) => o.value === status)
                ?.label ?? status}
            </span>
            <span className="text-xs text-slate-400">(no editable en canvas)</span>
          </div>
        </div>

        {/* ID del nodo (debug info) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">ID</label>
          <p className="break-all font-mono text-xs text-slate-400">{node.id}</p>
        </div>
      </div>
    </aside>
  )
}
