import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import clsx from "clsx";

import type { TableNodeData } from "../lib/diagram";

type Props = NodeProps<Node<TableNodeData, "tableNode">>;

function TableNode({ data, selected }: Props) {
  const { table } = data;
  return (
    <>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className={clsx("table-node", selected && "selected")}
        role="group"
        aria-label={`${table.name} table`}
      >
        <header className="table-node__head">
          <div>
            <p className="table-node__eyebrow">{table.columns.length} columns</p>
            <h3>{table.name}</h3>
          </div>
          <div className="table-meta">
            {table.interleavedIn && <span className="badge">Interleaved</span>}
            {table.comment && <span className="badge">Annotated</span>}
          </div>
        </header>
        <ul className="column-list">
          {table.columns.map((column) => (
            <li key={column.name} className="column-row">
              <span className="column-dot" aria-hidden />
              <div>
                <div className="column-name">
                  {column.isPrimaryKey && <span className="column-chip">PK</span>}
                  {column.name}
                </div>
                <div className="column-type">
                  <span>{column.type}</span>
                  {!column.isNullable && <span>Required</span>}
                  {column.isArray && <span>Array</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  );
}

export default memo(TableNode);
