import { eq, and, isNull, asc, inArray } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { skills } from '@/lib/db/schema/skills'
import type { Skill } from '@/lib/db/schema/skills'
import { stepSkillTags } from '@/lib/db/schema/step-skill-tags'

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

/**
 * Returns skills tagged to a specific step activity.
 * Only returns skills owned by the given userId (security guard).
 * Story 7.2 — AC6.
 */
export async function getSkillsForActivity(
  stepActivityId: string,
  userId: string
): Promise<Skill[]> {
  assertDatabaseUrl()
  const tags = await db
    .select({ skillId: stepSkillTags.skillId })
    .from(stepSkillTags)
    .where(and(eq(stepSkillTags.stepActivityId, stepActivityId), eq(stepSkillTags.userId, userId)))

  if (tags.length === 0) return []

  return db
    .select()
    .from(skills)
    .where(
      inArray(
        skills.id,
        tags.map((t) => t.skillId)
      )
    )
    .orderBy(asc(skills.name))
}

/**
 * Returns skill tags per activity as Record<activityId, skillId[]>.
 * Used by CalendarPage to pre-load skill tags for all visible activities.
 * Story 7.2 — AC7.
 */
export async function getSkillTagsForActivities(
  activityIds: string[],
  userId: string
): Promise<Record<string, string[]>> {
  if (activityIds.length === 0) return {}
  assertDatabaseUrl()

  const tags = await db
    .select({
      stepActivityId: stepSkillTags.stepActivityId,
      skillId: stepSkillTags.skillId,
    })
    .from(stepSkillTags)
    .where(
      and(inArray(stepSkillTags.stepActivityId, activityIds), eq(stepSkillTags.userId, userId))
    )

  const result: Record<string, string[]> = {}
  for (const tag of tags) {
    if (!result[tag.stepActivityId]) result[tag.stepActivityId] = []
    result[tag.stepActivityId].push(tag.skillId)
  }
  return result
}
