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
    <div className="stats-bar">
      {items.map((item) => (
        <article key={item.label} className="stat-card">
          <span className="stat-label">{item.label}</span>
          <span className="stat-value">{item.value}</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{item.hint}</span>
        </article>
      ))}
    </div>
  );
}
