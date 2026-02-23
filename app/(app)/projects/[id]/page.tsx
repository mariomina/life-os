import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAreas } from '@/lib/db/queries/areas'
import { getProjectById } from '@/lib/db/queries/projects'
import { getKRsByYear } from '@/lib/db/queries/okrs'
import { ProjectEditInline } from '@/components/projects/ProjectEditInline'
import { ProjectArchiveButton } from '@/components/projects/ProjectArchiveButton'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  archived: 'Archivado',
  paused: 'Pausado',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  completed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  archived: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  paused: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
}

/**
 * Página de detalle de un Proyecto — Server Component.
 * Muestra todos los campos del proyecto + controles de edición y archivado.
 */
export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params
  const currentYear = new Date().getFullYear()

  const [project, userAreas, allKrs] = await Promise.all([
    getProjectById(user.id, id),
    getUserAreas(user.id),
    getKRsByYear(user.id, currentYear),
  ])

  if (!project) {
    notFound()
  }

  const createdDate = new Date(project.createdAt).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const updatedDate = new Date(project.updatedAt).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a Proyectos
      </Link>

      {/* Header */}
      <section className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">{project.title}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status] ?? ''}`}
            >
              {STATUS_LABELS[project.status] ?? project.status}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
      </section>

      {/* Detalles */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Detalles
        </h2>

        <dl className="space-y-3">
          {/* Área */}
          <div className="flex items-start gap-3">
            <dt className="text-sm font-medium text-muted-foreground w-24 shrink-0">Área</dt>
            <dd className="text-sm text-foreground">
              {project.area ? (
                <span>
                  {project.area.name}{' '}
                  <span className="text-muted-foreground text-xs">
                    · Nivel {project.area.maslowLevel} ·{' '}
                    {project.area.group === 'd_needs' ? 'D-Needs' : 'B-Needs'}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground italic">Sin área vinculada</span>
              )}
            </dd>
          </div>

          {/* KR vinculado */}
          <div className="flex items-start gap-3">
            <dt className="text-sm font-medium text-muted-foreground w-24 shrink-0">KR</dt>
            <dd className="text-sm text-foreground">
              {project.linkedOkr ? (
                <span>
                  {project.linkedOkr.quarter} — {project.linkedOkr.title}
                </span>
              ) : (
                <span className="text-muted-foreground italic">Sin KR vinculado</span>
              )}
            </dd>
          </div>

          {/* Fechas */}
          <div className="flex items-start gap-3">
            <dt className="text-sm font-medium text-muted-foreground w-24 shrink-0">Creado</dt>
            <dd className="text-sm text-foreground">{createdDate}</dd>
          </div>
          <div className="flex items-start gap-3">
            <dt className="text-sm font-medium text-muted-foreground w-24 shrink-0">Actualizado</dt>
            <dd className="text-sm text-foreground">{updatedDate}</dd>
          </div>
        </dl>
      </section>

      {/* Editar */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <ProjectEditInline project={project} areas={userAreas} allKrs={allKrs} />
      </section>

      {/* Zona peligrosa */}
      {project.status !== 'archived' && (
        <section className="rounded-lg border border-dashed border-red-200 dark:border-red-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Archivar proyecto</p>
            <p className="text-xs text-muted-foreground">
              El proyecto se moverá a Archivados. Puedes verlo pero no editarlo.
            </p>
          </div>
          <ProjectArchiveButton projectId={project.id} />
        </section>
      )}
    </div>
  )
}
