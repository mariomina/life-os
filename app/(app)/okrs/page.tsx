import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAreas } from '@/lib/db/queries/areas'
import { getRecentAreaScores } from '@/lib/db/queries/area-scores'
import { getVision, getAnnualOKRs } from '@/lib/db/queries/okrs'
import { VisionCard } from '@/components/okrs/VisionCard'
import { AnnualOKRList } from '@/components/okrs/AnnualOKRList'

/**
 * Página principal de OKRs — Server Component puro.
 *
 * Carga en paralelo:
 * - vision:       OKR tipo 'vision' del usuario (null si no existe)
 * - annualOKRs:   OKRs anuales del año actual
 * - userAreas:    Áreas del usuario (para OKRForm — hierarchy guard + impact)
 * - scoreHistory: Historial de scores últimos 30 días (para hierarchy guard)
 */
export default async function OKRsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const currentYear = new Date().getFullYear()

  const [vision, annualOKRs, userAreas, scoreHistory] = await Promise.all([
    getVision(user.id),
    getAnnualOKRs(user.id, currentYear),
    getUserAreas(user.id),
    getRecentAreaScores(user.id, 30),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">OKRs</h1>
        <p className="text-sm text-muted-foreground">
          Visión de 5 años · Objetivos anuales (máx. 3) · KRs trimestrales
        </p>
      </section>

      {/* Visión 5 años */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Visión 5 años</span>
          <span className="text-xs text-muted-foreground">Narrativa de largo plazo</span>
        </div>
        <VisionCard vision={vision} />
      </section>

      {/* OKRs anuales */}
      <section>
        <AnnualOKRList
          annualOKRs={annualOKRs}
          areas={userAreas}
          scoreHistory={scoreHistory}
          year={currentYear}
        />
      </section>
    </div>
  )
}
