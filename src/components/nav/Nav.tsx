"use client";
// src/components/nav/Nav.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavProps {
  authSlot: React.ReactNode;
}

const TABS = [
  { label: "Daily", href: "/" },
  { label: "Roguelike", href: "/run" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Profile", href: "/profile" },
];

export default function Nav({ authSlot }: NavProps) {
  const pathname = usePathname();

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
        position: "relative",
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 17,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        mono
        <span style={{ color: "var(--accent)" }}>—</span>
        dialect
      </Link>

      {/* Tab pill group */}
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
          const isActive = pathname === tab.href;
          const isDisabled =
            tab.href === "/leaderboard" || tab.href === "/profile";

          return (
            <Link
              key={tab.href}
              href={isDisabled ? "#" : tab.href}
              aria-disabled={isDisabled}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                color: isActive
                  ? "var(--text-primary)"
                  : isDisabled
                  ? "var(--text-muted)"
                  : "var(--text-muted)",
                padding: "5px 12px",
                borderRadius: 5,
                background: isActive ? "var(--bg-3)" : "transparent",
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "color 120ms var(--ease), background 120ms var(--ease)",
                pointerEvents: isDisabled ? "none" : "auto",
                opacity: isDisabled ? 0.45 : 1,
                cursor: isDisabled ? "default" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isDisabled) {
                  e.currentTarget.style.color = "var(--text-secondary, var(--text-muted))";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--text-muted)";
                }
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Auth slot */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {authSlot}
      </div>
    </nav>
  );
}