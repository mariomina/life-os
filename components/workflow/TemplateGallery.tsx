'use client'

// components/workflow/TemplateGallery.tsx
// Modal con la galería de los 8 templates predefinidos del sistema.
// Incluye confirmación de sobreescritura si el canvas ya tiene nodos.

import { useState } from 'react'
import { X } from 'lucide-react'
import type { WorkflowTemplate } from '@/lib/db/schema/workflow-templates'
import TemplateCard from './TemplateCard'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TemplateGalleryProps {
  templates: WorkflowTemplate[]
  /** true si el canvas ya tiene nodos (solicita confirmación de sobreescritura) */
  hasExistingNodes: boolean
  onSelect: (template: WorkflowTemplate) => void
  onClose: () => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TemplateGallery({
  templates,
  hasExistingNodes,
  onSelect,
  onClose,
}: TemplateGalleryProps) {
  const [pendingTemplate, setPendingTemplate] = useState<WorkflowTemplate | null>(null)

  const handleTemplateClick = (template: WorkflowTemplate) => {
    if (hasExistingNodes) {
      // Solicitar confirmación antes de sobreescribir
      setPendingTemplate(template)
    } else {
      onSelect(template)
    }
  }

  const handleConfirmOverwrite = () => {
    if (pendingTemplate) {
      onSelect(pendingTemplate)
      setPendingTemplate(null)
    }
  }

  const handleCancelOverwrite = () => {
    setPendingTemplate(null)
  }

  return (
    <>
      {/* Overlay del modal */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Galería de templates de workflow"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Templates de Workflow</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecciona un template para instanciar el canvas automáticamente
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Cerrar galería"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Grid de templates */}
          <div className="flex-1 overflow-y-auto p-6">
            {templates.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-12">
                No hay templates disponibles.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleTemplateClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diálogo de confirmación de sobreescritura */}
      {pendingTemplate && (
        <>
          <div className="fixed inset-0 z-60 bg-black/50" aria-hidden="true" />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirmar sobreescritura del canvas"
            className="fixed inset-0 z-70 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
              <h3 className="text-sm font-semibold text-slate-900">¿Reemplazar canvas actual?</h3>
              <p className="mt-2 text-sm text-slate-500">
                El canvas actual se reemplazará con los nodos del template{' '}
                <strong className="text-slate-700">{pendingTemplate.name}</strong>. Esta acción no
                se puede deshacer.
              </p>
              <div className="mt-4 flex gap-3 justify-end">
                <button
                  onClick={handleCancelOverwrite}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmOverwrite}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
