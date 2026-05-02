"use client";

// src/components/nav/Nav.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Daily", href: "/" },
  { label: "Roguelike", href: "/run" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Profile", href: null }, // dynamic — needs username
] as const;

interface NavProps {
  username?: string | null;
  authSlot?: React.ReactNode;
}

export default function Nav({ username, authSlot }: NavProps) {
  const pathname = usePathname();

  function isActive(href: string | null): boolean {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function getProfileHref(): string {
    return username ? `/profile/${username}` : "/api/auth/signin";
  }

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: 52,
        borderBottom: "0.5px solid var(--border)",
        background: "var(--bg)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-serif, 'DM Serif Display', serif)",
          fontSize: 17,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          textDecoration: "none",
        }}
      >
        mono<span style={{ color: "var(--accent)" }}>—</span>dialect
      </Link>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          background: "var(--bg-2)",
          padding: 3,
          borderRadius: 8,
        }}
      >
        {TABS.map((tab) => {
          const href = tab.label === "Profile" ? getProfileHref() : tab.href!;
          const active = tab.label === "Profile"
            ? pathname.startsWith("/profile")
            : isActive(tab.href);

          return (
            <Link
              key={tab.label}
              href={href}
              style={{
                fontFamily: "var(--font-sans, 'Outfit', sans-serif)",
                fontSize: 12,
                fontWeight: 500,
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                padding: "5px 12px",
                borderRadius: 5,
                textDecoration: "none",
                background: active ? "var(--bg-3)" : "none",
                transition: "color 120ms, background 120ms",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Right slot */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {authSlot}
      </div>
    </nav>
  );
}
