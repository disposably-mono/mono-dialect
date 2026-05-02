"use client";
// src/app/(game)/run/RunEndScreen.tsx

import Link from "next/link";
import { RunState, DIFF_MULTIPLIERS, getSubModeMultiplier } from "./types";

interface Props {
  state: RunState;
  username: string | null;
  previousHighScore: number;
  totalRuns: number;
  totalRounds: number;
  onPlayAgain: () => void;
}

export default function RunEndScreen({
  state,
  username,
  previousHighScore,
  totalRuns,
  totalRounds,
  onPlayAgain,
}: Props) {
  const { finalScore, finalRounds, isHighScore, lastWord, config } = state;

  const diffMult = DIFF_MULTIPLIERS[config.difficulty];
  const modeMult = getSubModeMultiplier(config);
  const combinedMult = (diffMult * modeMult).toFixed(2);
  const newHighScore = isHighScore ? finalScore : previousHighScore;

  function buildShareText() {
    const lines = [
      `mono—dialect · Roguelike`,
      `${config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1)} · ${
        config.subMode === "timed"
          ? `${config.timeLimit}s timer`
          : `${config.lives} ${config.lives === 1 ? "life" : "lives"}`
      }`,
      ``,
      `${finalRounds} rounds won`,
      `${finalScore.toLocaleString()} pts${isHighScore ? " 🏆 New high score!" : ""}`,
      ``,
      `dialect.mono.dev`,
    ];
    return lines.join("\n");
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(buildShareText());
    } catch {
      // silent fallback
    }
  }

  const configLabel =
    config.subMode === "timed"
      ? `Timed · ${config.timeLimit}s`
      : `Lives · ${config.lives}L ${config.guessesPerLife}G`;

  const diffLabel =
    config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1);

  return (
    <>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .res-root {
          display: grid;
          grid-template-columns: 1fr 280px;
          height: 100%;
          min-height: 0;
          overflow: hidden;
        }

        .res-main {
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          border-right: 1px solid var(--border);
          overflow-y: auto;
        }

        .res-sidebar {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
        }

        .res-stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .res-ctas {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }

        /* Mobile overrides */
        @media (max-width: 640px) {
          .res-root {
            grid-template-columns: 1fr;
            height: auto;
            min-height: 100%;
            overflow-y: auto;
          }

          .res-main {
            padding: 20px 16px;
            border-right: none;
            border-bottom: 0.5px solid var(--border);
            overflow-y: visible;
            gap: 18px;
          }

          .res-sidebar {
            padding: 16px;
            overflow-y: visible;
          }

          .res-ctas {
            margin-top: 0;
            flex-direction: column;
          }
        }

        @media (max-width: 380px) {
          .res-stat-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="res-root">
        {/* ── Left / top: main result ── */}
        <div className="res-main">
          {/* Header */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <h1 style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(20px, 5vw, 26px)",
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}>
                Run complete
              </h1>
              {isHighScore && (
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--highlight, #C8A84B)",
                  border: "0.5px solid var(--highlight, #C8A84B)",
                  borderRadius: 4,
                  padding: "2px 7px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  animation: "fadeInDown 400ms var(--ease) forwards",
                  whiteSpace: "nowrap",
                }}>
                  New high score
                </span>
              )}
            </div>
            {lastWord && (
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                The word was{" "}
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", letterSpacing: "0.06em" }}>
                  {lastWord.toUpperCase()}
                </span>
              </p>
            )}
          </div>

          {/* Score hero */}
          <div style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg, 20px)",
            padding: "24px",
            textAlign: "center",
          }}>
            <p style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              margin: "0 0 8px",
            }}>
              Final score
            </p>
            <p style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(36px, 10vw, 52px)",
              fontWeight: 500,
              color: isHighScore ? "var(--highlight, #C8A84B)" : "var(--text-primary)",
              margin: 0,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              transition: "color 400ms var(--ease)",
            }}>
              {finalScore.toLocaleString()}
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0" }}>
              {finalRounds} {finalRounds === 1 ? "round" : "rounds"} won
            </p>
          </div>

          {/* Score breakdown */}
          <div>
            <p style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              margin: "0 0 10px",
            }}>
              Run configuration
            </p>
            <div style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md, 12px)",
              overflow: "hidden",
            }}>
              {[
                { label: "Difficulty", value: diffLabel, mult: `${diffMult.toFixed(2)}×` },
                { label: "Sub-mode", value: configLabel, mult: `${modeMult.toFixed(2)}×` },
                { label: "Combined multiplier", value: "", mult: `${combinedMult}×`, highlight: true },
              ].map((row, i, arr) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                    background: row.highlight
                      ? "color-mix(in srgb, var(--accent) 5%, var(--bg-2))"
                      : "transparent",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                      {row.label}
                    </span>
                    {row.value && (
                      <span style={{
                        fontSize: 12,
                        color: "var(--text-sec, var(--text-muted))",
                        fontFamily: "var(--font-sans)",
                        marginLeft: 8,
                      }}>
                        {row.value}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: row.highlight ? 16 : 13,
                    fontWeight: 500,
                    color: row.highlight ? "var(--accent)" : "var(--text-muted)",
                    flexShrink: 0,
                  }}>
                    {row.mult}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="res-ctas">
            <button
              onClick={onPlayAgain}
              style={{
                flex: 1,
                background: "var(--accent)",
                border: "none",
                borderRadius: "var(--radius-md, 12px)",
                color: "#fff",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 600,
                padding: 14,
                cursor: "pointer",
                transition: "opacity 160ms var(--ease), transform 120ms var(--ease)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              Play again
            </button>
            <button
              onClick={handleShare}
              style={{
                flex: 1,
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md, 12px)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 500,
                padding: 14,
                cursor: "pointer",
                transition: "border-color 160ms var(--ease), transform 120ms var(--ease)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              Share result ↗
            </button>
          </div>
        </div>

        {/* ── Right / bottom: stats sidebar ── */}
        <div className="res-sidebar">
          <h2 style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            color: "var(--text-primary)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}>
            Your stats
          </h2>

          <div className="res-stat-grid">
            {[
              { label: "High score", value: newHighScore.toLocaleString(), highlight: isHighScore },
              { label: "This run", value: finalScore.toLocaleString(), highlight: false },
              { label: "Total runs", value: String(totalRuns + 1), highlight: false },
              { label: "Total rounds", value: String(totalRounds + finalRounds), highlight: false },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "var(--bg-2)",
                  border: `1px solid ${s.highlight ? "var(--highlight, #C8A84B)" : "var(--border)"}`,
                  borderRadius: "var(--radius-md, 12px)",
                  padding: 16,
                  textAlign: "center",
                }}
              >
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 20,
                  fontWeight: 500,
                  color: s.highlight ? "var(--highlight, #C8A84B)" : "var(--text-primary)",
                  display: "block",
                }}>
                  {s.value}
                </span>
                <span style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-sans)",
                  display: "block",
                  marginTop: 3,
                }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: "var(--border)" }} />

          {/* Sign-in prompt for anonymous — fixed: <Link> not <link> */}
          {!username && (
            <div style={{
              background: "color-mix(in srgb, var(--accent) 6%, var(--bg-2))",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md, 12px)",
              padding: 14,
            }}>
              <p style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--text-muted)",
                margin: "0 0 10px",
                lineHeight: 1.5,
              }}>
                Sign in to save your score to the leaderboard and track your progress.
              </p>
              <Link
                href="/api/auth/signin"
                style={{
                  display: "block",
                  textAlign: "center",
                  background: "var(--accent)",
                  color: "#fff",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: 8,
                  borderRadius: "var(--radius-sm, 6px)",
                  textDecoration: "none",
                }}
              >
                Sign in with Google
              </Link>
            </div>
          )}

          {username && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", margin: 0 }}>
              ✓ Score saved to your profile
            </p>
          )}

          <div style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md, 12px)",
            padding: "12px 14px",
            marginTop: "auto",
          }}>
            <p style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: "0 0 6px",
            }}>
              This run
            </p>
            <p style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-sec, var(--text-muted))",
              margin: 0,
              lineHeight: 1.6,
            }}>
              {diffLabel} · {configLabel}
              <br />
              {combinedMult}× base multiplier
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
