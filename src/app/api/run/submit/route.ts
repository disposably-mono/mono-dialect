// src/app/api/run/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { readFileSync } from "fs";
import { join } from "path";

type Feedback = "correct" | "present" | "absent";

interface RunPayload {
  word:              string;
  wordLength:        number;
  difficulty:        "easy" | "hard";
  subMode:           "timed" | "lives";
  timeLimit:         number | null;
  lives:             number | null;
  guessesPerLife:    number | null;
  guessesAllowed:    number;
  subModeMultiplier: number;
  roundsWon:         number;
  totalScore:        number;
  livesRemaining:    number | null;
  isBoss:            boolean;
  isChaos:           boolean;
  // Exclusion list — words already seen this run.
  // Cleared when entering chaos so the full pool is reusable.
  usedWords:         string[];
}

interface SubmitBody {
  token:        string;
  guess:        string;
  guessesTaken: number;
}

interface WordBank {
  easy: Record<string, string[]>;
  hard: Record<string, string[]>;
}

let wordBank: WordBank | null = null;
function getWordBank(): WordBank {
  if (!wordBank) {
    const raw = readFileSync(join(process.cwd(), "public", "words", "en.json"), "utf-8");
    wordBank  = JSON.parse(raw) as WordBank;
  }
  return wordBank;
}

// ── Evaluation ────────────────────────────────────────────────────────────────

function evaluateGuess(guess: string, word: string): Feedback[] {
  const result:  Feedback[] = Array(word.length).fill("absent");
  const wordArr  = word.split("");
  const guessArr = guess.split("");
  const used     = Array(word.length).fill(false);

  guessArr.forEach((l, i) => {
    if (l === wordArr[i]) { result[i] = "correct"; used[i] = true; }
  });
  guessArr.forEach((l, i) => {
    if (result[i] === "correct") return;
    const j = wordArr.findIndex((w, wi) => w === l && !used[wi]);
    if (j !== -1) { result[i] = "present"; used[j] = true; }
  });

  return result;
}

// ── Scoring ───────────────────────────────────────────────────────────────────
//
// roundScore = floor((base + lengthBonus) × diffMult × subModeMult × 1.12^roundsWon × bossMult)

function calcRoundScore(payload: RunPayload, guessesTaken: number): number {
  const { guessesAllowed, difficulty, subModeMultiplier, wordLength, roundsWon, isBoss, isChaos } = payload;
  const minLength   = difficulty === "easy" ? 3 : 5;
  const base        = 100 * (guessesAllowed - guessesTaken + 1);
  const lengthBonus = (wordLength - minLength) * 20;
  const diffMult    = difficulty === "hard" ? 1.75 : 1.0;
  const streakMult  = Math.pow(1.12, roundsWon);
  const bossMult    = (isBoss || isChaos) ? 1.5 : 1.0;

  return Math.round(
    (base + lengthBonus) * diffMult * subModeMultiplier * streakMult * bossMult
  );
}

// ── Progression ───────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRoundSpec(
  difficulty: "easy" | "hard",
  roundsWon: number
): { length: number; pool: "easy" | "hard"; isBoss: boolean; isChaos: boolean } {
  if (difficulty === "easy") {
    const stageSize    = 5;
    const minLen       = 3;
    const maxLen       = 10;
    const totalOrdered = (maxLen - minLen + 1) * stageSize;

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

// ── Word picking with exclusion list ─────────────────────────────────────────
//
// Filters out any word already in usedWords for this run.
// On chaos entry the caller passes an empty usedWords so the full pool
// is available again — runs can then continue indefinitely.

function pickWord(
  bank: WordBank,
  pool: "easy" | "hard",
  length: number,
  usedWords: string[]
): string {
  const usedSet    = new Set(usedWords);
  const candidates = (bank[pool]?.[String(length)] ?? []).filter((w) => !usedSet.has(w.toUpperCase()));

  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Exhausted this pool/length — try the other pool
  const fallbackPool = pool === "easy" ? "hard" : "easy";
  const fallback     = (bank[fallbackPool]?.[String(length)] ?? []).filter((w) => !usedSet.has(w.toUpperCase()));
  if (fallback.length > 0) {
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  // Absolute last resort: ignore exclusion (pool truly exhausted for this length)
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
    const body: SubmitBody = await req.json();
    const { token, guess, guessesTaken } = body;

    if (!token || !guess || !guessesTaken) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    let payload: RunPayload;
    try {
      const { payload: raw } = await jwtVerify(token, secret);
      payload = raw as unknown as RunPayload;
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Ensure usedWords always exists (backwards compat with tokens minted before this change)
    const usedWords: string[] = payload.usedWords ?? [];

    // ── Word bank validation ──────────────────────────────────────────────────────
    const bank = getWordBank();
    const allValid = new Set(
      [
        ...Object.values(bank.easy).flat(),
        ...Object.values(bank.hard).flat(),
      ].map((w) => w.toLowerCase())
    );

    const normalized = guess.toUpperCase();

    if (
      !allValid.has(guess.toLowerCase()) &&
      normalized !== payload.word
    ) {
      return NextResponse.json(
        { error: "Not a valid word", invalid: true },
        { status: 422 }
      );
    }

    if (normalized.length !== payload.wordLength) {
      return NextResponse.json({ error: "Wrong word length" }, { status: 400 });
    }

    const feedback    = evaluateGuess(normalized, payload.word);
    const won         = normalized === payload.word;
    const isLastGuess = guessesTaken >= payload.guessesAllowed;

    // ── WON ───────────────────────────────────────────────────────────────────
    if (won) {
      const roundScore   = calcRoundScore(payload, guessesTaken);
      const newRoundsWon = payload.roundsWon + 1;
      const newTotal     = payload.totalScore + roundScore;
      const bank         = getWordBank();
      const spec         = getRoundSpec(payload.difficulty, newRoundsWon);

      // Entering chaos for the first time — reset the exclusion list so the
      // full word pool is available again and the run can go on indefinitely.
      const wasInChaos   = payload.isChaos;
      const enteringChaos = spec.isChaos && !wasInChaos;
      const nextUsedWords = enteringChaos
        ? []           // reset: chaos mode starts fresh
        : usedWords;   // carry forward existing exclusion list

      const nextWord    = pickWord(bank, spec.pool, spec.length, nextUsedWords);
      const nextWordUpper = nextWord.toUpperCase();
      const nextGuesses = payload.subMode === "lives" ? (payload.guessesPerLife ?? 3) : 6;

      // Add the next word to the exclusion list for the token we're about to mint
      const updatedUsedWords = [...nextUsedWords, nextWordUpper];

      const nextToken = await signToken({
        word:              nextWordUpper,
        wordLength:        spec.length,
        difficulty:        payload.difficulty,
        subMode:           payload.subMode,
        timeLimit:         payload.timeLimit,
        lives:             payload.lives,
        guessesPerLife:    payload.guessesPerLife,
        guessesAllowed:    nextGuesses,
        subModeMultiplier: payload.subModeMultiplier,
        roundsWon:         newRoundsWon,
        totalScore:        newTotal,
        livesRemaining:    payload.livesRemaining,
        isBoss:            spec.isBoss,
        isChaos:           spec.isChaos,
        usedWords:         updatedUsedWords,
      });

      return NextResponse.json({
        feedback,
        won:                true,
        runOver:            false,
        roundScore,
        totalScore:         newTotal,
        roundsWon:          newRoundsWon,
        nextToken,
        nextWordLength:     spec.length,
        nextGuessesAllowed: nextGuesses,
        nextIsBoss:         spec.isBoss,
        nextIsChaos:        spec.isChaos,
        word:               payload.word,
      });
    }

    // ── LOST ──────────────────────────────────────────────────────────────────
    if (isLastGuess) {
      if (payload.subMode === "lives") {
        const newLives = (payload.livesRemaining ?? 1) - 1;

        if (newLives <= 0) {
          return NextResponse.json({
            feedback, won: false, runOver: true,
            totalScore: payload.totalScore,
            roundsWon:  payload.roundsWon,
            word:       payload.word,
          });
        }

        // Life lost — same length, new word (still excluded from used list)
        const bank     = getWordBank();
        const nextWord = pickWord(bank, payload.difficulty, payload.wordLength, usedWords);
        const nextWordUpper = nextWord.toUpperCase();

        const nextToken = await signToken({
          ...payload,
          word:           nextWordUpper,
          livesRemaining: newLives,
          // Add the new word to the used list so it won't repeat either
          usedWords:      [...usedWords, nextWordUpper],
        });

        return NextResponse.json({
          feedback, won: false, runOver: false,
          lifeLost:           true,
          livesRemaining:     newLives,
          totalScore:         payload.totalScore,
          roundsWon:          payload.roundsWon,
          nextToken,
          nextWordLength:     payload.wordLength,
          nextGuessesAllowed: payload.guessesPerLife ?? 3,
          word:               payload.word,
        });
      }

      // Timed mode — no lives, run is over
      return NextResponse.json({
        feedback, won: false, runOver: true,
        totalScore: payload.totalScore,
        roundsWon:  payload.roundsWon,
        word:       payload.word,
      });
    }

    // ── STILL GUESSING ────────────────────────────────────────────────────────
    let hint: { position: number; letter: string } | null = null;
    if (payload.difficulty === "easy") {
      const guessesLeft = payload.guessesAllowed - guessesTaken;
      if (guessesLeft <= 2) {
        const unrevealed = feedback
          .map((f, i) => f !== "correct" ? i : -1)
          .filter((i) => i !== -1);
        if (unrevealed.length > 0) {
          const pos = unrevealed[0];
          hint = { position: pos, letter: payload.word[pos] };
        }
      }
    }

    return NextResponse.json({ feedback, won: false, runOver: false, hint });
  } catch (err) {
    console.error("[run/submit]", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
