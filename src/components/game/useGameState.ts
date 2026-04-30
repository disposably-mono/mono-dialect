"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Feedback, GameStatus } from "./types";
import type { BoardStateData } from "@/app/page";

const MAX_ROWS = 6;
const BASE_STORAGE_KEY = "mono-dialect-daily";
const WIN_MESSAGES = ["Brilliant!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"];

// ── Account-scoped key: prevents cross-account localStorage bleed
function storageKey(userId?: string) {
  return userId ? `${BASE_STORAGE_KEY}-${userId}` : BASE_STORAGE_KEY;
}

export interface GameState {
  wordLength: number;
  token: string;
  date: string;
  grid: string[][];
  revealed: (Feedback | null)[][];
  currentRow: number;
  currentCol: number;
  status: GameStatus;
  keyMap: Record<string, Feedback>;
  word?: string;
  shakingRow: number | null;
  revealingRow: number | null;
  bouncingRow: number | null;
  popCell: { row: number; col: number } | null;
  toast: string | null;
  isLoading: boolean;
  error: string | null;
}

type StoredState = Pick<
  GameState,
  "date" | "token" | "wordLength" | "grid" | "revealed" | "currentRow" | "currentCol" | "status" | "word"
>;

interface UseGameStateParams {
  hasPlayedToday: boolean;
  today: string;
  onGameEnd?: () => void;
  userId?: string;                  // ── NEW
  boardState: BoardStateData | null; // ── NEW
}

function makeGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(""));
}

function makeRevealed(rows: number, cols: number): (Feedback | null)[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

function buildKeyMap(
  grid: string[][],
  revealed: (Feedback | null)[][]
): Record<string, Feedback> {
  const priority: Record<Feedback, number> = { correct: 3, present: 2, absent: 1 };
  const map: Record<string, Feedback> = {};
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const l = grid[r][c];
      const fb = revealed[r][c];
      if (!l || !fb) continue;
      if (!map[l] || priority[fb] > priority[map[l]]) map[l] = fb;
    }
  }
  return map;
}

function loadStored(today: string, userId?: string): StoredState | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    return parsed.date === today ? parsed : null;
  } catch {
    return null;
  }
}

function saveStored(patch: Partial<StoredState>, userId?: string) {
  try {
    const key = storageKey(userId);
    const raw = localStorage.getItem(key);
    const existing: Partial<StoredState> = raw ? JSON.parse(raw) : {};
    localStorage.setItem(key, JSON.stringify({ ...existing, ...patch }));
  } catch {}
}

const INITIAL: GameState = {
  wordLength: 5,
  token: "",
  date: "",
  grid: [],
  revealed: [],
  currentRow: 0,
  currentCol: 0,
  status: "idle",
  keyMap: {},
  shakingRow: null,
  revealingRow: null,
  bouncingRow: null,
  popCell: null,
  toast: null,
  isLoading: true,
  error: null,
};

export function useGameState({ hasPlayedToday, today, onGameEnd, userId, boardState }: UseGameStateParams) {
  const [state, setState] = useState<GameState>(INITIAL);
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onGameEndRef = useRef(onGameEnd);
  onGameEndRef.current = onGameEnd;

  function showToast(msg: string, duration = 1800) {
    setState(s => ({ ...s, toast: msg }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setState(s => ({ ...s, toast: null })),
      duration
    );
  }

  useEffect(() => {
    async function init() {
      // ── Priority order for state source:
      //    1. localStorage (same device, same account — fastest, most up to date)
      //    2. DB boardState prop (cross-device rehydration for auth'd users)
      //    3. Fresh fetch from /api/daily-word (new game)

      // ── Check localStorage first (account-scoped key)
      const stored = loadStored(today, userId);

      if (stored) {
        // localStorage is authoritative for this device — use it regardless
        // of hasPlayedToday, since it's already scoped to this account
        setState(s => ({
          ...s,
          ...stored,
          keyMap: buildKeyMap(stored.grid, stored.revealed),
          isLoading: false,
        }));
        return;
      }

      // ── No localStorage — check if DB has a board snapshot (cross-device)
      if (boardState) {
        // Rehydrate from DB snapshot. This covers:
        //   - Account A cleared cookies and signed back in
        //   - Account A signing in on a different device
        const grid = boardState.grid;
        const revealed = boardState.revealed as (Feedback | null)[][];

        // We need the token for potential further guesses (mid-game rehydration).
        // Fetch it fresh — /api/daily-word never exposes the word, just length+token.
        let token = "";
        let date = today;
        if (boardState.status === "playing") {
          try {
            const res = await fetch("/api/daily-word");
            const data = await res.json();
            if (res.ok) { token = data.token; date = data.date; }
          } catch {}
        }

        const patch: StoredState = {
          date,
          token,
          wordLength: grid[0]?.length ?? 5,
          grid,
          revealed,
          currentRow: boardState.currentRow,
          currentCol: boardState.currentCol,
          status: boardState.status as GameStatus,
          ...(boardState.word && { word: boardState.word }),
        };

        // Write to localStorage so subsequent loads on this device are instant
        saveStored(patch, userId);

        setState(s => ({
          ...s,
          ...patch,
          keyMap: buildKeyMap(grid, revealed),
          isLoading: false,
        }));
        return;
      }

      // ── No localStorage, no DB snapshot — fresh game
      if (hasPlayedToday) {
        // Edge case: DB says played but boardState is null (shouldn't happen
        // after this fix, but guard anyway). Show locked empty board.
        try {
          const res = await fetch("/api/daily-word");
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setState(s => ({
            ...s,
            date: data.date,
            token: data.token,
            wordLength: data.length,
            grid: makeGrid(MAX_ROWS, data.length),
            revealed: makeRevealed(MAX_ROWS, data.length),
            currentRow: 0,
            currentCol: 0,
            status: "won",
            keyMap: {},
            isLoading: false,
          }));
        } catch {
          setState(s => ({ ...s, isLoading: false, error: "Failed to load today's word." }));
        }
        return;
      }

      // ── Completely fresh — fetch word metadata and start new game
      try {
        const res = await fetch("/api/daily-word");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const grid = makeGrid(MAX_ROWS, data.length);
        const revealed = makeRevealed(MAX_ROWS, data.length);
        const patch: StoredState = {
          date: data.date,
          token: data.token,
          wordLength: data.length,
          grid,
          revealed,
          currentRow: 0,
          currentCol: 0,
          status: "playing",
        };
        saveStored(patch, userId);
        setState(s => ({ ...s, ...patch, keyMap: {}, isLoading: false }));
      } catch {
        setState(s => ({ ...s, isLoading: false, error: "Failed to load today's word." }));
      }
    }
    init();
  }, [hasPlayedToday, today, userId, boardState]);

  const submitGuess = useCallback(async () => {
    const s = stateRef.current;
    if (s.status !== "playing") return;

    if (s.currentCol < s.wordLength) {
      setState(p => ({ ...p, shakingRow: s.currentRow }));
      showToast("Not enough letters");
      setTimeout(() => setState(p => ({ ...p, shakingRow: null })), 500);
      return;
    }

    const guess = s.grid[s.currentRow].join("");

    try {
      const res = await fetch("/api/validate-guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guess,
          token: s.token,
          guessNumber: s.currentRow + 1,
          totalGuesses: MAX_ROWS,
          // ── NEW: send full grid + revealed so server can persist board state
          grid: s.grid,
          revealed: s.revealed,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Validation failed");

      const { feedback, won, lost, word } = data as {
        feedback: Feedback[];
        won: boolean;
        lost: boolean;
        word?: string;
      };

      const newRevealed = s.revealed.map(r => [...r]);
      feedback.forEach((fb, c) => { newRevealed[s.currentRow][c] = fb; });

      const newKeyMap = buildKeyMap(s.grid, newRevealed);
      const newStatus: GameStatus = won ? "won" : lost ? "lost" : "playing";
      const revealingRow = s.currentRow;

      const patch: Partial<StoredState> = {
        revealed: newRevealed,
        currentRow: s.currentRow + 1,
        currentCol: 0,
        status: newStatus,
        ...(word && { word }),
      };

      setState(p => ({ ...p, ...patch, keyMap: newKeyMap, revealingRow }));
      saveStored(patch, userId); // ── CHANGED: account-scoped key

      const revealDuration = s.wordLength * 80 + 350;

      setTimeout(() => {
        setState(p => ({ ...p, revealingRow: null }));

        if (won) {
          setState(p => ({ ...p, bouncingRow: revealingRow }));
          showToast(WIN_MESSAGES[Math.min(s.currentRow, 5)], 2200);
          setTimeout(() => setState(p => ({ ...p, bouncingRow: null })), 900);
        } else if (lost) {
          showToast(word ?? "", 3500);
        }

        if (won || lost) {
          onGameEndRef.current?.();
        }
      }, revealDuration);
    } catch {
      showToast("Something went wrong");
    }
  }, [userId]);

  const handleKey = useCallback(
    (key: string) => {
      if (key === "ENTER") {
        submitGuess();
        return;
      }

      setState(s => {
        if (s.status !== "playing") return s;

        if (key === "BACKSPACE" || key === "⌫") {
          if (s.currentCol <= 0) return s;
          const grid = s.grid.map(r => [...r]);
          const col = s.currentCol - 1;
          grid[s.currentRow][col] = "";
          saveStored({ grid, currentCol: col }, userId);
          return { ...s, grid, currentCol: col, popCell: null };
        }

        if (/^[A-Z]$/.test(key)) {
          if (s.currentCol >= s.wordLength) return s;
          const grid = s.grid.map(r => [...r]);
          grid[s.currentRow][s.currentCol] = key;
          const popCell = { row: s.currentRow, col: s.currentCol };
          const col = s.currentCol + 1;
          saveStored({ grid, currentCol: col }, userId);
          setTimeout(() => setState(p => ({ ...p, popCell: null })), 150);
          return { ...s, grid, currentCol: col, popCell };
        }

        return s;
      });
    },
    [submitGuess, userId]
  );

  const handleShare = useCallback(() => {
    const s = stateRef.current;
    if (s.status === "idle" || s.status === "playing") {
      showToast("Finish today's word first!");
      return;
    }
    const EMOJI: Record<Feedback, string> = {
      correct: "🟩",
      present: "🟨",
      absent: "⬛",
    };
    const rows = s.revealed
      .slice(0, s.currentRow)
      .map(row => row.map(f => EMOJI[f ?? "absent"]).join(""))
      .join("\n");
    const count = s.status === "won" ? s.currentRow : "X";
    const text = `Mono — Dialect · ${s.date}\n${count}/6\n\n${rows}\n\ndialect.mono.dev`;
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Copied to clipboard!"))
      .catch(() => showToast("Copy failed — try again"));
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") handleKey("ENTER");
      else if (e.key === "Backspace") handleKey("BACKSPACE");
      else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  return { ...state, handleKey, handleShare };
}
