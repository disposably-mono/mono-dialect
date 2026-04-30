// src/app/api/run/end/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { auth } from "@/lib/auth";
import db from "@/lib/db";

interface EndBody {
  token: string;
  // Client also sends these for the end screen — server validates against token
  totalScore: number;
  roundsWon: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: EndBody = await req.json();
    const { token, totalScore, roundsWon } = body;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // Verify token to get authoritative values (never trust client-sent score alone)
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    let payload: {
      totalScore: number;
      roundsWon: number;
      difficulty: string;
      subMode: string;
      timeLimit: number | null;
      lives: number | null;
      guessesPerLife: number | null;
      subModeMultiplier: number;
    };

    try {
      const { payload: raw } = await jwtVerify(token, secret);
      payload = raw as typeof payload;
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Sanity check — client values should match token (they should, since client
    // tracks these from our own API responses, but we use the token values)
    const finalScore = payload.totalScore;
    const finalRounds = payload.roundsWon;

    // Attempt to persist if the user is authenticated
    const session = await auth();
    let isHighScore = false;
    let previousHighScore = 0;

    if (session?.user?.id) {
      const userId = session.user.id;

      // Fetch current rogue stats
      const current = await db.rogueStats.findUnique({ where: { userId } });
      previousHighScore = current?.highScore ?? 0;
      isHighScore = finalScore > previousHighScore;

      await db.$transaction([
        // Save the run record
        db.run.create({
          data: {
            userId,
            difficulty: payload.difficulty,
            subMode: payload.subMode,
            config: {
              timeLimit: payload.timeLimit,
              lives: payload.lives,
              guessesPerLife: payload.guessesPerLife,
              subModeMultiplier: payload.subModeMultiplier,
            },
            totalScore: finalScore,
            roundsWon: finalRounds,
          },
        }),
        // Update aggregate rogue stats
        db.rogueStats.update({
          where: { userId },
          data: {
            highScore: isHighScore ? finalScore : previousHighScore,
            totalRuns: { increment: 1 },
            totalRounds: { increment: finalRounds },
            totalScore: { increment: finalScore },
          },
        }),
      ]);
    }

    return NextResponse.json({
      saved: !!session?.user?.id,
      finalScore,
      finalRounds,
      isHighScore,
      previousHighScore,
    });
  } catch (err) {
    console.error("[run/end]", err);
    return NextResponse.json({ error: "Failed to end run" }, { status: 500 });
  }
}
