import { cn } from "../lib/classNames";

type Variant = "hub" | "resumes" | "hero" | "compact";

type Props = {
  variant?: Variant;
  className?: string;
};

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200/80", className)} />;
}

export function EntitlementSkeleton({ variant = "hub", className }: Props) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center justify-center py-10", className)} aria-busy aria-label="Loading">
        <span className="cc-spinner h-5 w-5 border-2 border-slate-200 border-t-[#5B4CF0]" />
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={cn("cc-fade-in mt-4 space-y-6", className)} aria-busy aria-label="Loading">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <Shimmer className="h-6 w-40" />
          <Shimmer className="mt-3 h-4 w-full max-w-xl" />
          <div className="mt-5 flex gap-3">
            <Shimmer className="h-8 w-24 rounded-full" />
            <Shimmer className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "resumes") {
    return (
      <div className={cn("cc-fade-in mt-4 space-y-6", className)} aria-busy aria-label="Loading">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <Shimmer className="h-6 w-36" />
          <Shimmer className="mt-2 h-4 w-full max-w-lg" />
        </div>
        <div className="space-y-3">
          <Shimmer className="h-20 w-full" />
          <Shimmer className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col space-y-3", className)} aria-busy aria-label="Loading">
      <Shimmer className="h-5 w-36" />
      <div className="flex gap-2">
        <Shimmer className="h-7 w-16 rounded-full" />
        <Shimmer className="h-7 w-20 rounded-full" />
        <Shimmer className="h-7 w-20 rounded-full" />
      </div>
      <Shimmer className="h-9 w-full max-w-sm" />
      <div className="space-y-2 pt-2">
        <Shimmer className="h-14 w-full" />
        <Shimmer className="h-14 w-full" />
        <Shimmer className="h-14 w-full" />
      </div>
    </div>
  );
}
