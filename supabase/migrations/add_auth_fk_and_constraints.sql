-- ============================================
-- FK: user_id → auth.users(id) ON DELETE CASCADE
-- Story 1.4: DB Schema Refinement
-- Applied via Supabase MCP (not drizzle-kit — auth schema is outside Drizzle scope)
-- ============================================

-- NOTE: workflow_templates has nullable user_id (null for system templates).
-- FK constraint only verifies NON-NULL values, so NULL passes the check safely.

ALTER TABLE public.areas
  ADD CONSTRAINT areas_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.area_scores
  ADD CONSTRAINT area_scores_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.okrs
  ADD CONSTRAINT okrs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.habits
  ADD CONSTRAINT habits_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.skills
  ADD CONSTRAINT skills_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.workflow_templates
  ADD CONSTRAINT workflow_templates_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.workflows
  ADD CONSTRAINT workflows_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.steps_activities
  ADD CONSTRAINT steps_activities_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.inbox_items
  ADD CONSTRAINT inbox_items_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.checkin_responses
  ADD CONSTRAINT checkin_responses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.step_skill_tags
  ADD CONSTRAINT step_skill_tags_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.correlations
  ADD CONSTRAINT correlations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- CHECK constraints: validate critical value ranges
-- ============================================

-- areas: maslow_level must be 1-8 (8 Maslow needs hierarchy levels)
ALTER TABLE public.areas
  ADD CONSTRAINT areas_maslow_level_check CHECK (maslow_level BETWEEN 1 AND 8);

-- areas: current_score must be 0-100 (Life System Health Score formula)
ALTER TABLE public.areas
  ADD CONSTRAINT areas_current_score_check CHECK (current_score BETWEEN 0 AND 100);

-- okrs: progress must be 0-100 (calculated automatically from activities)
ALTER TABLE public.okrs
  ADD CONSTRAINT okrs_progress_check CHECK (progress BETWEEN 0 AND 100);

-- checkin_responses: energy_level must be 1-5 (Likert scale)
ALTER TABLE public.checkin_responses
  ADD CONSTRAINT checkin_responses_energy_level_check CHECK (energy_level BETWEEN 1 AND 5);
