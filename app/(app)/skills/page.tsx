import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserSkills } from '@/lib/db/queries/skills'
import { getUserAreas } from '@/lib/db/queries/areas'
import { suggestSkillFromActivities } from '@/actions/skills'
import { SkillsClient } from './_components/SkillsClient'

/**
 * Página de Habilidades — Server Component puro.
 *
 * Carga las skills y áreas del usuario autenticado en paralelo
 * y renderiza el Client Component con CRUD de habilidades.
 * Story 7.1 — CRUD Habilidades.
 */
export default async function SkillsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load skills, areas, and emerging suggestions in parallel (Story 7.3)
  const [skills, areas, suggestions] = await Promise.all([
    getUserSkills(user.id),
    getUserAreas(user.id),
    suggestSkillFromActivities(),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Habilidades</h1>
        <p className="text-sm text-muted-foreground">
          Registra y sigue el progreso de tus competencias. El tiempo se calcula automáticamente.
        </p>
      </section>

      {/* Skills list + CRUD + Emerging suggestions */}
      <SkillsClient initialSkills={skills} areas={areas} initialSuggestions={suggestions} />
    </div>
  )
}
