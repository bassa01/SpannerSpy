import { useEffect, useMemo, useState } from "react";

import type { SpannerSchema } from "@shared/types";
import { sampleSchema } from "@shared/sample/schema";

import { ControlPanel } from "./components/ControlPanel";
import { DiagramCanvas } from "./components/DiagramCanvas";
import { StatsBar } from "./components/StatsBar";
import { TableDrawer } from "./components/TableDrawer";
import { Toast } from "./components/Toast";
import type { ThemeMode } from "./components/ThemeToggle";
import { buildVisualDiagram } from "./lib/diagram";
import type { VisualTable } from "./lib/diagram";

const getPreferredTheme = (): ThemeMode => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export default function App() {
  const [schema, setSchema] = useState<SpannerSchema>(sampleSchema);
  const [selectedTable, setSelectedTable] = useState<VisualTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(getPreferredTheme);

  const diagram = useMemo(() => buildVisualDiagram(schema), [schema]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!selectedTable) return;
    const fresh = diagram.tables.find((table) => table.name === selectedTable.name) ?? null;
    if (fresh !== selectedTable) {
      setSelectedTable(fresh);
    }
  }, [diagram, selectedTable]);

  const handleSchemaLoaded = (next: SpannerSchema) => {
    setSchema(next);
    setSelectedTable(null);
  };

  return (
    <div className="app-shell">
      <div className="intro-stack">
        <header className="hero glass-panel" aria-labelledby="hero-title">
          <p className="hero-pill">SpannerSpy Studio · Principal Surface</p>
          <h1 id="hero-title" className="hero-title">
            Cloud Spanner orchestration, tuned for the keynote stage.
          </h1>
          <p className="hero-subtitle">
            Editorial glass, unhurried spacing, and interactions proofed in Vitest 4 browser mode make every schema review feel
            as intentional as hardware on a turntable. Load live metadata, pan with precision, and handoff assets with zero
            AI residue.
          </p>
          <div className="hero-meta">
            <span className="hero-chip">Vitest 4 Browser Cert</span>
            <span className="hero-chip">Live ingestion</span>
            <span className="hero-chip">Tactile zoom + focus</span>
          </div>
        </header>
        <StatsBar stats={diagram.stats} />
      </div>

      <section className="workspace-grid">
        <ControlPanel onSchemaLoaded={handleSchemaLoaded} onError={setError} theme={theme} onThemeChange={setTheme} />

        <DiagramCanvas
          diagram={diagram}
          selectedTable={selectedTable?.name}
          onNodeSelected={(name) => {
            if (!name) {
              setSelectedTable(null);
              return;
            }
            const table = diagram.tables.find((item) => item.name === name) ?? null;
            setSelectedTable(table);
          }}
        />
      </section>

      <TableDrawer table={selectedTable} onClose={() => setSelectedTable(null)} />
      <Toast message={error} onDismiss={() => setError(null)} />
    </div>
  );
}
