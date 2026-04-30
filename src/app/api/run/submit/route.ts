// src/app/api/run/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { readFileSync } from "fs";
import { join } from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

type Feedback = "correct" | "present" | "absent";

interface RunPayload {
  word: string;
  wordLength: number;
  difficulty: "easy" | "hard";
  subMode: "timed" | "lives";
  timeLimit: number | null;
  lives: number | null;
  guessesPerLife: number | null;
  guessesAllowed: number;
  subModeMultiplier: number;
  roundsWon: number;
  totalScore: number;
  livesRemaining: number | null;
}

interface SubmitBody {
  token: string;
  guess: string;
  guessesTaken: number; // how many guesses taken INCLUDING this one
}

// ── Word bank ─────────────────────────────────────────────────────────────────

interface WordBank {
  easy: Record<string, string[]>;
  hard: Record<string, string[]>;
}

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

function evaluateGuess(guess: string, word: string): Feedback[] {
  const result: Feedback[] = Array(word.length).fill("absent");
  const wordArr = word.split("");
  const guessArr = guess.split("");
  const used = Array(word.length).fill(false);

  // Pass 1: correct
  guessArr.forEach((l, i) => {
    if (l === wordArr[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  });

  // Pass 2: present
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

function calcRoundScore(
  payload: RunPayload,
  guessesTaken: number
): number {
  const { guessesAllowed, difficulty, subModeMultiplier, wordLength, roundsWon } = payload;
  const minLength = difficulty === "easy" ? 3 : 5;
  const baseScore = 100 * (guessesAllowed - guessesTaken + 1);
  const lengthBonus = (wordLength - minLength) * 15;
  const diffMultiplier = difficulty === "hard" ? 1.75 : 1.0;
  const streakMultiplier = Math.min(1 + roundsWon * 0.05, 2.0);
  return Math.round(
    (baseScore + lengthBonus) * diffMultiplier * subModeMultiplier * streakMultiplier
  );
}

function getNextWordLength(
  difficulty: "easy" | "hard",
  roundsWon: number
): number {
  if (difficulty === "easy") {
    // starts at 3, increases every 2 rounds, caps at 6
    return Math.min(3 + Math.floor(roundsWon / 2), 6);
  } else {
    // starts at 5, increases every 2 rounds, caps at 7
    return Math.min(5 + Math.floor(roundsWon / 2), 7);
  }
}

function pickWord(
  bank: WordBank,
  difficulty: "easy" | "hard",
  length: number
): string {
  const pool = bank[difficulty]?.[String(length)] ?? [];
  if (pool.length === 0) throw new Error(`No words for ${difficulty}/${length}`);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Hint: reveal one letter in its correct position (first unrevealed position)
function getHint(word: string, revealedPositions: number[]): number | null {
  for (let i = 0; i < word.length; i++) {
    if (!revealedPositions.includes(i)) return i;
  }
  return null;
}

async function signRunToken(payload: object): Promise<string> {
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
    const body: SubmitBody = await req.json();
    const { token, guess, guessesTaken } = body;

    if (!token || !guess || !guessesTaken) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Verify token
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    let payload: RunPayload;
    try {
      const { payload: raw } = await jwtVerify(token, secret);
      payload = raw as unknown as RunPayload;
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const normalizedGuess = guess.toUpperCase();
    if (normalizedGuess.length !== payload.wordLength) {
      return NextResponse.json({ error: "Wrong word length" }, { status: 400 });
    }

    const feedback = evaluateGuess(normalizedGuess, payload.word);
    const won = normalizedGuess === payload.word;
    const isLastGuess = guessesTaken >= payload.guessesAllowed;

    // ── ROUND WON ─────────────────────────────────────────────────────────────
    if (won) {
      const roundScore = calcRoundScore(payload, guessesTaken);
      const newRoundsWon = payload.roundsWon + 1;
      const newTotalScore = payload.totalScore + roundScore;
      const nextLength = getNextWordLength(payload.difficulty, newRoundsWon);
      const bank = getWordBank();
      const nextWord = pickWord(bank, payload.difficulty, nextLength).toUpperCase();
      const nextGuessesAllowed =
        payload.subMode === "lives" ? (payload.guessesPerLife ?? 3) : 6;

      const nextToken = await signRunToken({
        word: nextWord,
        wordLength: nextLength,
        difficulty: payload.difficulty,
        subMode: payload.subMode,
        timeLimit: payload.timeLimit,
        lives: payload.lives,
        guessesPerLife: payload.guessesPerLife,
        guessesAllowed: nextGuessesAllowed,
        subModeMultiplier: payload.subModeMultiplier,
        roundsWon: newRoundsWon,
        totalScore: newTotalScore,
        livesRemaining: payload.livesRemaining,
      });

      return NextResponse.json({
        feedback,
        won: true,
        runOver: false,
        roundScore,
        totalScore: newTotalScore,
        roundsWon: newRoundsWon,
        nextToken,
        nextWordLength: nextLength,
        nextGuessesAllowed,
        word: payload.word, // reveal on round end so board can show it briefly
      });
    }

    // ── ROUND LOST ────────────────────────────────────────────────────────────
    if (isLastGuess) {
      // Lives mode: deduct a life
      if (payload.subMode === "lives") {
        const newLives = (payload.livesRemaining ?? 1) - 1;

        if (newLives <= 0) {
          // Run over
          return NextResponse.json({
            feedback,
            won: false,
            runOver: true,
            totalScore: payload.totalScore,
            roundsWon: payload.roundsWon,
            word: payload.word,
          });
        }

        // Still have lives — start next round (same length, new word)
        const bank = getWordBank();
        const nextWord = pickWord(bank, payload.difficulty, payload.wordLength).toUpperCase();

        const nextToken = await signRunToken({
          ...payload,
          word: nextWord,
          livesRemaining: newLives,
        });

        return NextResponse.json({
          feedback,
          won: false,
          runOver: false,
          lifeLost: true,
          livesRemaining: newLives,
          totalScore: payload.totalScore,
          roundsWon: payload.roundsWon,
          nextToken,
          nextWordLength: payload.wordLength,
          nextGuessesAllowed: payload.guessesPerLife ?? 3,
          word: payload.word,
        });
      }

      // Timed mode with no guesses left (shouldn't normally happen since timer fires first, but handle it)
      return NextResponse.json({
        feedback,
        won: false,
        runOver: true,
        totalScore: payload.totalScore,
        roundsWon: payload.roundsWon,
        word: payload.word,
      });
    }

    // ── STILL GUESSING ────────────────────────────────────────────────────────
    // Easy mode hints
    let hint: { position: number; letter: string } | null = null;

    if (payload.difficulty === "easy") {
      const guessesLeft = payload.guessesAllowed - guessesTaken;
      // Hint at 2nd-to-last and last guess
      if (guessesLeft <= 2) {
        // Track which positions we've hinted via a simple approach:
        // hint the first position that hasn't been correct in this guess
        const unrevealed: number[] = [];
        feedback.forEach((f, i) => { if (f !== "correct") unrevealed.push(i); });
        if (unrevealed.length > 0) {
          const pos = unrevealed[0];
          hint = { position: pos, letter: payload.word[pos] };
        }
      }
    }

    // Update token with no changes to word/score (stateless, token unchanged is fine)
    return NextResponse.json({
      feedback,
      won: false,
      runOver: false,
      hint,
    });
  } catch (err) {
    console.error("[run/submit]", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
