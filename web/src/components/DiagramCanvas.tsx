import { useMemo } from "react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import type { Edge, Node, NodeMouseHandler, ReactFlowInstance } from "@xyflow/react";

import TableNode from "./TableNode";
import { createFlowGraph } from "../lib/diagram";
import type { RelationshipEdgeData, TableNodeData, VisualDiagram } from "../lib/diagram";

interface DiagramCanvasProps {
  diagram: VisualDiagram;
  selectedTable?: string | null;
  onNodeSelected: (tableName: string | null) => void;
}

const nodeTypes = { tableNode: TableNode };
export function DiagramCanvas({ diagram, selectedTable, onNodeSelected }: DiagramCanvasProps) {
  const flow = useMemo(() => createFlowGraph(diagram), [diagram]);
  type ERNode = Node<TableNodeData, "tableNode">;
  type EREdge = Edge<RelationshipEdgeData>;

  const baseNodes = flow.nodes as ERNode[];
  const edges = flow.edges as EREdge[];

  const nodes: ERNode[] = useMemo(
    () => baseNodes.map((node) => ({ ...node, selected: node.id === selectedTable })),
    [baseNodes, selectedTable],
  );

  const handleNodeClick: NodeMouseHandler<ERNode> = (_, node) => onNodeSelected(node.id);
  const handleInit = (instance: ReactFlowInstance<ERNode, EREdge>) => {
    instance.fitView({ padding: 0.25 });
  };

  return (
    <section className="diagram-shell glass-panel" aria-label="Diagram workspace">
      <header className="diagram-header">
        <div>
          <p className="hero-pill">Live canvas</p>
          <h2>Relational landscape</h2>
          <p>Use trackpad gestures or a mouse to pan, zoom, and precision-select any table.</p>
        </div>
        <div className="diagram-meta">
          <span>Focus snaps · auto layout · mini-map</span>
        </div>
      </header>
      <div className="diagram-stage">
        <ReactFlow<ERNode, EREdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.35}
          maxZoom={1.6}
          panOnScroll
          selectionOnDrag
          onNodeClick={handleNodeClick}
          onPaneClick={() => onNodeSelected(null)}
          onInit={handleInit}
        >
          <Background gap={28} color="rgba(255,255,255,0.06)" />
          <Controls showInteractive={false} position="bottom-left" className="diagram-controls" />
          <MiniMap nodeColor={() => "#0a84ff"} pannable zoomable className="diagram-minimap" />
        </ReactFlow>
        <div className="diagram-legend">
          <span>
            <span className="legend-dot" data-kind="fk" /> Foreign key
          </span>
          <span>
            <span className="legend-dot" data-kind="interleaved" /> Interleaved
          </span>
        </div>
      </div>
    </section>
  );
}
