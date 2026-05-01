"use client";
// src/app/(game)/run/RunGameScreen.tsx

import { useRef } from "react";
import { RunState, Feedback } from "./types";
import TimerHUD from "./TimerHUD";
import LivesHUD from "./LivesHUD";

interface Props {
  state: RunState;
  onLetter: (l: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  onTimerExpired: () => void;
  onAbandon: () => void;
  showToast: (msg: string, duration?: number) => void;
}

// ── Tile style ────────────────────────────────────────────────────────────────

function getTileStyle(feedback: Feedback | null, filled: boolean, isCursor: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-mono)",
    fontWeight: 500,
    textTransform: "uppercase",
    userSelect: "none",
    borderRadius: "var(--radius-sm, 6px)",
    animationFillMode: "both",
  };
  if (feedback === "correct") return { ...base, background: "var(--fern-dark, #3B6D11)", border: "1px solid var(--accent)", color: "var(--beige, #EAF0CE)" };
  if (feedback === "present") return { ...base, background: "#5C4A1A", border: "1px solid var(--highlight, #C8A84B)", color: "#F0D080" };
  if (feedback === "absent")  return { ...base, background: "var(--bg-3)", border: "1px solid var(--bg-3)", color: "var(--text-muted)" };
  if (isCursor) return { ...base, background: "var(--bg-2)", border: "1px solid var(--lavender-grey, #8D99AE)", color: "var(--text-primary)" };
  if (filled)   return { ...base, background: "var(--bg-2)", border: "1px solid var(--tile-border, #4A4640)", color: "var(--text-primary)" };
  return { ...base, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-primary)" };
}

// ── Key style — all variants use border shorthand only ────────────────────────

function getKeyStyle(feedback: Feedback | undefined): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontWeight: 500,
    height: 38,
    minWidth: 32,
    padding: "0 6px",
    borderRadius: "var(--radius-sm, 6px)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textTransform: "uppercase",
    userSelect: "none",
    touchAction: "manipulation",
    transition: "background 100ms, transform 80ms",
  };
  if (feedback === "correct") return { ...base, background: "var(--fern-dark, #3B6D11)", border: "1px solid var(--accent)", color: "var(--beige, #EAF0CE)" };
  if (feedback === "present") return { ...base, background: "#5C4A1A", border: "1px solid var(--highlight, #C8A84B)", color: "#F0D080" };
  if (feedback === "absent")  return { ...base, background: "var(--bg-3)", border: "1px solid var(--bg-3)", color: "var(--text-muted)" };
  return { ...base, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-primary)" };
}

const KB_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","⌫"],
];

const sideLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--text-muted)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  margin: "0 0 4px",
};

function badgeStyle(variant: "green" | "neutral"): React.CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    color: variant === "green" ? "var(--accent)" : "var(--text-muted)",
    border: `0.5px solid ${variant === "green" ? "var(--accent)" : "var(--border)"}`,
    borderRadius: 4,
    padding: "2px 7px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RunGameScreen({
  state,
  onLetter,
  onDelete,
  onSubmit,
  onTimerExpired,
  onAbandon,
}: Props) {
  const {
    config, grid, revealed, currentRow, currentCol, keyMap, hint,
    wordLength, guessesAllowed, roundsWon, totalScore, livesRemaining,
    shakeRow, bounceRow, toast, isSubmitting, roundScore,
  } = state;

  const keyRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const hintPosition = hint?.position ?? null;
  const hintLetter = hint?.letter ?? null;
  const timerKey = `timer-${roundsWon}-${wordLength}`;

  const tileSize     = wordLength >= 7 ? 42 : wordLength >= 6 ? 44 : 48;
  const tileFontSize = wordLength >= 7 ? 15 : wordLength >= 6 ? 16 : 18;
  const tileGap      = wordLength >= 7 ? 4 : 5;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", height: "100%", minHeight: 0, overflow: "hidden" }}>

      {/* ── Board ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 20px 16px", borderRight: "1px solid var(--border)", overflow: "hidden", position: "relative" }}>

        {/* Toast */}
        {toast && (
          <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", background: "var(--text-primary)", color: "var(--graphite, #34312D)", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, padding: "7px 16px", borderRadius: 20, whiteSpace: "nowrap", zIndex: 20, pointerEvents: "none" }}>
            {toast}
          </div>
        )}

        {/* Tile grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: tileGap, marginBottom: 20, marginTop: 8 }}>
          {Array.from({ length: guessesAllowed }).map((_, row) => (
            <div
              key={row}
              style={{
                display: "flex",
                gap: tileGap,
                animation: shakeRow === row
                  ? "tile-shake 400ms var(--ease-out-strong, cubic-bezier(0.23,1,0.32,1))"
                  : undefined,
              }}
            >
              {Array.from({ length: wordLength }).map((_, col) => {
                const letter   = grid[row]?.[col] ?? "";
                const feedback = revealed[row]?.[col] ?? null;
                const isCursor = row === currentRow && col === currentCol && !feedback;
                const filled   = !!letter && !feedback;
                const isHintPos = feedback === null && hintPosition === col && row === currentRow;

                return (
                  <div
                    key={col}
                    style={{
                      ...getTileStyle(feedback, filled, isCursor),
                      width: tileSize,
                      height: tileSize,
                      fontSize: tileFontSize,
                      animationName: bounceRow === row ? "tile-bounce" : feedback ? "tile-flip" : undefined,
                      animationDuration: bounceRow === row ? "600ms" : feedback ? "500ms" : undefined,
                      animationTimingFunction: bounceRow === row
                        ? "var(--ease-out-strong, cubic-bezier(0.23,1,0.32,1))"
                        : "var(--ease-in-out-strong, cubic-bezier(0.77,0,0.175,1))",
                      animationDelay: `${col * 80}ms`,
                      outline: isHintPos ? "1.5px dashed var(--accent)" : undefined,
                      position: "relative",
                    }}
                  >
                    {letter || (isHintPos ? hintLetter : "")}
                    {isHintPos && (
                      <span style={{ position: "absolute", bottom: 2, right: 3, fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--accent)" }}>
                        hint
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Keyboard */}
        <div style={{ width: "100%", maxWidth: 340, marginTop: "auto" }}>
          {KB_ROWS.map((row, ri) => (
            <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 5 }}>
              {row.map((key) => {
                const isWide   = key.length > 1;
                const feedback = keyMap[key] as Feedback | undefined;
                return (
                  <button
                    key={key}
                    ref={(el) => { keyRefs.current[key] = el; }}
                    disabled={!!isSubmitting}
                    aria-label={key === "⌫" ? "Backspace" : key}
                    onClick={() => {
                      if (key === "ENTER") onSubmit();
                      else if (key === "⌫") onDelete();
                      else onLetter(key);
                    }}
                    style={{ ...getKeyStyle(feedback), minWidth: isWide ? 52 : 32, fontSize: isWide ? 10 : 11 }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
                    onMouseUp={(e)   => { e.currentTarget.style.transform = "scale(1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── HUD sidebar ── */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

        {/* Badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={badgeStyle("green")}>{config.difficulty}</span>
          <span style={badgeStyle("neutral")}>
            {config.subMode === "timed" ? `${config.timeLimit}s` : `${config.lives}L · ${config.guessesPerLife}G`}
          </span>
        </div>

        {/* Timer or Lives */}
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md, 12px)", padding: "16px", display: "flex", justifyContent: "center" }}>
          {config.subMode === "timed" ? (
            <TimerHUD
              key={timerKey}
              seconds={config.timeLimit ?? 30}
              isActive={!isSubmitting}
              onExpired={onTimerExpired}
            />
          ) : (
            <LivesHUD
              livesRemaining={livesRemaining ?? config.lives ?? 1}
              livesTotal={config.lives ?? 1}
            />
          )}
        </div>

        {/* Score */}
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md, 12px)", padding: "16px" }}>
          <p style={sideLabel}>Score</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 500, color: "var(--text-primary)", margin: 0, lineHeight: 1 }}>
            {totalScore.toLocaleString()}
          </p>
          {roundScore != null && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", margin: "4px 0 0" }}>
              +{roundScore.toLocaleString()} last round
            </p>
          )}
        </div>

        {/* Rounds won */}
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md, 12px)", padding: "16px" }}>
          <p style={sideLabel}>Rounds won</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 500, color: "var(--text-primary)", margin: 0, lineHeight: 1 }}>
            {roundsWon}
          </p>
          {roundsWon > 0 && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>
              streak ×{Math.min(1 + roundsWon * 0.05, 2).toFixed(2)}
            </p>
          )}
        </div>

        {/* Word length pips */}
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md, 12px)", padding: "16px" }}>
          <p style={sideLabel}>Word length</p>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {Array.from({ length: wordLength }).map((_, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)", opacity: 0.5 + i * 0.07 }} />
            ))}
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>
            {wordLength} letters
          </p>
        </div>

        {/* Abandon — now calls onAbandon prop, no window.confirm or navigation */}
        <div style={{ marginTop: "auto" }}>
          <button
            onClick={onAbandon}
            style={{
              width: "100%",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm, 6px)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              padding: "9px",
              cursor: "pointer",
              transition: "border 160ms var(--ease), color 160ms var(--ease)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = "1px solid #E85D5D";
              e.currentTarget.style.color  = "#E85D5D";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = "1px solid var(--border)";
              e.currentTarget.style.color  = "var(--text-muted)";
            }}
          >
            Abandon run
          </button>
        </div>
      </div>
    </div>
  );
}