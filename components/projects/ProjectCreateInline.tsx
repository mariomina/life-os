'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { createProject } from '@/actions/projects'
import type { Area } from '@/lib/db/schema/areas'
import type { OKR } from '@/lib/db/schema/okrs'

interface ProjectCreateInlineProps {
  areas: Area[]
  allKrs: OKR[]
}

/**
 * Botón "Nuevo Proyecto" con formulario inline colapsable.
 * Client Component — maneja el estado de visibilidad del formulario.
 */
export function ProjectCreateInline({ areas, allKrs }: ProjectCreateInlineProps) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(data: {
    title: string
    description: string
    areaId: string
    okrId: string | null
  }) {
    startTransition(async () => {
      const result = await createProject(data)
      if (result.error) {
        alert(result.error)
      } else {
        setShowForm(false)
      }
    })
  }

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </button>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_3px_rgb(0_0_0/0.06)] space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Nuevo Proyecto
            </h3>
          </div>
          <ProjectForm
            areas={areas}
            allKrs={allKrs}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isLoading={isPending}
            submitLabel="Crear Proyecto"
          />
        </div>
      )}
    </div>
  )
}
