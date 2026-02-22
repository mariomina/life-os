import type { Alert } from '@/features/maslow/alerts'

interface AlertBannerProps {
  alerts: Alert[]
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const isCritical = alert.type === 'critical'
        return (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              isCritical
                ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
                : 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
            }`}
          >
            <span className="mt-0.5 shrink-0">{isCritical ? '🚨' : '⚠️'}</span>
            <p>{alert.message}</p>
          </div>
        )
      })}
    </div>
  )
}
