"use client";

const PRESET_COLORS = [
  "#d97706", "#2563eb", "#16a34a", "#ef4444",
  "#8b5cf6", "#ec4899", "#0891b2", "#65a30d",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-1.5">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className="h-6 w-6 rounded-full transition-transform duration-100"
          style={{
            backgroundColor: color,
            transform: value === color ? "scale(1.2)" : "scale(1)",
            boxShadow: value === color ? `0 0 0 2px var(--background), 0 0 0 4px ${color}` : "none",
          }}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
}
