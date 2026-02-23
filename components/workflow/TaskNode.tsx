'use client'

// components/workflow/TaskNode.tsx
// Nodo Task para el Visual Workflow Builder.
// Representa una fase/tarea dentro del workflow — rectángulo azul-gris con título editable inline.

import { memo, useState, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { TaskNodeData } from './types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  skipped: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  skipped: 'Omitido',
}

function TaskNode({ data, selected }: NodeProps) {
  const taskData = data as unknown as TaskNodeData & { onLabelChange?: (label: string) => void }
  const [editing, setEditing] = useState(false)
  const [localLabel, setLocalLabel] = useState(taskData.label)

  const handleDoubleClick = useCallback(() => {
    setEditing(true)
  }, [])

  const handleBlur = useCallback(() => {
    setEditing(false)
    const trimmed = localLabel.trim() || 'Nueva Task'
    setLocalLabel(trimmed)
    if (taskData.onLabelChange) {
      taskData.onLabelChange(trimmed)
    }
  }, [localLabel, taskData])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur()
      }
      if (e.key === 'Escape') {
        setLocalLabel(taskData.label)
        setEditing(false)
      }
    },
    [taskData.label]
  )

  const statusBadge = STATUS_COLORS[taskData.status] ?? STATUS_COLORS.pending
  const statusLabel = STATUS_LABELS[taskData.status] ?? 'Pendiente'

  return (
    <div
      className={`min-w-[160px] max-w-[240px] rounded-lg border-2 bg-white shadow-sm transition-shadow ${
        selected ? 'border-blue-500 shadow-md' : 'border-slate-300'
      }`}
    >
      {/* Header */}
      <div className="rounded-t-md bg-slate-600 px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-200">Task</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {editing ? (
          <input
            autoFocus
            className="w-full rounded border border-blue-400 bg-blue-50 px-1 py-0.5 text-sm font-medium text-slate-800 outline-none"
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p
            className="cursor-text text-sm font-medium text-slate-800"
            onDoubleClick={handleDoubleClick}
            title="Doble click para editar"
          >
            {localLabel}
          </p>
        )}

        {/* Status badge */}
        <span className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-xs ${statusBadge}`}>
          {statusLabel}
        </span>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-400 !bg-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-slate-400 !bg-white"
      />
    </div>
  )
}

export default memo(TaskNode)
