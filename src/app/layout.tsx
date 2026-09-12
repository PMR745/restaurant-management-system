import type { Metadata, Viewport } from "next";
import { AppToaster, SyncProvider } from "@/components/providers";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Noir & Gold — Restaurant Management",
    template: "%s · Noir & Gold",
  },
  description:
    "A restaurant operations system: QR ordering, live kitchen display, waiter service and floor management, synchronised in real time.",
};

export const viewport: Viewport = {
  themeColor: "#0D0C0A",
  width: "device-width",
  initialScale: 1,
  // The customer menu is full-bleed; letting it zoom is still required for
  // accessibility, so only the initial scale is pinned.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-dvh bg-obsidian font-sans text-ink-2 antialiased">
        {/* Atmosphere, in order: the light above the table, then the grain
            that stops the whole thing reading as flat vector. Both are
            pointer-events:none and sit outside the content flow. */}
        <div className="glow-backdrop" aria-hidden />
        <SyncProvider>{children}</SyncProvider>
        <div className="grain" aria-hidden />
        <AppToaster />
      </body>
    </html>
  );
}
