// app/(app)/calendar/page.tsx
// Server Component — auth check + calendar shell.
// Delegates rendering to CalendarClient (Client Component).

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CalendarClient } from './_components/CalendarClient'
import type { ICalendarEvent } from '@/lib/calendar/calendar-utils'

// ─── Stub events for AC5 (removed when DB is connected in Story 5.2+) ─────────

const STUB_EVENTS: ICalendarEvent[] = [
  {
    id: 'stub-1',
    title: 'Meditación matutina',
    start: new Date(new Date().setUTCHours(7, 0, 0, 0)),
    end: new Date(new Date().setUTCHours(7, 30, 0, 0)),
    color: 'blue',
    description: 'Evento de prueba — se reemplazará con datos reales en Story 5.2',
  },
  {
    id: 'stub-2',
    title: 'Bloque de trabajo profundo',
    start: new Date(new Date().setUTCHours(9, 0, 0, 0)),
    end: new Date(new Date().setUTCHours(11, 0, 0, 0)),
    color: 'purple',
  },
]

export default async function CalendarPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
        <p className="text-sm text-muted-foreground">
          Visualiza y planifica tus actividades, hábitos y eventos
        </p>
      </section>

      {/* Calendar */}
      <CalendarClient events={STUB_EVENTS} defaultView="week" />
    </div>
  )
}
