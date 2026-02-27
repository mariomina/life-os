// lib/db/queries/inbox.ts
// Inbox item queries for fetching and counting user inbox items.
// Used by actions/inbox.ts and app/(app)/inbox/page.tsx.

import { eq, and, desc, sql } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { inboxItems } from '@/lib/db/schema/inbox-items'
import type { InboxItem } from '@/lib/db/schema/inbox-items'

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns inbox items for a user, optionally filtered by status.
 * Ordered by createdAt DESC, capped at 50 items.
 */
export async function getInboxItemsByUser(
  userId: string,
  statusFilter?: InboxItem['status']
): Promise<InboxItem[]> {
  assertDatabaseUrl()
  const conditions = [eq(inboxItems.userId, userId)]
  if (statusFilter) {
    conditions.push(eq(inboxItems.status, statusFilter))
  }
  return db
    .select()
    .from(inboxItems)
    .where(and(...conditions))
    .orderBy(desc(inboxItems.createdAt))
    .limit(50)
}

/**
 * Returns the count of pending inbox items for a user.
 * Used by sidebar badge.
 */
export async function getPendingInboxCount(userId: string): Promise<number> {
  assertDatabaseUrl()
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inboxItems)
    .where(and(eq(inboxItems.userId, userId), eq(inboxItems.status, 'pending')))
  return result[0]?.count ?? 0
}
