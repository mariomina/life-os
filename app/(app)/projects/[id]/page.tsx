import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAreas } from '@/lib/db/queries/areas'
import { getProjectById } from '@/lib/db/queries/projects'
import { getKRsByYear } from '@/lib/db/queries/okrs'
import { ProjectEditInline } from '@/components/projects/ProjectEditInline'
import { ProjectArchiveButton } from '@/components/projects/ProjectArchiveButton'
import { Badge } from '@/components/ui/badge'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  archived: 'Archivado',
  paused: 'Pausado',
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
            <Badge variant={project.status as 'active' | 'completed' | 'archived' | 'paused'}>
              {STATUS_LABELS[project.status] ?? project.status}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
      </section>

      {/* Detalles */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
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
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <ProjectEditInline project={project} areas={userAreas} allKrs={allKrs} />
      </section>

      {/* Workflow */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Workflow
        </h2>
        <p className="text-sm text-muted-foreground">
          Organiza las tareas y pasos de este proyecto visualmente en el canvas de workflow.
        </p>
        <Link
          href={`/projects/${project.id}/workflow`}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Ver Workflow
        </Link>
      </section>

      {/* Zona peligrosa */}
      {project.status !== 'archived' && (
        <section className="rounded-2xl border border-dashed border-destructive/30 p-4 flex items-center justify-between">
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
