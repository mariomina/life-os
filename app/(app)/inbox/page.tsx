import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getInboxItemsByUser } from '@/lib/db/queries/inbox'
import { InboxClient } from './_components/InboxClient'

/**
 * Página de Inbox — Server Component puro.
 *
 * Carga los items del inbox del usuario autenticado y renderiza
 * el Client Component que gestiona captura, filtros y descarte.
 * Story 6.1 — Captura Rápida Inbox.
 */
export default async function InboxPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const items = await getInboxItemsByUser(user.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Captura rápida de ideas, tareas y eventos. Clasifícalos después.
        </p>
      </section>

      {/* Capture + List */}
      <InboxClient initialItems={items} />
    </div>
  )
}
