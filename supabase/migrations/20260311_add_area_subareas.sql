-- Migration: Add area_subareas and area_subarea_scores tables
-- Epic 11: Areas Redesign — Story 11.1
-- Created: 2026-03-11

-- ── area_subareas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS area_subareas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id         UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  maslow_level    INTEGER NOT NULL,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  internal_weight NUMERIC(4,3) NOT NULL,
  current_score   INTEGER NOT NULL DEFAULT 0,
  display_order   INTEGER NOT NULL,
  is_optional     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  score_updated_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique slug per area (prevents duplicate sub-areas within an area)
CREATE UNIQUE INDEX IF NOT EXISTS area_subareas_area_id_slug_idx
  ON area_subareas (area_id, slug);

-- RLS + queries: all sub-areas for a user by Maslow level
CREATE INDEX IF NOT EXISTS area_subareas_user_maslow_idx
  ON area_subareas (user_id, maslow_level);

-- UI ordering: sub-areas for an area in impact order
CREATE INDEX IF NOT EXISTS area_subareas_area_display_order_idx
  ON area_subareas (area_id, display_order);

-- RLS: users can only access their own sub-areas
ALTER TABLE area_subareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own area_subareas"
  ON area_subareas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own area_subareas"
  ON area_subareas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own area_subareas"
  ON area_subareas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own area_subareas"
  ON area_subareas FOR DELETE
  USING (auth.uid() = user_id);


-- ── area_subarea_scores ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS area_subarea_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subarea_id        UUID NOT NULL REFERENCES area_subareas(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL,
  score             INTEGER NOT NULL DEFAULT 0,
  behavioral_score  INTEGER DEFAULT 0,
  subjective_score  INTEGER DEFAULT 0,
  progress_score    INTEGER DEFAULT 0,
  scored_at         DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One score per sub-area per day
CREATE UNIQUE INDEX IF NOT EXISTS area_subarea_scores_subarea_id_scored_at_idx
  ON area_subarea_scores (subarea_id, scored_at);

-- Historical queries: user's sub-area scores over time
CREATE INDEX IF NOT EXISTS area_subarea_scores_user_subarea_time_idx
  ON area_subarea_scores (user_id, subarea_id, scored_at);

-- RLS: users can only access their own scores
ALTER TABLE area_subarea_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own area_subarea_scores"
  ON area_subarea_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own area_subarea_scores"
  ON area_subarea_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own area_subarea_scores"
  ON area_subarea_scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own area_subarea_scores"
  ON area_subarea_scores FOR DELETE
  USING (auth.uid() = user_id);


-- ── areas: add score_updated_at ──────────────────────────────────────────────
ALTER TABLE areas
  ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ;
