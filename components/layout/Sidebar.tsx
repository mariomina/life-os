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

const menuItems: NavItem[] = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/areas', label: 'Áreas de Vida', icon: Grid3X3 },
  { href: '/okrs', label: 'OKRs', icon: Target },
  { href: '/projects', label: 'Proyectos', icon: FolderOpen },
  { href: '/calendar', label: 'Calendario', icon: Calendar },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
]

const toolItems: NavItem[] = [
  { href: '/habits', label: 'Hábitos', icon: CheckSquare },
  { href: '/skills', label: 'Habilidades', icon: Star },
  { href: '/reports', label: 'Informes', icon: BarChart3 },
  { href: '/weekly-review', label: 'Review Semanal', icon: ClipboardList },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  pendingInboxCount?: number
}

export function Sidebar({ isOpen, onToggle, pendingInboxCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  const navItemClass = (href: string) =>
    isActive(href)
      ? 'flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-semibold bg-accent text-sidebar-primary transition-colors'
      : 'flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors'

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
          'fixed left-0 top-0 z-40 h-screen flex-col bg-white border-r border-border',
          'sidebar-transition overflow-hidden',
          isOpen ? 'w-64 flex' : 'w-0 flex',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">L</span>
            </div>
            <span className="text-lg font-semibold text-foreground">life-os</span>
          </Link>
          {/* Collapse button — desktop only */}
          <button
            onClick={onToggle}
            className="hidden xl:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Colapsar sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {/* Section: MENÚ */}
          <p className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Menú
          </p>
          <ul>
            {menuItems.map((item) => {
              const showBadge = item.href === '/inbox' && pendingInboxCount > 0
              return (
                <li key={item.href}>
                  <Link href={item.href} className={navItemClass(item.href)}>
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {showBadge && (
                      <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {pendingInboxCount > 99 ? '99+' : pendingInboxCount}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Section: HERRAMIENTAS */}
          <p className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Herramientas
          </p>
          <ul>
            {toolItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={navItemClass(item.href)}>
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-4 py-4">
          <p className="text-xs text-muted-foreground">life-os v0.1.0</p>
        </div>
      </aside>
    </>
  )
}
