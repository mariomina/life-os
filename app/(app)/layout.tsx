'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main content — offset by sidebar width on xl+ */}
      <div
        className={[
          'flex flex-col transition-[margin] duration-300',
          sidebarOpen ? 'xl:ml-64' : 'xl:ml-0',
        ].join(' ')}
      >
        <Header onMenuToggle={toggleSidebar} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
