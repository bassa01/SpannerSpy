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
      <header className="hero glass-panel">
        <span className="hero-pill">SpannerSpy Studio</span>
        <h1 className="hero-title">
          Give your <span>Cloud Spanner</span> schema an editorial-grade ER canvas.
        </h1>
        <p className="hero-subtitle">
          Apple-inspired lighting, SchemaSpy-level depth. Pan, zoom, and inspect every relationship with tactile controls and
          live schema ingestion.
        </p>
      </header>

      <StatsBar stats={diagram.stats} />

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

      <TableDrawer table={selectedTable} onClose={() => setSelectedTable(null)} />
      <Toast message={error} onDismiss={() => setError(null)} />
    </div>
  );
}
