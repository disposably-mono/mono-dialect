// src/app/api/leaderboard/friends/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type UserRow = {
  id: string;
  username: string | null;
  image: string | null;
  rogueStats: {
    highScore: number;
    totalRuns: number;
    totalRounds: number;
    totalScore: number;
  } | null;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const friendships = await db.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { userAId: true, userBId: true },
    });

    const friendIds = friendships.map((f: { userAId: string; userBId: string }) =>
      f.userAId === userId ? f.userBId : f.userAId
    );

    const allIds = [userId, ...friendIds];

    const users = await db.user.findMany({
      where: {
        id: { in: allIds },
        username: { not: null },
        rogueStats: { isNot: null },
      },
      select: {
        id: true,
        username: true,
        image: true,
        rogueStats: {
          select: {
            highScore: true,
            totalRuns: true,
            totalRounds: true,
            totalScore: true,
          },
        },
      },
      orderBy: {
        rogueStats: { highScore: "desc" },
      },
    });

    const entries = users.map((u: UserRow, i: number) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username!,
      image: u.image,
      isYou: u.id === userId,
      highScore: u.rogueStats?.highScore ?? 0,
      totalRuns: u.rogueStats?.totalRuns ?? 0,
      totalRounds: u.rogueStats?.totalRounds ?? 0,
      totalScore: u.rogueStats?.totalScore ?? 0,
    }));

    return NextResponse.json({ entries, friendCount: friendIds.length });
  } catch (err) {
    console.error("[leaderboard/friends] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch friends leaderboard" }, { status: 500 });
  }
}
