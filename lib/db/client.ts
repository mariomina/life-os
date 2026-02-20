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

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Connection pool — reuse across requests in the same serverless instance
const connectionString = process.env.DATABASE_URL

/**
 * postgres-js client.
 * prepare: false → required for Supabase Transaction Pooler (pgBouncer)
 */
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

export type DB = typeof db
