import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

type Feedback = "correct" | "present" | "absent";

function evaluateGuess(guess: string, word: string): Feedback[] {
  const result: Feedback[] = Array(word.length).fill("absent");
  const wordArr = word.split("");
  const guessArr = guess.split("");
  const used = Array(word.length).fill(false);

  guessArr.forEach((l, i) => {
    if (l === wordArr[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  });

  guessArr.forEach((l, i) => {
    if (result[i] === "correct") return;
    const j = wordArr.findIndex((w, wi) => w === l && !used[wi]);
    if (j !== -1) {
      result[i] = "present";
      used[j] = true;
    }
  });

  return result;
}

async function saveToDB(
  userId: string,
  {
    won,
    lost,
    guessNumber,
    date,
    word,
    boardState,
  }: {
    won: boolean;
    lost: boolean;
    guessNumber: number;
    date: string;
    word: string;
    boardState: object;
  }
) {
  const stats = await db.dailyStats.findUnique({ where: { userId } });
  if (!stats) return;

  // ── Always write boardState on every guess so cross-device rehydration
  //    reflects the latest state, not just the final state.
  const baseUpdate = {
    boardState,
    // ── Store the word on loss so it can be shown without a JWT
    ...(lost && { lastPlayedWord: word }),
  };

  // ── Only update streak/dist/played counters when the game ends
  if (won || lost) {
    // Guard: don't double-count if called again after game end
    if (stats.lastPlayedDate === date) {
      // Still update boardState even if stats already counted
      await db.dailyStats.update({ where: { userId }, data: baseUpdate });
      return;
    }

    const guessDist = stats.guessDist as Record<string, number>;
    if (won) {
      guessDist[String(guessNumber)] = (guessDist[String(guessNumber)] ?? 0) + 1;
    }

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const streakContinued = stats.lastPlayedDate === yesterdayStr;
    const newStreak = won ? (streakContinued ? stats.currentStreak + 1 : 1) : 0;

    await db.dailyStats.update({
      where: { userId },
      data: {
        ...baseUpdate,
        gamesPlayed: { increment: 1 },
        ...(won && { gamesWon: { increment: 1 } }),
        currentStreak: newStreak,
        longestStreak: { set: Math.max(stats.longestStreak, newStreak) },
        guessDist,
        lastPlayedDate: date,
      },
    });
  } else {
    // Mid-game — only persist board snapshot
    await db.dailyStats.update({ where: { userId }, data: baseUpdate });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guess, token, guessNumber, totalGuesses, grid, revealed } = body as {
      guess: string;
      token: string;
      guessNumber: number;
      totalGuesses: number;
      // ── NEW: client sends current full grid + revealed so we can persist it
      grid: string[][];
      revealed: (string | null)[][];
    };

    if (!guess || !token || !guessNumber || !totalGuesses) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let word: string;
    let date: string;
    try {
      const { payload } = await jwtVerify(token, secret);
      word = payload.word as string;
      date = payload.date as string;
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const guessUpper = guess.toUpperCase();

    if (guessUpper.length !== word.length) {
      return NextResponse.json({ error: "Incorrect guess length" }, { status: 400 });
    }

    const feedback = evaluateGuess(guessUpper, word);
    const won = guessUpper === word;
    const lost = !won && guessNumber >= totalGuesses;

    // ── NEW: build the post-guess revealed state to persist
    const newRevealed = revealed.map((r: (string | null)[]) => [...r]);
    feedback.forEach((fb, c) => { newRevealed[guessNumber - 1][c] = fb; });

    const boardState = {
      grid,
      revealed: newRevealed,
      currentRow: guessNumber, // after this guess, cursor moves to next row
      currentCol: 0,
      status: won ? "won" : lost ? "lost" : "playing",
      ...(lost && { word }),
    };

    // ── Save on every guess for authenticated users
    const session = await auth();
    if (session?.user?.id) {
      await saveToDB(session.user.id, {
        won,
        lost,
        guessNumber,
        date,
        word,
        boardState,
      });
    }

    return NextResponse.json({
      feedback,
      won,
      lost,
      ...(lost && { word }),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
