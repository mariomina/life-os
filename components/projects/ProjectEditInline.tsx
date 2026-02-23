'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { updateProject } from '@/actions/projects'
import type { Area } from '@/lib/db/schema/areas'
import type { OKR } from '@/lib/db/schema/okrs'
import type { ProjectWithRelations } from '@/lib/db/queries/projects'

interface ProjectEditInlineProps {
  project: ProjectWithRelations
  areas: Area[]
  allKrs: OKR[]
}

/**
 * Botón "Editar" con formulario inline colapsable para la página de detalle.
 */
export function ProjectEditInline({ project, areas, allKrs }: ProjectEditInlineProps) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(data: {
    title: string
    description: string
    areaId: string
    okrId: string | null
  }) {
    startTransition(async () => {
      const result = await updateProject(project.id, data)
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
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Editar
        </button>
      ) : (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4 animate-in fade-in duration-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Editar Proyecto
          </h3>
          <ProjectForm
            areas={areas}
            allKrs={allKrs}
            initialData={{
              title: project.title,
              description: project.description,
              areaId: project.areaId ?? '',
              okrId: project.okrId,
            }}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isLoading={isPending}
            submitLabel="Guardar cambios"
          />
        </div>
      )}
    </div>
  )
}
