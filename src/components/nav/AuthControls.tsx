"use client";

// src/components/nav/AuthControls.tsx
import { signOut } from "next-auth/react";
import Link from "next/link";

interface AuthControlsProps {
  username: string | null | undefined;
  userId: string | null | undefined;
}

export function AuthControls({ username, userId }: AuthControlsProps) {
  function handleSignOut() {
    if (userId) {
      localStorage.removeItem(`mono-dialect-daily-${userId}`);
      localStorage.removeItem(`mono-dialect-run-${userId}`);
    }
    // Also clear anonymous keys in case they exist
    localStorage.removeItem("mono-dialect-daily");
    localStorage.removeItem("mono-dialect-run");
    signOut({ callbackUrl: "/" });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {username ? (
        <Link
          href={`/profile/${username}`}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-muted)",
            textDecoration: "none",
            transition: "color 160ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-sec)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          {username}
        </Link>
      ) : null}
      <button
        onClick={handleSignOut}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-muted)",
          background: "none",
          border: "0.5px solid var(--border)",
          borderRadius: 6,
          padding: "5px 14px",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          transition: "color 160ms, border-color 160ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
          e.currentTarget.style.borderColor = "var(--border-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        Sign out
      </button>
    </div>
  );
}
