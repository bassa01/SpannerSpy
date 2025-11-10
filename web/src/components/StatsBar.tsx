import type { DiagramStats } from "../lib/diagram";

interface StatsBarProps {
  stats: DiagramStats;
}

const descriptors = [
  "Blueprint-ready",
  "Relational links",
  "Nested hierarchies",
  "Field density",
];

export function StatsBar({ stats }: StatsBarProps) {
  const items = [
    { label: "Tables", value: stats.tables, hint: descriptors[0] },
    { label: "Columns", value: stats.columns, hint: descriptors[3] },
    { label: "Relationships", value: stats.relationships, hint: descriptors[1] },
    { label: "Interleaved", value: stats.interleaves, hint: descriptors[2] },
  ];

  return (
    <section className="stats-panel glass-panel" aria-label="Live schema snapshot">
      <div className="stats-header">
        <p className="hero-pill">Live snapshot</p>
        <p className="stats-copy">Contours update the instant you ingest or paste a JSON payload.</p>
      </div>
      <div className="stats-bar">
        {items.map((item) => (
          <article key={item.label} className="stat-card">
            <span className="stat-label">{item.label}</span>
            <span className="stat-value">{item.value}</span>
            <span className="stat-hint">{item.hint}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
