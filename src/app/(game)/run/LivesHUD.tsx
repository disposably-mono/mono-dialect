"use client";
// src/app/(game)/run/LivesHUD.tsx

interface Props {
  livesRemaining: number;
  livesTotal: number;
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transition: "opacity 300ms var(--ease)" }}
    >
      <path
        d="M8 13.5S2 9.5 2 5.5A3.5 3.5 0 0 1 8 3.616 3.5 3.5 0 0 1 14 5.5C14 9.5 8 13.5 8 13.5Z"
        fill={filled ? "#E85D5D" : "none"}
        stroke={filled ? "#E85D5D" : "var(--border)"}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LivesHUD({ livesRemaining, livesTotal }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: livesTotal }).map((_, i) => (
          <Heart key={i} filled={i < livesRemaining} />
        ))}
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--text-muted)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        lives
      </span>
    </div>
  );
}
