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

  // Pass 1: correct positions
  guessArr.forEach((l, i) => {
    if (l === wordArr[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  });

  // Pass 2: present but wrong position
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

async function saveStats(
  userId: string,
  {
    won,
    guessNumber,
    date,
  }: { won: boolean; guessNumber: number; date: string }
) {
  const stats = await db.dailyStats.findUnique({ where: { userId } });
  if (!stats) return;

  // Guard: don't double-save for the same day
  if (stats.lastPlayedDate === date) return;

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
      gamesPlayed: { increment: 1 },
      ...(won && { gamesWon: { increment: 1 } }),
      currentStreak: newStreak,
      longestStreak: { set: Math.max(stats.longestStreak, newStreak) },
      guessDist,
      lastPlayedDate: date,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guess, token, guessNumber, totalGuesses } = body as {
      guess: string;
      token: string;
      guessNumber: number; // 1-indexed: which guess this is (e.g. 3 = third guess)
      totalGuesses: number; // max allowed (6 for daily)
    };

    if (!guess || !token || !guessNumber || !totalGuesses) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify token
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

    // Save stats for authenticated users when the game ends
    if (won || lost) {
      const session = await auth();
      if (session?.user?.id) {
        await saveStats(session.user.id, { won, guessNumber, date });
      }
    }

    return NextResponse.json({
      feedback,
      won,
      lost,
      // Reveal word only on loss so the player can see what they missed
      ...(lost && { word }),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
