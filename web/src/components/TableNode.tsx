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
      <div className={clsx("table-node", selected && "selected")}>
        <div>
          <h3>{table.name}</h3>
          <div className="table-meta">
            <span className="badge">{table.columns.length} Columns</span>
            {table.interleavedIn && <span className="badge">Interleaved</span>}
          </div>
        </div>
        <ul className="column-list">
          {table.columns.map((column) => (
            <li key={column.name} className="column-row">
              <div>
                <div className="column-name">
                  {column.isPrimaryKey && "★ "}
                  {column.name}
                </div>
                <div className="column-type">
                  {column.type}
                  {!column.isNullable && " · required"}
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
