import { auth, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { DailyGame } from "@/components/game/DailyGame";
import { AuthControls } from "@/components/nav/AuthControls";
import type { DailyStatsData } from "@/components/game/types";

// ── NEW: shape of the board snapshot coming from the DB
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
  const user = session?.user as { id?: string; username?: string; name?: string } | undefined;

  const today = new Date().toISOString().slice(0, 10);

  let stats: DailyStatsData | null = null;
  let hasPlayedToday = false;
  let boardState: BoardStateData | null = null; // ── NEW

  if (user?.id) {
    const row = await db.dailyStats.findUnique({ where: { userId: user.id } });
    if (row) {
      stats = {
        currentStreak: row.currentStreak,
        longestStreak:  row.longestStreak,
        gamesPlayed:    row.gamesPlayed,
        gamesWon:       row.gamesWon,
        guessDist:      row.guessDist as Record<string, number>,
      };
      hasPlayedToday = row.lastPlayedDate === today;
      // ── NEW: pass board snapshot down if it exists for today
      if (row.boardState && row.lastPlayedDate === today) {
        boardState = row.boardState as BoardStateData;
      }
    }
  }

  return (
    <div style={{ background: "var(--bg)", color: "var(--text-primary)", minHeight: "100vh" }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: 52,
        borderBottom: "0.5px solid var(--tile-border)",
        background: "var(--bg)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <span style={{
          fontFamily: "var(--font-serif)",
          fontSize: 17,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}>
          mono<span style={{ color: "var(--fern)" }}>—</span>dialect
        </span>

        <div style={{
          display: "flex",
          gap: 2,
          background: "var(--bg-2)",
          padding: 3,
          borderRadius: 8,
        }}>
          {["Daily", "Roguelike", "Leaderboard", "Profile"].map((tab, i) => (
            <span
              key={tab}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                color: i === 0 ? "var(--text-primary)" : "var(--text-muted)",
                padding: "5px 12px",
                borderRadius: 5,
                background: i === 0 ? "var(--bg-3)" : "none",
                cursor: i === 0 ? "default" : "not-allowed",
                opacity: i === 0 ? 1 : 0.4,
                userSelect: "none",
              }}
            >
              {tab}
            </span>
          ))}
        </div>

        {/* ── CHANGED: server signout form replaced with AuthControls client
                component so it can clear localStorage before signing out ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <AuthControls
              username={user.username ?? user.name}
              userId={user.id}
            />
          ) : (
            <form action={async () => { "use server"; await signIn("google"); }}>
              <button type="submit" style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--graphite)",
                background: "var(--beige)",
                padding: "5px 14px",
                borderRadius: 6,
                cursor: "pointer",
                border: "none",
                fontFamily: "var(--font-sans)",
              }}>
                Sign in
              </button>
            </form>
          )}
        </div>
      </nav>

      {/* ── GAME ─────────────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: "var(--max-w)",
        margin: "0 auto",
        border: "0.5px solid var(--tile-border)",
        borderTop: "none",
      }}>
        <DailyGame
          initialStats={stats}
          username={user?.username}
          userId={user?.id}         // ── NEW: for account-scoped localStorage key
          hasPlayedToday={hasPlayedToday}
          today={today}
          boardState={boardState}   // ── NEW: DB snapshot for cross-device rehydration
        />
      </div>
    </div>
  );
}
