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
    <section className="diagram-shell glass-panel">
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
        <Background gap={24} color="rgba(255,255,255,0.05)" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap nodeColor={() => "#38bdf8"} pannable zoomable style={{ background: "rgba(15,23,42,0.4)" }} />
      </ReactFlow>
      <div className="diagram-legend">
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="legend-dot" style={{ background: "#38bdf8" }} /> Foreign key
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="legend-dot" style={{ background: "#34d399" }} /> Interleaved
        </span>
      </div>
    </section>
  );
}
