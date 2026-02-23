'use server'

// actions/projects.ts
// Server Actions para CRUD de Proyectos.
// Los proyectos son los vehículos de ejecución de KRs (FR5).

import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { projects } from '@/lib/db/schema/projects'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ActionResult {
  error: string | null
}

export interface CreateProjectData {
  title: string
  description?: string
  areaId: string
  okrId?: string | null
}

export interface UpdateProjectData {
  title?: string
  description?: string
  areaId?: string
  okrId?: string | null
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
 * Crea un nuevo proyecto para el usuario.
 *
 * Validaciones:
 * - Usuario autenticado
 * - Título requerido (no vacío)
 * - Área requerida
 *
 * Estado inicial: 'active'
 */
export async function createProject(data: CreateProjectData): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    if (!data.title.trim()) {
      return { error: 'El título es requerido' }
    }
    if (!data.areaId) {
      return { error: 'El área es requerida' }
    }

    const userId = await getAuthenticatedUserId()

    await db.insert(projects).values({
      userId,
      title: data.title.trim(),
      description: data.description?.trim() ?? null,
      areaId: data.areaId,
      okrId: data.okrId ?? null,
      status: 'active',
    })

    revalidatePath('/projects')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

/**
 * Actualiza título, descripción, área u OKR vinculado de un proyecto.
 * Solo el propietario puede actualizar su propio proyecto (userId en WHERE).
 */
export async function updateProject(id: string, data: UpdateProjectData): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    if (data.title !== undefined && !data.title.trim()) {
      return { error: 'El título no puede estar vacío' }
    }

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() }
    if (data.title !== undefined) updatePayload.title = data.title.trim()
    if (data.description !== undefined) updatePayload.description = data.description?.trim() ?? null
    if (data.areaId !== undefined) updatePayload.areaId = data.areaId
    if (data.okrId !== undefined) updatePayload.okrId = data.okrId ?? null

    await db
      .update(projects)
      .set(updatePayload)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))

    revalidatePath('/projects')
    revalidatePath(`/projects/${id}`)
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

/**
 * Delete lógico: cambia status a 'archived'.
 * Sin borrado físico — preserva historial y workflows vinculados.
 */
export async function archiveProject(id: string): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    await db
      .update(projects)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))

    revalidatePath('/projects')
    revalidatePath(`/projects/${id}`)
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}
