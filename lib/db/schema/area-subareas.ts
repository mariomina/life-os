import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { areas } from './areas'

/**
 * Sub-areas for each Maslow area — decompose the 8 top-level areas into
 * ~46 specific sub-areas with individual weights and scores.
 *
 * Each area (L1–L8) has 5–7 sub-areas ordered by behavioral impact
 * (displayOrder=1 is the highest-weight sub-area for that level).
 *
 * Seeded automatically during onboarding alongside the 8 parent areas.
 * Optional sub-areas (salud_sexual, mascotas) are included but flagged.
 *
 * Score formula per sub-area:
 *   score = behavioral_component × w_b + subjective_component × w_s + progress_component × w_p
 *   where weights vary by Maslow level (D-Needs: behavioral-heavy, B-Needs: subjective-heavy)
 *
 * [Source: docs/briefs/areas-redesign-brief.md#4-subareas]
 */
export const areaSubareas = pgTable(
  'area_subareas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** FK to parent area — cascades delete when area is removed */
    areaId: uuid('area_id')
      .notNull()
      .references(() => areas.id, { onDelete: 'cascade' }),
    /** Denormalized for RLS policy efficiency */
    userId: uuid('user_id').notNull(),
    /** 1-8: Maslow level (denormalized from parent area for efficient queries) */
    maslowLevel: integer('maslow_level').notNull(),
    /** Display name. Example: "Sueño y Descanso" */
    name: text('name').notNull(),
    /** URL-safe identifier unique within a maslow level. Example: "sueno" */
    slug: text('slug').notNull(),
    /**
     * Internal weight within the parent area (0.030–0.400).
     * All non-optional sub-areas per level sum to ≤ 1.0.
     * [Source: brief#4-subareas]
     */
    internalWeight: numeric('internal_weight', { precision: 4, scale: 3 }).notNull(),
    /** Cached composite score 0-100. Recalculated by area-calculator.ts */
    currentScore: integer('current_score').default(0).notNull(),
    /**
     * Display order within the area — 1 = highest impact (highest internalWeight).
     * Used for UI ordering and "top 3 sub-areas" queries.
     */
    displayOrder: integer('display_order').notNull(),
    /** true for sub-areas that are personal/optional: salud_sexual, mascotas */
    isOptional: boolean('is_optional').default(false).notNull(),
    /** false = excluded from score calculation (soft delete) */
    isActive: boolean('is_active').default(true).notNull(),
    /** Timestamp of last score recalculation */
    scoreUpdatedAt: timestamp('score_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** One slug per area — prevents duplicate sub-areas */
    uniqueAreaSlug: uniqueIndex('area_subareas_area_id_slug_idx').on(table.areaId, table.slug),
    /** RLS + queries: all sub-areas for a user by Maslow level */
    userMaslowIdx: index('area_subareas_user_maslow_idx').on(table.userId, table.maslowLevel),
    /** UI ordering: sub-areas for an area in impact order */
    areaOrderIdx: index('area_subareas_area_display_order_idx').on(
      table.areaId,
      table.displayOrder
    ),
  })
)

export type AreaSubarea = typeof areaSubareas.$inferSelect
export type NewAreaSubarea = typeof areaSubareas.$inferInsert
