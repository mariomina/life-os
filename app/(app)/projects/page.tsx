import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAreas } from '@/lib/db/queries/areas'
import { getProjects } from '@/lib/db/queries/projects'
import { getKRsByYear } from '@/lib/db/queries/okrs'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectCreateInline } from '@/components/projects/ProjectCreateInline'
import type { ProjectStatus } from '@/lib/db/queries/projects'

const TABS: { status: ProjectStatus; label: string }[] = [
  { status: 'active', label: 'Activos' },
  { status: 'paused', label: 'Pausados' },
  { status: 'completed', label: 'Completados' },
  { status: 'archived', label: 'Archivados' },
]

/**
 * Página de Proyectos — Server Component puro.
 *
 * Carga en paralelo:
 * - projects: todos los proyectos del usuario para el tab activo
 * - userAreas: áreas para el formulario de creación
 * - activeKrs: KRs activos del año actual para el selector de KR en ProjectForm
 */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
  const currentStatus = (params.status as ProjectStatus) ?? 'active'
  const validStatuses: ProjectStatus[] = ['active', 'paused', 'completed', 'archived']
  const activeTab: ProjectStatus = validStatuses.includes(currentStatus) ? currentStatus : 'active'

  const currentYear = new Date().getFullYear()

  const [projects, userAreas, allKrs] = await Promise.all([
    getProjects(user.id, activeTab),
    getUserAreas(user.id),
    getKRsByYear(user.id, currentYear),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
          <p className="text-sm text-muted-foreground">
            Vehículos de ejecución vinculados a tus áreas y KRs
          </p>
        </div>
        <ProjectCreateInline areas={userAreas} allKrs={allKrs} />
      </section>

      {/* Tabs por estado */}
      <nav className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <a
            key={tab.status}
            href={`/projects?status=${tab.status}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.status
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      {/* Lista de proyectos */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <span className="text-5xl">📁</span>
          <p className="text-sm font-medium text-foreground">
            {activeTab === 'active'
              ? 'No tienes proyectos activos'
              : `No hay proyectos ${TABS.find((t) => t.status === activeTab)?.label.toLowerCase() ?? ''}`}
          </p>
          {activeTab === 'active' && (
            <p className="text-xs text-muted-foreground">
              Crea tu primer proyecto para empezar a ejecutar tus KRs.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <a key={project.id} href={`/projects/${project.id}`} className="block">
              <ProjectCard project={project} />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
