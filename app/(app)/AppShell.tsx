'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

interface AppShellProps {
  children: React.ReactNode
  pendingInboxCount: number
  userName?: string
  userEmail?: string
}

export default function AppShell({
  children,
  pendingInboxCount,
  userName,
  userEmail,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()
  // Stores the sidebar state before entering Calendar Mode so we can restore it on exit
  const prevSidebarStateRef = useRef<boolean | null>(null)

  // Calendar Mode (AC1 Story 10.2): auto-collapse nav sidebar when on /calendar
  useEffect(() => {
    if (pathname.startsWith('/calendar')) {
      // Save current state only once when entering /calendar
      if (prevSidebarStateRef.current === null) {
        prevSidebarStateRef.current = sidebarOpen
      }
      setSidebarOpen(false)
    } else {
      // Restore previous state when leaving /calendar
      if (prevSidebarStateRef.current !== null) {
        setSidebarOpen(prevSidebarStateRef.current)
        prevSidebarStateRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        pendingInboxCount={pendingInboxCount}
      />

      {/* Main content — offset by sidebar width on xl+ */}
      <div
        className={[
          'flex flex-col transition-[margin] duration-300',
          sidebarOpen ? 'xl:ml-64' : 'xl:ml-0',
        ].join(' ')}
      >
        <Header onMenuToggle={toggleSidebar} userName={userName} userEmail={userEmail} />
        <main className={pathname.startsWith('/calendar') ? 'flex-1' : 'flex-1 p-4 md:p-6'}>
          {children}
        </main>
      </div>
    </div>
  )
}
