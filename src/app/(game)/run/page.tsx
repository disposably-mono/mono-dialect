// src/app/(game)/run/page.tsx
import { auth } from "@/lib/auth";
import db from "@/lib/db";
import NavWrapper from "@/components/nav/NavWrapper";
import RunShell from "./RunShell";

export default async function RunPage() {
  const session  = await auth();
  const userId   = session?.user?.id ?? null;
  const username =
    (session?.user as { username?: string } | undefined)?.username ??
    session?.user?.name ??
    null;

  let highScore   = 0;
  let totalRuns   = 0;
  let totalRounds = 0;

  if (userId) {
    const rogueStats = await db.rogueStats.findUnique({ where: { userId } });
    highScore   = rogueStats?.highScore   ?? 0;
    totalRuns   = rogueStats?.totalRuns   ?? 0;
    totalRounds = rogueStats?.totalRounds ?? 0;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      {/* ── Shared nav ── */}
      <NavWrapper />

      <RunShell
        userId={userId}
        username={username}
        previousHighScore={highScore}
        totalRuns={totalRuns}
        totalRounds={totalRounds}
      />
    </div>
  );
}
