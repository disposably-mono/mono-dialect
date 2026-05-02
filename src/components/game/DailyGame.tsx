"use client";

import { useRouter } from "next/navigation";
import { useGameState } from "./useGameState";
import { Board } from "./Board";
import { Keyboard } from "./Keyboard";
import type { DailyStatsData } from "./types";
import type { BoardStateData } from "@/app/page";

interface DailyGameProps {
  initialStats: DailyStatsData | null;
  username?: string | null;
  userId?: string;           // ── NEW
  hasPlayedToday: boolean;
  today: string;
  boardState: BoardStateData | null; // ── NEW
}

export function DailyGame({
  initialStats,
  username,
  userId,
  hasPlayedToday,
  today,
  boardState,
}: DailyGameProps) {
  const router = useRouter();

  function onGameEnd() {
    router.refresh();
  }

  const game = useGameState({ hasPlayedToday, today, onGameEnd, userId, boardState });

  // ── rest of the component is completely unchanged ──
  const isGameOver = game.status === "won" || game.status === "lost";

  const winRate =
    initialStats && initialStats.gamesPlayed > 0
      ? Math.round((initialStats.gamesWon / initialStats.gamesPlayed) * 100)
      : 0;

  const guessDist = initialStats?.guessDist ?? { "1":0,"2":0,"3":0,"4":0,"5":0,"6":0 };
  const maxDist = Math.max(...Object.values(guessDist), 1);

  const todayLabel = game.date
    ? new Date(game.date + "T12:00:00").toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : "Loading...";

  if (game.isLoading) {
    return (
      <div style={{ height: 548, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
          Loading today&apos;s word...
        </span>
      </div>
    );
  }

  if (game.error) {
    return (
      <div style={{ height: 548, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
          {game.error}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", opacity: 0.6 }}>
          Make sure the cron job has been run for today.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", height: 548 }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 20px 16px",
        borderRight: "0.5px solid var(--tile-border)",
        position: "relative",
        overflow: "hidden",
      }}>
        {game.toast && (
          <div style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--text-primary)",
            color: "var(--graphite)",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            padding: "7px 16px",
            borderRadius: 20,
            whiteSpace: "nowrap",
            zIndex: 10,
            pointerEvents: "none",
          }}>
            {game.toast}
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            {todayLabel}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Daily Challenge · {game.wordLength} Letters
          </div>
        </div>

        {game.grid.length > 0 && (
          <Board
            grid={game.grid}
            revealed={game.revealed}
            currentRow={game.currentRow}
            currentCol={game.currentCol}
            status={game.status}
            shakingRow={game.shakingRow}
            revealingRow={game.revealingRow}
            bouncingRow={game.bouncingRow}
            popCell={game.popCell}
          />
        )}

        <Keyboard keyMap={game.keyMap} onKey={game.handleKey} disabled={isGameOver} />
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Streak
          </div>
          <div style={{ background: "var(--bg-2)", border: "0.5px solid var(--tile-border)", borderRadius: 8, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              {[
                { value: initialStats?.currentStreak ?? "—", label: "current", highlight: false },
                { value: initialStats?.longestStreak ?? "—", label: "longest", highlight: false },
                { value: initialStats?.gamesPlayed ?? "—", label: "played", highlight: false },
                { value: initialStats ? `${winRate}%` : "—", label: "win rate", highlight: true },
              ].map(({ value, label, highlight }) => (
                <div key={label} style={{ flex: 1, textAlign: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 500, color: highlight ? "var(--highlight)" : "var(--fern)", display: "block" }}>
                    {value}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginTop: 2 }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Guess distribution
          </div>
          <div style={{ background: "var(--bg-2)", border: "0.5px solid var(--tile-border)", borderRadius: 8, padding: 14 }}>
            {[1,2,3,4,5,6].map(n => {
              const count = guessDist[String(n)] ?? 0;
              const pct = Math.max(Math.round((count / maxDist) * 100), 8);
              const isCurrentGuess = game.status === "won" && game.currentRow === n;
              return (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: n < 6 ? 6 : 0 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", width: 10, textAlign: "right", flexShrink: 0 }}>
                    {n}
                  </span>
                  <div style={{ flex: 1, height: 16, background: "var(--bg-3)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: isCurrentGuess ? "var(--fern)" : "var(--fern-dark)",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: 6,
                      transition: "width 600ms var(--ease-out-strong)",
                    }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--beige)", fontWeight: 500 }}>
                        {count}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={game.handleShare}
            style={{
              width: "100%",
              background: isGameOver ? "var(--fern-dark)" : "var(--bg-2)",
              border: "none",
              borderRadius: 6,
              color: isGameOver ? "var(--beige)" : "var(--text-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              padding: "10px",
              cursor: isGameOver ? "pointer" : "default",
              letterSpacing: "0.01em",
              transition: "opacity 160ms",
            }}
          >
            Share result ↗
          </button>

          {!username && (
            <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
              Sign in to save your stats
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
