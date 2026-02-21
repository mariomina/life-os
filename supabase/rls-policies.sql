-- ============================================
-- RLS Policies — life-os
-- Story 1.2: Enable RLS on all 15 tables
-- ============================================

-- ============================================
-- STEP 1: Enable RLS on all 15 tables
-- ============================================
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_skill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Policies for tables with direct user_id
-- (ALL operations: user_id = auth.uid())
-- Note: workflow_templates excluded — handled in STEP 3
-- ============================================

CREATE POLICY "user_owns_row" ON areas
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON area_scores
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON okrs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON habits
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON skills
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON projects
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON workflows
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON tasks
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON steps_activities
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON time_entries
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON inbox_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON checkin_responses
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON step_skill_tags
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_owns_row" ON correlations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- STEP 3: workflow_templates
-- user_id is nullable (NULL for system templates seeded by admin).
-- System templates (is_system=true) are readable by all authenticated users.
-- Users can only insert/update/delete their own templates (user_id = auth.uid()).
-- ============================================

CREATE POLICY "select_own_or_system" ON workflow_templates
  FOR SELECT USING (user_id = auth.uid() OR is_system = true);

CREATE POLICY "insert_own" ON workflow_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own" ON workflow_templates
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_own" ON workflow_templates
  FOR DELETE USING (user_id = auth.uid());
