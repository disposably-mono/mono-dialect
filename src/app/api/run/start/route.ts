// src/app/api/run/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { readFileSync } from "fs";
import { join } from "path";

interface WordBank {
  easy: Record<string, string[]>;
  hard: Record<string, string[]>;
}

interface StartBody {
  difficulty: "easy" | "hard";
  subMode:    "timed" | "lives";
  timeLimit?:      30 | 45 | 60;
  lives?:          1  | 2  | 3;
  guessesPerLife?: 3  | 4  | 5;
}

let wordBank: WordBank | null = null;
function getWordBank(): WordBank {
  if (!wordBank) {
    const raw = readFileSync(join(process.cwd(), "public", "words", "en.json"), "utf-8");
    wordBank  = JSON.parse(raw) as WordBank;
  }
  return wordBank;
}

const TIMED_MULT:  Record<number, number> = { 30: 2.0, 45: 1.6, 60: 1.25 };
const LIVES_MULT:  Record<string, number> = {
  "1-3": 2.5, "1-4": 2.0,
  "2-3": 1.8, "2-4": 1.5,
  "3-4": 1.25, "3-5": 1.1,
};

function getSubModeMult(body: StartBody): number {
  if (body.subMode === "timed") return TIMED_MULT[body.timeLimit ?? 30] ?? 2.0;
  return LIVES_MULT[`${body.lives ?? 1}-${body.guessesPerLife ?? 3}`] ?? 2.5;
}

function getGuessesAllowed(body: StartBody): number {
  return body.subMode === "timed" ? 6 : (body.guessesPerLife ?? 3);
}

// ── Progression ───────────────────────────────────────────────────────────────

function getRoundSpec(
  difficulty: "easy" | "hard",
  roundsWon: number
): { length: number; pool: "easy" | "hard"; isBoss: boolean; isChaos: boolean } {

  if (difficulty === "easy") {
    const stageSize    = 5;
    const minLen       = 3;
    const maxLen       = 10;
    const totalOrdered = (maxLen - minLen + 1) * stageSize; // 40

    if (roundsWon >= totalOrdered) {
      return { length: rand(3, 10), pool: Math.random() < 0.5 ? "easy" : "hard", isBoss: false, isChaos: true };
    }

    const stage      = Math.floor(roundsWon / stageSize);
    const posInStage = roundsWon % stageSize;
    const length     = minLen + stage;
    const isBoss     = posInStage === 4;
    return { length, pool: isBoss ? "hard" : "easy", isBoss, isChaos: false };
  }

  const lengths = [5, 6, 7, 8, 9, 10];
  let cursor = 0;
  for (const len of lengths) {
    if (roundsWon < cursor + len) {
      return { length: len, pool: "hard", isBoss: false, isChaos: false };
    }
    cursor += len;
  }
  return { length: rand(5, 10), pool: "hard", isBoss: false, isChaos: true };
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Word picking with exclusion list ─────────────────────────────────────────
//
// usedWords is the set of words already seen this run, stored in the JWT.
// On chaos entry it is cleared so the full pool is available again — and
// stays clear for the rest of the infinite run.

function pickWord(
  bank: WordBank,
  pool: "easy" | "hard",
  length: number,
  usedWords: string[]
): string {
  const usedSet = new Set(usedWords);
  const candidates = (bank[pool]?.[String(length)] ?? []).filter((w) => !usedSet.has(w.toUpperCase()));

  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Exhausted this pool/length — try the other pool at the same length
  const fallbackPool = pool === "easy" ? "hard" : "easy";
  const fallback = (bank[fallbackPool]?.[String(length)] ?? []).filter((w) => !usedSet.has(w.toUpperCase()));
  if (fallback.length > 0) {
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  // Absolute last resort: ignore exclusion list (pool truly exhausted)
  const all = bank[pool]?.[String(length)] ?? bank[fallbackPool]?.[String(length)] ?? [];
  if (all.length === 0) throw new Error(`No words for pool=${pool} length=${length}`);
  return all[Math.floor(Math.random() * all.length)];
}

async function signToken(payload: object): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("6h")
    .sign(secret);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: StartBody = await req.json();

    if (!body.difficulty || !body.subMode) {
      return NextResponse.json({ error: "Missing difficulty or subMode" }, { status: 400 });
    }

    if (body.subMode === "timed" && !TIMED_MULT[body.timeLimit ?? -1]) {
      return NextResponse.json({ error: "Invalid timeLimit" }, { status: 400 });
    }

    const bank           = getWordBank();
    const spec           = getRoundSpec(body.difficulty, 0);
    // Start run with empty used list
    const usedWords: string[] = [];
    const word           = pickWord(bank, spec.pool, spec.length, usedWords);
    const wordUpper      = word.toUpperCase();
    const guessesAllowed = getGuessesAllowed(body);
    const subModeMult    = getSubModeMult(body);

    const token = await signToken({
      word:              wordUpper,
      wordLength:        spec.length,
      difficulty:        body.difficulty,
      subMode:           body.subMode,
      timeLimit:         body.timeLimit    ?? null,
      lives:             body.lives        ?? null,
      guessesPerLife:    body.guessesPerLife ?? null,
      guessesAllowed,
      subModeMultiplier: subModeMult,
      roundsWon:         0,
      totalScore:        0,
      livesRemaining:    body.subMode === "lives" ? (body.lives ?? 1) : null,
      isBoss:            spec.isBoss,
      isChaos:           spec.isChaos,
      usedWords:         [wordUpper], // seed list with first word
    });

    return NextResponse.json({
      token,
      wordLength:        spec.length,
      guessesAllowed,
      subModeMultiplier: subModeMult,
      difficulty:        body.difficulty,
      subMode:           body.subMode,
      isBoss:            spec.isBoss,
      isChaos:           spec.isChaos,
    });
  } catch (err) {
    console.error("[run/start]", err);
    return NextResponse.json({ error: "Failed to start run" }, { status: 500 });
  }
}
