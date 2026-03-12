'use server'

// actions/areas.ts
// Server Actions para consultas de áreas y sub-áreas.
// Expone getSubareasByArea como Server Action para uso seguro desde Client Components.

import { eq, asc, and } from 'drizzle-orm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { areaSubareas } from '@/lib/db/schema/area-subareas'
import type { AreaSubarea } from '@/lib/db/schema/area-subareas'

/**
 * Server Action — retorna sub-áreas activas de un área, ordenadas por displayOrder.
 * Valida que el área pertenezca al usuario autenticado.
 */
export async function getSubareasForArea(areaId: string): Promise<AreaSubarea[]> {
  if (!areaId) return []
  assertDatabaseUrl()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  return db
    .select()
    .from(areaSubareas)
    .where(
      and(
        eq(areaSubareas.areaId, areaId),
        eq(areaSubareas.userId, user.id),
        eq(areaSubareas.isActive, true)
      )
    )
    .orderBy(asc(areaSubareas.displayOrder))
}
