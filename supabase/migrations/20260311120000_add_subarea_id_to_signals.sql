-- ── Story 11.2: Vinculación de Señales Conductuales a Sub-áreas ──────────────
-- Adds optional subarea_id FK to steps_activities and habits so that
-- behavioral signals can be linked to specific sub-areas for scoring.
-- ON DELETE SET NULL ensures backward compatibility — existing rows keep null.

ALTER TABLE steps_activities
  ADD COLUMN subarea_id UUID REFERENCES area_subareas(id) ON DELETE SET NULL;

ALTER TABLE habits
  ADD COLUMN subarea_id UUID REFERENCES area_subareas(id) ON DELETE SET NULL;

CREATE INDEX steps_activities_subarea_id_idx ON steps_activities(subarea_id);
CREATE INDEX habits_subarea_id_idx ON habits(subarea_id);
