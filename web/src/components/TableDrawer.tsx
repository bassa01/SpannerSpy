import clsx from "clsx";

import type { VisualTable } from "../lib/diagram";

interface TableDrawerProps {
  table: VisualTable | null;
  onClose: () => void;
}

export function TableDrawer({ table, onClose }: TableDrawerProps) {
  return (
    <aside className={clsx("drawer", table && "open")} aria-hidden={!table} aria-live="polite">
      {table ? (
        <>
          <header className="drawer-header">
            <div>
              <p className="hero-pill">Table detail</p>
              <h2>{table.name}</h2>
              <p className="drawer-subtitle">
                {table.columns.length} columns · {table.interleavedIn ? `Interleaved in ${table.interleavedIn}` : "Standalone"}
              </p>
            </div>
            <button type="button" className="secondary-button" onClick={onClose}>
              Close
            </button>
          </header>
          {table.comment && <p className="drawer-comment">{table.comment}</p>}
          {table.interleavedIn && (
            <div className="drawer-infocard">
              <strong>Interleaved in</strong>
              <p>{table.interleavedIn}</p>
            </div>
          )}
          <div className="drawer-columns">
            {table.columns.map((column) => (
              <div key={column.name} className="column-card">
                <div className="column-card__header">
                  <div>
                    <strong>{column.name}</strong>
                    <p className="column-type">
                      {column.type} {column.isNullable ? "· nullable" : "· required"}
                    </p>
                  </div>
                  <div className="table-meta">
                    {column.isPrimaryKey && <span className="badge">Primary</span>}
                    {column.isArray && <span className="badge">Array</span>}
                  </div>
                </div>
                {column.comment && <p className="column-comment">{column.comment}</p>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="drawer-empty">
          <p>Select a table to inspect its schema.</p>
          <p>Details dock here so the canvas stays uncluttered.</p>
        </div>
      )}
    </aside>
  );
}
