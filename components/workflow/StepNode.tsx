'use client'

// components/workflow/StepNode.tsx
// Nodo Step para el Visual Workflow Builder.
// Círculo coloreado por executor_type: human=azul, ai=púrpura, mixed=degradado.

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { StepNodeData } from './types'

const EXECUTOR_LABELS: Record<string, string> = {
  human: 'Human',
  ai: 'AI',
  mixed: 'Mixed',
}

function getNodeStyle(executorType: string): React.CSSProperties {
  switch (executorType) {
    case 'ai':
      return { background: '#8b5cf6', borderColor: '#7c3aed' }
    case 'mixed':
      return {
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        borderColor: '#6366f1',
      }
    default:
      // human
      return { background: '#3b82f6', borderColor: '#2563eb' }
  }
}

function StepNode({ data, selected }: NodeProps) {
  const stepData = data as unknown as StepNodeData
  const nodeStyle = getNodeStyle(stepData.executorType)
  const executorLabel = EXECUTOR_LABELS[stepData.executorType] ?? 'Human'

  return (
    <div
      className={`relative flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 shadow-sm transition-shadow ${
        selected ? 'ring-2 ring-offset-2 ring-white shadow-lg' : ''
      }`}
      style={{
        ...nodeStyle,
        ...(selected
          ? { boxShadow: '0 0 0 3px rgba(255,255,255,0.8), 0 4px 12px rgba(0,0,0,0.2)' }
          : {}),
      }}
    >
      {/* Tipo */}
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
        {executorLabel}
      </span>

      {/* Título (truncado) */}
      <span
        className="mt-0.5 px-1 text-center text-[11px] font-semibold leading-tight text-white"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          maxWidth: '72px',
        }}
        title={stepData.label}
      >
        {stepData.label}
      </span>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-white/50"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-white/50"
      />
    </div>
  )
}

export default memo(StepNode)
