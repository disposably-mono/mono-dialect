"use client";

import { Tile } from "./Tile";
import type { Feedback } from "./types";

interface BoardProps {
  grid: string[][];
  revealed: (Feedback | null)[][];
  currentRow: number;
  currentCol: number;
  status: string;
  shakingRow: number | null;
  revealingRow: number | null;
  bouncingRow: number | null;
  popCell: { row: number; col: number } | null;
}

export function Board({
  grid, revealed, currentRow, currentCol, status,
  shakingRow, revealingRow, bouncingRow, popCell,
}: BoardProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 18 }}>
      {grid.map((row, r) => (
        <div key={r} style={{ display: "flex", gap: 5 }}>
          {row.map((letter, c) => (
            <Tile
              key={c}
              letter={letter}
              feedback={revealed[r]?.[c] ?? null}
              isCursor={
                status === "playing" &&
                r === currentRow &&
                c === currentCol &&
                !revealed[r]?.[c]
              }
              isRevealing={revealingRow === r}
              revealDelay={c * 80}
              isShaking={shakingRow === r}
              isBouncing={bouncingRow === r}
              bounceDelay={c * 80}
              isPopping={popCell?.row === r && popCell?.col === c}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
