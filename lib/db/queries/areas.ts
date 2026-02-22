import { eq, asc } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { areas } from '@/lib/db/schema'
import type { Area } from '@/lib/db/schema/areas'

export async function getUserAreas(userId: string): Promise<Area[]> {
  assertDatabaseUrl()
  return db.select().from(areas).where(eq(areas.userId, userId)).orderBy(asc(areas.maslowLevel))
}
