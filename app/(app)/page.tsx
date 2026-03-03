import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAreas } from '@/lib/db/queries/areas'
import { getTimeInvestedByArea } from '@/lib/db/queries/time-entries'
import { getUncheckedActivities } from '@/lib/db/queries/checkin'
import { getActivitiesForDay } from '@/lib/db/queries/calendar'
import { calculateGlobalScore } from '@/features/maslow/scoring'
import { scoreColorClass } from '@/lib/utils/trend'
import { getAlerts } from '@/features/maslow/alerts'
import { AlertBanner } from '@/components/shared/AlertBanner'
import { DailyCheckinBanner } from '@/components/shared/DailyCheckinBanner'
import type { MaslowLevel } from '@/lib/utils/maslow-weights'
import type { Area } from '@/lib/db/schema/areas'
import type { ActivityForCalendar } from '@/lib/db/queries/calendar'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildScoreMap(userAreas: Area[]): Record<MaslowLevel, number> {
  const map = {} as Record<MaslowLevel, number>
  for (const area of userAreas) {
    map[area.maslowLevel as MaslowLevel] = area.currentScore
  }
  return map
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_ICON: Record<string, string> = {
  done: '✓',
  pending: '○',
  skipped: '✗',
  postponed: '↷',
}

const EVENT_COLORS: Record<string, string> = {
  blue: 'border-blue-500 bg-blue-500/10',
  green: 'border-green-500 bg-green-500/10',
  red: 'border-red-500 bg-red-500/10',
  yellow: 'border-yellow-500 bg-yellow-500/10',
  purple: 'border-purple-500 bg-purple-500/10',
  orange: 'border-orange-500 bg-orange-500/10',
  gray: 'border-gray-500 bg-gray-500/10',
}

function TodayActivities({ activities }: { activities: ActivityForCalendar[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        <p>No hay actividades programadas para hoy.</p>
        <Link href="/calendar" className="mt-2 inline-flex text-primary hover:underline text-xs">
          Abrir calendario →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activities.map((a) => {
        const colorClass = EVENT_COLORS[a.areaColor] ?? EVENT_COLORS.blue
        const statusIcon = STATUS_ICON[a.status] ?? '○'
        const isDone = a.status === 'done'
        return (
          <div
            key={a.id}
            className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 ${colorClass} ${isDone ? 'opacity-50' : ''}`}
          >
            <span className="text-xs text-muted-foreground shrink-0 w-12 text-right font-mono">
              {formatTime(a.scheduledAt)}
            </span>
            <span
              className={`text-xs shrink-0 ${isDone ? 'text-green-500' : 'text-muted-foreground'}`}
            >
              {statusIcon}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}
              >
                {a.title}
              </p>
              {a.areaName && <p className="text-xs text-muted-foreground">{a.areaName}</p>}
            </div>
            {a.scheduledDurationMinutes && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDuration(a.scheduledDurationMinutes)}
              </span>
            )}
          </div>
        )
      })}
      <div className="pt-1">
        <Link href="/calendar" className="text-xs text-primary hover:underline">
          Ver calendario completo →
        </Link>
      </div>
    </div>
  )
}

function CompactAreaScores({ areas }: { areas: Area[] }) {
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

  return (
    <div className="grid grid-cols-4 gap-2">
      {areas.map((area) => {
        const score = area.currentScore
        const colorClass = scoreColorClass(score)
        const icon = AREA_ICONS[area.maslowLevel] ?? '⭕'
        return (
          <div
            key={area.id}
            className="flex flex-col items-center gap-1 rounded-2xl border bg-card p-2 text-center shadow-[0_1px_3px_rgb(0_0_0/0.06)]"
          >
            <span className="text-base">{icon}</span>
            <span className={`text-sm font-bold ${colorClass}`}>{score}%</span>
            <span className="text-[10px] text-muted-foreground leading-tight truncate w-full text-center">
              {area.name}
            </span>
          </div>
        )
      })}
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
        className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Completar diagnóstico
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const today = new Date()
  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  yesterday.setUTCHours(0, 0, 0, 0)

  const [userAreas, timeMap, uncheckedActivities, todayActivities] = await Promise.all([
    getUserAreas(user.id),
    getTimeInvestedByArea(user.id),
    getUncheckedActivities(user.id, yesterday),
    getActivitiesForDay(user.id, today).catch(() => []),
  ])

  if (userAreas.length === 0) {
    return <EmptyState />
  }

  const scoreMap = buildScoreMap(userAreas)
  const globalScore = Math.round(calculateGlobalScore(scoreMap))
  const alerts = getAlerts(userAreas, timeMap)

  const globalColorClass = scoreColorClass(globalScore)

  const doneToday = todayActivities.filter((a) => a.status === 'done').length
  const totalToday = todayActivities.length

  return (
    <div className="space-y-6">
      {/* Daily Check-in — máxima prioridad visual */}
      <DailyCheckinBanner initialActivities={uncheckedActivities} />

      {/* Alertas activas */}
      <AlertBanner alerts={alerts} />

      {/* Hoy en el calendario */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Hoy</h2>
            {totalToday > 0 && (
              <p className="text-xs text-muted-foreground">
                {doneToday}/{totalToday} actividades completadas
              </p>
            )}
          </div>
          <Link
            href="/calendar"
            className="text-xs rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            + Nueva
          </Link>
        </div>
        <TodayActivities activities={todayActivities} />
      </section>

      {/* Life System Health Score — compacto + acceso rápido a áreas */}
      <section className="rounded-xl border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Life System Health
            </p>
            <p className={`text-4xl font-bold ${globalColorClass}`}>{globalScore}</p>
            <p className="text-xs text-muted-foreground">sobre 100</p>
          </div>
          <Link
            href="/areas"
            className="text-xs rounded-md border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Ver áreas completas →
          </Link>
        </div>
        <CompactAreaScores areas={userAreas} />
      </section>

      {/* Acceso rápido a módulos */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Acceso rápido
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { href: '/habits', icon: '🔁', label: 'Hábitos' },
            { href: '/okrs', icon: '🎯', label: 'OKRs' },
            { href: '/inbox', icon: '📥', label: 'Inbox' },
            { href: '/reports', icon: '📊', label: 'Informes' },
          ].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-2xl border bg-card px-3 py-2.5 text-sm font-medium text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.06)] hover:bg-muted transition-colors"
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
