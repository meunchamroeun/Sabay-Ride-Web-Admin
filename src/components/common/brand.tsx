import { cn } from "@/lib/utils";

/** Wheel-and-road mark. Pure SVG so it inherits currentColor in both themes. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-sidebar-primary" />
      <circle cx="10" cy="20" r="4.2" fill="none" strokeWidth="2.2" className="stroke-sidebar-primary-foreground" />
      <circle cx="22.5" cy="20" r="4.2" fill="none" strokeWidth="2.2" className="stroke-sidebar-primary-foreground" />
      <path
        d="M10 20 L15 12.5 H20 L22.5 20 M15 12.5 L13.5 9.5 H11"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-sidebar-primary-foreground"
      />
    </svg>
  );
}
