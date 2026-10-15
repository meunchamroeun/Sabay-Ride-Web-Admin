import type { MetadataRoute } from "next";

/** Installable app (PWA): "Add to Home Screen" opens SabayRide Admin full-screen like a native app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SabayRide Admin",
    short_name: "SabayRide",
    description: "Administrator console for the SabayRide motorbike rental marketplace in Siem Reap.",
    lang: "km",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f5fb",
    theme_color: "#19232d",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shops to review", short_name: "Shops", url: "/shops", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Payouts", short_name: "Payouts", url: "/payouts", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
