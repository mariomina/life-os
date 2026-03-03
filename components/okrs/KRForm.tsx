'use client'

import { useState } from 'react'

interface KRFormProps {
  /** ID del OKR anual padre */
  parentId: string
  /** Año del OKR anual padre */
  year: number
  /** Llamado al enviar el formulario */
  onSubmit?: (data: {
    parentId: string
    title: string
    description?: string
    year: number
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
    krType: 'time_based' | 'outcome_based' | 'milestone'
    targetValue?: number
    targetUnit?: string
  }) => void
}

/**
 * Formulario para crear un Key Result (KR) trimestral.
 * Los KRs son tácticos y no requieren validación jerárquica (la hace el OKR anual padre).
 */
export function KRForm({ parentId, year, onSubmit }: KRFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [quarter, setQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1')
  const [krType, setKrType] = useState<'time_based' | 'outcome_based' | 'milestone'>('time_based')
  const [targetValue, setTargetValue] = useState<number>(0)
  const [targetUnit, setTargetUnit] = useState('')

  const canSubmit = title.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit?.({
      parentId,
      title: title.trim(),
      description: description.trim() || undefined,
      year,
      quarter,
      krType,
      targetValue: targetValue || undefined,
      targetUnit: targetUnit.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-1">
        <label htmlFor="kr-title" className="block text-sm font-medium text-foreground">
          Título del KR
        </label>
        <input
          id="kr-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Meditar 50 horas en el trimestre"
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label htmlFor="kr-description" className="block text-sm font-medium text-foreground">
          Descripción (opcional)
        </label>
        <textarea
          id="kr-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles sobre cómo medir este KR..."
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Quarter */}
        <div className="space-y-1">
          <label htmlFor="kr-quarter" className="block text-sm font-medium text-foreground">
            Trimestre
          </label>
          <select
            id="kr-quarter"
            value={quarter}
            onChange={(e) => setQuarter(e.target.value as 'Q1' | 'Q2' | 'Q3' | 'Q4')}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            required
          >
            <option value="Q1">Q1 (Ene-Mar)</option>
            <option value="Q2">Q2 (Abr-Jun)</option>
            <option value="Q3">Q3 (Jul-Sep)</option>
            <option value="Q4">Q4 (Oct-Dic)</option>
          </select>
        </div>

        {/* KR Type */}
        <div className="space-y-1">
          <label htmlFor="kr-type" className="block text-sm font-medium text-foreground">
            Tipo de KR
          </label>
          <select
            id="kr-type"
            value={krType}
            onChange={(e) =>
              setKrType(e.target.value as 'time_based' | 'outcome_based' | 'milestone')
            }
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            required
          >
            <option value="time_based">Tiempo (Horas)</option>
            <option value="outcome_based">Resultado (Numérico)</option>
            <option value="milestone">Hito (Binario)</option>
          </select>
        </div>
      </div>

      {krType !== 'milestone' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Target Value */}
          <div className="space-y-1">
            <label htmlFor="kr-target" className="block text-sm font-medium text-foreground">
              Meta ({krType === 'time_based' ? 'Horas' : 'Valor'})
            </label>
            <input
              id="kr-target"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              min={0}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              required
            />
          </div>

          {/* Target Unit (only for outcome_based) */}
          {krType === 'outcome_based' && (
            <div className="space-y-1">
              <label htmlFor="kr-unit" className="block text-sm font-medium text-foreground">
                Unidad (ej: kg, libros)
              </label>
              <input
                id="kr-unit"
                type="text"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                placeholder="Unidad..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        Crear Key Result
      </button>
    </form>
  )
}
