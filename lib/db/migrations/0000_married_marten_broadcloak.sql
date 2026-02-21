CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"maslow_level" integer NOT NULL,
	"group" text NOT NULL,
	"name" text NOT NULL,
	"default_name" text NOT NULL,
	"weight_multiplier" numeric(3, 1) NOT NULL,
	"current_score" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"executor_type_default" text DEFAULT 'human' NOT NULL,
	"squad_type" text DEFAULT 'none' NOT NULL,
	"tasks_config" jsonb NOT NULL,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"area_id" uuid,
	"name" text NOT NULL,
	"level" text DEFAULT 'beginner' NOT NULL,
	"time_invested_seconds" integer DEFAULT 0 NOT NULL,
	"auto_detected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"area_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"rrule" text NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"streak_current" integer DEFAULT 0 NOT NULL,
	"streak_best" integer DEFAULT 0 NOT NULL,
	"last_completed_at" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "area_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"scored_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "okrs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"parent_id" uuid,
	"area_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"year" integer,
	"quarter" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"kr_type" text,
	"target_value" integer,
	"target_unit" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"area_id" uuid,
	"okr_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"template_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"template_id" uuid,
	"squad_type" text DEFAULT 'none' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"canvas_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steps_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"user_id" uuid NOT NULL,
	"area_id" uuid,
	"habit_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"executor_type" text DEFAULT 'human' NOT NULL,
	"planned" boolean DEFAULT true NOT NULL,
	"ai_agent" text,
	"verification_criteria" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"scheduled_duration_minutes" integer,
	"completed_at" timestamp with time zone,
	"order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_activity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"paused_at" timestamp with time zone,
	"pause_reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"ai_classification" text,
	"ai_suggested_area_id" uuid,
	"ai_suggested_slot" timestamp with time zone,
	"ai_suggested_title" text,
	"ai_suggested_duration_minutes" integer,
	"ai_error" text,
	"step_activity_id" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkin_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"step_activity_id" uuid NOT NULL,
	"checkin_date" date NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"energy_level" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "step_skill_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_activity_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "correlations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"computed_at" timestamp with time zone NOT NULL,
	"tier" text NOT NULL,
	"type" text NOT NULL,
	"confidence" numeric(4, 3),
	"entity_a_type" text NOT NULL,
	"entity_a_id" uuid,
	"entity_b_type" text NOT NULL,
	"entity_b_id" uuid,
	"correlation_value" numeric(5, 4),
	"data_points_count" integer NOT NULL,
	"days_of_data" integer NOT NULL,
	"description_nl" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_scores" ADD CONSTRAINT "area_scores_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okrs" ADD CONSTRAINT "okrs_parent_id_okrs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."okrs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okrs" ADD CONSTRAINT "okrs_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_okr_id_okrs_id_fk" FOREIGN KEY ("okr_id") REFERENCES "public"."okrs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_template_id_workflow_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_template_id_workflow_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps_activities" ADD CONSTRAINT "steps_activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps_activities" ADD CONSTRAINT "steps_activities_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps_activities" ADD CONSTRAINT "steps_activities_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_step_activity_id_steps_activities_id_fk" FOREIGN KEY ("step_activity_id") REFERENCES "public"."steps_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_ai_suggested_area_id_areas_id_fk" FOREIGN KEY ("ai_suggested_area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_step_activity_id_steps_activities_id_fk" FOREIGN KEY ("step_activity_id") REFERENCES "public"."steps_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_responses" ADD CONSTRAINT "checkin_responses_step_activity_id_steps_activities_id_fk" FOREIGN KEY ("step_activity_id") REFERENCES "public"."steps_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_skill_tags" ADD CONSTRAINT "step_skill_tags_step_activity_id_steps_activities_id_fk" FOREIGN KEY ("step_activity_id") REFERENCES "public"."steps_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_skill_tags" ADD CONSTRAINT "step_skill_tags_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "areas_user_id_idx" ON "areas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "areas_user_maslow_idx" ON "areas" USING btree ("user_id","maslow_level");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_user_id_name_idx" ON "skills" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "habits_user_active_idx" ON "habits" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "habits_user_area_idx" ON "habits" USING btree ("user_id","area_id");--> statement-breakpoint
CREATE UNIQUE INDEX "area_scores_area_id_scored_at_idx" ON "area_scores" USING btree ("area_id","scored_at");--> statement-breakpoint
CREATE INDEX "okrs_user_status_idx" ON "okrs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "okrs_user_type_idx" ON "okrs" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "okrs_parent_id_idx" ON "okrs" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "projects_user_status_idx" ON "projects" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "projects_user_area_idx" ON "projects" USING btree ("user_id","area_id");--> statement-breakpoint
CREATE INDEX "workflows_project_id_idx" ON "workflows" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "workflows_user_status_idx" ON "workflows" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tasks_workflow_order_idx" ON "tasks" USING btree ("workflow_id","order");--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "steps_activities_user_scheduled_idx" ON "steps_activities" USING btree ("user_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "steps_activities_user_status_idx" ON "steps_activities" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "steps_activities_area_id_idx" ON "steps_activities" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX "time_entries_user_active_idx" ON "time_entries" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "time_entries_user_started_at_idx" ON "time_entries" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "time_entries_step_activity_id_idx" ON "time_entries" USING btree ("step_activity_id");--> statement-breakpoint
CREATE INDEX "inbox_items_user_status_idx" ON "inbox_items" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "inbox_items_user_created_at_idx" ON "inbox_items" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "checkin_responses_activity_date_idx" ON "checkin_responses" USING btree ("step_activity_id","checkin_date");--> statement-breakpoint
CREATE INDEX "checkin_responses_user_date_idx" ON "checkin_responses" USING btree ("user_id","checkin_date");--> statement-breakpoint
CREATE UNIQUE INDEX "step_skill_tags_step_skill_idx" ON "step_skill_tags" USING btree ("step_activity_id","skill_id");--> statement-breakpoint
CREATE INDEX "step_skill_tags_skill_id_idx" ON "step_skill_tags" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "correlations_user_active_computed_idx" ON "correlations" USING btree ("user_id","is_active","computed_at");