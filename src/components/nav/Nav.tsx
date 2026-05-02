"use client";

// src/components/nav/Nav.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavProps {
  username?: string | null;
  authSlot?: React.ReactNode;
  pendingCount?: number;
}

export default function Nav({ username, authSlot, pendingCount = 0 }: NavProps) {
  const pathname = usePathname();

  function isActive(href: string | null): boolean {
    if (!href) return false;
    if (href === "/run") return pathname === "/run" || pathname === "/";
    return pathname.startsWith(href);
  }

  function getProfileHref(): string {
    return username ? `/profile/${username}` : "/api/auth/signin";
  }

  const tabs = [
    { label: "Play", href: "/run" },
    { label: "Leaderboard", href: "/leaderboard", badge: pendingCount > 0 },
    { label: "Profile", href: null },
  ];

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

      <div
        style={{
          display: "flex",
          gap: 2,
          background: "var(--bg-2)",
          padding: 3,
          borderRadius: 8,
        }}
      >
        {tabs.map((tab) => {
          const href = tab.label === "Profile" ? getProfileHref() : tab.href!;
          const active =
            tab.label === "Profile"
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
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {tab.label}
              {tab.badge && (
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--highlight, #C8A84B)",
                    flexShrink: 0,
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {authSlot}
      </div>
    </nav>
  );
}
