// src/app/page.tsx
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DailyGame } from "@/components/game/DailyGame";
import NavWrapper from "@/components/nav/NavWrapper";
import type { DailyStatsData } from "@/components/game/types";

export type BoardStateData = {
  grid: string[][];
  revealed: (string | null)[][];
  currentRow: number;
  currentCol: number;
  status: string;
  word?: string;
};

export default async function Home() {
  const session = await auth();
  const user = session?.user as
    | { id?: string; username?: string; name?: string }
    | undefined;

  const today = new Date().toISOString().slice(0, 10);

  let stats: DailyStatsData | null = null;
  let hasPlayedToday = false;
  let boardState: BoardStateData | null = null;

  if (user?.id) {
    const row = await db.dailyStats.findUnique({ where: { userId: user.id } });
    if (row) {
      stats = {
        currentStreak: row.currentStreak,
        longestStreak: row.longestStreak,
        gamesPlayed:   row.gamesPlayed,
        gamesWon:      row.gamesWon,
        guessDist:     row.guessDist as Record<string, number>,
      };
      hasPlayedToday = row.lastPlayedDate === today;
      if (row.boardState && row.lastPlayedDate === today) {
        boardState = row.boardState as BoardStateData;
      }
    }
  }

  const username = user?.username ?? user?.name ?? null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "var(--bg)",
        color: "var(--text-primary)",
      }}
    >
      {/* ── Shared nav ── */}
      <NavWrapper />

      {/* ── Game column ── */}
      <div
        style={{
          flex: 1,
          maxWidth: "var(--max-w)",
          width: "100%",
          margin: "0 auto",
          borderLeft: "0.5px solid var(--tile-border)",
          borderRight: "0.5px solid var(--tile-border)",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DailyGame
          initialStats={stats}
          username={username}
          userId={user?.id}
          hasPlayedToday={hasPlayedToday}
          today={today}
          boardState={boardState}
        />
      </div>
    </div>
  );
}
