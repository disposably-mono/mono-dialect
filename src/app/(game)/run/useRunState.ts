"use client";
// src/app/(game)/run/useRunState.ts

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  RunConfig,
  RunState,
  RunPhase,
  Feedback,
  StartResponse,
  SubmitResponse,
  EndResponse,
} from "./types";
import { useAudio } from "./useAudio";

// ── Storage key ───────────────────────────────────────────────────────────────

function storageKey(userId: string | null): string {
  return userId ? `mono-dialect-run-${userId}` : "mono-dialect-run";
}

// ── State helpers ─────────────────────────────────────────────────────────────

function emptyGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(""));
}

function emptyRevealed(rows: number, cols: number): (Feedback | null)[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

function makeInitialState(): RunState {
  return {
    phase: "config",
    config: { difficulty: "hard", subMode: "timed", timeLimit: 30 },
    token: null,
    wordLength: 5,
    guessesAllowed: 6,
    grid: emptyGrid(6, 5),
    revealed: emptyRevealed(6, 5),
    currentRow: 0,
    currentCol: 0,
    keyMap: {},
    hint: null,
    roundsWon: 0,
    totalScore: 0,
    livesRemaining: null,
    isBoss: false,
    isChaos: false,
    lastWord: null,
    finalScore: 0,
    finalRounds: 0,
    isHighScore: false,
    isSubmitting: false,
    shakeRow: null,
    revealingRow: null,
    bounceRow: null,
    toast: null,
    roundJustWon: false,
    lifeLost: false,
    roundScore: null,
  };
}

// ── Reducer ───────────────────────────────────────────────────────────────────

type Action =
  | { type: "LOAD"; state: RunState }
  | { type: "SET_PHASE"; phase: RunPhase }
  | { type: "START_RUN"; res: StartResponse; config: RunConfig }
  | { type: "ADD_LETTER"; letter: string }
  | { type: "DELETE_LETTER" }
  | { type: "SET_SUBMITTING"; value: boolean }
  | { type: "SHAKE_ROW" }
  | { type: "CLEAR_SHAKE" }
  | { type: "REVEAL_DONE"; feedback: Feedback[]; res: SubmitResponse }
  | { type: "NEXT_ROUND"; res: SubmitResponse }
  | { type: "LIFE_LOST_NEXT"; res: SubmitResponse }
  | { type: "END_RUN"; res: EndResponse; lastWord: string }
  | { type: "SET_TOAST"; msg: string | null }
  | { type: "CLEAR_BOUNCE" }
  | { type: "RESET" };

function newRoundGrid(wordLength: number, guessesAllowed: number) {
  return {
    grid: emptyGrid(guessesAllowed, wordLength),
    revealed: emptyRevealed(guessesAllowed, wordLength),
    currentRow: 0,
    currentCol: 0,
    keyMap: {} as Record<string, Feedback>,
    hint: null,
  };
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "LOAD":
      return {
        ...action.state,
        isSubmitting: false,
        shakeRow: null,
        revealingRow: null,
        bounceRow: null,
        toast: null,
      };

    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "START_RUN": {
      const { res, config } = action;
      const guesses = res.guessesAllowed;
      return {
        ...makeInitialState(),
        phase: "playing",
        config,
        token: res.token,
        wordLength: res.wordLength,
        guessesAllowed: guesses,
        livesRemaining: config.subMode === "lives" ? (config.lives ?? 1) : null,
        isBoss: res.isBoss,
        isChaos: res.isChaos,
        ...newRoundGrid(res.wordLength, guesses),
      };
    }

    case "ADD_LETTER": {
      if (state.currentCol >= state.wordLength) return state;
      const grid = state.grid.map((r) => [...r]);
      grid[state.currentRow][state.currentCol] = action.letter;
      return { ...state, grid, currentCol: state.currentCol + 1 };
    }

    case "DELETE_LETTER": {
      if (state.currentCol <= 0) return state;
      const grid = state.grid.map((r) => [...r]);
      grid[state.currentRow][state.currentCol - 1] = "";
      return { ...state, grid, currentCol: state.currentCol - 1 };
    }

    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.value };

    case "SHAKE_ROW":
      return { ...state, shakeRow: state.currentRow };

    case "CLEAR_SHAKE":
      return { ...state, shakeRow: null };

    case "REVEAL_DONE": {
      const { feedback, res } = action;
      const revealed = state.revealed.map((r) => [...r]) as (Feedback | null)[][];
      revealed[state.currentRow] = feedback;

      const keyMap = { ...state.keyMap };
      const priority: Record<Feedback, number> = { correct: 3, present: 2, absent: 1 };
      state.grid[state.currentRow].forEach((letter, i) => {
        const f = feedback[i];
        if (!keyMap[letter] || priority[f] > priority[keyMap[letter] as Feedback]) {
          keyMap[letter] = f;
        }
      });

      return {
        ...state,
        revealed,
        keyMap,
        hint: res.hint ?? null,
        currentRow: state.currentRow + 1,
        currentCol: 0,
        bounceRow: res.won ? state.currentRow : null,
        revealingRow: null,
        roundJustWon: res.won ?? false,
        lifeLost: res.lifeLost ?? false,
        roundScore: res.roundScore ?? null,
        totalScore: res.totalScore ?? state.totalScore,
        roundsWon: res.roundsWon ?? state.roundsWon,
        livesRemaining: res.livesRemaining ?? state.livesRemaining,
        isSubmitting: false,
      };
    }

    case "NEXT_ROUND": {
      const { res } = action;
      const guesses = res.nextGuessesAllowed ?? state.guessesAllowed;
      return {
        ...state,
        token: res.nextToken!,
        wordLength: res.nextWordLength!,
        guessesAllowed: guesses,
        isBoss: res.nextIsBoss ?? false,
        isChaos: res.nextIsChaos ?? false,
        ...newRoundGrid(res.nextWordLength!, guesses),
        bounceRow: null,
        roundJustWon: false,
        roundScore: null,
        lastWord: res.word ?? null,
      };
    }

    case "LIFE_LOST_NEXT": {
      const { res } = action;
      const guesses = res.nextGuessesAllowed ?? state.guessesAllowed;
      return {
        ...state,
        token: res.nextToken!,
        wordLength: res.nextWordLength ?? state.wordLength,
        guessesAllowed: guesses,
        ...newRoundGrid(res.nextWordLength ?? state.wordLength, guesses),
        lifeLost: false,
        lastWord: res.word ?? null,
      };
    }

    case "END_RUN":
      return {
        ...state,
        phase: "ended",
        finalScore: action.res.finalScore,
        finalRounds: action.res.finalRounds,
        isHighScore: action.res.isHighScore,
        lastWord: action.lastWord,
        bounceRow: null,
        roundJustWon: false,
        isSubmitting: false,
      };

    case "SET_TOAST":
      return { ...state, toast: action.msg };

    case "CLEAR_BOUNCE":
      return { ...state, bounceRow: null };

    case "RESET":
      return makeInitialState();

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseRunStateOptions {
  userId: string | null;
  previousHighScore: number;
}

export function useRunState({ userId, previousHighScore }: UseRunStateOptions) {
  const key = storageKey(userId);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tick, correct, wrong, roundWin, bossRound, runOver } = useAudio();

  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const [mounted, setMounted] = useState(false);

  // After mount: rehydrate from localStorage if a valid in-progress run exists
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as RunState;
        if (saved.phase === "playing" && saved.token) {
          dispatch({ type: "LOAD", state: saved });
        }
      }
    } catch {
      // corrupt or missing — start fresh
    }
    queueMicrotask(() => setMounted(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage on state change (client-side only)
  useEffect(() => {
    if (!mounted) return;
    if (state.phase === "playing") {
      try {
        const {
          isSubmitting, shakeRow, revealingRow, bounceRow, toast,
          roundJustWon, lifeLost, roundScore,
          ...toSave
        } = state as RunState & Record<string, unknown>;
        localStorage.setItem(key, JSON.stringify(toSave));
      } catch { /* storage full */ }
    } else {
      localStorage.removeItem(key);
    }
  }, [state, key, mounted]);

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, duration = 1800) => {
    dispatch({ type: "SET_TOAST", msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => dispatch({ type: "SET_TOAST", msg: null }),
      duration
    );
  }, []);

  // ── Start run ─────────────────────────────────────────────────────────────

  const startRun = useCallback(async (config: RunConfig) => {
    try {
      const res = await fetch("/api/run/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to start");
      const data: StartResponse = await res.json();
      dispatch({ type: "START_RUN", res: data, config });

      // Play boss sting immediately if the very first round is a boss word
      if (data.isBoss || data.isChaos) {
        bossRound();
      }
    } catch {
      showToast("Couldn't start run. Try again.");
    }
  }, [showToast, bossRound]);

  // ── Input ─────────────────────────────────────────────────────────────────

  const addLetter = useCallback((letter: string) => {
    if (state.phase !== "playing" || state.isSubmitting) return;
    dispatch({ type: "ADD_LETTER", letter });
  }, [state.phase, state.isSubmitting]);

  const deleteLetter = useCallback(() => {
    if (state.phase !== "playing" || state.isSubmitting) return;
    dispatch({ type: "DELETE_LETTER" });
  }, [state.phase, state.isSubmitting]);

  // ── Submit guess ──────────────────────────────────────────────────────────

  const submitGuess = useCallback(async () => {
    if (state.phase !== "playing" || state.isSubmitting) return;
    if (state.currentCol < state.wordLength) {
      dispatch({ type: "SHAKE_ROW" });
      wrong(); // ← wrong guess / incomplete word
      showToast("Not enough letters");
      setTimeout(() => dispatch({ type: "CLEAR_SHAKE" }), 500);
      return;
    }

    const guess = state.grid[state.currentRow].join("");
    const guessesTaken = state.currentRow + 1;
    dispatch({ type: "SET_SUBMITTING", value: true });

    try {
      const res = await fetch("/api/run/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: state.token, guess, guessesTaken }),
      });

      if (!res.ok) {
        dispatch({ type: "SET_SUBMITTING", value: false });
        const errData = await res.json().catch(() => ({}));
        if (errData.invalid) {
          dispatch({ type: "SHAKE_ROW" });
          wrong();
          showToast("Not in word list");
          setTimeout(() => dispatch({ type: "CLEAR_SHAKE" }), 500);
        } else {
          showToast("Something went wrong.");
        }
        return;
      }

      const data: SubmitResponse = await res.json();

      // Play correct/wrong sound immediately on submit before reveal animation
      if (data.won) {
        correct(); // ← two-tone chime on correct guess
      } else if (!data.runOver && !data.lifeLost) {
        // Still guessing — wrong letter(s) but run continues
        wrong(); // ← thud on wrong guess
      }

      const revealDelay = state.wordLength * 80 + 200;

      setTimeout(() => {
        dispatch({ type: "REVEAL_DONE", feedback: data.feedback, res: data });

        if (data.runOver) {
          runOver(); // ← descending minor on game over
          showToast(`The word was: ${data.word}`, 2400);

          setTimeout(async () => {
            try {
              const endRes = await fetch("/api/run/end", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token: state.token,
                  totalScore: data.totalScore ?? state.totalScore,
                  roundsWon: data.roundsWon ?? state.roundsWon,
                }),
              });
              const endData: EndResponse = await endRes.json();
              dispatch({ type: "END_RUN", res: endData, lastWord: data.word ?? "" });
            } catch {
              dispatch({
                type: "END_RUN",
                res: {
                  saved: false,
                  finalScore: state.totalScore,
                  finalRounds: state.roundsWon,
                  isHighScore: state.totalScore > previousHighScore,
                  previousHighScore,
                },
                lastWord: data.word ?? "",
              });
            }
          }, 2600);
          return;
        }

        if (data.won) {
          const msg = [
            "Brilliant!", "Magnificent!", "Impressive!",
            "Splendid!", "Great!", "Phew!",
          ][Math.min(guessesTaken - 1, 5)];

          const nextTag = data.nextIsChaos
            ? " ⚡ CHAOS"
            : data.nextIsBoss
            ? " ☠ BOSS"
            : "";

          showToast(
            `${msg} +${data.roundScore?.toLocaleString()} pts${nextTag}`,
            1600
          );

          setTimeout(() => {
            dispatch({ type: "NEXT_ROUND", res: data });
            if (data.nextIsBoss || data.nextIsChaos) {
              bossRound();
            } else {
              roundWin();
            }
          }, 1600);
          return;
        }

        if (data.lifeLost) {
          wrong();
          showToast(
            `The word was: ${data.word} — ${data.livesRemaining} life remaining`,
            2000
          );
          setTimeout(() => dispatch({ type: "LIFE_LOST_NEXT", res: data }), 2200);
          return;
        }

        if (data.hint) {
          showToast(`Hint: position ${data.hint.position + 1} is "${data.hint.letter}"`);
        }

      }, revealDelay);

    } catch {
      dispatch({ type: "SET_SUBMITTING", value: false });
      showToast("Something went wrong.");
    }
  }, [state, previousHighScore, showToast, correct, wrong, roundWin, bossRound, runOver]);

  // ── Timer expiry ──────────────────────────────────────────────────────────

  const onTimerExpired = useCallback(async () => {
    if (state.phase !== "playing") return;
    runOver(); // ← descending minor when timer hits zero
    try {
      const endRes = await fetch("/api/run/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: state.token,
          totalScore: state.totalScore,
          roundsWon: state.roundsWon,
        }),
      });
      const endData: EndResponse = await endRes.json();
      dispatch({ type: "END_RUN", res: endData, lastWord: "" });
    } catch {
      dispatch({
        type: "END_RUN",
        res: {
          saved: false,
          finalScore: state.totalScore,
          finalRounds: state.roundsWon,
          isHighScore: state.totalScore > previousHighScore,
          previousHighScore,
        },
        lastWord: "",
      });
    }
  }, [state, previousHighScore, runOver]);

  // ── Physical keyboard ─────────────────────────────────────────────────────

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (state.phase !== "playing") return;
      if (e.key === "Enter") submitGuess();
      else if (e.key === "Backspace") deleteLetter();
      else if (/^[a-zA-Z]$/.test(e.key)) addLetter(e.key.toUpperCase());
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.phase, submitGuess, deleteLetter, addLetter]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetRun = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // ── Expose tick for TimerHUD (already used directly via useAudio there) ───
  // tick is used directly in TimerHUD via its own useAudio() call — no need
  // to thread it through useRunState. Listed here for documentation only.

  return {
    state,
    mounted,
    startRun,
    addLetter,
    deleteLetter,
    submitGuess,
    onTimerExpired,
    resetRun,
    showToast,
  };
}
