import { eq, asc, and } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { areas, areaSubareas } from '@/lib/db/schema'
import type { Area } from '@/lib/db/schema/areas'
import type { AreaSubarea } from '@/lib/db/schema/area-subareas'

export async function getUserAreas(userId: string): Promise<Area[]> {
  assertDatabaseUrl()
  return db.select().from(areas).where(eq(areas.userId, userId)).orderBy(asc(areas.maslowLevel))
}

/** Returns active sub-areas for a specific area, ordered by display (impact) order. */
export async function getSubareasByArea(areaId: string): Promise<AreaSubarea[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(areaSubareas)
    .where(and(eq(areaSubareas.areaId, areaId), eq(areaSubareas.isActive, true)))
    .orderBy(asc(areaSubareas.displayOrder))
}

/** Returns all active sub-areas for a user across all Maslow levels. */
export async function getSubareasByUser(userId: string): Promise<AreaSubarea[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(areaSubareas)
    .where(and(eq(areaSubareas.userId, userId), eq(areaSubareas.isActive, true)))
    .orderBy(asc(areaSubareas.maslowLevel), asc(areaSubareas.displayOrder))
}
