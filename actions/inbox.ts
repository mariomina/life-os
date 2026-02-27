'use server'

// actions/inbox.ts
// Server Actions para captura de items en el Inbox.
// Crear, descartar y listar inbox items del usuario autenticado.
// Story 6.1 — Captura Rápida Inbox.

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { inboxItems } from '@/lib/db/schema/inbox-items'
import { getInboxItemsByUser } from '@/lib/db/queries/inbox'
import { eq, and } from 'drizzle-orm'
import type { InboxItem } from '@/lib/db/schema/inbox-items'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InboxActionResult {
  success: boolean
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user.id
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Creates a new inbox item with status 'pending'.
 * Trims whitespace and validates non-empty input.
 */
export async function createInboxItem(rawText: string): Promise<InboxActionResult> {
  const trimmed = rawText?.trim()
  if (!trimmed) return { success: false, error: 'El texto no puede estar vacío' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    await db.insert(inboxItems).values({
      userId,
      rawText: trimmed,
      status: 'pending',
    })

    revalidatePath('/inbox')
    return { success: true }
  } catch (err) {
    console.error('[createInboxItem] failed:', err)
    return { success: false, error: 'Error al guardar el item' }
  }
}

/**
 * Marks an inbox item as 'discarded'.
 * Only allows discarding items owned by the authenticated user.
 */
export async function discardInboxItem(itemId: string): Promise<InboxActionResult> {
  if (!itemId) return { success: false, error: 'ID de item inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    await db
      .update(inboxItems)
      .set({ status: 'discarded', updatedAt: new Date() })
      .where(and(eq(inboxItems.id, itemId), eq(inboxItems.userId, userId)))

    revalidatePath('/inbox')
    return { success: true }
  } catch (err) {
    console.error('[discardInboxItem] failed:', err)
    return { success: false, error: 'Error al descartar el item' }
  }
}

/**
 * Returns inbox items for the authenticated user, optionally filtered by status.
 */
export async function getInboxItems(statusFilter?: InboxItem['status']): Promise<InboxItem[]> {
  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()
    return getInboxItemsByUser(userId, statusFilter)
  } catch (err) {
    console.error('[getInboxItems] failed:', err)
    return []
  }
}
