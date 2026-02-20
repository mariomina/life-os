import type { Config } from 'drizzle-kit'

/**
 * Drizzle Kit configuration for life-os.
 *
 * Commands (run from project root):
 *   Generate migration:  npx drizzle-kit generate
 *   Push to DB:          npx drizzle-kit push   (dev only — direct schema push)
 *   Open Drizzle Studio: npx drizzle-kit studio
 *   Check migrations:    npx drizzle-kit check
 *
 * WARNING: Use `push` only in development against local Supabase.
 * In production, always use `generate` → review SQL → apply via Supabase migrations.
 */
export default {
  schema: './lib/db/schema/index.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Verbose output for debugging migration generation
  verbose: true,
  strict: true,
} satisfies Config
