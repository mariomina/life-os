/**
 * Drizzle ORM Schema — life-os
 * Single barrel export for all tables and relations.
 *
 * Import order respects FK dependencies:
 *   1. Leaf tables (no FK deps)
 *   2. Mid-level tables
 *   3. Deep tables
 *   4. Relations (always last — references everything)
 *
 * Usage:
 *   import { areas, stepsActivities, ... } from '@/lib/db/schema'
 *   import { db } from '@/lib/db/client'
 */

// ── Level 1: No upstream FK dependencies ──────────────────────
export * from './areas'
export * from './workflow-templates'
export * from './skills'
export * from './habits'
export * from './calendars'

// ── Level 1.5: Depend on areas (sub-area tables) ──────────────
export * from './area-subareas'

// ── Level 1.6: Depend on area-subareas ────────────────────────
export * from './area-subarea-scores'

// ── Level 2: Depend on Level 1 ────────────────────────────────
export * from './area-scores'
export * from './okrs'

// ── Level 3: Depend on Level 1-2 ──────────────────────────────
export * from './projects'

// ── Level 4: Depend on Level 3 ────────────────────────────────
export * from './workflows'

// ── Level 5: Depend on Level 4 ────────────────────────────────
export * from './tasks'

// ── Level 6: Depend on Level 1-5 ──────────────────────────────
export * from './steps-activities'

// ── Level 7: Depend on steps-activities ───────────────────────
export * from './time-entries'
export * from './inbox-items'
export * from './checkin-responses'
export * from './step-skill-tags'
export * from './aios-queue-log'

// ── Level 8: Independent analytics ───────────────────────────
export * from './correlations'
export * from './user-events'

// ── Level 9: Independent user data ────────────────────────────
export * from './holidays'

// ── Relations: Always last ────────────────────────────────────
export * from './relations'
