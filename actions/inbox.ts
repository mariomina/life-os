'use server'

// actions/inbox.ts
// Server Actions para captura de items en el Inbox.
// Crear, descartar, listar y procesar inbox items del usuario autenticado.
// Story 6.1 — Captura Rápida Inbox.
// Story 6.2 — Pipeline IA: clasificación + área/OKR sugerido + detección huecos.

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { inboxItems } from '@/lib/db/schema/inbox-items'
import { getInboxItemsByUser } from '@/lib/db/queries/inbox'
import { getFreeSlots } from '@/lib/db/queries/calendar'
import { getActiveOKRsForUser } from '@/lib/db/queries/okrs'
import { getUserAreas } from '@/lib/db/queries/areas'
import { getAIProvider } from '@/lib/ai'
import { eq, and } from 'drizzle-orm'
import type { InboxItem } from '@/lib/db/schema/inbox-items'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InboxActionResult {
  success: boolean
  error?: string
}

export interface ProcessInboxResult {
  success: boolean
  /** true when AI was unavailable and item fell back to manual mode (FR22) */
  manual?: boolean
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

/**
 * Runs the AI pipeline for an inbox item:
 * 1. Validates ownership and fetches the item
 * 2. Sets status = 'processing'
 * 3. Fetches context: free calendar slots (next 7 days), user areas, active OKRs
 * 4. Calls ILLMProvider.classifyInboxItem
 * 5. On success: updates item with AI results + status = 'processed'
 * 6. On error (FR22): updates item with status = 'manual' + aiError (graceful fallback)
 *
 * Never throws to the client — errors result in manual fallback.
 */
export async function processInboxItem(itemId: string): Promise<ProcessInboxResult> {
  if (!itemId?.trim()) return { success: false, error: 'ID de item inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    // Verify item exists and belongs to this user
    const itemRows = await db
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.id, itemId), eq(inboxItems.userId, userId)))
      .limit(1)

    const item = itemRows[0]
    if (!item) return { success: false, error: 'Item no encontrado' }

    // Mark as processing
    await db
      .update(inboxItems)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(inboxItems.id, itemId))

    // Gather context for AI
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [freeSlots, areas, activeOKRs] = await Promise.all([
      getFreeSlots(userId, now, sevenDaysLater),
      getUserAreas(userId),
      getActiveOKRsForUser(userId),
    ])

    const context = {
      areas: areas.map((a) => ({
        id: a.id,
        name: a.name ?? a.defaultName ?? `Área ${a.maslowLevel}`,
        maslowLevel: a.maslowLevel,
      })),
      activeOKRs: activeOKRs.map((o) => ({
        id: o.id,
        title: o.title,
        type: o.type,
        areaId: o.areaId,
      })),
      freeSlots: freeSlots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        durationMinutes: s.durationMinutes,
      })),
    }

    // AI classification
    try {
      const provider = await getAIProvider()
      const result = await provider.classifyInboxItem(item.rawText, context)

      await db
        .update(inboxItems)
        .set({
          status: 'processed',
          aiClassification: result.classification,
          aiSuggestedAreaId: result.suggestedAreaId,
          aiSuggestedOkrId: result.suggestedOkrId ?? null,
          aiSuggestedSlot: new Date(result.suggestedSlot),
          aiSuggestedTitle: result.suggestedTitle,
          aiSuggestedDurationMinutes: result.estimatedDurationMinutes,
          aiError: null,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inboxItems.id, itemId))

      revalidatePath('/inbox')
      return { success: true, manual: false }
    } catch (aiErr) {
      // FR22: graceful fallback to manual mode
      const errorMsg = aiErr instanceof Error ? aiErr.message : 'Error desconocido del proveedor IA'
      console.error('[processInboxItem] AI classification failed (FR22 fallback):', aiErr)

      await db
        .update(inboxItems)
        .set({
          status: 'manual',
          aiError: errorMsg,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inboxItems.id, itemId))

      revalidatePath('/inbox')
      return { success: true, manual: true }
    }
  } catch (err) {
    console.error('[processInboxItem] failed:', err)
    return { success: false, error: 'Error al procesar el item' }
  }
}
