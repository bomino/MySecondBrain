export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function NoteCardSkeleton() {
  return (
    <div className="rounded-[10px] p-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-3/4" />
      <div className="mt-3 flex gap-1.5">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-12" />
      </div>
    </div>
  );
}

export function NoteListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <NoteCardSkeleton key={i} />
      ))}
    </div>
  );
}
