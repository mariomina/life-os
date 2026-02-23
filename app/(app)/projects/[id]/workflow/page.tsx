// app/(app)/projects/[id]/workflow/page.tsx
// Página del Visual Workflow Builder — Server Component (carga datos).
// Pasa el canvas al Client Component WorkflowCanvas.

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { inArray, and } from 'drizzle-orm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db/client'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { aiosQueueLog } from '@/lib/db/schema/aios-queue-log'
import { getOrCreateWorkflow } from '@/actions/workflows'
import { getWorkflowTemplateById } from '@/lib/db/queries/workflow-templates'
import WorkflowCanvas from '@/components/workflow/WorkflowCanvas'
import type { Node, Edge } from '@xyflow/react'

/**
 * Página del canvas del Visual Workflow Builder.
 *
 * Comportamiento:
 * 1. Autentica al usuario.
 * 2. Llama a getOrCreateWorkflow → garantiza que existe un workflow para el proyecto.
 * 3. Deserializa canvas_data (nodes + edges) si existe.
 * 4. Carga el nombre del template activo si templateId está presente.
 * 5. Renderiza WorkflowCanvas (Client Component) con datos iniciales.
 */
export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id: projectId } = await params

  const { error, workflow } = await getOrCreateWorkflow(projectId)

  if (error || !workflow) {
    notFound()
  }

  // Deserializar canvas_data si existe
  let initialNodes: Node[] = []
  let initialEdges: Edge[] = []

  if (workflow.canvasData) {
    const canvas = workflow.canvasData as { nodes?: Node[]; edges?: Edge[] }
    initialNodes = canvas.nodes ?? []
    initialEdges = canvas.edges ?? []
  }

  // Enriquecer nodos step con status live desde DB (queueStatus + scheduledAt)
  const stepNodeIds = initialNodes.filter((n) => n.type === 'step').map((n) => n.id)

  if (stepNodeIds.length > 0) {
    // Leer status y scheduledAt actuales de steps_activities
    const stepRows = await db
      .select({
        id: stepsActivities.id,
        executorType: stepsActivities.executorType,
        status: stepsActivities.status,
        scheduledAt: stepsActivities.scheduledAt,
      })
      .from(stepsActivities)
      .where(inArray(stepsActivities.id, stepNodeIds))

    // Leer último queueStatus de aios_queue_log para steps AI
    const aiStepIds = stepRows.filter((s) => s.executorType === 'ai').map((s) => s.id)

    type QueueRow = { stepId: string; status: string }
    let queueRows: QueueRow[] = []
    if (aiStepIds.length > 0) {
      queueRows = await db
        .select({ stepId: aiosQueueLog.stepId, status: aiosQueueLog.status })
        .from(aiosQueueLog)
        .where(
          and(
            inArray(aiosQueueLog.stepId, aiStepIds),
            inArray(aiosQueueLog.status, ['queued', 'running', 'completed', 'failed'])
          )
        )
    }

    // Mapa stepId → último queueStatus (el más reciente por stepId)
    const queueMap = new Map<string, string>()
    for (const row of queueRows) {
      // Si ya hay un entry, preferir el de mayor precedencia (running > queued > failed > completed)
      const existing = queueMap.get(row.stepId)
      if (!existing) {
        queueMap.set(row.stepId, row.status)
      } else {
        const priority: Record<string, number> = { running: 4, queued: 3, failed: 2, completed: 1 }
        if ((priority[row.status] ?? 0) > (priority[existing] ?? 0)) {
          queueMap.set(row.stepId, row.status)
        }
      }
    }

    // Mapa stepId → { status, scheduledAt }
    const stepMap = new Map(stepRows.map((s) => [s.id, s]))

    // Enriquecer data de cada nodo step
    initialNodes = initialNodes.map((node) => {
      if (node.type !== 'step') return node
      const stepRow = stepMap.get(node.id)
      if (!stepRow) return node

      const enriched = { ...node.data } as Record<string, unknown>

      if (stepRow.executorType === 'ai') {
        const qs = queueMap.get(node.id)
        enriched.queueStatus = qs ?? null
      } else {
        // human o mixed: pasar scheduledAt como ISO string
        enriched.scheduledAt = stepRow.scheduledAt ? stepRow.scheduledAt.toISOString() : null
      }

      return { ...node, data: enriched }
    })
  }

  // Cargar nombre del template activo si existe
  let templateName: string | null = null
  if (workflow.templateId) {
    const template = await getWorkflowTemplateById(workflow.templateId)
    templateName = template?.name ?? null
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al Proyecto
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">Workflow</span>
        <span className="ml-auto text-xs text-slate-400">
          {initialNodes.length > 0
            ? `${initialNodes.filter((n) => n.type === 'task').length} tasks · ${initialNodes.filter((n) => n.type === 'step').length} steps`
            : 'Canvas vacío'}
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas
          workflowId={workflow.id}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          templateId={workflow.templateId ?? null}
          templateName={templateName}
          squadType={workflow.squadType}
        />
      </div>
    </div>
  )
}
