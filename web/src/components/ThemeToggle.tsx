import clsx from "clsx";

export type ThemeMode = "light" | "dark";

interface ThemeToggleProps {
  theme: ThemeMode;
  onChange: (theme: ThemeMode) => void;
}

const options: Array<{ value: ThemeMode; label: string; hint: string }> = [
  { value: "light", label: "Daylight", hint: "Review builds" },
  { value: "dark", label: "Midnight", hint: "War room" },
];

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return (
    <div className="theme-toggle" role="group" aria-label="Theme selection">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={clsx(option.value === theme && "active")}
          aria-pressed={option.value === theme}
          onClick={() => onChange(option.value)}
        >
          <strong>{option.label}</strong>
          <span>{option.hint}</span>
        </button>
      ))}
    </div>
  );
}
