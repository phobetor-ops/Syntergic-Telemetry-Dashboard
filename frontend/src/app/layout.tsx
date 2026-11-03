import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SYNTERGIC IDS // Telemetry Dashboard",
  description:
    "Passive Intrusion Detection System measuring environmental & social entropy (Ω) with FastAPI, Celery, Redis, and Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <div className="fixed inset-0 crt-overlay z-50 pointer-events-none" />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
