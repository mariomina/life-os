// components/workflow/dagre-layout.ts
// Auto-layout left-to-right con dagre para el Visual Workflow Builder.

import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'

const NODE_WIDTH = 180
const NODE_HEIGHT = 80
const STEP_SIZE = 80

/**
 * Aplica layout left-to-right con dagre a los nodos y edges del canvas.
 * Retorna nodos con posiciones calculadas.
 */
export function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 60 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    const isStep = node.type === 'step'
    g.setNode(node.id, {
      width: isStep ? STEP_SIZE : NODE_WIDTH,
      height: isStep ? STEP_SIZE : NODE_HEIGHT,
    })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const { x, y } = g.node(node.id)
    const isStep = node.type === 'step'
    const w = isStep ? STEP_SIZE : NODE_WIDTH
    const h = isStep ? STEP_SIZE : NODE_HEIGHT
    return {
      ...node,
      position: {
        x: x - w / 2,
        y: y - h / 2,
      },
    }
  })
}
