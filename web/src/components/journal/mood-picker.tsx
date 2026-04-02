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
      <span className="text-sm text-gray-500">{label}:</span>
      <div className="flex gap-1">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(value === mood.value ? null : mood.value)}
            className={`rounded px-2 py-1 text-xs ${
              value === mood.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            }`}
            title={mood.label}
          >
            {mood.value}
          </button>
        ))}
      </div>
    </div>
  );
}
