"use client";

import { signOut } from "next-auth/react";

const STORAGE_KEY = "mono-dialect-daily";

interface AuthControlsProps {
  username: string | null | undefined;
  userId: string | null | undefined;
}

export function AuthControls({ username, userId }: AuthControlsProps) {
  function handleSignOut() {
    // ── Clear this account's localStorage entry before signing out
    //    so the next user on this browser starts completely fresh
    if (userId) {
      localStorage.removeItem(`${STORAGE_KEY}-${userId}`);
      localStorage.removeItem("mono-dialect-run");
      localStorage.removeItem('mono-dialect-run-${userId}');
    }
    signOut({ callbackUrl: "/" });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--text-muted)",
      }}>
        {username}
      </span>
      <button
        onClick={handleSignOut}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-muted)",
          background: "none",
          border: "0.5px solid var(--tile-border)",
          borderRadius: 6,
          padding: "5px 14px",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
        }}
      >
        Sign out
      </button>
    </div>
  );
}
