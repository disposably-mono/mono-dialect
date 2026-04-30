"use client";

import type { Feedback } from "./types";

const ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","⌫"],
];

const KEY_STYLES: Record<Feedback, { bg: string; border: string; color: string }> = {
  correct: { bg: "var(--fern-dark)", border: "var(--fern)", color: "var(--beige)" },
  present: { bg: "#5C4A1A", border: "#C8A84B", color: "#F0D080" },
  absent:  { bg: "var(--bg-3)", border: "var(--bg-3)", color: "var(--text-muted)" },
};

interface KeyboardProps {
  keyMap: Record<string, Feedback>;
  onKey: (key: string) => void;
  disabled?: boolean;
}

export function Keyboard({ keyMap, onKey, disabled }: KeyboardProps) {
  return (
    <div style={{ width: "100%", maxWidth: 340 }}>
      {ROWS.map((row, ri) => (
        <div
          key={ri}
          style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 5 }}
        >
          {row.map(key => {
            const fb = keyMap[key];
            const ks = fb ? KEY_STYLES[fb] : null;
            const isWide = key.length > 1;

            return (
              <button
                key={key}
                onClick={() => !disabled && onKey(key)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: isWide ? 10 : 11,
                  fontWeight: 500,
                  height: 38,
                  minWidth: isWide ? 52 : 32,
                  padding: "0 6px",
                  borderRadius: 4,
                  border: `0.5px solid ${ks?.border ?? "var(--tile-border)"}`,
                  background: ks?.bg ?? "var(--bg-2)",
                  color: ks?.color ?? "var(--text-primary)",
                  cursor: disabled ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textTransform: "uppercase",
                  userSelect: "none",
                  transition: "background 100ms, transform 80ms",
                }}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
