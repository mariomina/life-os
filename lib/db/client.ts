import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Drizzle ORM client for life-os.
 * Server-side only — NEVER import this in Client Components.
 *
 * Uses Supabase Transaction Pooler connection string (port 6543).
 * `prepare: false` is REQUIRED for Supabase pooler in transaction mode.
 *
 * Environment variable: DATABASE_URL
 * Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 *
 * Usage in Server Actions / Server Components:
 *   import { db } from '@/lib/db/client'
 *   import { stepsActivities } from '@/lib/db/schema'
 *
 *   const activities = await db
 *     .select()
 *     .from(stepsActivities)
 *     .where(eq(stepsActivities.userId, userId))
 *
 * NEVER access db directly from Server Actions — always use lib/db/queries/*.ts functions.
 */

/**
 * postgres-js client.
 * prepare: false → required for Supabase Transaction Pooler (pgBouncer)
 *
 * DATABASE_URL is validated at runtime (first request), not at module
 * evaluation, so that Next.js can complete the build without a live DB.
 */
const connectionString = process.env.DATABASE_URL ?? 'postgresql://placeholder'

const client = postgres(connectionString, {
  prepare: false,
  // Max connections per serverless function instance
  max: 1,
})

/**
 * Drizzle ORM instance with full schema.
 * Pass schema for db.query.* relational API support.
 */
export const db = drizzle(client, { schema })

/**
 * Call this at the top of every server-side query function to ensure
 * DATABASE_URL is present before attempting a real DB connection.
 */
export function assertDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
}

export type DB = typeof db
