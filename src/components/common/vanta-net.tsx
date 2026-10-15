"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type VantaEffect = { destroy: () => void; setOptions: (o: Record<string, unknown>) => void };

// Dark keeps the original green-on-night-purple; light flips to a soft lavender page with a
// deeper green so the network still reads clearly.
const PALETTE = {
  dark: { color: 0x207d3c, backgroundColor: 0x1f1a37 },
  light: { color: 0x1b7a3a, backgroundColor: 0xf3f1fa },
} as const;

/**
 * Animated Vanta.js NET background. three.js and vanta are loaded lazily on the client so they
 * stay out of the main bundle; colours follow the light/dark theme without re-creating the
 * scene, and the effect is skipped for people who prefer reduced motion (the solid colour shows).
 */
export function VantaNet({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const effect = useRef<VantaEffect | null>(null);
  const { resolvedTheme } = useTheme();
  const mode: keyof typeof PALETTE = resolvedTheme === "light" ? "light" : "dark";
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
    effect.current?.setOptions({ ...PALETTE[mode] });
  }, [mode]);

  useEffect(() => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;

    (async () => {
      const [THREE, { default: NET }] = await Promise.all([
        import("three"),
        import("vanta/dist/vanta.net.min"),
      ]);
      if (cancelled || !ref.current) return;
      effect.current = NET({
        el: ref.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1,
        scaleMobile: 1,
        ...PALETTE[modeRef.current],
      }) as VantaEffect;
    })();

    return () => {
      cancelled = true;
      effect.current?.destroy();
      effect.current = null;
    };
  }, []);

  return <div ref={ref} aria-hidden className={cn("bg-[#f3f1fa] dark:bg-[#1f1a37]", className)} />;
}
