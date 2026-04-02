"use client";

interface CalendarHeatmapProps {
  dates: string[];
}

export function CalendarHeatmap({ dates }: CalendarHeatmapProps) {
  const dateSet = new Set(dates.map((d) => d.split("T")[0]));
  const weeks = buildWeeks();

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day}
                className="h-[11px] w-[11px] rounded-[2px] transition-colors duration-150"
                style={{
                  backgroundColor: dateSet.has(day) ? "var(--accent)" : "var(--elevated)",
                  opacity: dateSet.has(day) ? 1 : 0.5,
                }}
                title={`${day}${dateSet.has(day) ? " — entry exists" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildWeeks(): string[][] {
  const weeks: string[][] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());

  let current = new Date(start);
  let week: string[] = [];

  while (current <= today) {
    week.push(current.toISOString().split("T")[0]);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    current.setDate(current.getDate() + 1);
  }
  if (week.length > 0) weeks.push(week);

  return weeks;
}
