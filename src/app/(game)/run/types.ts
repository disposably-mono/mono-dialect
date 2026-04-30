// src/app/(game)/run/types.ts

export type Difficulty = "easy" | "hard";
export type SubMode = "timed" | "lives";
export type TimeLimit = 30 | 45 | 60;
export type LivesCount = 1 | 2 | 3;
export type GuessesPerLife = 3 | 4 | 5;
export type Feedback = "correct" | "present" | "absent";

// ── Run configuration ─────────────────────────────────────────────────────────

export interface RunConfig {
  difficulty: Difficulty;
  subMode: SubMode;
  timeLimit?: TimeLimit;
  lives?: LivesCount;
  guessesPerLife?: GuessesPerLife;
}

// ── Multiplier tables ─────────────────────────────────────────────────────────

export const TIMED_MULTIPLIERS: Record<TimeLimit, number> = {
  30: 2.0,
  45: 1.6,
  60: 1.25,
};

export const LIVES_MULTIPLIERS: Record<string, number> = {
  "1-3": 2.5,
  "1-4": 2.0,
  "2-3": 1.8,
  "2-4": 1.5,
  "3-4": 1.25,
  "3-5": 1.1,
};

export const DIFF_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 1.0,
  hard: 1.75,
};

export function getSubModeMultiplier(config: RunConfig): number {
  if (config.subMode === "timed") {
    return TIMED_MULTIPLIERS[config.timeLimit ?? 30];
  }
  return LIVES_MULTIPLIERS[`${config.lives ?? 1}-${config.guessesPerLife ?? 3}`] ?? 2.5;
}

export function getCombinedMultiplier(config: RunConfig, streakRounds = 5): number {
  const diff = DIFF_MULTIPLIERS[config.difficulty];
  const mode = getSubModeMultiplier(config);
  const streak = Math.min(1 + streakRounds * 0.05, 2.0);
  return diff * mode * streak;
}

// ── Run phase ─────────────────────────────────────────────────────────────────

export type RunPhase = "config" | "playing" | "ended";

// ── Run state (persisted fields + transient UI fields) ────────────────────────

export interface RunState {
  phase: RunPhase;
  config: RunConfig;
  token: string | null;
  wordLength: number;
  guessesAllowed: number;

  // Current round board
  grid: string[][];
  revealed: (Feedback | null)[][];
  currentRow: number;
  currentCol: number;
  keyMap: Record<string, Feedback>;
  hint: { position: number; letter: string } | null;

  // Run progress
  roundsWon: number;
  totalScore: number;
  livesRemaining: number | null;

  // End state
  lastWord: string | null;
  finalScore: number;
  finalRounds: number;
  isHighScore: boolean;

  // Transient UI — stripped before localStorage write
  isSubmitting?: boolean;
  shakeRow?: number | null;
  revealingRow?: number | null;
  bounceRow?: number | null;
  toast?: string | null;
  roundJustWon?: boolean;
  lifeLost?: boolean;
  roundScore?: number | null;
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface StartResponse {
  token: string;
  wordLength: number;
  guessesAllowed: number;
  subModeMultiplier: number;
  difficulty: Difficulty;
  subMode: SubMode;
}

export interface SubmitResponse {
  feedback: Feedback[];
  won: boolean;
  runOver: boolean;
  // On win
  roundScore?: number;
  totalScore?: number;
  roundsWon?: number;
  nextToken?: string;
  nextWordLength?: number;
  nextGuessesAllowed?: number;
  word?: string;
  // On life lost
  lifeLost?: boolean;
  livesRemaining?: number;
  nextToken?: string;
  // On still guessing
  hint?: { position: number; letter: string } | null;
}

export interface EndResponse {
  saved: boolean;
  finalScore: number;
  finalRounds: number;
  isHighScore: boolean;
  previousHighScore: number;
}
