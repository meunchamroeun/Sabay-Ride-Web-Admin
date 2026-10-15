import type { Metadata, Viewport } from "next";
import { Geist_Mono, Kantumruy_Pro } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Kantumruy Pro covers both Khmer and Latin, so the two languages share one rhythm.
const kantumruy = Kantumruy_Pro({
  variable: "--font-kantumruy",
  subsets: ["khmer", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "SabayRide Admin", template: "%s · SabayRide Admin" },
  description: "Administrator dashboard for the SabayRide motorbike rental marketplace in Siem Reap.",
  applicationName: "SabayRide Admin",
  // iOS home-screen app: full screen, title under the icon, status bar over the app colour.
  appleWebApp: { capable: true, title: "SabayRide", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the bottom tab bar sit above the iPhone home indicator
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2230" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km" suppressHydrationWarning className={`${kantumruy.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
