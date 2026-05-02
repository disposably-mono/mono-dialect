"use client";

// src/components/nav/Nav.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavProps {
  username?: string | null;
  authSlot?: React.ReactNode;
  pendingCount?: number;
}

export default function Nav({ username, authSlot, pendingCount = 0 }: NavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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
    <>
      <style>{`
        .nav-root {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          height: 52px;
          border-bottom: 0.5px solid var(--border);
          background: var(--bg);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        /* Desktop tab strip */
        .nav-tabs {
          display: flex;
          gap: 2px;
          background: var(--bg-2);
          padding: 3px;
          border-radius: 8px;
        }

        /* Hamburger — hidden on desktop */
        .nav-hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          width: 32px;
          height: 32px;
          padding: 6px;
          background: none;
          border: 0.5px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .nav-hamburger span {
          display: block;
          height: 1.5px;
          background: var(--text-muted);
          border-radius: 2px;
          transition: transform 200ms var(--ease), opacity 200ms var(--ease);
        }

        .nav-hamburger.open span:nth-child(1) {
          transform: translateY(5.5px) rotate(45deg);
        }
        .nav-hamburger.open span:nth-child(2) {
          opacity: 0;
        }
        .nav-hamburger.open span:nth-child(3) {
          transform: translateY(-5.5px) rotate(-45deg);
        }

        /* Mobile dropdown menu */
        .nav-mobile-menu {
          display: none;
          position: absolute;
          top: 52px;
          left: 0;
          right: 0;
          background: var(--bg);
          border-bottom: 0.5px solid var(--border);
          padding: 8px 16px 12px;
          flex-direction: column;
          gap: 2px;
          z-index: 9;
          animation: menuSlideDown 180ms var(--ease) both;
        }

        @keyframes menuSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .nav-mobile-menu.open {
          display: flex;
        }

        .nav-mobile-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 6px;
          font-family: var(--font-sans, 'Outfit', sans-serif);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          text-decoration: none;
          transition: background 120ms, color 120ms;
        }

        .nav-mobile-tab.active {
          background: var(--bg-2);
          color: var(--text-primary);
        }

        .nav-mobile-tab:hover {
          background: var(--bg-2);
          color: var(--text-primary);
        }

        /* Auth slot on mobile — truncate long usernames */
        .nav-auth {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          overflow: hidden;
        }

        /* Wordmark shrinks slightly on very small screens */
        .nav-wordmark {
          font-family: var(--font-serif, 'DM Serif Display', serif);
          font-size: 17px;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
        }

        @media (max-width: 600px) {
          .nav-tabs { display: none; }
          .nav-hamburger { display: flex; }
          .nav-wordmark { font-size: 15px; }
        }

        @media (max-width: 380px) {
          .nav-root { padding: 0 12px; }
          .nav-wordmark { font-size: 14px; }
        }
      `}</style>

      <nav className="nav-root" style={{ position: "relative" }}>
        {/* Wordmark */}
        <Link href="/" className="nav-wordmark">
          mono<span style={{ color: "var(--accent)" }}>—</span>dialect
        </Link>

        {/* Desktop tab strip */}
        <div className="nav-tabs">
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
                  <span style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--highlight, #C8A84B)",
                    flexShrink: 0,
                  }} />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side: auth + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div className="nav-auth">{authSlot}</div>

          {/* Hamburger button */}
          <button
            className={`nav-hamburger${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <div className={`nav-mobile-menu${menuOpen ? " open" : ""}`}>
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
              className={`nav-mobile-tab${active ? " active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {tab.label}
              {tab.badge && (
                <span style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--highlight, #C8A84B)",
                  flexShrink: 0,
                }} />
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
