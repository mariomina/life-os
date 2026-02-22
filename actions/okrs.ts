'use server'

// actions/okrs.ts
// Server Actions para CRUD de OKRs (visión + anuales).
// La validación Buffett 5/25 se aplica en createAnnualOKR.

import { eq, and } from 'drizzle-orm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { okrs } from '@/lib/db/schema/okrs'
import { countActiveAnnualOKRs, getVision } from '@/lib/db/queries/okrs'
import { MAX_ANNUAL_OKRS } from '@/lib/utils/okr-constants'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ActionResult {
  error: string | null
}

export interface UpsertVisionData {
  title: string
  description?: string
}

export interface CreateAnnualOKRData {
  title: string
  description?: string
  areaId?: string | null
  year: number
}

export interface UpdateAnnualOKRData {
  title?: string
  description?: string
  areaId?: string | null
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
 * Crea o actualiza la visión narrativa de 5 años del usuario.
 * Garantiza unicidad: si ya existe un registro type='vision', lo actualiza.
 * No acepta área vinculada — la visión es narrativa pura.
 */
export async function upsertVision(data: UpsertVisionData): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()
    const existing = await getVision(userId)

    if (existing) {
      await db
        .update(okrs)
        .set({
          title: data.title,
          description: data.description ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(okrs.id, existing.id), eq(okrs.userId, userId)))
    } else {
      await db.insert(okrs).values({
        userId,
        type: 'vision',
        title: data.title,
        description: data.description ?? null,
      })
    }

    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

/**
 * Crea un OKR anual para el usuario.
 *
 * Validaciones:
 * - Usuario autenticado
 * - Regla Buffett 5/25: máx MAX_ANNUAL_OKRS OKRs anuales activos por año
 *
 * El parent_id se enlaza automáticamente a la visión del usuario si existe.
 */
export async function createAnnualOKR(data: CreateAnnualOKRData): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    // Validación Buffett 5/25
    const activeCount = await countActiveAnnualOKRs(userId, data.year)
    if (activeCount >= MAX_ANNUAL_OKRS) {
      return {
        error: `Máximo ${MAX_ANNUAL_OKRS} OKRs anuales activos (regla Buffett 5/25). Cancela uno antes de crear otro.`,
      }
    }

    // Enlazar con visión si existe
    const vision = await getVision(userId)

    await db.insert(okrs).values({
      userId,
      type: 'annual',
      parentId: vision?.id ?? null,
      areaId: data.areaId ?? null,
      title: data.title,
      description: data.description ?? null,
      year: data.year,
      progress: 0,
      status: 'active',
    })

    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

/**
 * Actualiza título, descripción o área de un OKR anual existente.
 * Solo el propietario puede actualizar su propio OKR (userId en WHERE).
 */
export async function updateAnnualOKR(
  id: string,
  data: UpdateAnnualOKRData
): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() }
    if (data.title !== undefined) updatePayload.title = data.title
    if (data.description !== undefined) updatePayload.description = data.description ?? null
    if (data.areaId !== undefined) updatePayload.areaId = data.areaId ?? null

    await db
      .update(okrs)
      .set(updatePayload)
      .where(and(eq(okrs.id, id), eq(okrs.userId, userId), eq(okrs.type, 'annual')))

    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

/**
 * Delete lógico: cambia status a 'cancelled'.
 * Sin borrado físico — preserva historial.
 * Funciona para cualquier tipo de OKR (vision, annual, key_result).
 */
export async function deleteOKR(id: string): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    await db
      .update(okrs)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(okrs.id, id), eq(okrs.userId, userId)))

    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}
