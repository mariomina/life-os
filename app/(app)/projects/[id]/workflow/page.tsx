// app/(app)/projects/[id]/workflow/page.tsx
// Página del Visual Workflow Builder — Server Component (carga datos).
// Pasa el canvas al Client Component WorkflowCanvas.

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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
        />
      </div>
    </div>
  )
}
