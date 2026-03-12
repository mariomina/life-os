-- Story 11.7: Add slug field to areas for clean URL routing (/areas/fisiologica)
-- Ref: docs/stories/11.7.story.md#dev-notes

ALTER TABLE areas ADD COLUMN IF NOT EXISTS slug text NOT NULL DEFAULT '';

-- Seed slug values based on maslow_level (only rows without a slug yet)
UPDATE areas
SET slug = CASE maslow_level
  WHEN 1 THEN 'fisiologica'
  WHEN 2 THEN 'seguridad'
  WHEN 3 THEN 'pertenencia'
  WHEN 4 THEN 'estima'
  WHEN 5 THEN 'cognitiva'
  WHEN 6 THEN 'estetica'
  WHEN 7 THEN 'autorrealizacion'
  WHEN 8 THEN 'autotrascendencia'
  ELSE slug
END
WHERE slug = '';

-- Unique index: one slug per user
CREATE UNIQUE INDEX IF NOT EXISTS areas_user_slug_idx ON areas (user_id, slug);
