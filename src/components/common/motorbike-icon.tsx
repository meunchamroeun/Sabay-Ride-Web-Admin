import { cn } from "@/lib/utils";

/**
 * Cruiser-style motorbike outline, drop-in for a lucide icon (`className`, `currentColor`).
 * Drawn on a 512 grid; the stroke is set on the inner group so utility classes such as
 * `stroke-[1.75]` on the <svg> cannot thin it out.
 */
export function Motorbike({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("lucide lucide-motorbike", className)}
      {...props}
    >
      <g strokeWidth={30}>
        {/* wheels */}
        <circle cx="112" cy="356" r="60" />
        <circle cx="112" cy="356" r="6" />
        <circle cx="432" cy="350" r="54" />
        <circle cx="432" cy="350" r="6" />
        {/* fork, handlebar, headlight */}
        <path d="M432 350 366 130" />
        <path d="M296 108 346 100 368 132" />
        <rect x="384" y="128" width="52" height="58" rx="14" />
        {/* seat and tank */}
        <path d="M106 214c-2-24 24-32 50-22l70 6c26-28 64-48 108-48l28 4 18 56c-44 14-94 22-144 16H128c-12 0-21-4-22-12Z" />
        {/* frame */}
        <path d="m176 226 38 70 108 8 58-92" />
        {/* exhaust */}
        <path d="m30 298 238 32c18 3 16 26-2 24L38 330c-16-2-20-28-8-32Z" />
        {/* fenders */}
        <path d="M28 262c28-34 96-40 150-10" />
        <path d="M376 292c22-30 76-34 114-16" />
      </g>
    </svg>
  );
}
