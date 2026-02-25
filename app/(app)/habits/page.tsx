import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getHabits } from '@/lib/db/queries/habits'
import { getUserAreas } from '@/lib/db/queries/areas'
import { HabitList } from './_components/HabitList'

/**
 * Página de Hábitos — Server Component puro.
 *
 * Carga en paralelo:
 * - habits: hábitos del usuario (activos + inactivos para toggle en cliente)
 * - userAreas: áreas para el formulario de creación/edición
 */
export default async function HabitsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [habitsWithArea, areas] = await Promise.all([
    getHabits(user.id, true), // includeInactive=true, client filters by toggle
    getUserAreas(user.id),
  ])

  // Map to the shape expected by HabitList (areaName flat field)
  const habits = habitsWithArea.map((h) => ({ ...h, areaName: h.area?.name ?? null }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Hábitos</h1>
        <p className="text-sm text-muted-foreground">
          Rutinas recurrentes que se agenden automáticamente en tu calendario
        </p>
      </section>

      {/* List + CRUD */}
      <HabitList habits={habits} areas={areas} userId={user.id} />
    </div>
  )
}
