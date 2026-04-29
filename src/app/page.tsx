// src/app/page.tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const user = session?.user as any;

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* NAV */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: "52px",
          borderBottom: "0.5px solid var(--border)",
          background: "var(--bg)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "17px",
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          mono
          <span style={{ color: "var(--accent)" }}>—</span>
          dialect
        </span>

        {/* Nav tabs — placeholder, active in Phase 2 */}
        <div
          style={{
            display: "flex",
            gap: "2px",
            background: "var(--bg-2)",
            padding: "3px",
            borderRadius: "8px",
          }}
        >
          {["Daily", "Roguelike", "Leaderboard", "Profile"].map((tab, i) => (
            <button
              key={tab}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                fontWeight: 500,
                color: i === 0 ? "var(--text-primary)" : "var(--text-muted)",
                padding: "5px 12px",
                borderRadius: "5px",
                cursor: "pointer",
                background: i === 0 ? "var(--bg-3)" : "none",
                border: "none",
                whiteSpace: "nowrap",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Auth actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Theme pill — wired in Phase 5 */}
          <button
            style={{
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              padding: "4px 10px",
              border: "0.5px solid var(--border)",
              borderRadius: "20px",
              cursor: "pointer",
              background: "none",
            }}
          >
            dark
          </button>

          {loading ? (
            <div
              style={{
                width: "72px",
                height: "28px",
                background: "var(--bg-3)",
                borderRadius: "6px",
                opacity: 0.5,
              }}
            />
          ) : user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--accent)",
                }}
              >
                @{user.username ?? user.name}
              </span>
              <button
                onClick={() => signOut()}
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text-muted)",
                  background: "var(--bg-2)",
                  padding: "5px 14px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  border: "0.5px solid var(--border)",
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("google")}
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--graphite)",
                background: "var(--beige)",
                padding: "5px 14px",
                borderRadius: "6px",
                cursor: "pointer",
                border: "none",
              }}
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      {/* BODY — placeholder until Phase 2 game board */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(28px, 6vw, 48px)",
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
          }}
        >
          mono
          <span style={{ color: "var(--accent)" }}>—</span>
          dialect
        </div>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {user
            ? `welcome back, ${user.username ?? user.name}`
            : "Phase 1 complete · Sign in to continue"}
        </p>
      </div>
    </main>
  );
}
