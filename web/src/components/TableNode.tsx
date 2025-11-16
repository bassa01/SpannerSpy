import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import clsx from "clsx";

import type { TableNodeData } from "../lib/diagram";
import type { ViewMode } from "../types/ui";

type Props = NodeProps<Node<TableNodeData, "tableNode">>;

const SIMPLE_MODE_COLUMN_LIMIT = 7;

function TableNode({ data, selected }: Props) {
  const { table } = data;
  const viewMode: ViewMode = (data.viewMode as ViewMode) ?? "studio";
  const isSimple = viewMode === "simple";
  const columns = isSimple
    ? table.columns.slice(0, SIMPLE_MODE_COLUMN_LIMIT)
    : table.columns;
  const hiddenCount = table.columns.length - columns.length;
  const primaryCount = table.columns.filter((column) => column.isPrimaryKey).length;
  return (
    <>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        className={clsx("table-node", selected && "selected", isSimple && "simple")}
        role="group"
        aria-label={`${table.name} table`}
      >
        <header className="table-node__head">
          <div>
            <p className="table-node__eyebrow">{isSimple ? "Table" : `${table.columns.length} columns`}</p>
            <h3>{table.name}</h3>
            {isSimple && table.comment && <p className="table-node__comment">{table.comment}</p>}
          </div>
          <div className="table-meta">
            {table.interleavedIn && <span className="badge">Interleaved</span>}
            {table.comment && !isSimple && <span className="badge">Annotated</span>}
            {isSimple && <span className="badge muted">{table.columns.length} cols</span>}
          </div>
        </header>
        {isSimple && (
          <div className="table-node__summary" aria-label="Table quick facts">
            <span>{primaryCount} primary keys</span>
            <span>{table.columns.length - primaryCount} attributes</span>
            {table.interleavedIn && <span>Parent: {table.interleavedIn}</span>}
          </div>
        )}
        <ul className={clsx("column-list", isSimple && "condensed")}>
          {columns.map((column) => (
            <li key={column.name} className={clsx("column-row", isSimple && "condensed")}>
              {!isSimple && <span className="column-dot" aria-hidden />}
              <div>
                <div className="column-name">
                  {column.isPrimaryKey && <span className="column-chip">PK</span>}
                  {column.name}
                </div>
                <div className={clsx("column-type", isSimple && "inline")}>
                  <span>{column.type}</span>
                  {!column.isNullable && <span>Required</span>}
                  {column.isArray && <span>Array</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {isSimple && hiddenCount > 0 && <p className="column-overflow">+ {hiddenCount} more columns</p>}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  );
}

export default memo(TableNode);
