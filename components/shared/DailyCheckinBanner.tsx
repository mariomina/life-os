'use client'

// components/shared/DailyCheckinBanner.tsx
// Client Component — persistent daily check-in banner for Home page.
// Shows pending activities from yesterday that have not yet been confirmed.

import { useState, useTransition, useEffect } from 'react'
import { confirmActivity, bulkConfirmHabits } from '@/actions/checkin'
import type { ActivityForCheckin } from '@/lib/db/queries/checkin'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5

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

// ─── Types ────────────────────────────────────────────────────────────────────

type ResponseStatus = 'completed' | 'skipped' | 'postponed'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(date: Date | null): string {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ActivityItemProps {
  activity: ActivityForCheckin
  responded: ResponseStatus | undefined
  isPending: boolean
  onConfirm: (id: string, status: ResponseStatus) => void
}

function ActivityItem({ activity, responded, isPending, onConfirm }: ActivityItemProps) {
  const areaIcon = activity.areaLevel ? (AREA_ICONS[activity.areaLevel] ?? '⭕') : '⭕'
  const isResponded = responded !== undefined

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-3 transition-opacity ${
        isResponded ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{areaIcon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {activity.areaName && <span>{activity.areaName}</span>}
              {activity.scheduledAt && <span>{formatTime(activity.scheduledAt)}</span>}
              {activity.habitId && <span>🔁</span>}
            </div>
          </div>
        </div>

        {isResponded ? (
          <span className="text-xs text-muted-foreground shrink-0">
            {responded === 'completed'
              ? '✓ Listo'
              : responded === 'skipped'
                ? '✗ Omitido'
                : '↷ Pospuesto'}
          </span>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onConfirm(activity.id, 'completed')}
              disabled={isPending}
              title="Completado"
              className="rounded-md border border-green-500 px-2 py-1 text-xs text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors dark:hover:bg-green-950"
            >
              ✓
            </button>
            <button
              onClick={() => onConfirm(activity.id, 'skipped')}
              disabled={isPending}
              title="Omitir"
              className="rounded-md border border-red-400 px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors dark:hover:bg-red-950"
            >
              ✗
            </button>
            <button
              onClick={() => onConfirm(activity.id, 'postponed')}
              disabled={isPending}
              title="Posponer al día de hoy"
              className="rounded-md border border-muted-foreground px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              ↷
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DailyCheckinBannerProps {
  initialActivities: ActivityForCheckin[]
}

export function DailyCheckinBanner({ initialActivities }: DailyCheckinBannerProps) {
  const [responses, setResponses] = useState<Map<string, ResponseStatus>>(() => new Map())
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [isPending, startTransition] = useTransition()

  const habitActivities = initialActivities.filter((a) => a.habitId !== null)
  const pendingCount = initialActivities.filter((a) => !responses.has(a.id)).length
  const allAnswered = pendingCount === 0

  // Auto-collapse 2s after all answered
  useEffect(() => {
    if (allAnswered && initialActivities.length > 0) {
      const timer = setTimeout(() => setCollapsed(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [allAnswered, initialActivities.length])

  if (initialActivities.length === 0 || collapsed) return null

  const visibleActivities = initialActivities.slice(0, page * PAGE_SIZE)
  const hasMore = initialActivities.length > page * PAGE_SIZE

  function handleConfirm(activityId: string, status: ResponseStatus) {
    // Optimistic update
    setResponses((prev) => new Map(prev).set(activityId, status))
    setError(null)

    startTransition(async () => {
      const result = await confirmActivity(activityId, status)
      if (result.error) {
        // Revert optimistic update
        setResponses((prev) => {
          const next = new Map(prev)
          next.delete(activityId)
          return next
        })
        setError(result.error)
      }
    })
  }

  function handleBulkConfirm() {
    const ids = habitActivities.filter((a) => !responses.has(a.id)).map((a) => a.id)
    if (ids.length === 0) return

    // Optimistic update for all habit activities
    setResponses((prev) => {
      const next = new Map(prev)
      ids.forEach((id) => next.set(id, 'completed'))
      return next
    })
    setError(null)

    startTransition(async () => {
      const result = await bulkConfirmHabits(ids)
      if (result.error) {
        // Revert all optimistic updates
        setResponses((prev) => {
          const next = new Map(prev)
          ids.forEach((id) => next.delete(id))
          return next
        })
        setError(result.error)
      }
    })
  }

  const pendingHabitsCount = habitActivities.filter((a) => !responses.has(a.id)).length

  return (
    <section
      role="region"
      aria-label="Check-in diario"
      className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Check-in diario
          </p>
          {allAnswered ? (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              ¡Todo al día! 🎉
            </p>
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {pendingCount}{' '}
              {pendingCount === 1
                ? 'actividad del ayer sin confirmar'
                : 'actividades del ayer sin confirmar'}
            </p>
          )}
        </div>

        {/* Bulk confirm — only when 2+ habit activities pending */}
        {pendingHabitsCount >= 2 && (
          <button
            onClick={handleBulkConfirm}
            disabled={isPending}
            className="text-xs rounded-md bg-amber-600 px-3 py-1.5 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            Confirmar todos los hábitos del ayer
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">
          {error}
        </p>
      )}

      {/* Activity list */}
      {!allAnswered && (
        <div className="space-y-2">
          {visibleActivities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              responded={responses.get(activity.id)}
              isPending={isPending}
              onConfirm={handleConfirm}
            />
          ))}

          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full text-xs text-amber-700 dark:text-amber-300 py-1 hover:underline"
            >
              Ver más ({initialActivities.length - visibleActivities.length} restantes)
            </button>
          )}
        </div>
      )}
    </section>
  )
}
