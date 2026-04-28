// src/app/page.tsx
// Placeholder — this becomes the Daily Challenge page in Step 4.
// For now it just proves the design tokens and fonts are working.

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        padding: "40px 20px",
      }}
    >
      {/* Logo */}
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

      {/* Subtitle */}
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--text-muted)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Step 1 complete · Design tokens loaded
      </p>

      {/* Token preview grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: "8px",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        {[
          { label: "bg", color: "var(--bg)", border: "1px solid var(--border-hover)" },
          { label: "bg-2", color: "var(--bg-2)" },
          { label: "bg-3", color: "var(--bg-3)" },
          { label: "accent", color: "var(--accent)" },
          { label: "highlight", color: "var(--highlight)" },
          { label: "text-sec", color: "var(--text-sec)" },
        ].map((t) => (
          <div
            key={t.label}
            style={{
              background: t.color,
              border: t.border ?? "none",
              borderRadius: "var(--radius-sm)",
              padding: "12px 8px",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--text-primary)",
                opacity: 0.7,
              }}
            >
              {t.label}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
