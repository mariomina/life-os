// lib/db/queries/workflow-templates.ts
// Queries de lectura para workflow_templates (plantillas predefinidas del sistema).
// Los templates is_system=true son globales y accesibles por todos los usuarios autenticados.

import { eq } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { workflowTemplates } from '@/lib/db/schema/workflow-templates'
import type { WorkflowTemplate } from '@/lib/db/schema/workflow-templates'

export type { WorkflowTemplate }

/**
 * Retorna todos los templates de sistema (is_system=true).
 * Los templates del sistema son globales — no filtrar por user_id.
 */
export async function getSystemWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  assertDatabaseUrl()

  const rows = await db.select().from(workflowTemplates).where(eq(workflowTemplates.isSystem, true))

  return rows
}

/**
 * Retorna un template por su ID.
 */
export async function getWorkflowTemplateById(
  templateId: string
): Promise<WorkflowTemplate | null> {
  assertDatabaseUrl()

  const rows = await db
    .select()
    .from(workflowTemplates)
    .where(eq(workflowTemplates.id, templateId))
    .limit(1)

  return rows[0] ?? null
}
