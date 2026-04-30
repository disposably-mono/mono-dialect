// src/app/(game)/run/page.tsx
import { auth } from "@/lib/auth";
import db from "@/lib/db";
import RunShell from "./RunShell";

export default async function RunPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  let highScore = 0;
  let totalRuns = 0;
  let totalRounds = 0;

  if (userId) {
    const rogueStats = await db.rogueStats.findUnique({ where: { userId } });
    highScore = rogueStats?.highScore ?? 0;
    totalRuns = rogueStats?.totalRuns ?? 0;
    totalRounds = rogueStats?.totalRounds ?? 0;
  }

  return (
    <RunShell
      userId={userId}
      username={session?.user?.name ?? null}
      previousHighScore={highScore}
      totalRuns={totalRuns}
      totalRounds={totalRounds}
    />
  );
}
