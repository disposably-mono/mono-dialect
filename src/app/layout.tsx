// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Analytics } from "@vercel/analytics/next";

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
      <head>
        <link 
          rel="icon" 
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%2334312D'/><text x='50%25' y='54%25' font-family='Georgia,serif' font-size='20' fill='%23EAF0CE' text-anchor='middle' dominant-baseline='middle'>M</text></svg>" 
        />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
