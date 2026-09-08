/**
 * Loading states. A blank rectangle is never a loading state, per CLAUDE.md, so
 * every lazy tab and every slow panel renders one of these instead.
 */

export function TabSkeleton({ label }: { readonly label: string }) {
  return (
    <div className="flex h-full min-h-64 flex-col gap-4 p-6" role="status" aria-live="polite">
      <div className="skeleton h-8 w-1/2 rounded-xl" />
      <div className="skeleton h-40 w-full rounded-2xl" />
      <div className="skeleton h-6 w-2/3 rounded-xl" />
      <span className="text-scale-sm font-medium text-bb-muted-foreground">Loading {label}</span>
    </div>
  );
}

export function LineSkeleton({ className = "" }: { readonly className?: string }) {
  return <div className={`skeleton h-5 rounded-lg ${className}`} aria-hidden />;
}
