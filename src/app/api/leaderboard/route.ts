// src/app/api/leaderboard/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 60; // ISR — revalidate every 60s

export async function GET() {
  try {
    const users = await db.user.findMany({
      where: {
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
      take: 100,
    });

    const entries = users
      .filter((u) => u.rogueStats && u.rogueStats.highScore > 0)
      .map((u, i) => ({
        rank: i + 1,
        userId: u.id,
        username: u.username!,
        image: u.image,
        highScore: u.rogueStats!.highScore,
        totalRuns: u.rogueStats!.totalRuns,
        totalRounds: u.rogueStats!.totalRounds,
        totalScore: u.rogueStats!.totalScore,
      }));

    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[leaderboard] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
