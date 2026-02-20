'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Grid3X3,
  Target,
  FolderOpen,
  Calendar,
  Inbox,
  CheckSquare,
  Star,
  BarChart3,
  ClipboardList,
  ChevronLeft,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/areas', label: 'Áreas de Vida', icon: Grid3X3 },
  { href: '/okrs', label: 'OKRs', icon: Target },
  { href: '/projects', label: 'Proyectos', icon: FolderOpen },
  { href: '/calendar', label: 'Calendario', icon: Calendar },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/habits', label: 'Hábitos', icon: CheckSquare },
  { href: '/skills', label: 'Habilidades', icon: Star },
  { href: '/reports', label: 'Informes', icon: BarChart3 },
  { href: '/weekly-review', label: 'Review Semanal', icon: ClipboardList },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 xl:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed left-0 top-0 z-40 h-screen flex-col bg-[#1c2434] dark:bg-[#24303f]',
          'sidebar-transition overflow-hidden',
          isOpen ? 'w-64 flex' : 'w-0 flex',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-white">L</span>
            </div>
            <span className="text-lg font-semibold text-white">life-os</span>
          </Link>
          {/* Collapse button — desktop only */}
          <button
            onClick={onToggle}
            className="hidden xl:flex h-8 w-8 items-center justify-center rounded-full text-[#adb7be] hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Colapsar sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={[
                      'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-[#adb7be] hover:bg-white/5 hover:text-white',
                    ].join(' ')}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4">
          <p className="text-xs text-[#adb7be]">life-os v0.1.0</p>
        </div>
      </aside>
    </>
  )
}
