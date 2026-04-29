// src/app/onboarding/OnboardingForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RULES = /^[a-zA-Z0-9_]{3,20}$/;

export default function OnboardingForm({ userId }: { userId: string }) {
  const [value, setValue]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    setError("");

    if (!RULES.test(value)) {
      setError("3–20 characters. Letters, numbers, and underscores only.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/onboarding/set-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: value.toLowerCase() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    // Username saved — go to the game
    router.push("/");
    router.refresh(); // force session re-read
  }

  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "40px",
        width: "100%",
        maxWidth: "400px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "24px",
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            marginBottom: "6px",
          }}
        >
          Pick a username
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--text-muted)",
          }}
        >
          This is how you'll appear on leaderboards
        </div>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="your_handle"
        maxLength={20}
        autoFocus
        style={{
          background: "var(--bg-3)",
          border: `0.5px solid ${error ? "#c0392b" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono)",
          fontSize: "16px",
          padding: "12px 16px",
          outline: "none",
          width: "100%",
        }}
      />

      {error && (
        <div
          style={{
            fontSize: "12px",
            color: "#c0392b",
            fontFamily: "var(--font-mono)",
            marginTop: "-12px",
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || value.length < 3}
        style={{
          background: loading || value.length < 3 ? "var(--bg-3)" : "var(--accent)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          color: "var(--beige)",
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          fontWeight: 600,
          padding: "12px",
          cursor: loading || value.length < 3 ? "not-allowed" : "pointer",
          transition: "opacity 160ms",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Saving..." : "Continue →"}
      </button>
    </div>
  );
}
