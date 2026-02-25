import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAreas } from '@/lib/db/queries/areas'
import { getRecentAreaScores } from '@/lib/db/queries/area-scores'
import { getTimeInvestedByArea } from '@/lib/db/queries/time-entries'
import { getUncheckedActivities } from '@/lib/db/queries/checkin'
import { calculateGlobalScore } from '@/features/maslow/scoring'
import { calculateTrend, scoreColorClass, scoreBgClass } from '@/lib/utils/trend'
import { getAlerts } from '@/features/maslow/alerts'
import { AlertBanner } from '@/components/shared/AlertBanner'
import { DailyCheckinBanner } from '@/components/shared/DailyCheckinBanner'
import type { MaslowLevel } from '@/lib/utils/maslow-weights'
import type { Area } from '@/lib/db/schema/areas'
import type { AreaScore } from '@/lib/db/schema/area-scores'

// Area icons keyed by Maslow level
const AREA_ICONS: Record<number, string> = {
  1: '🧬',
  2: '🏠',
  3: '👥',
  4: '🏆',
  5: '📚',
  6: '🎨',
  7: '🌟',
  8: '🌍',
}

function buildTrendMap(recentScores: AreaScore[]): Record<string, number[]> {
  const map: Record<string, number[]> = {}
  for (const s of recentScores) {
    if (!map[s.areaId]) map[s.areaId] = []
    map[s.areaId].push(s.score)
  }
  return map
}

function buildScoreMap(userAreas: Area[]): Record<MaslowLevel, number> {
  const map = {} as Record<MaslowLevel, number>
  for (const area of userAreas) {
    map[area.maslowLevel as MaslowLevel] = area.currentScore
  }
  return map
}

interface AreaCardProps {
  area: Area
  trend: '↑' | '↓' | '→'
}

function AreaCard({ area, trend }: AreaCardProps) {
  const score = area.currentScore
  const colorClass = scoreColorClass(score)
  const bgClass = scoreBgClass(score)
  const icon = AREA_ICONS[area.maslowLevel] ?? '⭕'

  const trendColor =
    trend === '↑' ? 'text-green-500' : trend === '↓' ? 'text-red-500' : 'text-muted-foreground'

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-sm font-medium text-foreground">{area.name}</p>
            <p className="text-xs text-muted-foreground">Nivel {area.maslowLevel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-lg font-bold ${colorClass}`}>{score}%</span>
          <span className={`text-base ${trendColor}`}>{trend}</span>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${bgClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center">
      <span className="text-6xl">🧭</span>
      <h2 className="text-xl font-semibold text-foreground">Completa tu diagnóstico inicial</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Para ver tu Vista Perfil necesitas completar el cuestionario de diagnóstico. Solo toma unos
        minutos.
      </p>
      <Link
        href="/onboarding"
        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Completar diagnóstico
      </Link>
    </div>
  )
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // yesterday at UTC midnight — check-in is always about the previous day
  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  yesterday.setUTCHours(0, 0, 0, 0)

  const [userAreas, recentScores, timeMap, uncheckedActivities] = await Promise.all([
    getUserAreas(user.id),
    getRecentAreaScores(user.id, 7),
    getTimeInvestedByArea(user.id),
    getUncheckedActivities(user.id, yesterday),
  ])

  if (userAreas.length === 0) {
    return <EmptyState />
  }

  const trendMap = buildTrendMap(recentScores)
  const scoreMap = buildScoreMap(userAreas)
  const globalScore = Math.round(calculateGlobalScore(scoreMap))
  const alerts = getAlerts(userAreas, timeMap)

  const dNeeds = userAreas.filter((a) => a.group === 'd_needs')
  const bNeeds = userAreas.filter((a) => a.group === 'b_needs')

  const globalColorClass = scoreColorClass(globalScore)

  return (
    <div className="space-y-8">
      {/* Daily Check-in — máxima prioridad visual */}
      <DailyCheckinBanner initialActivities={uncheckedActivities} />

      {/* Alertas activas */}
      <AlertBanner alerts={alerts} />

      {/* Hero — Life System Health Score */}
      <section className="rounded-xl border bg-card p-6 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Life System Health Score
        </p>
        <p className={`text-6xl font-bold ${globalColorClass}`}>{globalScore}</p>
        <p className="text-xs text-muted-foreground">sobre 100 — score ponderado Maslow</p>
      </section>

      {/* D-Needs */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">D-Needs</span>
          <span className="text-xs text-muted-foreground">Necesidades de Deficiencia (1-4)</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dNeeds.map((area) => {
            const scores = trendMap[area.id] ?? []
            const trend = calculateTrend(scores)
            return <AreaCard key={area.id} area={area} trend={trend} />
          })}
        </div>
      </section>

      {/* B-Needs */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">B-Needs</span>
          <span className="text-xs text-muted-foreground">Necesidades de Ser (5-8)</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {bNeeds.map((area) => {
            const scores = trendMap[area.id] ?? []
            const trend = calculateTrend(scores)
            return <AreaCard key={area.id} area={area} trend={trend} />
          })}
        </div>
      </section>
    </div>
  )
}
