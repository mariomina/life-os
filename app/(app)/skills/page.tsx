import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserSkills } from '@/lib/db/queries/skills'
import { getUserAreas } from '@/lib/db/queries/areas'
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

  const [skills, areas] = await Promise.all([getUserSkills(user.id), getUserAreas(user.id)])

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Habilidades</h1>
        <p className="text-sm text-muted-foreground">
          Registra y sigue el progreso de tus competencias. El tiempo se calcula automáticamente.
        </p>
      </section>

      {/* Skills list + CRUD */}
      <SkillsClient initialSkills={skills} areas={areas} />
    </div>
  )
}
