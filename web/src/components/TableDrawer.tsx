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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p className="hero-pill" style={{ fontSize: "0.75rem", marginBottom: 8 }}>
                Table Detail
              </p>
              <h2>{table.name}</h2>
            </div>
            <button type="button" className="secondary-button" onClick={onClose}>
              Close
            </button>
          </div>
          {table.interleavedIn && (
            <div className="column-card" style={{ marginBottom: 8 }}>
              <strong>Interleaved in</strong>
              <p style={{ margin: "6px 0 0", color: "var(--text-muted)" }}>{table.interleavedIn}</p>
            </div>
          )}
          <div className="drawer-columns">
            {table.columns.map((column) => (
              <div key={column.name} className="column-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{column.name}</strong>
                    <p className="column-type" style={{ margin: "4px 0 0" }}>
                      {column.type} {column.isNullable ? "· nullable" : "· required"}
                    </p>
                  </div>
                  <div className="table-meta" style={{ marginTop: 0 }}>
                    {column.isPrimaryKey && <span className="badge">Primary</span>}
                    {column.isArray && <span className="badge">Array</span>}
                  </div>
                </div>
                {column.comment && <p style={{ marginTop: 8, color: "var(--text-muted)" }}>{column.comment}</p>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ marginTop: "40%", textAlign: "center", opacity: 0.6 }}>
          <p>Select a table to inspect its schema.</p>
        </div>
      )}
    </aside>
  );
}
