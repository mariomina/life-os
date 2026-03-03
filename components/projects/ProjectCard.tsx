'use client'

import { useState, useTransition } from 'react'
import { Archive, FolderOpen } from 'lucide-react'
import { archiveProject } from '@/actions/projects'
import { Badge } from '@/components/ui/badge'
import type { ProjectWithRelations } from '@/lib/db/queries/projects'

interface ProjectCardProps {
  project: ProjectWithRelations
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  archived: 'Archivado',
  paused: 'Pausado',
}

const MASLOW_GROUP_COLORS: Record<string, string> = {
  d_needs: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  b_needs: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isPending, startTransition] = useTransition()
  const [archived, setArchived] = useState(false)

  if (archived) return null

  function handleArchive() {
    if (!confirm('¿Archivar este proyecto? Puedes verlo en la tab "Archivados".')) return
    startTransition(async () => {
      const result = await archiveProject(project.id)
      if (result.error) {
        alert(result.error)
      } else {
        setArchived(true)
      }
    })
  }

  const createdDate = new Date(project.createdAt).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-[0_1px_3px_rgb(0_0_0/0.06)] transition-all duration-200 hover:shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <FolderOpen className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{project.title}</p>
            {project.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <Badge
          variant={project.status as 'active' | 'completed' | 'archived' | 'paused'}
          className="shrink-0"
        >
          {STATUS_LABELS[project.status] ?? project.status}
        </Badge>
      </div>

      {/* Área + KR */}
      <div className="flex flex-wrap gap-1.5">
        {project.area && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${MASLOW_GROUP_COLORS[project.area.group] ?? ''}`}
          >
            {project.area.name} · Nivel {project.area.maslowLevel}
          </span>
        )}
        {project.linkedOkr ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground">
            KR: {project.linkedOkr.title}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">Sin KR vinculado</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-dashed">
        <span className="text-[10px] text-muted-foreground">Creado {createdDate}</span>
        {project.status !== 'archived' && (
          <button
            onClick={handleArchive}
            disabled={isPending}
            className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <Archive className="w-3 h-3" />
            Archivar
          </button>
        )}
      </div>
    </div>
  )
}
