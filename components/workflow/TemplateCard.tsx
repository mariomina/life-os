'use client'

// components/workflow/TemplateCard.tsx
// Tarjeta de un template de workflow — nombre, categoría, descripción, executor_type_default.

import type { WorkflowTemplate } from '@/lib/db/schema/workflow-templates'

// ─── Helpers de presentación ──────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  personal_development: 'Desarrollo Personal',
  product_launch: 'Lanzamiento de Producto',
  health_sprint: 'Sprint de Salud',
  learning: 'Aprendizaje',
  content_creation: 'Creación de Contenido',
  financial_review: 'Revisión Financiera',
  habit_building: 'Hábitos',
  custom: 'Personalizado',
}

const EXECUTOR_ICONS: Record<string, string> = {
  human: '👤',
  ai: '🤖',
  mixed: '⚡',
}

const EXECUTOR_LABELS: Record<string, string> = {
  human: 'Humano',
  ai: 'IA',
  mixed: 'Mixto',
}

const EXECUTOR_COLORS: Record<string, string> = {
  human: 'bg-blue-100 text-blue-700',
  ai: 'bg-purple-100 text-purple-700',
  mixed: 'bg-indigo-100 text-indigo-700',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: WorkflowTemplate
  onSelect: (template: WorkflowTemplate) => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const categoryLabel = CATEGORY_LABELS[template.category] ?? template.category
  const executorIcon = EXECUTOR_ICONS[template.executorTypeDefault] ?? '👤'
  const executorLabel =
    EXECUTOR_LABELS[template.executorTypeDefault] ?? template.executorTypeDefault
  const executorColor =
    EXECUTOR_COLORS[template.executorTypeDefault] ?? 'bg-slate-100 text-slate-700'

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_3px_rgb(0_0_0/0.06)] hover:border-primary/30 hover:shadow-sm transition-all">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground leading-snug">{template.name}</h3>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${executorColor}`}
        >
          {executorIcon} {executorLabel}
        </span>
      </div>

      {/* Categoría */}
      <span className="inline-block w-fit rounded-lg border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {categoryLabel}
      </span>

      {/* Descripción */}
      {template.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {template.description}
        </p>
      )}

      {/* Botón */}
      <button
        onClick={() => onSelect(template)}
        className="mt-auto w-full rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Usar este template
      </button>
    </div>
  )
}
