// src/app/profile/[username]/not-found.tsx
import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: "80px auto",
        padding: "0 24px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono, 'DM Mono', monospace)",
          fontSize: 11,
          color: "var(--text-muted)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        404
      </p>
      <h1
        style={{
          fontFamily: "var(--font-serif, 'DM Serif Display', serif)",
          fontSize: 28,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          marginBottom: 10,
        }}
      >
        Player not found
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono, 'DM Mono', monospace)",
          marginBottom: 28,
        }}
      >
        That username doesn&apos;t exist or hasn&apos;t completed onboarding.
      </p>
      <Link
        href="/leaderboard"
        style={{
          display: "inline-block",
          padding: "8px 20px",
          background: "var(--bg-2)",
          border: "0.5px solid var(--border)",
          borderRadius: "var(--radius-sm, 6px)",
          color: "var(--text-primary)",
          fontSize: 13,
          fontWeight: 500,
          textDecoration: "none",
          fontFamily: "var(--font-sans, 'Outfit', sans-serif)",
          transition: "opacity 160ms",
        }}
      >
        View leaderboard
      </Link>
    </div>
  );
}
