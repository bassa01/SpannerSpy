import clsx from "clsx";

import type { ViewMode } from "../types/ui";

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const options: Array<{ value: ViewMode; label: string; hint: string }> = [
  { value: "studio", label: "Studio", hint: "Full narrative" },
  { value: "simple", label: "Simple", hint: "Diagram focus" },
];

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="mode-toggle" role="group" aria-label="Presentation density">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={clsx(option.value === mode && "active")}
          aria-pressed={option.value === mode}
          onClick={() => onChange(option.value)}
        >
          <strong>{option.label}</strong>
          <span>{option.hint}</span>
        </button>
      ))}
    </div>
  );
}
