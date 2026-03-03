'use client'

import { useTheme } from 'next-themes'
import { Menu, Sun, Moon, Search, Bell } from 'lucide-react'

interface HeaderProps {
  onMenuToggle: () => void
  userName?: string
  userEmail?: string
}

function getUserInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email[0].toUpperCase()
  return 'U'
}

export function Header({ onMenuToggle, userName, userEmail }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const userInitials = getUserInitials(userName, userEmail)

  const toggleDarkMode = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
      {/* Hamburger — mobile & sidebar toggle */}
      <button
        onClick={onMenuToggle}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search bar — UI only */}
      <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground w-64 cursor-pointer hover:border-primary/30 transition-colors">
        <Search className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1">Buscar...</span>
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bell — UI only */}
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
      </button>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Toggle dark mode"
        suppressHydrationWarning
      >
        <Sun className="h-5 w-5 hidden dark:block" suppressHydrationWarning />
        <Moon className="h-5 w-5 block dark:hidden" suppressHydrationWarning />
      </button>

      {/* Profile widget */}
      <div className="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1.5 hover:bg-muted transition-colors">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
          {userInitials}
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-foreground leading-none">
            {userName ?? 'Usuario'}
          </p>
          <p className="text-[11px] text-muted-foreground">{userEmail ?? ''}</p>
        </div>
      </div>
    </header>
  )
}
