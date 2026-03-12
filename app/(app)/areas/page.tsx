// app/(app)/areas/page.tsx
// Server Component — Vista analítica de áreas Maslow.
// Story 11.6 — UI /areas GLSHS Chart + Grid de Cards con Score Circular.
//
// Modelo mental: "Areas es un espejo analítico — no captura datos, los lee."
// No hay formularios, no hay botones de crear. Solo visualización.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAreasWithSubareas, getGLSHSHistory } from '@/lib/db/queries/areas'
import { getRecentAreaScores } from '@/lib/db/queries/area-scores'
import { GLSHSChart } from './_components/GLSHSChart'
import { AreaCard } from './_components/AreaCard'
import type { AreaWithSubareas } from '@/lib/db/queries/areas'
import type { AreaScore } from '@/lib/db/schema/area-scores'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a map: areaId → score 7 days ago (for trend delta) */
function buildPreviousScoreMap(recentScores: AreaScore[]): Record<string, number> {
  // recentScores ordered desc by scoredAt — oldest available = 7 days ago proxy
  const map: Record<string, number> = {}
  // Process in reverse (oldest first) so latest entry wins
  for (const s of [...recentScores].reverse()) {
    map[s.areaId] = s.score
  }
  return map
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center">
      <span className="text-6xl">🧭</span>
      <h2 className="text-xl font-semibold text-foreground">Completa tu diagnóstico inicial</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Para ver tus áreas necesitas completar el cuestionario de diagnóstico.
      </p>
      <Link
        href="/onboarding"
        className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Completar diagnóstico
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AreasPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [areasWithSubs, glshsHistory, recentScores] = await Promise.all([
    getAreasWithSubareas(user.id),
    getGLSHSHistory(user.id, 90),
    getRecentAreaScores(user.id, 7),
  ])

  if (areasWithSubs.length === 0) return <EmptyState />

  const previousScoreMap = buildPreviousScoreMap(recentScores)

  // Split by Maslow group
  const dNeeds = areasWithSubs.filter((a: AreaWithSubareas) => a.group === 'd_needs')
  const bNeeds = areasWithSubs.filter((a: AreaWithSubareas) => a.group === 'b_needs')

  return (
    <div className="space-y-6">
      {/* Zona 1 — GLSHS Chart */}
      <GLSHSChart data={glshsHistory} />

      {/* Zona 2 — Grid de Cards */}
      <section className="space-y-4">
        {/* D-Needs */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">D-Needs</span>
            <span className="text-xs text-muted-foreground">
              Necesidades de Deficiencia (L1–L4)
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dNeeds.map((area: AreaWithSubareas) => (
              <AreaCard key={area.id} area={area} previousScore={previousScoreMap[area.id]} />
            ))}
          </div>
        </div>

        {/* B-Needs */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">B-Needs</span>
            <span className="text-xs text-muted-foreground">Necesidades de Ser (L5–L8)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {bNeeds.map((area: AreaWithSubareas) => (
              <AreaCard key={area.id} area={area} previousScore={previousScoreMap[area.id]} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
