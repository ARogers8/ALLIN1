import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TimezoneCookie } from "@/components/timezone-cookie";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ALLIN1 — Fitness, all in one", template: "%s · ALLIN1" },
  description: "Track food, workouts, steps and weight. ALLIN1 works out exactly how much you should eat to cut, maintain or bulk.",
};

export const viewport: Viewport = {
  themeColor: "#06070b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <TimezoneCookie />
        {children}
      </body>
    </html>
  );
}
