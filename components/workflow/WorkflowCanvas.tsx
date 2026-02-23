'use client'

// components/workflow/WorkflowCanvas.tsx
// Canvas principal del Visual Workflow Builder con React Flow.
// Client Component — React Flow requiere APIs de browser.

import { useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import TaskNode from './TaskNode'
import StepNode from './StepNode'
import NodeSidebar from './NodeSidebar'
import TemplateGallery from './TemplateGallery'
import { applyDagreLayout } from './dagre-layout'
import {
  saveWorkflowCanvas,
  getWorkflowTemplates,
  instantiateTemplate,
  updateWorkflowSquad,
} from '@/actions/workflows'
import { squadTypeToPrimaryAgent, SQUAD_LABELS, type SquadType } from '@/lib/workflow/squad-utils'
import type { TaskNodeData, StepNodeData } from './types'
import type { TaskSyncData, StepSyncData, FlowNode, FlowEdge } from '@/actions/workflows'
import type { WorkflowTemplate } from '@/lib/db/schema/workflow-templates'

// ─── Tipos de nodo registrados ────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  task: TaskNode,
  step: StepNode,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultEdgeOptions = {
  animated: true,
  type: 'smoothstep',
  style: { strokeWidth: 2, stroke: '#94a3b8' },
  markerEnd: { type: 'arrowclosed' as const, color: '#94a3b8' },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkflowCanvasProps {
  workflowId: string
  initialNodes?: Node[]
  initialEdges?: Edge[]
  /** ID del template activo (si el workflow fue instanciado desde uno) */
  templateId?: string | null
  /** Nombre del template activo para mostrar en toolbar */
  templateName?: string | null
  /** Squad de agentes asignado al workflow */
  squadType?: SquadType
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function WorkflowCanvas({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  templateId: initialTemplateId = null,
  templateName: initialTemplateName = null,
  squadType: initialSquadType = 'none',
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // ── Template state ─────────────────────────────────────────────────────────
  const [showTemplateGallery, setShowTemplateGallery] = useState(false)
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(
    initialTemplateName ?? null
  )
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(initialTemplateId ?? null)

  // ── Squad state ────────────────────────────────────────────────────────────
  const [activeSquadType, setActiveSquadType] = useState<SquadType>(initialSquadType)

  // ── Conexión de edges ──────────────────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, ...defaultEdgeOptions }, eds))
    },
    [setEdges]
  )

  // ── Selección de nodo ──────────────────────────────────────────────────────
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // ── Actualizar nodo desde sidebar ──────────────────────────────────────────
  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<TaskNodeData | StepNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n
          return { ...n, data: { ...n.data, ...updates } }
        })
      )
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...updates } } : prev
      )
    },
    [setNodes]
  )

  // ── Agregar Task ───────────────────────────────────────────────────────────
  const addTask = useCallback(() => {
    const id = crypto.randomUUID()
    const newNode: Node = {
      id,
      type: 'task',
      position: { x: 80 + nodes.length * 20, y: 80 + nodes.length * 20 },
      data: {
        label: 'Nueva Task',
        status: 'pending',
        onLabelChange: (label: string) => updateNodeData(id, { label }),
      } satisfies TaskNodeData,
    }
    setNodes((nds) => [...nds, newNode])
  }, [nodes.length, setNodes, updateNodeData])

  // ── Agregar Step ───────────────────────────────────────────────────────────
  const addStep = useCallback(() => {
    const id = crypto.randomUUID()
    const newNode: Node = {
      id,
      type: 'step',
      position: { x: 300 + nodes.length * 20, y: 80 + nodes.length * 20 },
      data: {
        label: 'Nuevo Step',
        executorType: 'human',
        status: 'pending',
      } satisfies StepNodeData,
    }
    setNodes((nds) => [...nds, newNode])
  }, [nodes.length, setNodes])

  // ── Auto-layout ────────────────────────────────────────────────────────────
  const autoLayout = useCallback(() => {
    const laid = applyDagreLayout(nodes, edges)
    setNodes(laid)
  }, [nodes, edges, setNodes])

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    // Preparar canvas_data (FlowNode / FlowEdge sin callbacks)
    const canvasNodes: FlowNode[] = nodes.map((n) => {
      const rawData = n.data as unknown as TaskNodeData & { onLabelChange?: unknown }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { onLabelChange: _ignored, ...cleanData } = rawData
      return {
        id: n.id,
        type: n.type as 'task' | 'step',
        position: n.position,
        data: cleanData as FlowNode['data'],
      }
    })

    const canvasEdges: FlowEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      animated: e.animated,
    }))

    // Preparar TaskSyncData
    const taskNodes = nodes.filter((n) => n.type === 'task')
    const taskSyncData: TaskSyncData[] = taskNodes.map((n, idx) => {
      const d = n.data as unknown as TaskNodeData
      return {
        id: n.id,
        title: d.label,
        status: d.status,
        order: idx,
      }
    })

    // Preparar StepSyncData — resolución de taskId desde edges entrantes
    const stepNodes = nodes.filter((n) => n.type === 'step')
    const stepSyncData: StepSyncData[] = stepNodes.map((n, idx) => {
      const d = n.data as unknown as StepNodeData
      // Buscar edge que conecta una Task hacia este Step
      const parentEdge = edges.find((e) => {
        const sourceNode = nodes.find((sn) => sn.id === e.source)
        return e.target === n.id && sourceNode?.type === 'task'
      })
      return {
        id: n.id,
        taskId: parentEdge ? parentEdge.source : null,
        title: d.label,
        executorType: d.executorType,
        aiAgent: d.aiAgent ?? null,
        verificationCriteria: d.verificationCriteria ?? null,
        description: d.description ?? null,
        status: d.status,
        order: idx,
      }
    })

    const result = await saveWorkflowCanvas(
      workflowId,
      { nodes: canvasNodes, edges: canvasEdges },
      taskSyncData,
      stepSyncData
    )

    setSaving(false)
    if (result.error) {
      setSaveError(result.error)
    } else {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    }
  }, [workflowId, nodes, edges])

  // ── Abrir galería de templates ─────────────────────────────────────────────
  const handleOpenTemplateGallery = useCallback(async () => {
    setShowTemplateGallery(true)
    if (templates.length === 0) {
      setTemplatesLoading(true)
      const result = await getWorkflowTemplates()
      setTemplatesLoading(false)
      if (!result.error) {
        setTemplates(result.templates)
      }
    }
  }, [templates.length])

  // ── Instanciar template ────────────────────────────────────────────────────
  const handleSelectTemplate = useCallback(
    async (template: WorkflowTemplate) => {
      setShowTemplateGallery(false)
      setSaving(true)
      setSaveError(null)

      const result = await instantiateTemplate(workflowId, template.id)

      setSaving(false)

      if (result.error) {
        setSaveError(result.error)
        return
      }

      // Actualizar canvas local con los nodos/edges generados
      if (result.canvasData) {
        setNodes(result.canvasData.nodes as unknown as Node[])
        setEdges(result.canvasData.edges as unknown as Edge[])
      }

      setActiveTemplateId(template.id)
      setActiveTemplateName(template.name)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    },
    [workflowId, setNodes, setEdges]
  )

  // ── Cambiar squad ──────────────────────────────────────────────────────────
  const handleSquadChange = useCallback(
    async (newSquad: SquadType) => {
      const prevSquad = activeSquadType
      // Optimistic update: actualizar estado local primero
      setActiveSquadType(newSquad)

      // Actualizar nodos AI con el nuevo agente del squad
      const primaryAgent = squadTypeToPrimaryAgent(newSquad)
      setNodes((nds) =>
        nds.map((n) => {
          if (n.type !== 'step') return n
          const d = n.data as unknown as StepNodeData
          if (d.executorType !== 'ai') return n
          return { ...n, data: { ...n.data, aiAgent: primaryAgent } }
        })
      )

      // Persistir en DB
      const result = await updateWorkflowSquad(workflowId, newSquad)
      if (result.error) {
        // Rollback si falla
        setActiveSquadType(prevSquad)
        const prevAgent = squadTypeToPrimaryAgent(prevSquad)
        setNodes((nds) =>
          nds.map((n) => {
            if (n.type !== 'step') return n
            const d = n.data as unknown as StepNodeData
            if (d.executorType !== 'ai') return n
            return { ...n, data: { ...n.data, aiAgent: prevAgent } }
          })
        )
        setSaveError(result.error)
      }
    },
    [activeSquadType, workflowId, setNodes]
  )

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <button
          onClick={addTask}
          className="rounded bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Task
        </button>
        <button
          onClick={addStep}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Step
        </button>
        <button
          onClick={autoLayout}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Auto-layout
        </button>
        <button
          onClick={handleOpenTemplateGallery}
          disabled={templatesLoading}
          className="rounded border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
        >
          {templatesLoading ? 'Cargando…' : 'Usar Template'}
        </button>

        {/* Indicador de template activo */}
        {activeTemplateName && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            <span className="text-indigo-400">Template:</span> {activeTemplateName}
          </span>
        )}

        {/* Separador */}
        <div className="h-5 w-px bg-slate-200" />

        {/* Selector de Squad */}
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <span className="font-medium">Squad:</span>
          <select
            value={activeSquadType}
            onChange={(e) => handleSquadChange(e.target.value as SquadType)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            {(Object.keys(SQUAD_LABELS) as SquadType[]).map((key) => (
              <option key={key} value={key}>
                {SQUAD_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex-1" />
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
        {saveSuccess && <span className="text-sm text-green-600">¡Guardado!</span>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* Canvas + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* React Flow canvas */}
        <div className="flex-1" style={{ height: 'calc(100vh - 200px)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode="Delete"
          >
            <Background color="#e2e8f0" gap={16} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Panel lateral */}
        {selectedNode && (
          <NodeSidebar
            node={selectedNode}
            onUpdate={updateNodeData}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Galería de templates */}
      {showTemplateGallery && (
        <TemplateGallery
          templates={templates}
          hasExistingNodes={nodes.length > 0}
          onSelect={handleSelectTemplate}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}

      {/* Suppress unused var warning for activeTemplateId */}
      <span data-template-id={activeTemplateId} className="hidden" aria-hidden="true" />
    </div>
  )
}
