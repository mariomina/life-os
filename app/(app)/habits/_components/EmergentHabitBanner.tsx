'use client'

// EmergentHabitBanner — AC9
// Shows a non-intrusive toast/banner suggesting to convert a repeated
// spontaneous activity into a habit.
//
// Dismissal is persisted in localStorage with key:
//   dismissed_habit_suggestion_{slugified-title}
// so the banner only shows once per suggestion.

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'

interface EmergentHabitBannerProps {
  suggestedTitle: string
  onCreateHabit: (title: string) => void
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function EmergentHabitBanner({ suggestedTitle, onCreateHabit }: EmergentHabitBannerProps) {
  const storageKey = `dismissed_habit_suggestion_${slugify(suggestedTitle)}`

  // Lazy initializer reads localStorage once at mount — avoids useEffect+setState cascade.
  const [visible, setVisible] = useState<boolean>(
    () => typeof window !== 'undefined' && !localStorage.getItem(storageKey)
  )

  function handleDismiss() {
    localStorage.setItem(storageKey, '1')
    setVisible(false)
  }

  function handleCreate() {
    localStorage.setItem(storageKey, '1')
    setVisible(false)
    onCreateHabit(suggestedTitle)
  }

  if (!visible) return null

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl border bg-card shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom-4 duration-300"
    >
      <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm font-medium text-foreground">
          Pareces repetir{' '}
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            &ldquo;{suggestedTitle}&rdquo;
          </span>{' '}
          frecuentemente. ¿Quieres convertirlo en un hábito?
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Crear hábito
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            No, gracias
          </button>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
