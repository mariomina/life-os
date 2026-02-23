'use server'

// actions/okrs.ts
// Server Actions para CRUD de OKRs (visión + anuales).
// La validación Buffett 5/25 se aplica en createAnnualOKR.

import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { okrs } from '@/lib/db/schema/okrs'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import {
  countActiveAnnualOKRs,
  getVision,
  updateKRProgress,
  updateAnnualOKRProgress,
} from '@/lib/db/queries/okrs'
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

export interface CreateKRData {
  parentId: string // ID del OKR anual padre
  title: string
  description?: string
  year: number
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  krType: 'time_based' | 'outcome_based' | 'milestone'
  targetValue?: number
  targetUnit?: string
}

export interface UpdateKRData {
  title?: string
  description?: string
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  krType?: 'time_based' | 'outcome_based' | 'milestone'
  targetValue?: number
  targetUnit?: string
  status?: 'active' | 'completed' | 'cancelled' | 'paused'
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

/**
 * Crea un Key Result (KR) trimestral vinculado a un OKR anual.
 */
export async function createKR(data: CreateKRData): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    await db.insert(okrs).values({
      userId,
      type: 'key_result',
      parentId: data.parentId,
      title: data.title,
      description: data.description ?? null,
      year: data.year,
      quarter: data.quarter,
      krType: data.krType,
      targetValue: data.targetValue ?? null,
      targetUnit: data.targetUnit ?? null,
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
 * Actualiza un Key Result (KR) trimestral.
 */
export async function updateKR(id: string, data: UpdateKRData): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() }
    if (data.title !== undefined) updatePayload.title = data.title
    if (data.description !== undefined) updatePayload.description = data.description ?? null
    if (data.quarter !== undefined) updatePayload.quarter = data.quarter
    if (data.krType !== undefined) updatePayload.krType = data.krType
    if (data.targetValue !== undefined) updatePayload.targetValue = data.targetValue ?? null
    if (data.targetUnit !== undefined) updatePayload.targetUnit = data.targetUnit ?? null
    if (data.status !== undefined) updatePayload.status = data.status

    await db
      .update(okrs)
      .set(updatePayload)
      .where(and(eq(okrs.id, id), eq(okrs.userId, userId), eq(okrs.type, 'key_result')))

    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

// ─── KR Progress Actions (Story 3.7) ──────────────────────────────────────────

/**
 * Recalcula y persiste el progreso de un KR específico.
 * También actualiza el progreso del OKR anual padre.
 * Invalida /okrs para que el Server Component re-fetche datos frescos.
 */
export async function recalculateKRProgress(krId: string): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    // Obtener el KR para conocer su parentId
    const kr = await db
      .select()
      .from(okrs)
      .where(and(eq(okrs.id, krId), eq(okrs.userId, userId), eq(okrs.type, 'key_result')))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (!kr) return { error: 'KR no encontrado' }

    await updateKRProgress(userId, krId)

    if (kr.parentId) {
      await updateAnnualOKRProgress(userId, kr.parentId)
    }

    revalidatePath('/okrs')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

/**
 * Confirma un KR de tipo 'milestone' creando una activity de confirmación vinculada.
 * Después recalcula el progreso (KR pasa a 100%).
 */
export async function confirmMilestone(krId: string): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    // Validar que el KR existe, pertenece al usuario y es milestone
    const kr = await db
      .select()
      .from(okrs)
      .where(and(eq(okrs.id, krId), eq(okrs.userId, userId), eq(okrs.type, 'key_result')))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (!kr) return { error: 'KR no encontrado' }
    if (kr.krType !== 'milestone') return { error: 'Solo KRs de tipo milestone pueden confirmarse' }

    // Crear activity de confirmación vinculada al KR
    await db.insert(stepsActivities).values({
      userId,
      okrId: krId,
      areaId: kr.areaId ?? null,
      title: `Hito confirmado: ${kr.title}`,
      executorType: 'human',
      planned: false,
      status: 'completed',
      completedAt: new Date(),
    })

    // Recalcular progreso (ahora habrá ≥1 activity completada → 100%)
    await updateKRProgress(userId, krId)

    if (kr.parentId) {
      await updateAnnualOKRProgress(userId, kr.parentId)
    }

    revalidatePath('/okrs')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}
