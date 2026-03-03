import { relations } from 'drizzle-orm'
import { calendars } from './calendars'
import { areas } from './areas'
import { areaScores } from './area-scores'
import { okrs } from './okrs'
import { projects } from './projects'
import { workflows } from './workflows'
import { workflowTemplates } from './workflow-templates'
import { tasks } from './tasks'
import { stepsActivities } from './steps-activities'
import { habits } from './habits'
import { skills } from './skills'
import { timeEntries } from './time-entries'
import { inboxItems } from './inbox-items'
import { checkinResponses } from './checkin-responses'
import { stepSkillTags } from './step-skill-tags'
import { correlations } from './correlations'

// ----------------------------------------------------------------
// Areas
// ----------------------------------------------------------------
export const areasRelations = relations(areas, ({ many }) => ({
  scores: many(areaScores),
  okrs: many(okrs),
  projects: many(projects),
  habits: many(habits),
  skills: many(skills),
  stepsActivities: many(stepsActivities),
  inboxItems: many(inboxItems),
}))

// ----------------------------------------------------------------
// Area Scores
// ----------------------------------------------------------------
export const areaScoresRelations = relations(areaScores, ({ one }) => ({
  area: one(areas, { fields: [areaScores.areaId], references: [areas.id] }),
}))

// ----------------------------------------------------------------
// OKRs (self-referential)
// ----------------------------------------------------------------
export const okrsRelations = relations(okrs, ({ one, many }) => ({
  area: one(areas, { fields: [okrs.areaId], references: [areas.id] }),
  parent: one(okrs, {
    fields: [okrs.parentId],
    references: [okrs.id],
    relationName: 'okr_children',
  }),
  children: many(okrs, { relationName: 'okr_children' }),
  projects: many(projects),
  linkedActivities: many(stepsActivities),
}))

// ----------------------------------------------------------------
// Projects
// ----------------------------------------------------------------
export const projectsRelations = relations(projects, ({ one, many }) => ({
  area: one(areas, { fields: [projects.areaId], references: [areas.id] }),
  okr: one(okrs, { fields: [projects.okrId], references: [okrs.id] }),
  template: one(workflowTemplates, {
    fields: [projects.templateId],
    references: [workflowTemplates.id],
  }),
  workflows: many(workflows),
}))

// ----------------------------------------------------------------
// Workflow Templates
// ----------------------------------------------------------------
export const workflowTemplatesRelations = relations(workflowTemplates, ({ many }) => ({
  workflows: many(workflows),
  projects: many(projects),
}))

// ----------------------------------------------------------------
// Workflows
// ----------------------------------------------------------------
export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  project: one(projects, { fields: [workflows.projectId], references: [projects.id] }),
  template: one(workflowTemplates, {
    fields: [workflows.templateId],
    references: [workflowTemplates.id],
  }),
  tasks: many(tasks),
}))

// ----------------------------------------------------------------
// Tasks
// ----------------------------------------------------------------
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  workflow: one(workflows, { fields: [tasks.workflowId], references: [workflows.id] }),
  stepsActivities: many(stepsActivities),
}))

// ----------------------------------------------------------------
// Steps/Activities
// ----------------------------------------------------------------
export const stepsActivitiesRelations = relations(stepsActivities, ({ one, many }) => ({
  task: one(tasks, { fields: [stepsActivities.taskId], references: [tasks.id] }),
  area: one(areas, { fields: [stepsActivities.areaId], references: [areas.id] }),
  habit: one(habits, { fields: [stepsActivities.habitId], references: [habits.id] }),
  okr: one(okrs, { fields: [stepsActivities.okrId], references: [okrs.id] }),
  calendar: one(calendars, { fields: [stepsActivities.calendarId], references: [calendars.id] }),
  timeEntries: many(timeEntries),
  checkinResponses: many(checkinResponses),
  skillTags: many(stepSkillTags),
  inboxItem: one(inboxItems, {
    fields: [stepsActivities.id],
    references: [inboxItems.stepActivityId],
  }),
}))

// ----------------------------------------------------------------
// Habits
// ----------------------------------------------------------------
export const habitsRelations = relations(habits, ({ one, many }) => ({
  area: one(areas, { fields: [habits.areaId], references: [areas.id] }),
  stepsActivities: many(stepsActivities),
}))

// ----------------------------------------------------------------
// Skills
// ----------------------------------------------------------------
export const skillsRelations = relations(skills, ({ one, many }) => ({
  area: one(areas, { fields: [skills.areaId], references: [areas.id] }),
  stepTags: many(stepSkillTags),
}))

// ----------------------------------------------------------------
// Time Entries
// ----------------------------------------------------------------
export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  stepActivity: one(stepsActivities, {
    fields: [timeEntries.stepActivityId],
    references: [stepsActivities.id],
  }),
}))

// ----------------------------------------------------------------
// Inbox Items
// ----------------------------------------------------------------
export const inboxItemsRelations = relations(inboxItems, ({ one }) => ({
  suggestedArea: one(areas, {
    fields: [inboxItems.aiSuggestedAreaId],
    references: [areas.id],
  }),
  stepActivity: one(stepsActivities, {
    fields: [inboxItems.stepActivityId],
    references: [stepsActivities.id],
  }),
}))

// ----------------------------------------------------------------
// Checkin Responses
// ----------------------------------------------------------------
export const checkinResponsesRelations = relations(checkinResponses, ({ one }) => ({
  stepActivity: one(stepsActivities, {
    fields: [checkinResponses.stepActivityId],
    references: [stepsActivities.id],
  }),
}))

// ----------------------------------------------------------------
// Step Skill Tags
// ----------------------------------------------------------------
export const stepSkillTagsRelations = relations(stepSkillTags, ({ one }) => ({
  stepActivity: one(stepsActivities, {
    fields: [stepSkillTags.stepActivityId],
    references: [stepsActivities.id],
  }),
  skill: one(skills, {
    fields: [stepSkillTags.skillId],
    references: [skills.id],
  }),
}))

// ----------------------------------------------------------------
// Correlations
// ----------------------------------------------------------------
export const correlationsRelations = relations(correlations, () => ({
  // Polymorphic — no direct FK relations defined in Drizzle
}))

// ----------------------------------------------------------------
// Calendars (Epic 10)
// ----------------------------------------------------------------
export const calendarsRelations = relations(calendars, ({ many }) => ({
  stepsActivities: many(stepsActivities),
}))
