import clsx from "clsx";
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
import type { DiagramStats, VisualTable } from "./lib/diagram";
import type { ViewMode } from "./types/ui";

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
  const [viewMode, setViewMode] = useState<ViewMode>("studio");

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
    <div className={clsx("app-shell", viewMode === "simple" && "simple-mode")}> 
      {viewMode === "simple" ? (
        <SimpleIntro stats={diagram.stats} />
      ) : (
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
      )}

      <section className={clsx("workspace-grid", viewMode === "simple" && "workspace-simple")}> 
        <ControlPanel onSchemaLoaded={handleSchemaLoaded} onError={setError} theme={theme} onThemeChange={setTheme} />

        <DiagramCanvas
          diagram={diagram}
          selectedTable={selectedTable?.name}
          viewMode={viewMode}
          onModeChange={setViewMode}
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

function SimpleIntro({ stats }: { stats: DiagramStats }) {
  const summary = [
    { label: "Tables", value: stats.tables },
    { label: "Columns", value: stats.columns },
    { label: "Relations", value: stats.relationships },
    { label: "Interleaves", value: stats.interleaves },
  ];

  return (
    <section className="simple-banner glass-panel" aria-labelledby="simple-mode-title">
      <div>
        <p className="hero-pill">Simple mode</p>
        <h1 id="simple-mode-title" className="simple-banner__title">
          Diagram-first workspace
        </h1>
        <p className="simple-banner__subtitle">
          Strips editorial chrome so you can scan relationships quickly, highlight key tables, and keep context anchored beside the live ER canvas.
        </p>
      </div>
      <div className="simple-metrics" aria-label="Schema summary">
        {summary.map((item) => (
          <div key={item.label} className="simple-metric">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
