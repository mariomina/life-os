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
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </button>
      ) : (
        <div className="rounded-lg border bg-card p-4 shadow-md space-y-4 animate-in fade-in duration-200">
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
