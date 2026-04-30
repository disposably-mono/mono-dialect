"use client";

import type { Feedback } from "./types";

interface TileProps {
  letter: string;
  feedback: Feedback | null;
  isCursor: boolean;
  isRevealing: boolean;
  revealDelay: number;
  isShaking: boolean;
  isBouncing: boolean;
  bounceDelay: number;
  isPopping: boolean;
}

const STYLES: Record<Feedback, { bg: string; border: string; color: string }> = {
  correct: {
    bg: "var(--fern-dark)",
    border: "var(--fern)",
    color: "var(--beige)",
  },
  present: {
    bg: "#5C4A1A",
    border: "#C8A84B",
    color: "#F0D080",
  },
  absent: {
    bg: "var(--bg-3)",
    border: "var(--bg-3)",
    color: "var(--text-muted)",
  },
};

export function Tile({
  letter,
  feedback,
  isCursor,
  isRevealing,
  revealDelay,
  isShaking,
  isBouncing,
  bounceDelay,
  isPopping,
}: TileProps) {
  const fs = feedback ? STYLES[feedback] : null;

  const bg = fs?.bg ?? "var(--bg-2)";
  const border = fs?.border ?? (letter ? (isCursor ? "var(--lavender-grey)" : "#5A5650") : "var(--tile-border)");
  const color = fs?.color ?? "var(--text-primary)";

  const animClass =
    isShaking
      ? "tile-shake"
      : isRevealing && feedback
      ? "tile-flip"
      : isBouncing
      ? "tile-bounce"
      : isPopping
      ? "tile-pop"
      : "";

  const animDelay = isRevealing
    ? `${revealDelay}ms`
    : isBouncing
    ? `${bounceDelay}ms`
    : "0ms";

  return (
    <div
      className={animClass}
      style={{
        width: 48,
        height: 48,
        background: bg,
        border: `0.5px solid ${border}`,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 18,
        fontWeight: 500,
        color,
        textTransform: "uppercase",
        animationDelay: animDelay,
        transformStyle: "preserve-3d",
        transition: feedback ? "none" : "border-color 100ms",
        userSelect: "none",
      }}
    >
      {letter}
    </div>
  );
}
