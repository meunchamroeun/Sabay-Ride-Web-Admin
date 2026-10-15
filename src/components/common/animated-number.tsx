"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/** Counts up from 0 with GSAP; `format` keeps currency/locale formatting during the tween. */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  });

  useGSAP(
    () => {
      const obj = { n: 0 };
      gsap.to(obj, {
        n: value,
        duration: 1.1,
        ease: "power3.out",
        onUpdate: () => {
          if (ref.current) ref.current.textContent = formatRef.current(Number.isInteger(value) ? Math.round(obj.n) : obj.n);
        },
      });
    },
    { dependencies: [value], scope: ref },
  );

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
