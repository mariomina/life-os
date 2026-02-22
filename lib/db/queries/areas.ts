import { eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { areas } from '@/lib/db/schema'
import type { Area } from '@/lib/db/schema/areas'

export async function getUserAreas(userId: string): Promise<Area[]> {
  return db.select().from(areas).where(eq(areas.userId, userId)).orderBy(asc(areas.maslowLevel))
}
