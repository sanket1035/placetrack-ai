import type { Metadata } from "next";
import "./globals.css";
import "./theme-c.css";

export const metadata: Metadata = {
  title: "PlaceTrack AI — Placement readiness, made visible",
  description: "AI-powered placement management and student readiness platform."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.toggle('dark', localStorage.getItem('placetrack-theme') === 'dark')` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
