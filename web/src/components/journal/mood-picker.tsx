"use client";

const MOODS = [
  { value: 1, label: "Awful" },
  { value: 2, label: "Bad" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
];

interface MoodPickerProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}

export function MoodPicker({ label, value, onChange }: MoodPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}:</span>
      <div className="flex gap-1">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(value === mood.value ? null : mood.value)}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150"
            style={{
              backgroundColor: value === mood.value ? "var(--accent)" : "var(--surface)",
              color: value === mood.value ? "white" : "var(--text-secondary)",
              border: `1px solid ${value === mood.value ? "var(--accent)" : "var(--border)"}`,
            }}
            aria-label={`${label}: ${mood.label}`}
            title={mood.label}
          >
            {mood.value}
          </button>
        ))}
      </div>
    </div>
  );
}
