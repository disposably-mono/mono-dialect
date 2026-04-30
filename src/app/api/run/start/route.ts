// src/app/api/run/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { readFileSync } from "fs";
import { join } from "path";

// ── Types ────────────────────────────────────────────────────────────────────

interface WordBank {
  easy: Record<string, string[]>;
  hard: Record<string, string[]>;
}

interface StartBody {
  difficulty: "easy" | "hard";
  subMode: "timed" | "lives";
  // Timed params
  timeLimit?: 30 | 45 | 60;
  // Lives params
  lives?: 1 | 2 | 3;
  guessesPerLife?: 3 | 4 | 5;
}

// ── Word bank (loaded once per cold start) ────────────────────────────────────

let wordBank: WordBank | null = null;

function getWordBank(): WordBank {
  if (!wordBank) {
    const raw = readFileSync(
      join(process.cwd(), "public", "words", "en.json"),
      "utf-8"
    );
    wordBank = JSON.parse(raw) as WordBank;
  }
  return wordBank;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIMED_MULTIPLIERS: Record<number, number> = { 30: 2.0, 45: 1.6, 60: 1.25 };
const LIVES_MULTIPLIERS: Record<string, number> = {
  "1-3": 2.5, "1-4": 2.0,
  "2-3": 1.8, "2-4": 1.5,
  "3-4": 1.25, "3-5": 1.1,
};

function getSubModeMultiplier(body: StartBody): number {
  if (body.subMode === "timed") {
    return TIMED_MULTIPLIERS[body.timeLimit ?? 30] ?? 2.0;
  }
  const key = `${body.lives ?? 1}-${body.guessesPerLife ?? 3}`;
  return LIVES_MULTIPLIERS[key] ?? 2.5;
}

function getGuessesAllowed(body: StartBody): number {
  if (body.subMode === "timed") return 6;
  return body.guessesPerLife ?? 3;
}

function getStartingLength(difficulty: "easy" | "hard"): number {
  return difficulty === "easy" ? 3 : 5;
}

function pickWord(
  bank: WordBank,
  difficulty: "easy" | "hard",
  length: number
): string {
  const pool = bank[difficulty]?.[String(length)] ?? [];
  if (pool.length === 0) {
    throw new Error(`No words available for ${difficulty}/${length}`);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

async function signRunToken(payload: object): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("6h") // max practical run duration
    .sign(secret);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: StartBody = await req.json();

    // Validate required fields
    if (!body.difficulty || !body.subMode) {
      return NextResponse.json(
        { error: "Missing difficulty or subMode" },
        { status: 400 }
      );
    }

    if (body.subMode === "timed" && !TIMED_MULTIPLIERS[body.timeLimit ?? -1]) {
      return NextResponse.json({ error: "Invalid timeLimit" }, { status: 400 });
    }

    const bank = getWordBank();
    const startingLength = getStartingLength(body.difficulty);
    const word = pickWord(bank, body.difficulty, startingLength);
    const guessesAllowed = getGuessesAllowed(body);
    const subModeMultiplier = getSubModeMultiplier(body);

    // Config stored in token so /api/run/submit can re-derive everything
    const token = await signRunToken({
      word: word.toUpperCase(),
      wordLength: startingLength,
      difficulty: body.difficulty,
      subMode: body.subMode,
      timeLimit: body.timeLimit ?? null,
      lives: body.lives ?? null,
      guessesPerLife: body.guessesPerLife ?? null,
      guessesAllowed,
      subModeMultiplier,
      roundsWon: 0,
      totalScore: 0,
      livesRemaining: body.subMode === "lives" ? (body.lives ?? 1) : null,
    });

    return NextResponse.json({
      token,
      wordLength: startingLength,
      guessesAllowed,
      subModeMultiplier,
      difficulty: body.difficulty,
      subMode: body.subMode,
    });
  } catch (err) {
    console.error("[run/start]", err);
    return NextResponse.json(
      { error: "Failed to start run" },
      { status: 500 }
    );
  }
}
