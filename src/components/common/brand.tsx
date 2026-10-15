import Image from "next/image";
import { cn } from "@/lib/utils";

/** SabayRide logo (public/logo.png — also used as the favicon via src/app/icon.png). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="SabayRide"
      width={64}
      height={64}
      priority
      className={cn("size-8 rounded-[28%] ring-1 ring-white/10", className)}
    />
  );
}
