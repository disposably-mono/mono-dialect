// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mono — Dialect",
  description: "A word-guessing game with roguelike run mode, scoring, and leaderboards.",
  openGraph: {
    title: "Mono — Dialect",
    description: "Daily challenge and roguelike word game.",
    siteName: "Mono — Dialect",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
