import { eq, and, isNull, asc } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { skills } from '@/lib/db/schema/skills'
import type { Skill } from '@/lib/db/schema/skills'

/**
 * Returns all active (non-archived) skills for a user, ordered by name.
 * Story 7.1 — CRUD Habilidades.
 */
export async function getUserSkills(userId: string): Promise<Skill[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(skills)
    .where(and(eq(skills.userId, userId), isNull(skills.archivedAt)))
    .orderBy(asc(skills.name))
}

/**
 * Returns all skills for a user (including archived), for admin/report use.
 */
export async function getAllUserSkills(userId: string): Promise<Skill[]> {
  assertDatabaseUrl()
  return db.select().from(skills).where(eq(skills.userId, userId)).orderBy(asc(skills.name))
}
