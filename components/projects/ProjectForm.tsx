'use client'

import { useState } from 'react'
import type { Area } from '@/lib/db/schema/areas'
import type { OKR } from '@/lib/db/schema/okrs'

interface ProjectFormProps {
  areas: Area[]
  /** All active KRs for this user — pre-fetched by Server Component */
  allKrs: OKR[]
  /** Existing project data for edit mode */
  initialData?: {
    title: string
    description?: string | null
    areaId: string
    okrId?: string | null
  }
  onSubmit: (data: {
    title: string
    description: string
    areaId: string
    okrId: string | null
  }) => void
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

/**
 * Formulario de creación/edición de proyectos.
 * Al seleccionar un área, filtra los KRs activos vinculados a ella.
 * Los KRs son pre-fetched por el Server Component padre y pasados como prop.
 */
export function ProjectForm({
  areas,
  allKrs,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Crear Proyecto',
}: ProjectFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [areaId, setAreaId] = useState(initialData?.areaId ?? '')
  const [okrId, setOkrId] = useState<string>(initialData?.okrId ?? '')
  const [errors, setErrors] = useState<{ title?: string; areaId?: string }>({})

  // Filtrar KRs por área seleccionada
  const filteredKrs = areaId ? allKrs.filter((kr) => kr.areaId === areaId) : []

  function validate(): boolean {
    const newErrors: { title?: string; areaId?: string } = {}
    if (!title.trim()) newErrors.title = 'El título es requerido'
    if (!areaId) newErrors.areaId = 'El área es requerida'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      areaId,
      okrId: okrId || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Título */}
      <div className="space-y-1">
        <label htmlFor="project-title" className="block text-sm font-medium text-foreground">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          id="project-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (e.target.value.trim()) setErrors((prev) => ({ ...prev, title: undefined }))
          }}
          placeholder="Ej: Lanzar producto MVP"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Descripción */}
      <div className="space-y-1">
        <label htmlFor="project-description" className="block text-sm font-medium text-foreground">
          Descripción <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="¿Qué quieres lograr con este proyecto?"
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Área */}
      <div className="space-y-1">
        <label htmlFor="project-area" className="block text-sm font-medium text-foreground">
          Área de vida <span className="text-red-500">*</span>
        </label>
        <select
          id="project-area"
          value={areaId}
          onChange={(e) => {
            setAreaId(e.target.value)
            setOkrId('') // reset KR al cambiar área
            if (e.target.value) setErrors((prev) => ({ ...prev, areaId: undefined }))
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Selecciona un área</option>
          <optgroup label="D-Needs (Niveles 1-4)">
            {areas
              .filter((a) => a.group === 'd_needs')
              .map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} (Nivel {area.maslowLevel})
                </option>
              ))}
          </optgroup>
          <optgroup label="B-Needs (Niveles 5-8)">
            {areas
              .filter((a) => a.group === 'b_needs')
              .map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} (Nivel {area.maslowLevel})
                </option>
              ))}
          </optgroup>
        </select>
        {errors.areaId && <p className="text-xs text-red-500">{errors.areaId}</p>}
      </div>

      {/* KR vinculado (opcional, filtrado por área) */}
      <div className="space-y-1">
        <label htmlFor="project-okr" className="block text-sm font-medium text-foreground">
          KR vinculado <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        </label>
        <select
          id="project-okr"
          value={okrId}
          onChange={(e) => setOkrId(e.target.value)}
          disabled={!areaId}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        >
          <option value="">
            {!areaId
              ? 'Selecciona un área primero'
              : filteredKrs.length === 0
                ? 'Sin KRs activos para esta área'
                : 'Sin KR vinculado'}
          </option>
          {filteredKrs.map((kr) => (
            <option key={kr.id} value={kr.id}>
              {kr.quarter} — {kr.title}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-muted-foreground">
          Solo se muestran KRs activos del área seleccionada.
        </p>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {isLoading ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
