import { useMemo } from "react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import type { Edge, Node, NodeMouseHandler, ReactFlowInstance } from "@xyflow/react";
import clsx from "clsx";

import TableNode from "./TableNode";
import { createFlowGraph } from "../lib/diagram";
import type { RelationshipEdgeData, TableNodeData, VisualDiagram } from "../lib/diagram";
import { ViewModeToggle } from "./ViewModeToggle";
import type { ViewMode } from "../types/ui";

interface DiagramCanvasProps {
  diagram: VisualDiagram;
  selectedTable?: string | null;
  onNodeSelected: (tableName: string | null) => void;
  viewMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

const nodeTypes = { tableNode: TableNode };
export function DiagramCanvas({ diagram, selectedTable, onNodeSelected, viewMode, onModeChange }: DiagramCanvasProps) {
  const flow = useMemo(() => createFlowGraph(diagram), [diagram]);
  type ERNode = Node<TableNodeData, "tableNode">;
  type EREdge = Edge<RelationshipEdgeData>;

  const baseNodes = flow.nodes as ERNode[];
  const edges = flow.edges as EREdge[];
  const isSimple = viewMode === "simple";

  const nodes: ERNode[] = useMemo(
    () =>
      baseNodes.map((node) => ({
        ...node,
        selected: node.id === selectedTable,
        data: { ...node.data, viewMode },
      })),
    [baseNodes, selectedTable, viewMode],
  );

  const handleNodeClick: NodeMouseHandler<ERNode> = (_, node) => onNodeSelected(node.id);
  const handleInit = (instance: ReactFlowInstance<ERNode, EREdge>) => {
    instance.fitView({ padding: isSimple ? 0.08 : 0.25 });
  };

  return (
    <section className={clsx("diagram-shell", "glass-panel", isSimple && "simple")}
      aria-label="Diagram workspace"
    >
      <header className="diagram-header">
        <div>
          <p className="hero-pill">Live canvas</p>
          <h2>{isSimple ? "ER overview" : "Relational landscape"}</h2>
          <p>
            {isSimple
              ? "Simplified nodes, calmer chrome, and tighter zoom defaults keep relationships legible during design reviews."
              : "Use trackpad gestures or a mouse to pan, zoom, and precision-select any table."}
          </p>
        </div>
        <div className="diagram-meta">
          <span>{isSimple ? "Simple mode prioritizes diagram clarity" : "Focus snaps · auto layout · mini-map"}</span>
          <ViewModeToggle mode={viewMode} onChange={onModeChange} />
        </div>
      </header>
      <div className="diagram-stage" data-mode={viewMode}>
        <ReactFlow<ERNode, EREdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={isSimple ? 0.55 : 0.35}
          maxZoom={isSimple ? 1.35 : 1.6}
          panOnScroll
          selectionOnDrag
          nodesDraggable={!isSimple}
          onNodeClick={handleNodeClick}
          onPaneClick={() => onNodeSelected(null)}
          onInit={handleInit}
          className={clsx(isSimple && "simple-flow")}
        >
          <Background gap={isSimple ? 42 : 28} color={isSimple ? "rgba(148,163,184,0.25)" : "rgba(255,255,255,0.06)"} />
          <Controls showInteractive={false} position="bottom-left" className="diagram-controls" />
          {!isSimple && <MiniMap nodeColor={() => "#0a84ff"} pannable zoomable className="diagram-minimap" />}
        </ReactFlow>
        <div className={clsx("diagram-legend", isSimple && "simple")}>
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
