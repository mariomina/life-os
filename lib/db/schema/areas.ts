import { pgTable, uuid, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core'

/**
 * 8 Maslow Areas per user (semi-static — seeded on onboarding).
 * User can rename areas but maslow_level and group are immutable.
 *
 * D-Needs (levels 1-4): weight multipliers 2.0×, 2.0×, 1.5×, 1.5×
 * B-Needs (levels 5-8): weight multipliers 1.2×, 1.2×, 1.0×, 1.0×
 * Sum of weights = 11.4 → used in Life System Health Score formula
 */
export const areas = pgTable('areas', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** References auth.users(id) — FK enforced via SQL migration, not Drizzle */
  userId: uuid('user_id').notNull(),
  /** 1-8: Maslow hierarchy level */
  maslowLevel: integer('maslow_level').notNull(),
  /** d_needs (levels 1-4) | b_needs (levels 5-8) */
  group: text('group').$type<'d_needs' | 'b_needs'>().notNull(),
  /** User-customizable display name */
  name: text('name').notNull(),
  /** Default names: Fisiológica, Seguridad, Conexión Social, Estima, Cognitiva, Estética, Autorrealización, Autotrascendencia */
  defaultName: text('default_name').notNull(),
  /** Maslow weight multiplier: 2.0, 1.5, 1.2, or 1.0 */
  weightMultiplier: numeric('weight_multiplier', { precision: 3, scale: 1 }).notNull(),
  /** Cached current score (0-100), recalculated on each checkin/activity */
  currentScore: integer('current_score').default(0).notNull(),
  /** Timestamp of last registered activity in this area */
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Area = typeof areas.$inferSelect
export type NewArea = typeof areas.$inferInsert
