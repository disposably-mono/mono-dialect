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

// ── Hex geometry helpers ──────────────────────────────────────────────────────

function getHexPath(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  // Flat-top hexagon: 6 points
  const pts = [
    [cx + rx * Math.cos(Math.PI / 6 * 0), cy + ry * Math.sin(Math.PI / 6 * 0)],
    [cx + rx * Math.cos(Math.PI / 6 * 2), cy + ry * Math.sin(Math.PI / 6 * 2)],
    [cx + rx * Math.cos(Math.PI / 6 * 4), cy + ry * Math.sin(Math.PI / 6 * 4)],
    [cx + rx * Math.cos(Math.PI / 6 * 6), cy + ry * Math.sin(Math.PI / 6 * 6)],
    [cx + rx * Math.cos(Math.PI / 6 * 8), cy + ry * Math.sin(Math.PI / 6 * 8)],
    [cx + rx * Math.cos(Math.PI / 6 * 10), cy + ry * Math.sin(Math.PI / 6 * 10)],
  ];
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ") + " Z";
}

// ── Hex tile colors ───────────────────────────────────────────────────────────

function getHexColors(feedback: Feedback | null, filled: boolean, isCursor: boolean) {
  if (feedback === "correct") return {
    fill: "color-mix(in srgb, var(--fern-dark, #3B6D11) 30%, var(--bg-2))",
    stroke: "var(--fern, #588157)",
    strokeWidth: 1.5,
    color: "var(--beige, #EAF0CE)",
  };
  if (feedback === "present") return {
    fill: "color-mix(in srgb, var(--lavender, #E5D4ED) 12%, var(--bg-2))",
    stroke: "var(--lavender-grey, #8D99AE)",
    strokeWidth: 1.5,
    color: "var(--lavender, #E5D4ED)",
  };
  if (feedback === "absent") return {
    fill: "var(--bg-2)",
    stroke: "var(--border)",
    strokeWidth: 1,
    color: "var(--text-muted)",
    opacity: 0.45,
  };
  if (isCursor) return {
    fill: "var(--bg-2)",
    stroke: "var(--lavender-grey, #8D99AE)",
    strokeWidth: 1.5,
    color: "var(--text-primary)",
  };
  if (filled) return {
    fill: "var(--bg-2)",
    stroke: "var(--border-hover)",
    strokeWidth: 1.5,
    color: "var(--text-primary)",
  };
  return {
    fill: "var(--bg-2)",
    stroke: "var(--border)",
    strokeWidth: 1,
    color: "var(--text-muted)",
  };
}

// ── Hex tile component ────────────────────────────────────────────────────────

function HexTile({
  letter,
  feedback,
  filled,
  isCursor,
  isHintPos,
  hintLetter,
  bouncing,
  shaking,
  colIndex,
  size,
}: {
  letter: string;
  feedback: Feedback | null;
  filled: boolean;
  isCursor: boolean;
  isHintPos: boolean;
  hintLetter: string | null;
  bouncing: boolean;
  shaking: boolean;
  colIndex: number;
  size: number;
}) {
  const w = size;
  const h = size * 1.1;
  const hexPath = getHexPath(w, h);
  const colors = getHexColors(feedback, filled, isCursor);
  const fontSize = size >= 46 ? 17 : size >= 40 ? 15 : 13;

  let animName: string | undefined;
  let animDuration: string | undefined;
  let animDelay: string | undefined;
  let animFill = "both";

  if (bouncing) {
    animName = "tileBounce";
    animDuration = "600ms";
    animDelay = `${colIndex * 60}ms`;
  } else if (feedback) {
    animName = "tileReveal";
    animDuration = "480ms";
    animDelay = `${colIndex * 70}ms`;
  } else if (filled) {
    animName = "tilePop";
    animDuration = "100ms";
    animDelay = undefined;
  } else if (isCursor) {
    animName = "hexCursorPulse";
    animDuration = "2s";
    animDelay = undefined;
    animFill = "both";
  }

  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        animationName: shaking ? "tileShake" : animName,
        animationDuration: shaking ? "400ms" : animDuration,
        animationTimingFunction: shaking
          ? "var(--ease-out-strong, cubic-bezier(0.23,1,0.32,1))"
          : feedback
          ? "var(--ease-in-out-strong, cubic-bezier(0.77,0,0.175,1))"
          : "var(--ease-out-strong, cubic-bezier(0.23,1,0.32,1))",
        animationDelay: shaking ? undefined : animDelay,
        animationFillMode: animFill,
        animationIterationCount: isCursor && !feedback ? "infinite" : undefined,
      }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: "block", overflow: "visible" }}
      >
        <path
          d={hexPath}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={colors.strokeWidth}
          style={{
            transition: "fill 300ms var(--ease), stroke 300ms var(--ease)",
            filter: feedback === "correct"
              ? "drop-shadow(0 0 6px color-mix(in srgb, var(--fern, #588157) 40%, transparent))"
              : isCursor
              ? "drop-shadow(0 0 4px color-mix(in srgb, var(--lavender-grey, #8D99AE) 30%, transparent))"
              : "none",
          }}
        />
        {/* Hint outline ring */}
        {isHintPos && (
          <path
            d={getHexPath(w - 3, h - 3)}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1}
            strokeDasharray="3 2"
            transform={`translate(1.5, 1.5)`}
            style={{ opacity: 0.7 }}
          />
        )}
      </svg>

      {/* Letter */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontWeight: 500,
          fontSize,
          textTransform: "uppercase",
          color: colors.color,
          userSelect: "none",
          transition: "color 300ms var(--ease)",
          opacity: (colors as { opacity?: number }).opacity ?? 1,
          paddingBottom: 1,
        }}
      >
        {letter || (isHintPos ? hintLetter : "")}
      </div>

      {/* Hint label */}
      {isHintPos && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-mono)",
            fontSize: 6,
            color: "var(--accent)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            pointerEvents: "none",
          }}
        >
          hint
        </div>
      )}
    </div>
  );
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

  // Hex tile sizing — slightly smaller to accommodate the hex shape's visual weight
  const hexSize = wordLength >= 7 ? 42 : wordLength >= 6 ? 46 : 50;
  // Horizontal overlap for hex grid — flat-top hexagons sit side by side with slight gap
  const hexColGap = 4;
  const hexRowGap = 3;

  return (
    <>
      <style>{`
        @keyframes hexCursorPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
        @keyframes tileReveal {
          0%   { transform: scaleY(1); }
          45%  { transform: scaleY(0.05); }
          55%  { transform: scaleY(0.05); }
          100% { transform: scaleY(1); }
        }
        @keyframes tilePop {
          0%   { transform: scale(1); }
          55%  { transform: scale(1.12); }
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

        .rgs-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          overflow: hidden;
        }

        .rgs-hud-top {
          display: none;
          gap: 8px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
          align-items: center;
          flex-wrap: wrap;
        }

        .rgs-body {
          display: grid;
          grid-template-columns: 1fr 260px;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .rgs-board {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 16px 12px;
          border-right: 1px solid var(--border);
          overflow: hidden;
          position: relative;
        }

        .rgs-keyboard {
          width: 100%;
          max-width: 340px;
          margin-top: 16px;
        }

        .rgs-sidebar {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        @media (max-width: 640px) {
          .rgs-hud-top { display: flex; }
          .rgs-body { grid-template-columns: 1fr; }
          .rgs-sidebar { display: none; }
          .rgs-board {
            border-right: none;
            padding: 10px 12px 8px;
          }
          .rgs-keyboard {
            max-width: 100%;
            margin-top: 10px;
          }
        }

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

        /* Hex grid row shake — applied at row level */
        .hex-row-shake {
          animation: tileShake 400ms var(--ease-out-strong, cubic-bezier(0.23,1,0.32,1)) both;
        }
      `}</style>

      <div className="rgs-root">

        {/* ── Mobile top HUD ── */}
        <div className="rgs-hud-top">
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

            {/* Hex tile grid */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: hexRowGap,
              marginTop: 8,
              alignItems: "center",
            }}>
              {Array.from({ length: guessesAllowed }).map((_, row) => (
                <div
                  key={row}
                  className={shakeRow === row ? "hex-row-shake" : undefined}
                  style={{
                    display: "flex",
                    gap: hexColGap,
                    alignItems: "center",
                  }}
                >
                  {Array.from({ length: wordLength }).map((_, col) => {
                    const letter   = grid[row]?.[col] ?? "";
                    const feedback = revealed[row]?.[col] ?? null;
                    const isCursor = row === currentRow && col === currentCol && !feedback;
                    const filled   = !!letter && !feedback;
                    const isHintPos = feedback === null && hintPosition === col && row === currentRow;

                    return (
                      <HexTile
                        key={col}
                        letter={letter}
                        feedback={feedback}
                        filled={filled}
                        isCursor={isCursor}
                        isHintPos={isHintPos}
                        hintLetter={hintLetter}
                        bouncing={bounceRow === row}
                        shaking={false} // shake handled at row level
                        colIndex={col}
                        size={hexSize}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Keyboard */}
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

          {/* Desktop sidebar — unchanged */}
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
