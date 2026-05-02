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

// ── Tile styles ───────────────────────────────────────────────────────────────

function getTileBase(tileSize: number, tileFontSize: number): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-mono)",
    fontWeight: 500,
    textTransform: "uppercase",
    userSelect: "none",
    borderRadius: "var(--radius-md, 12px)",
    position: "relative",
    width: tileSize,
    height: tileSize + 4,
    fontSize: tileFontSize,
  };
}

function getTileColors(
  feedback: Feedback | null,
  filled: boolean,
  isCursor: boolean
): React.CSSProperties {
  if (feedback === "correct") return {
    background: "color-mix(in srgb, var(--fern-dark, #3B6D11) 18%, var(--bg-2))",
    border: "1px solid color-mix(in srgb, var(--fern, #588157) 60%, transparent)",
    color: "var(--beige, #EAF0CE)",
    boxShadow: "inset 3px 0 0 var(--fern, #588157)",
  };
  if (feedback === "present") return {
    background: "color-mix(in srgb, var(--lavender, #E5D4ED) 10%, var(--bg-2))",
    border: "1px solid color-mix(in srgb, var(--lavender-grey, #8D99AE) 70%, transparent)",
    color: "var(--lavender, #E5D4ED)",
    boxShadow: "inset 3px 0 0 var(--lavender-grey, #8D99AE)",
  };
  if (feedback === "absent") return {
    background: "var(--bg-2)",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    opacity: 0.5,
  };
  if (isCursor) return {
    background: "var(--bg-2)",
    border: "1px solid var(--lavender-grey, #8D99AE)",
    color: "var(--text-primary)",
    // cursor pulse handled via animationName below
  };
  if (filled) return {
    background: "var(--bg-2)",
    border: "1px solid var(--border-hover)",
    color: "var(--text-primary)",
  };
  return {
    background: "var(--bg-2)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  };
}

// ── Key styles ────────────────────────────────────────────────────────────────

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
    transition: "background 100ms, transform 80ms, opacity 100ms",
  };
  if (feedback === "correct") return {
    ...base,
    background: "color-mix(in srgb, var(--fern-dark, #3B6D11) 25%, var(--bg-3))",
    border: "1px solid color-mix(in srgb, var(--fern, #588157) 60%, transparent)",
    color: "var(--beige, #EAF0CE)",
    boxShadow: "inset 2px 0 0 var(--fern, #588157)",
  };
  if (feedback === "present") return {
    ...base,
    background: "color-mix(in srgb, var(--lavender, #E5D4ED) 12%, var(--bg-3))",
    border: "1px solid color-mix(in srgb, var(--lavender-grey, #8D99AE) 60%, transparent)",
    color: "var(--lavender, #E5D4ED)",
    boxShadow: "inset 2px 0 0 var(--lavender-grey, #8D99AE)",
  };
  if (feedback === "absent") return {
    ...base,
    background: "var(--bg-2)",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    opacity: 0.4,
  };
  return {
    ...base,
    background: "var(--bg-2)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  };
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

  const keyRefs  = useRef<Record<string, HTMLButtonElement | null>>({});
  const hintPosition = hint?.position ?? null;
  const hintLetter   = hint?.letter   ?? null;
  const timerKey     = `timer-${roundsWon}-${wordLength}`;

  const tileSize     = wordLength >= 7 ? 42 : wordLength >= 6 ? 44 : 48;
  const tileFontSize = wordLength >= 7 ? 15 : wordLength >= 6 ? 16 : 18;
  const tileGap      = wordLength >= 7 ? 4  : 5;

  return (
    <>
      <style>{`
        @keyframes cursorPulse {
          0%, 100% { border-color: var(--lavender-grey, #8D99AE); }
          50%       { border-color: color-mix(in srgb, var(--lavender-grey, #8D99AE) 25%, transparent); }
        }
        @keyframes tileReveal {
          0%   { transform: scaleY(1); }
          45%  { transform: scaleY(0.05); }
          55%  { transform: scaleY(0.05); }
          100% { transform: scaleY(1); }
        }
        @keyframes tilePop {
          0%   { transform: scale(1); }
          55%  { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes tileBounce {
          0%   { transform: translateY(0); }
          30%  { transform: translateY(-10px); }
          60%  { transform: translateY(-4px); }
          80%  { transform: translateY(-7px); }
          100% { transform: translateY(0); }
        }
        @keyframes tileShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(5px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(3px); }
        }

        /* ── Layout ── */
        .rgs-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          overflow: hidden;
        }

        /* Mobile HUD bar */
        .rgs-hud-top {
          display: none;
          gap: 8px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
          align-items: center;
          flex-wrap: wrap;
        }

        /* Desktop: side-by-side */
        .rgs-body {
          display: grid;
          grid-template-columns: 1fr 260px;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* Board column */
        .rgs-board {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 16px 12px;
          border-right: 1px solid var(--border);
          overflow: hidden;
          position: relative;
        }

        /* Keyboard directly under grid — no marginTop: auto */
        .rgs-keyboard {
          width: 100%;
          max-width: 340px;
          margin-top: 16px;
        }

        /* Desktop sidebar */
        .rgs-sidebar {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        /* ── Mobile overrides ── */
        @media (max-width: 640px) {
          .rgs-hud-top {
            display: flex;
          }
          .rgs-body {
            grid-template-columns: 1fr;
          }
          .rgs-sidebar {
            display: none;
          }
          .rgs-board {
            border-right: none;
            padding: 10px 12px 8px;
          }
          .rgs-keyboard {
            max-width: 100%;
            margin-top: 10px;
          }
        }

        /* Stat chip used in mobile HUD */
        .hud-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--bg-2);
          border: 0.5px solid var(--border);
          border-radius: 6px;
          padding: 5px 10px;
        }
        .hud-chip-label {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .hud-chip-val {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }
      `}</style>

      <div className="rgs-root">

        {/* ── Mobile top HUD ── */}
        <div className="rgs-hud-top">
          {/* Timer or lives */}
          <div style={{ display: "flex", alignItems: "center" }}>
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
          <div className="hud-chip">
            <span className="hud-chip-label">Score</span>
            <span className="hud-chip-val">{totalScore.toLocaleString()}</span>
          </div>
          <div className="hud-chip">
            <span className="hud-chip-label">Rounds</span>
            <span className="hud-chip-val">{roundsWon}</span>
          </div>
          <div className="hud-chip">
            <span className="hud-chip-label">Letters</span>
            <span className="hud-chip-val">{wordLength}</span>
          </div>
          <button
            onClick={onAbandon}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "0.5px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              padding: "5px 10px",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            ✕ Quit
          </button>
        </div>

        {/* ── Main body ── */}
        <div className="rgs-body">

          {/* Board */}
          <div className="rgs-board">
            {/* Toast */}
            {toast && (
              <div style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--text-primary)",
                color: "var(--graphite, #34312D)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                padding: "7px 16px",
                borderRadius: "var(--radius-md, 12px)",
                whiteSpace: "nowrap",
                zIndex: 20,
                pointerEvents: "none",
              }}>
                {toast}
              </div>
            )}

            {/* Tile grid */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: tileGap,
              marginTop: 8,
            }}>
              {Array.from({ length: guessesAllowed }).map((_, row) => (
                <div
                  key={row}
                  style={{
                    display: "flex",
                    gap: tileGap,
                    animationName: shakeRow === row ? "tileShake" : undefined,
                    animationDuration: shakeRow === row ? "400ms" : undefined,
                    animationTimingFunction: shakeRow === row
                      ? "var(--ease-out-strong, cubic-bezier(0.23,1,0.32,1))"
                      : undefined,
                    animationFillMode: "both",
                  }}
                >
                  {Array.from({ length: wordLength }).map((_, col) => {
                    const letter     = grid[row]?.[col] ?? "";
                    const feedback   = revealed[row]?.[col] ?? null;
                    const isCursor   = row === currentRow && col === currentCol && !feedback;
                    const filled     = !!letter && !feedback;
                    const isHintPos  = feedback === null && hintPosition === col && row === currentRow;

                    // Determine animation — all longhand, never mix with shorthand
                    let animName: string | undefined;
                    let animDuration: string | undefined;
                    let animTiming: string | undefined;
                    let animDelay: string | undefined;
                    let animFill: string | undefined;

                    if (bounceRow === row) {
                      animName     = "tileBounce";
                      animDuration = "600ms";
                      animTiming   = "var(--ease-out-strong, cubic-bezier(0.23,1,0.32,1))";
                      animDelay    = `${col * 60}ms`;
                      animFill     = "both";
                    } else if (feedback) {
                      animName     = "tileReveal";
                      animDuration = "480ms";
                      animTiming   = "var(--ease-in-out-strong, cubic-bezier(0.77,0,0.175,1))";
                      animDelay    = `${col * 70}ms`;
                      animFill     = "both";
                    } else if (filled) {
                      animName     = "tilePop";
                      animDuration = "100ms";
                      animTiming   = "var(--ease-out-strong, cubic-bezier(0.23,1,0.32,1))";
                      animDelay    = undefined;
                      animFill     = "both";
                    } else if (isCursor) {
                      animName     = "cursorPulse";
                      animDuration = "2s";
                      animTiming   = "var(--ease)";
                      animDelay    = undefined;
                      animFill     = "both";
                    }

                    return (
                      <div
                        key={col}
                        style={{
                          ...getTileBase(tileSize, tileFontSize),
                          ...getTileColors(feedback, filled, isCursor),
                          animationName:             animName,
                          animationDuration:         animDuration,
                          animationTimingFunction:   animTiming,
                          animationDelay:            animDelay,
                          animationFillMode:         animFill,
                          animationIterationCount:   isCursor ? "infinite" : undefined,
                          outline: isHintPos ? "1.5px dashed var(--accent)" : undefined,
                        }}
                      >
                        {letter || (isHintPos ? hintLetter : "")}
                        {isHintPos && (
                          <span style={{
                            position: "absolute",
                            bottom: 2,
                            right: 3,
                            fontFamily: "var(--font-mono)",
                            fontSize: 7,
                            color: "var(--accent)",
                          }}>
                            hint
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Keyboard directly under grid */}
            <div className="rgs-keyboard">
              {KB_ROWS.map((row, ri) => (
                <div key={ri} style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 4,
                  marginBottom: 4,
                }}>
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
                        style={{
                          ...getKeyStyle(feedback),
                          minWidth: isWide ? 48 : 30,
                          fontSize: isWide ? 9 : 11,
                          height: 36,
                        }}
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

          {/* Desktop sidebar */}
          <div className="rgs-sidebar">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={badgeStyle("green")}>{config.difficulty}</span>
              <span style={badgeStyle("neutral")}>
                {config.subMode === "timed"
                  ? `${config.timeLimit}s`
                  : `${config.lives}L · ${config.guessesPerLife}G`}
              </span>
            </div>

            <div style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md, 12px)",
              padding: "16px",
              display: "flex",
              justifyContent: "center",
            }}>
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

            <div style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md, 12px)",
              padding: "16px",
            }}>
              <p style={sideLabel}>Score</p>
              <p style={{
                fontFamily: "var(--font-mono)",
                fontSize: 28,
                fontWeight: 500,
                color: "var(--text-primary)",
                margin: 0,
                lineHeight: 1,
              }}>
                {totalScore.toLocaleString()}
              </p>
              {roundScore != null && (
                <p style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--accent)",
                  margin: "4px 0 0",
                }}>
                  +{roundScore.toLocaleString()} last round
                </p>
              )}
            </div>

            <div style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md, 12px)",
              padding: "16px",
            }}>
              <p style={sideLabel}>Rounds won</p>
              <p style={{
                fontFamily: "var(--font-mono)",
                fontSize: 28,
                fontWeight: 500,
                color: "var(--text-primary)",
                margin: 0,
                lineHeight: 1,
              }}>
                {roundsWon}
              </p>
              {roundsWon > 0 && (
                <p style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  margin: "4px 0 0",
                }}>
                  streak ×{Math.min(1 + roundsWon * 0.05, 2).toFixed(2)}
                </p>
              )}
            </div>

            <div style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md, 12px)",
              padding: "16px",
            }}>
              <p style={sideLabel}>Word length</p>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {Array.from({ length: wordLength }).map((_, i) => (
                  <div key={i} style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: "var(--accent)",
                    opacity: 0.4 + i * 0.08,
                  }} />
                ))}
              </div>
              <p style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
                margin: "6px 0 0",
              }}>
                {wordLength} letters
              </p>
            </div>

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
                  padding: "14px",
                  cursor: "pointer",
                  transition: "border-color 160ms var(--ease), color 160ms var(--ease), transform 120ms var(--ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#E85D5D";
                  e.currentTarget.style.color = "#E85D5D";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                Abandon run
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
