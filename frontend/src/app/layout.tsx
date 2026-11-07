import type { Metadata } from "next";
import "./globals.css";
import "./theme-c.css";

export const metadata: Metadata = {
  title: "PlaceTrack AI — Placement readiness, made visible",
  description: "AI-powered placement management and student readiness platform.",
  icons: { icon: "/icon.svg" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
