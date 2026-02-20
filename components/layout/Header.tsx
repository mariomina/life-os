'use client'

import { useTheme } from 'next-themes'
import { Menu, Sun, Moon } from 'lucide-react'

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()

  const toggleDarkMode = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-4 md:px-6">
      {/* Hamburger — mobile & sidebar toggle */}
      <button
        onClick={onMenuToggle}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Dark mode toggle — suppressHydrationWarning handles SSR mismatch */}
      <button
        onClick={toggleDarkMode}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Toggle dark mode"
        suppressHydrationWarning
      >
        <Sun className="h-5 w-5 hidden dark:block" suppressHydrationWarning />
        <Moon className="h-5 w-5 block dark:hidden" suppressHydrationWarning />
      </button>
    </header>
  )
}
